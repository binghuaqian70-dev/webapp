#!/bin/bash
##############################################################################
# 11.10数据导入系统验证脚本
# 用于验证所有组件和文件是否准备就绪
##############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

AI_DRIVE_PATH="/mnt/aidrive"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}================================================================================${NC}"
echo -e "${BLUE}                 11.10数据导入系统验证                                        ${NC}"
echo -e "${BLUE}================================================================================${NC}"
echo ""

# 验证AI Drive中的文件
echo -e "${BLUE}1. 验证 AI Drive 文件${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

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

ALL_FILES_OK=true
TOTAL_LINES=0

for i in "${!TARGET_FILES[@]}"; do
    FILE="${TARGET_FILES[$i]}"
    FILE_PATH="$AI_DRIVE_PATH/$FILE"
    
    if [ -f "$FILE_PATH" ]; then
        LINES=$(wc -l < "$FILE_PATH")
        DATA_LINES=$((LINES - 1))  # 减去表头
        TOTAL_LINES=$((TOTAL_LINES + DATA_LINES))
        SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
        SIZE_KB=$(echo "scale=2; $SIZE / 1024" | bc)
        echo -e "${GREEN}✅ [$((i+1))] $FILE${NC}"
        echo -e "   行数: $LINES (数据行: $DATA_LINES)"
        echo -e "   大小: ${SIZE_KB} KB"
    else
        echo -e "${RED}❌ [$((i+1))] $FILE - 文件不存在${NC}"
        ALL_FILES_OK=false
    fi
done

echo ""
echo -e "📊 统计信息:"
echo -e "  总文件数: ${#TARGET_FILES[@]}"
echo -e "  总数据行数: $TOTAL_LINES"
echo ""

if [ "$ALL_FILES_OK" = false ]; then
    echo -e "${RED}❌ 部分文件缺失！${NC}"
else
    echo -e "${GREEN}✅ 所有文件验证通过！${NC}"
fi
echo ""

# 验证脚本文件
echo -e "${BLUE}2. 验证导入系统脚本${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

SCRIPTS=(
  "optimized_batch_import_11_10.mjs:导入主脚本"
  "check_11_10_import_status.mjs:状态检查脚本"
  "start_11_10_import.sh:启动脚本"
  "verify_11_10_system.sh:验证脚本"
)

ALL_SCRIPTS_OK=true

for SCRIPT_INFO in "${SCRIPTS[@]}"; do
    IFS=':' read -r SCRIPT DESC <<< "$SCRIPT_INFO"
    SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT"
    
    if [ -f "$SCRIPT_PATH" ]; then
        if [ -x "$SCRIPT_PATH" ]; then
            echo -e "${GREEN}✅ $DESC ($SCRIPT) - 可执行${NC}"
        else
            echo -e "${YELLOW}⚠️  $DESC ($SCRIPT) - 存在但不可执行${NC}"
        fi
    else
        echo -e "${RED}❌ $DESC ($SCRIPT) - 不存在${NC}"
        ALL_SCRIPTS_OK=false
    fi
done

echo ""
if [ "$ALL_SCRIPTS_OK" = false ]; then
    echo -e "${RED}❌ 部分脚本缺失！${NC}"
else
    echo -e "${GREEN}✅ 所有脚本验证通过！${NC}"
fi
echo ""

# 验证Node.js环境
echo -e "${BLUE}3. 验证运行环境${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js 未安装${NC}"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  npm 未安装${NC}"
fi

echo ""

# 生成启动命令
echo -e "${BLUE}4. 快速启动命令${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}启动导入系统:${NC}"
echo -e "  ./start_11_10_import.sh"
echo ""
echo -e "${GREEN}查看导入状态:${NC}"
echo -e "  node check_11_10_import_status.mjs"
echo ""
echo -e "${GREEN}直接运行导入脚本 (后台):${NC}"
echo -e "  nohup node optimized_batch_import_11_10.mjs > 11_10_import.log.console 2>&1 &"
echo ""

# 总结
echo -e "${BLUE}================================================================================${NC}"
if [ "$ALL_FILES_OK" = true ] && [ "$ALL_SCRIPTS_OK" = true ]; then
    echo -e "${GREEN}✅ 系统验证通过！可以开始导入${NC}"
else
    echo -e "${RED}❌ 系统验证失败，请解决上述问题后再启动${NC}"
fi
echo -e "${BLUE}================================================================================${NC}"
