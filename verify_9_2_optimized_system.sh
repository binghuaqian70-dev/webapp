#!/bin/bash

################################################################################
# 9.2数据汇总表导入系统 - 系统验证脚本
################################################################################
# 功能：验证9.2数据导入系统的完整性和配置
# 检查项：
#   1. 导入脚本存在性
#   2. 辅助脚本存在性和可执行权限
#   3. AI Drive源文件可访问性（12个CSV文件）
#   4. 本地缓存目录可写性
#   5. Node.js环境
#   6. 网络连接
#   7. 配置文件语法正确性
#   8. 磁盘空间充足性
################################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}9.2数据汇总表导入系统 - 系统验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
check_item() {
  local description=$1
  local command=$2
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "[检查 $TOTAL_CHECKS] $description ... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 通过${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗ 失败${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

echo -e "${YELLOW}开始系统验证...${NC}"
echo ""

# 1. 检查主导入脚本
check_item "主导入脚本 (optimized_batch_import_9_2.mjs)" \
  "test -f optimized_batch_import_9_2.mjs && test -x optimized_batch_import_9_2.mjs"

# 2. 检查启动脚本
check_item "启动脚本 (start_9_2_optimized_import.sh)" \
  "test -f start_9_2_optimized_import.sh && test -x start_9_2_optimized_import.sh"

# 3. 检查监控脚本
check_item "监控脚本 (check_9_2_optimized_import.sh)" \
  "test -f check_9_2_optimized_import.sh && test -x check_9_2_optimized_import.sh"

# 4. 检查简单监控脚本
check_item "简单监控脚本 (monitor_9_2_import.sh)" \
  "test -f monitor_9_2_import.sh && test -x monitor_9_2_import.sh"

# 5. 检查AI Drive源文件 (12个文件)
echo ""
echo -e "${YELLOW}检查AI Drive源文件 (12个文件)...${NC}"

AI_DRIVE_BASE="/mnt/aidrive"
TARGET_FILES=(
  "9.2数据汇总表-utf8_part_1.csv"
  "9.2数据汇总表-utf8_part_2.csv"
  "9.2数据汇总表-utf8_part_3.csv"
  "9.2数据汇总表-utf8_part_4.csv"
  "9.2数据汇总表-utf8_part_5.csv"
  "9.2数据汇总表-utf8_part_6.csv"
  "9.2数据汇总表-utf8_part_7.csv"
  "9.2数据汇总表-utf8_part_8.csv"
  "9.2数据汇总表-utf8_part_9.csv"
  "9.2数据汇总表-utf8_part_10.csv"
  "9.2数据汇总表-utf8_part_11.csv"
  "9.2数据汇总表-utf8_part_12.csv"
)

for file in "${TARGET_FILES[@]}"; do
  check_item "AI Drive文件: $file" \
    "test -f $AI_DRIVE_BASE/$file && test -r $AI_DRIVE_BASE/$file"
done

# 6. 检查本地缓存目录可写性
echo ""
check_item "本地缓存目录创建权限 (/tmp/9_2_import_cache)" \
  "mkdir -p /tmp/9_2_import_cache && test -w /tmp/9_2_import_cache"

# 7. 检查Node.js环境
echo ""
check_item "Node.js运行环境" \
  "command -v node"

# 8. 检查网络连接
check_item "网络连接 (生产环境)" \
  "curl -s --connect-timeout 5 https://webapp-csv-import.pages.dev > /dev/null"

# 9. 检查主脚本语法
echo ""
check_item "主脚本语法检查" \
  "node --check optimized_batch_import_9_2.mjs"

# 10. 检查磁盘空间 (至少需要1GB空闲空间)
check_item "磁盘空间充足性 (>1GB)" \
  "test $(df /tmp | tail -1 | awk '{print $4}') -gt 1048576"

# 汇总结果
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}验证结果汇总${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "总检查项: ${YELLOW}$TOTAL_CHECKS${NC}"
echo -e "通过检查: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "失败检查: ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✓ 所有检查通过! 系统已准备就绪${NC}"
  echo ""
  echo -e "${YELLOW}下一步操作:${NC}"
  echo "  1. 运行 ${GREEN}./start_9_2_optimized_import.sh${NC} 开始导入"
  echo "  2. 或运行 ${GREEN}./QUICKSTART_9_2_OPTIMIZED.sh${NC} 一键启动"
  echo ""
  exit 0
else
  echo -e "${RED}✗ 发现 $FAILED_CHECKS 个问题，请修复后重试${NC}"
  echo ""
  exit 1
fi
