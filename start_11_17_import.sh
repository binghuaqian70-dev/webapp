#!/bin/bash
################################################################################
# 11.17数据汇总表批量导入启动脚本
# 功能：一键启动导入系统，包含完整的预检查和后台运行
################################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
AI_DRIVE_PATH="/mnt/aidrive"
PRODUCTION_URL="https://webapp-csv-import.pages.dev"
LOG_FILE="./11_17_import.log"
CONSOLE_LOG="./11_17_import.log.console"
PROGRESS_FILE="./11_17_import_progress.json"
STATS_FILE="./11_17_import_stats.json"
SCRIPT_NAME="optimized_batch_import.mjs"

# 目标文件列表
TARGET_FILES=(
  "11.17数据汇总表-part01.csv"
  "11.17数据汇总表-part02.csv"
  "11.17数据汇总表-part03.csv"
)

echo ""
echo "================================================================================"
echo -e "${BLUE}🚀 11.17数据汇总表批量导入系统${NC}"
echo "================================================================================"
echo ""

################################################################################
# 步骤1: 系统环境检查
################################################################################
echo -e "${BLUE}[步骤 1/6]${NC} 检查系统环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到Node.js${NC}"
    echo "请先安装Node.js"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js版本: ${NODE_VERSION}${NC}"

# 检查导入脚本
if [ ! -f "$SCRIPT_NAME" ]; then
    echo -e "${RED}❌ 错误: 未找到导入脚本 ${SCRIPT_NAME}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 导入脚本: ${SCRIPT_NAME}${NC}"

################################################################################
# 步骤2: 检查AI Drive和目标文件
################################################################################
echo ""
echo -e "${BLUE}[步骤 2/6]${NC} 检查AI Drive和目标文件..."

# 检查AI Drive路径
if [ ! -d "$AI_DRIVE_PATH" ]; then
    echo -e "${RED}❌ 错误: AI Drive路径不存在: ${AI_DRIVE_PATH}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AI Drive路径存在: ${AI_DRIVE_PATH}${NC}"

# 检查目标文件
EXISTING_FILES=0
MISSING_FILES=0
TOTAL_SIZE=0
TOTAL_RECORDS=0

echo ""
echo "📁 检查目标文件..."
for i in "${!TARGET_FILES[@]}"; do
    FILE="${TARGET_FILES[$i]}"
    FILE_PATH="${AI_DRIVE_PATH}/${FILE}"
    FILE_NUM=$((i + 1))
    
    if [ -f "$FILE_PATH" ]; then
        SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
        SIZE_KB=$((SIZE / 1024))
        
        # 计算实际行数（数据行数 = 总行数 - 1）
        LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')
        DATA_LINES=$((LINE_COUNT - 1))
        
        TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        TOTAL_RECORDS=$((TOTAL_RECORDS + DATA_LINES))
        EXISTING_FILES=$((EXISTING_FILES + 1))
        
        echo -e "  ${GREEN}✅ [${FILE_NUM}]${NC} ${FILE} (${SIZE_KB}KB, ${DATA_LINES}行数据)"
    else
        MISSING_FILES=$((MISSING_FILES + 1))
        echo -e "  ${RED}❌ [${FILE_NUM}]${NC} ${FILE} (文件不存在)"
    fi
done

echo ""
echo "📊 文件统计:"
echo "  - 总文件数: ${#TARGET_FILES[@]}"
echo -e "  - 存在文件: ${GREEN}${EXISTING_FILES}${NC}"
echo -e "  - 缺失文件: ${RED}${MISSING_FILES}${NC}"
echo "  - 总数据行数: $(printf "%'d" $TOTAL_RECORDS) 行"
TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))
echo "  - 总文件大小: ${TOTAL_SIZE_MB}MB"

if [ $EXISTING_FILES -eq 0 ]; then
    echo ""
    echo -e "${RED}❌ 错误: 没有找到任何目标文件${NC}"
    exit 1
fi

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️ 警告: 有 ${MISSING_FILES} 个文件缺失${NC}"
    echo -n "是否继续导入现有文件? (y/n): "
    read -r CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "导入已取消"
        exit 0
    fi
fi

################################################################################
# 步骤3: 检查生产环境连接
################################################################################
echo ""
echo -e "${BLUE}[步骤 3/6]${NC} 检查生产环境连接..."

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✅ 生产环境连接正常${NC}"
        echo "   URL: $PRODUCTION_URL"
        echo "   状态码: $HTTP_CODE"
    else
        echo -e "${YELLOW}⚠️ 警告: 无法连接到生产环境${NC}"
        echo "   URL: $PRODUCTION_URL"
        echo "   状态码: $HTTP_CODE"
        echo ""
        echo -n "是否继续? (y/n): "
        read -r CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            echo "导入已取消"
            exit 0
        fi
    fi
