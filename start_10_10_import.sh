#!/bin/bash
# 10.10数据汇总表导入启动脚本
# 提供用户确认、后台运行、日志管理功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 文件路径
SCRIPT_PATH="./optimized_batch_import_10_10.mjs"
LOG_FILE="./10_10_import.log"
STATS_FILE="./10_10_import_stats.json"
PROGRESS_FILE="./10_10_import_progress.json"
AI_DRIVE_PATH="/mnt/aidrive"
TARGET_FILE="10.10数据汇总表-utf8.csv"

echo -e "${BLUE}🚀 10.10数据汇总表导入启动脚本${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 预检查
echo -e "\n${CYAN}📋 系统预检查...${NC}"

# 检查脚本文件
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ 导入脚本不存在: $SCRIPT_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 导入脚本: $SCRIPT_PATH${NC}"

# 检查AI Drive文件
TARGET_PATH="$AI_DRIVE_PATH/$TARGET_FILE"
if [ ! -f "$TARGET_PATH" ]; then
    echo -e "${RED}❌ 目标文件不存在: $TARGET_PATH${NC}"
    exit 1
fi

# 获取文件信息
FILE_SIZE=$(stat -f%z "$TARGET_PATH" 2>/dev/null || stat -c%s "$TARGET_PATH" 2>/dev/null || echo "0")
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))
RECORD_COUNT=$(wc -l < "$TARGET_PATH" | tr -d ' ')
DATA_RECORDS=$((RECORD_COUNT - 1))

echo -e "${GREEN}✅ 目标文件: $TARGET_FILE${NC}"
echo -e "   📊 文件大小: ${FILE_SIZE_MB}MB (${FILE_SIZE} bytes)"
echo -e "   📈 预计记录: ${DATA_RECORDS} 条 (${RECORD_COUNT} 行含表头)"

# 检查节点和依赖
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未找到${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# 2. 检查导入状态
echo -e "\n${CYAN}📊 检查现有导入状态...${NC}"

# 检查是否有正在运行的进程
RUNNING_PROCESSES=$(ps aux | grep "optimized_batch_import_10_10.mjs" | grep -v grep | wc -l)
if [ "$RUNNING_PROCESSES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  检测到 $RUNNING_PROCESSES 个正在运行的导入进程${NC}"
    ps aux | grep "optimized_batch_import_10_10.mjs" | grep -v grep
    echo -e "\n${RED}请先停止现有进程或等待完成${NC}"
    exit 1
fi

# 检查统计文件
if [ -f "$STATS_FILE" ]; then
    echo -e "${BLUE}📊 找到统计数据文件${NC}"
    
    # 尝试解析状态（简单检查）
    if grep -q '"status.*completed"' "$STATS_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ 上次导入状态: 已完成${NC}"
    elif grep -q '"status.*error"' "$STATS_FILE" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  上次导入状态: 错误${NC}"
    elif grep -q '"status.*running"' "$STATS_FILE" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  上次导入状态: 运行中 (可能异常退出)${NC}"
    fi
else
    echo -e "${BLUE}📋 未找到历史导入记录${NC}"
fi

# 检查进度文件
if [ -f "$PROGRESS_FILE" ]; then
    echo -e "${BLUE}🔄 找到进度数据文件 - 支持断点续传${NC}"
else
    echo -e "${BLUE}🆕 首次导入 - 将从头开始${NC}"
fi

# 3. 用户确认
echo -e "\n${PURPLE}📋 导入任务详情:${NC}"
echo -e "   🎯 目标文件: ${TARGET_FILE}"
echo -e "   📊 预计记录: ${DATA_RECORDS} 条"
echo -e "   📁 文件大小: ${FILE_SIZE_MB}MB"
echo -e "   🔧 导入方式: 智能分块导入"
echo -e "   💾 断点续传: 支持"
echo -e "   📋 日志文件: ${LOG_FILE}"

echo -e "\n${YELLOW}⚠️  注意事项:${NC}"
echo -e "   • 导入过程中请勿关闭终端"
echo -e "   • 预计耗时: 5-15分钟 (取决于网络和服务器状态)"
echo -e "   • 支持Ctrl+C安全中断，可稍后从断点继续"
echo -e "   • 导入过程将在后台运行"

echo -e "\n${CYAN}是否确认开始导入? ${NC}[y/N]: \c"
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}💡 导入已取消${NC}"
    exit 0
fi

# 4. 准备导入环境
echo -e "\n${CYAN}🔧 准备导入环境...${NC}"

# 确保脚本可执行
chmod +x "$SCRIPT_PATH"

# 创建日志目录（如果需要）
LOG_DIR=$(dirname "$LOG_FILE")
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
fi

echo -e "${GREEN}✅ 环境准备完成${NC}"

# 5. 启动导入
echo -e "\n${GREEN}🚀 启动10.10数据汇总表导入...${NC}"
echo -e "${BLUE}================================================${NC}"

# 记录启动时间
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "🕐 启动时间: ${START_TIME}"

# 启动后台进程
nohup node "$SCRIPT_PATH" > "${LOG_FILE}.console" 2>&1 &
IMPORT_PID=$!

echo -e "${GREEN}✅ 导入进程已启动 (PID: ${IMPORT_PID})${NC}"
echo -e "📋 控制台输出: ${LOG_FILE}.console"
echo -e "📊 详细日志: ${LOG_FILE}"
echo -e "📈 统计数据: ${STATS_FILE}"

# 等待几秒确认进程正常启动
sleep 3

if ps -p $IMPORT_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 进程运行正常${NC}"
else
    echo -e "${RED}❌ 进程启动失败${NC}"
    echo -e "\n${YELLOW}控制台输出:${NC}"
    cat "${LOG_FILE}.console" 2>/dev/null || echo "无输出文件"
    exit 1
fi

# 6. 监控和指导
echo -e "\n${PURPLE}📊 监控指令:${NC}"
echo -e "   查看实时日志: ${BLUE}tail -f ${LOG_FILE}${NC}"
echo -e "   查看控制台输出: ${BLUE}tail -f ${LOG_FILE}.console${NC}"
echo -e "   检查导入状态: ${BLUE}node check_10_10_import_status.mjs${NC}"
echo -e "   查看进程状态: ${BLUE}ps aux | grep optimized_batch_import_10_10.mjs${NC}"

echo -e "\n${PURPLE}💡 管理指令:${NC}"
echo -e "   停止导入进程: ${BLUE}kill ${IMPORT_PID}${NC}"
echo -e "   强制停止: ${BLUE}kill -9 ${IMPORT_PID}${NC}"
echo -e "   清理临时文件: ${BLUE}rm -f ${PROGRESS_FILE}${NC}"

echo -e "\n${CYAN}🎯 导入任务已启动，正在后台运行...${NC}"
echo -e "${YELLOW}💡 建议使用状态检查脚本监控进度，避免频繁查看日志文件${NC}"

# 显示初始状态
sleep 5
echo -e "\n${CYAN}📊 5秒后初始状态:${NC}"
if [ -f "${LOG_FILE}.console" ]; then
    echo -e "${BLUE}控制台输出 (最后10行):${NC}"
    tail -10 "${LOG_FILE}.console" 2>/dev/null || echo "暂无输出"
fi

echo -e "\n${GREEN}🎊 启动完成！请使用监控指令跟踪导入进度。${NC}"
echo -e "${BLUE}================================================${NC}"