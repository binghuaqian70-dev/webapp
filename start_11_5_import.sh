#!/bin/bash
##############################################################################
# 11.5数据汇总表批量导入启动脚本
# 功能：系统检查、文件验证、用户确认、后台启动导入进程
##############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
AI_DRIVE_PATH="/mnt/aidrive"
SCRIPT_NAME="optimized_batch_import.mjs"
LOG_FILE="11_5_import.log"
STATS_FILE="11_5_import_stats.json"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     11.5数据汇总表批量导入系统 - 启动脚本               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. 检查Node.js环境
echo -e "${YELLOW}[1/5]${NC} 检查系统环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到Node.js环境${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js 版本: ${NODE_VERSION}${NC}"

# 2. 检查导入脚本是否存在
echo -e "${YELLOW}[2/5]${NC} 检查导入脚本..."
if [ ! -f "$SCRIPT_NAME" ]; then
    echo -e "${RED}❌ 错误: 找不到导入脚本 ${SCRIPT_NAME}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 导入脚本: ${SCRIPT_NAME}${NC}"

# 3. 检查AI Drive挂载
echo -e "${YELLOW}[3/5]${NC} 检查AI Drive..."
if [ ! -d "$AI_DRIVE_PATH" ]; then
    echo -e "${RED}❌ 错误: AI Drive未挂载 (${AI_DRIVE_PATH})${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AI Drive: ${AI_DRIVE_PATH}${NC}"

# 4. 检查目标文件
echo -e "${YELLOW}[4/5]${NC} 检查目标文件..."

declare -a TARGET_FILES=(
    "11.5数据汇总表-utf8_part_01.csv"
    "11.5数据汇总表-utf8_part_02.csv"
    "11.5数据汇总表-utf8_part_03.csv"
    "11.5数据汇总表-utf8_part_04.csv"
    "11.5数据汇总表-utf8_part_05.csv"
    "11.5数据汇总表-utf8_part_06.csv"
    "11.5数据汇总表-utf8_part_07.csv"
    "11.5数据汇总表-utf8_part_08.csv"
    "11.5数据汇总表-utf8_part_09.csv"
    "11.5数据汇总表-utf8_part_10.csv"
    "11.5数据汇总表-utf8_part_11.csv"
    "11.5数据汇总表-utf8_part_12.csv"
    "11.5数据汇总表-utf8_part_13.csv"
    "11.5数据汇总表-utf8_part_14.csv"
    "11.5数据汇总表-utf8_part_15.csv"
    "11.5数据汇总表-utf8_part_16.csv"
    "11.5数据汇总表-utf8_part_17.csv"
    "11.5数据汇总表-utf8_part_18.csv"
    "11.5数据汇总表-utf8_part_19.csv"
    "11.5数据汇总表-utf8_part_20.csv"
)

MISSING_COUNT=0
EXISTING_COUNT=0
TOTAL_SIZE=0

for file in "${TARGET_FILES[@]}"; do
    FILE_PATH="${AI_DRIVE_PATH}/${file}"
    if [ -f "$FILE_PATH" ]; then
        FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
        TOTAL_SIZE=$((TOTAL_SIZE + FILE_SIZE))
        EXISTING_COUNT=$((EXISTING_COUNT + 1))
    else
        echo -e "${RED}   ❌ 缺失: ${file}${NC}"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

echo -e "${GREEN}✅ 找到文件: ${EXISTING_COUNT}/${#TARGET_FILES[@]}${NC}"

if [ $MISSING_COUNT -gt 0 ]; then
    echo -e "${RED}❌ 错误: ${MISSING_COUNT} 个文件缺失${NC}"
    exit 1
fi

# 转换文件大小为可读格式
if [ $TOTAL_SIZE -gt 1048576 ]; then
    SIZE_MB=$((TOTAL_SIZE / 1048576))
    echo -e "${GREEN}📊 总文件大小: ${SIZE_MB} MB${NC}"
else
    SIZE_KB=$((TOTAL_SIZE / 1024))
    echo -e "${GREEN}📊 总文件大小: ${SIZE_KB} KB${NC}"
fi

# 5. 用户确认
echo ""
echo -e "${YELLOW}[5/5]${NC} 准备启动导入..."
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 导入配置摘要:${NC}"
echo -e "${BLUE}   • 文件数量: ${#TARGET_FILES[@]} 个分割文件${NC}"
echo -e "${BLUE}   • AI Drive: ${AI_DRIVE_PATH}${NC}"
echo -e "${BLUE}   • 日志文件: ${LOG_FILE}${NC}"
echo -e "${BLUE}   • 统计文件: ${STATS_FILE}${NC}"
echo -e "${BLUE}   • 运行模式: 后台进程 (nohup)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "$(echo -e ${YELLOW}是否开始导入？[y/N]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  导入已取消${NC}"
    exit 0
fi

# 检查是否已有进程在运行
if pgrep -f "$SCRIPT_NAME" > /dev/null; then
    echo -e "${YELLOW}⚠️  检测到已有导入进程在运行${NC}"
    read -p "$(echo -e ${YELLOW}是否终止现有进程并重新启动？[y/N]: ${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "$SCRIPT_NAME"
        echo -e "${GREEN}✅ 已终止现有进程${NC}"
        sleep 2
    else
        echo -e "${YELLOW}⏸️  保持现有进程，退出${NC}"
        exit 0
    fi
fi

# 启动导入进程
echo ""
echo -e "${GREEN}🚀 正在启动导入进程...${NC}"

nohup node "$SCRIPT_NAME" > "$LOG_FILE" 2>&1 &
PID=$!

sleep 2

# 验证进程是否成功启动
if ps -p $PID > /dev/null; then
    echo -e "${GREEN}✅ 导入进程已成功启动！${NC}"
    echo -e "${GREEN}   📍 进程ID: ${PID}${NC}"
    echo -e "${GREEN}   📋 日志文件: ${LOG_FILE}${NC}"
    echo -e "${GREEN}   📊 统计文件: ${STATS_FILE}${NC}"
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}💡 监控命令:${NC}"
    echo -e "${BLUE}   查看实时日志: tail -f ${LOG_FILE}${NC}"
    echo -e "${BLUE}   查看进度状态: node check_11_5_import_status.mjs${NC}"
    echo -e "${BLUE}   查看进程状态: ps aux | grep ${SCRIPT_NAME}${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
else
    echo -e "${RED}❌ 错误: 进程启动失败${NC}"
    echo -e "${YELLOW}查看日志获取详细信息: tail -20 ${LOG_FILE}${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ 启动完成！导入进程正在后台运行...${NC}"
