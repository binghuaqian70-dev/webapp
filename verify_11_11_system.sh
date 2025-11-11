#!/bin/bash
################################################################################
# 11.11数据导入系统验证脚本
# 功能：验证所有必要的文件和环境配置
################################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

AI_DRIVE_PATH="/mnt/aidrive"

# 目标文件列表
TARGET_FILES=(
  "11.11数据汇总表-utf8_part01.csv"
  "11.11数据汇总表-utf8_part02.csv"
  "11.11数据汇总表-utf8_part03.csv"
  "11.11数据汇总表-utf8_part04.csv"
  "11.11数据汇总表-utf8_part05.csv"
  "11.11数据汇总表-utf8_part06.csv"
  "11.11数据汇总表-utf8_part07.csv"
  "11.11数据汇总表-utf8_part08.csv"
  "11.11数据汇总表-utf8_part09.csv"
  "11.11数据汇总表-utf8_part10.csv"
)

echo ""
echo "================================================================================"
echo -e "${BLUE}🔍 11.11数据导入系统验证${NC}"
echo "================================================================================"
echo ""

# 1. 验证脚本文件
echo -e "${BLUE}[1] 验证脚本文件${NC}"
echo ""

SCRIPTS=(
  "optimized_batch_import.mjs"
  "check_11_11_import_status.mjs"
  "start_11_11_import.sh"
  "verify_11_11_system.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    echo -e "  ${GREEN}✅${NC} $script"
  else
    echo -e "  ${RED}❌${NC} $script (缺失)"
  fi
done

# 2. 验证AI Drive文件
echo ""
echo -e "${BLUE}[2] 验证AI Drive CSV文件${NC}"
echo ""

EXISTING_COUNT=0
TOTAL_RECORDS=0

for i in "${!TARGET_FILES[@]}"; do
  FILE="${TARGET_FILES[$i]}"
  FILE_PATH="${AI_DRIVE_PATH}/${FILE}"
  FILE_NUM=$((i + 1))
  
  if [ -f "$FILE_PATH" ]; then
    SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
    SIZE_KB=$((SIZE / 1024))
    
    # 计算实际数据行数
    LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')
    DATA_LINES=$((LINE_COUNT - 1))
    
    TOTAL_RECORDS=$((TOTAL_RECORDS + DATA_LINES))
    EXISTING_COUNT=$((EXISTING_COUNT + 1))
    
    echo -e "  ${GREEN}✅ [${FILE_NUM}]${NC} ${FILE} (${SIZE_KB}KB, ${DATA_LINES}行)"
  else
    echo -e "  ${RED}❌ [${FILE_NUM}]${NC} ${FILE} (不存在)"
  fi
done

echo ""
echo "📊 统计:"
echo "  - 总文件数: ${#TARGET_FILES[@]}"
echo -e "  - 存在文件: ${GREEN}${EXISTING_COUNT}${NC}"
echo -e "  - 缺失文件: ${RED}$((${#TARGET_FILES[@]} - EXISTING_COUNT))${NC}"
echo "  - 总数据行数: $(printf "%'d" $TOTAL_RECORDS)"

# 3. 验证Node.js环境
echo ""
echo -e "${BLUE}[3] 验证Node.js环境${NC}"
echo ""

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "  ${GREEN}✅${NC} Node.js版本: $NODE_VERSION"
else
  echo -e "  ${RED}❌${NC} 未找到Node.js"
fi

# 4. 验证网络连接
echo ""
echo -e "${BLUE}[4] 验证生产环境连接${NC}"
echo ""

PRODUCTION_URL="https://webapp-csv-import.pages.dev"

if command -v curl &> /dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" || echo "000")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "  ${GREEN}✅${NC} 生产环境连接正常"
    echo "     URL: $PRODUCTION_URL"
    echo "     状态码: $HTTP_CODE"
  else
    echo -e "  ${YELLOW}⚠️${NC} 无法连接到生产环境"
    echo "     URL: $PRODUCTION_URL"
    echo "     状态码: $HTTP_CODE"
  fi
else
  echo -e "  ${YELLOW}⚠️${NC} 未找到curl命令"
fi

# 总结
echo ""
echo "================================================================================"
echo -e "${BLUE}📊 验证总结${NC}"
echo "================================================================================"
echo ""

if [ $EXISTING_COUNT -eq ${#TARGET_FILES[@]} ]; then
  echo -e "${GREEN}✅ 所有文件准备就绪！${NC}"
  echo ""
  echo "可以运行以下命令开始导入:"
  echo "  bash start_11_11_import.sh"
else
  echo -e "${YELLOW}⚠️ 部分文件缺失${NC}"
  echo ""
  echo "缺失 $((${#TARGET_FILES[@]} - EXISTING_COUNT)) 个文件"
  echo "请先上传所有CSV文件到AI Drive"
fi

echo ""