else
    echo -e "${YELLOW}⚠️ 未找到curl命令，跳过连接检查${NC}"
fi

################################################################################
# 步骤4: 检查并清理旧进程
################################################################################
echo ""
echo -e "${BLUE}[步骤 4/6]${NC} 检查现有导入进程..."

RUNNING_PIDS=$(ps aux | grep "$SCRIPT_NAME" | grep -v grep | awk '{print $2}' || true)

if [ -n "$RUNNING_PIDS" ]; then
    echo -e "${YELLOW}⚠️ 发现正在运行的导入进程:${NC}"
    ps aux | grep "$SCRIPT_NAME" | grep -v grep
    echo ""
    echo -n "是否停止现有进程并重新开始? (y/n): "
    read -r KILL_EXISTING
    
    if [ "$KILL_EXISTING" = "y" ] || [ "$KILL_EXISTING" = "Y" ]; then
        echo "正在停止现有进程..."
        echo "$RUNNING_PIDS" | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ 已停止现有进程${NC}"
    else
        echo "导入已取消"
        exit 0
    fi
else
    echo -e "${GREEN}✅ 没有运行中的导入进程${NC}"
fi

################################################################################
# 步骤5: 清理旧的日志和统计文件（可选）
################################################################################
echo ""
echo -e "${BLUE}[步骤 5/6]${NC} 处理现有导入记录..."

if [ -f "$STATS_FILE" ]; then
    LAST_STATUS=$(node -e "try { const s = require('./${STATS_FILE}'); console.log(s.status || 'unknown'); } catch(e) { console.log('unknown'); }")
    echo "📊 发现上次导入记录 (状态: ${LAST_STATUS})"
    
    if [ "$LAST_STATUS" = "completed" ]; then
        echo -n "上次导入已完成，是否清理并重新开始? (y/n): "
    else
        echo -n "上次导入未完成，是否从断点继续? (y/n，n将清理重新开始): "
    fi
    
    read -r CLEAN_FILES
    
    if [ "$CLEAN_FILES" = "n" ] || [ "$CLEAN_FILES" = "N" ]; then
        echo "清理旧文件..."
        rm -f "$LOG_FILE" "$CONSOLE_LOG" "$PROGRESS_FILE" "$STATS_FILE"
        echo -e "${GREEN}✅ 已清理旧文件，将重新开始${NC}"
    else
        echo -e "${GREEN}✅ 保留现有记录，将从断点继续${NC}"
    fi
else
    echo -e "${GREEN}✅ 没有发现旧的导入记录，全新开始${NC}"
fi

################################################################################
# 步骤6: 启动导入进程
################################################################################
echo ""
echo -e "${BLUE}[步骤 6/6]${NC} 启动导入进程..."

# 启动后台进程
nohup node "$SCRIPT_NAME" > "$CONSOLE_LOG" 2>&1 &
PID=$!

echo ""
echo -e "${GREEN}✅ 导入进程已启动！${NC}"
echo ""
echo "================================================"
echo "📊 进程信息:"
echo "================================================"
echo "  PID: $PID"
echo "  脚本: $SCRIPT_NAME"
echo "  日志文件: $LOG_FILE"
echo "  控制台日志: $CONSOLE_LOG"
echo "  统计文件: $STATS_FILE"
echo "  进度文件: $PROGRESS_FILE"
echo ""
echo "================================================"
echo "📈 导入任务信息:"
echo "================================================"
echo "  目标文件数: ${EXISTING_FILES}"
echo "  预计总记录数: $(printf "%'d" $TOTAL_RECORDS) 条"
echo "  生产环境: $PRODUCTION_URL"
echo ""

# 等待几秒检查进程是否正常启动
sleep 3

if ps -p $PID > /dev/null; then
    echo -e "${GREEN}✅ 进程运行正常${NC}"
    echo ""
    echo "================================================"
    echo "💡 后续操作指南:"
    echo "================================================"
    echo "  查看实时日志:"
    echo "    tail -f $LOG_FILE"
    echo ""
    echo "  查看导入状态:"
    echo "    node check_11_17_import_status.mjs"
    echo ""
    echo "  停止导入进程:"
    echo "    kill $PID"
    echo ""
    echo "  查看进程状态:"
    echo "    ps -p $PID"
    echo ""
    echo "================================================"
    echo ""
    
    # 显示初始日志
    echo "📋 显示初始日志..."
    sleep 2
    if [ -f "$LOG_FILE" ]; then
        echo ""
        tail -20 "$LOG_FILE"
    fi
    
else
    echo -e "${RED}❌ 错误: 进程启动失败${NC}"
    echo ""
    echo "请查看错误日志: $CONSOLE_LOG"
    if [ -f "$CONSOLE_LOG" ]; then
        echo ""
        cat "$CONSOLE_LOG"
    fi
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 导入系统已成功启动！${NC}"
echo ""
