#!/bin/bash
##############################################################################
# 11.10数据汇总表批量导入启动脚本
# 
# 功能：
# - 全面的系统环境检查
# - AI Drive 文件存在性验证
# - 生产环境连通性测试
# - 后台进程启动和管理
# - 实时状态监控
##############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
AI_DRIVE_PATH="/mnt/aidrive"
PRODUCTION_URL="https://webapp-csv-import.pages.dev"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMPORT_SCRIPT="$SCRIPT_DIR/optimized_batch_import_11_10.mjs"
STATUS_SCRIPT="$SCRIPT_DIR/check_11_10_import_status.mjs"
LOG_FILE="$SCRIPT_DIR/11_10_import.log.console"

# 目标文件列表
TARGET_FILES=(
  "11.10数据汇总表_part_1.csv"
  "11.10数据汇总表_part_2.csv"
  "11.10数据汇总表_part_3.csv"
  "11.10数据汇总表_part_4.csv"
  "11.10数据汇总表_part_5.csv"
  "11.10数据汇总表_part_6.csv"
  "11.10数据汇总表_part_7.csv"
  "11.10数据汇总表_part_8.csv"
)

echo -e "${BLUE}================================================================================${NC}"
echo -e "${BLUE}             11.10数据汇总表批量导入系统 - 启动脚本                           ${NC}"
echo -e "${BLUE}================================================================================${NC}"
echo ""
echo -e "📅 启动时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "📂 工作目录: $SCRIPT_DIR"
echo -e "🌐 生产环境: $PRODUCTION_URL"
echo -e "📁 AI Drive路径: $AI_DRIVE_PATH"
echo -e "📊 目标文件数: ${#TARGET_FILES[@]}"
echo ""

##############################################################################
# 步骤1: 系统环境检查
##############################################################################
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 1/6: 系统环境检查${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo -e "${YELLOW}   请先安装 Node.js (v16或更高版本)${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# 检查导入脚本是否存在
if [ ! -f "$IMPORT_SCRIPT" ]; then
    echo -e "${RED}❌ 错误: 导入脚本不存在: $IMPORT_SCRIPT${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 导入脚本: $IMPORT_SCRIPT${NC}"

# 检查状态检查脚本
if [ ! -f "$STATUS_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  警告: 状态检查脚本不存在: $STATUS_SCRIPT${NC}"
else
    echo -e "${GREEN}✅ 状态脚本: $STATUS_SCRIPT${NC}"
fi

echo ""

##############################################################################
# 步骤2: AI Drive 文件检查
##############################################################################
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 2/6: AI Drive 文件检查${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

if [ ! -d "$AI_DRIVE_PATH" ]; then
    echo -e "${RED}❌ 错误: AI Drive 目录不存在: $AI_DRIVE_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AI Drive 目录存在${NC}"

MISSING_FILES=0
TOTAL_SIZE=0

for i in "${!TARGET_FILES[@]}"; do
    FILE="${TARGET_FILES[$i]}"
    FILE_PATH="$AI_DRIVE_PATH/$FILE"
    
    if [ -f "$FILE_PATH" ]; then
        SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
        TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        SIZE_MB=$(echo "scale=2; $SIZE / 1024 / 1024" | bc)
        echo -e "${GREEN}  ✅ [$((i+1))] $FILE (${SIZE_MB} MB)${NC}"
    else
        echo -e "${RED}  ❌ [$((i+1))] $FILE (不存在)${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

echo ""
echo -e "📊 文件统计:"
echo -e "  - 总文件数: ${#TARGET_FILES[@]}"
echo -e "  - 存在文件: $((${#TARGET_FILES[@]} - MISSING_FILES))"
echo -e "  - 缺失文件: $MISSING_FILES"

TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024" | bc)
echo -e "  - 总大小: ${TOTAL_SIZE_MB} MB"

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}❌ 错误: 有 $MISSING_FILES 个文件缺失！${NC}"
    echo -e "${YELLOW}   请确保所有文件都已上传到 AI Drive${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 所有文件验证通过！${NC}"
echo ""

##############################################################################
# 步骤3: 生产环境连通性测试
##############################################################################
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 3/6: 生产环境连通性测试${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "🔍 测试连接: $PRODUCTION_URL"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" --max-time 10)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 302 ]; then
    echo -e "${GREEN}✅ 生产环境可访问 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ 错误: 无法访问生产环境 (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}   请检查网络连接和生产环境状态${NC}"
    exit 1
fi
echo ""

##############################################################################
# 步骤4: 检查是否有进程正在运行
##############################################################################
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 4/6: 检查运行中的导入进程${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

RUNNING_PROCESS=$(ps aux | grep "optimized_batch_import_11_10.mjs" | grep -v grep)

if [ -n "$RUNNING_PROCESS" ]; then
    echo -e "${YELLOW}⚠️  警告: 发现正在运行的导入进程:${NC}"
    echo "$RUNNING_PROCESS"
    echo ""
    read -p "是否终止现有进程并重新开始？(y/N): " KILL_CONFIRM
    
    if [[ $KILL_CONFIRM =~ ^[Yy]$ ]]; then
        PID=$(echo "$RUNNING_PROCESS" | awk '{print $2}')
        kill -9 $PID
        echo -e "${GREEN}✅ 已终止进程 (PID: $PID)${NC}"
        sleep 2
    else
        echo -e "${YELLOW}取消启动${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ 没有运行中的导入进程${NC}"
fi
echo ""

##############################################################################
# 步骤5: 用户确认
##############################################################################
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 5/6: 最终确认${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "${YELLOW}准备开始导入，请确认以下信息:${NC}"
echo ""
echo -e "  📂 文件数量: ${#TARGET_FILES[@]} 个"
echo -e "  📊 总大小: ${TOTAL_SIZE_MB} MB"
echo -e "  🌐 目标环境: $PRODUCTION_URL"
echo -e "  📝 日志文件: $LOG_FILE"
echo ""
echo -e "${YELLOW}导入过程将在后台运行，可能需要较长时间${NC}"
echo ""

read -p "是否开始导入？(y/N): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消导入${NC}"
    exit 0
fi

##############################################################################
# 步骤6: 启动导入进程
##############################################################################
echo ""
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}步骤 6/6: 启动导入进程${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

echo -e "🚀 启动后台导入进程..."

# 启动后台进程
nohup node "$IMPORT_SCRIPT" > "$LOG_FILE" 2>&1 &
PID=$!

sleep 2

# 检查进程是否成功启动
if ps -p $PID > /dev/null; then
    echo -e "${GREEN}✅ 导入进程已启动 (PID: $PID)${NC}"
    echo ""
    echo -e "${BLUE}================================================================================${NC}"
    echo -e "${GREEN}                    🎉 导入系统启动成功！                                      ${NC}"
    echo -e "${BLUE}================================================================================${NC}"
    echo ""
    echo -e "📊 进程信息:"
    echo -e "  - PID: $PID"
    echo -e "  - 日志文件: $LOG_FILE"
    echo -e "  - 统计文件: $SCRIPT_DIR/11_10_import_stats.json"
    echo -e "  - 进度文件: $SCRIPT_DIR/11_10_import_progress.json"
    echo ""
    echo -e "📋 监控命令:"
    echo -e "  ${BLUE}# 查看实时日志${NC}"
    echo -e "  tail -f $LOG_FILE"
    echo ""
    echo -e "  ${BLUE}# 查看导入状态${NC}"
    echo -e "  node $STATUS_SCRIPT"
    echo ""
    echo -e "  ${BLUE}# 查看进程状态${NC}"
    echo -e "  ps aux | grep optimized_batch_import_11_10.mjs"
    echo ""
    echo -e "  ${BLUE}# 终止导入进程${NC}"
    echo -e "  kill -9 $PID"
    echo ""
    echo -e "${YELLOW}💡 提示: 导入将在后台运行，可以安全关闭此终端${NC}"
    echo -e "${BLUE}================================================================================${NC}"
else
    echo -e "${RED}❌ 错误: 导入进程启动失败${NC}"
    echo -e "${YELLOW}   请查看日志文件: $LOG_FILE${NC}"
    exit 1
fi
