#!/bin/bash

################################################################################
# 苏州擎航电子元件有限公司 - 批量删除脚本
################################################################################
# 供应商: 苏州擎航电子元件有限公司
# 记录数: 5,300 条
# 策略: 批量删除,每批1000条,最多10批
# 安全: 批次间延迟2秒,自动计数验证
################################################################################

set -e

SUPPLIER_NAME="苏州擎航电子元件有限公司"
BATCH_SIZE=1000
MAX_BATCHES=10
BATCH_DELAY=2
LOG_FILE="./delete_qinghang_supplier.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}苏州擎航电子元件有限公司 - 批量删除${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 记录开始时间
START_TIME=$(date +%s)
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo ""

# 查询初始记录数
echo -e "${YELLOW}[1/4] 查询初始记录数...${NC}"
INITIAL_COUNT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
  --command="SELECT COUNT(*) as count FROM products WHERE company_name = '$SUPPLIER_NAME'" 2>&1 | \
  grep -A 5 '"count"' | grep -o '"count":[[:space:]]*[0-9]*' | grep -o '[0-9]*$')

if [ -z "$INITIAL_COUNT" ]; then
  echo -e "${RED}错误: 无法获取初始记录数${NC}"
  exit 1
fi

echo -e "${GREEN}初始记录数: $INITIAL_COUNT 条${NC}" | tee -a "$LOG_FILE"
echo ""

# 确认删除
echo -e "${YELLOW}[2/4] 确认删除操作...${NC}"
echo -e "${RED}警告: 即将删除 $INITIAL_COUNT 条记录!${NC}"
echo -e "供应商: ${YELLOW}$SUPPLIER_NAME${NC}"
echo -e "批次大小: ${YELLOW}$BATCH_SIZE${NC} 条/批"
echo -e "最大批次: ${YELLOW}$MAX_BATCHES${NC} 批"
echo ""
read -p "确认删除? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}取消删除操作${NC}"
  exit 0
fi

echo ""
echo -e "${YELLOW}[3/4] 开始批量删除...${NC}"

BATCH_NUM=0
TOTAL_DELETED=0

while [ $BATCH_NUM -lt $MAX_BATCHES ]; do
  BATCH_NUM=$((BATCH_NUM + 1))
  
  echo -e "${BLUE}批次 $BATCH_NUM/$MAX_BATCHES${NC}" | tee -a "$LOG_FILE"
  
  # 执行删除
  DELETE_OUTPUT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
    --command="DELETE FROM products WHERE company_name = '$SUPPLIER_NAME' LIMIT $BATCH_SIZE" 2>&1)
  
  # 提取删除的记录数
  DELETED_COUNT=$(echo "$DELETE_OUTPUT" | grep -o '"changes":[[:space:]]*[0-9]*' | grep -o '[0-9]*$' || echo "0")
  
  if [ -z "$DELETED_COUNT" ] || [ "$DELETED_COUNT" = "0" ]; then
    echo -e "${GREEN}  已删除: 0 条 (无剩余记录)${NC}" | tee -a "$LOG_FILE"
    break
  fi
  
  TOTAL_DELETED=$((TOTAL_DELETED + DELETED_COUNT))
  
  echo -e "${GREEN}  已删除: $DELETED_COUNT 条 (累计: $TOTAL_DELETED)${NC}" | tee -a "$LOG_FILE"
  
  # 查询剩余记录数
  REMAINING=$(npx wrangler d1 execute webapp-csv-import-production --remote \
    --command="SELECT COUNT(*) as count FROM products WHERE company_name = '$SUPPLIER_NAME'" 2>&1 | \
    grep -A 5 '"count"' | grep -o '"count":[[:space:]]*[0-9]*' | grep -o '[0-9]*$')
  
  echo -e "  剩余记录: ${YELLOW}$REMAINING${NC} 条" | tee -a "$LOG_FILE"
  
  # 如果没有剩余记录,退出循环
  if [ "$REMAINING" = "0" ]; then
    echo -e "${GREEN}  所有记录已删除完毕!${NC}" | tee -a "$LOG_FILE"
    break
  fi
  
  # 批次间延迟
  if [ $BATCH_NUM -lt $MAX_BATCHES ]; then
    echo "  等待 ${BATCH_DELAY}秒..." | tee -a "$LOG_FILE"
    sleep $BATCH_DELAY
  fi
  
  echo "" | tee -a "$LOG_FILE"
done

echo ""
echo -e "${YELLOW}[4/4] 验证删除结果...${NC}"

# 最终验证
FINAL_COUNT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
  --command="SELECT COUNT(*) as count FROM products WHERE company_name = '$SUPPLIER_NAME'" 2>&1 | \
  grep -A 5 '"count"' | grep -o '"count":[[:space:]]*[0-9]*' | grep -o '[0-9]*$')

# 查询数据库总记录数
TOTAL_RECORDS=$(npx wrangler d1 execute webapp-csv-import-production --remote \
  --command="SELECT COUNT(*) as count FROM products" 2>&1 | \
  grep -A 5 '"count"' | grep -o '"count":[[:space:]]*[0-9]*' | grep -o '[0-9]*$')

# 记录结束时间
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}删除完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "初始记录数: ${YELLOW}$INITIAL_COUNT${NC} 条"
echo -e "删除记录数: ${GREEN}$TOTAL_DELETED${NC} 条"
echo -e "剩余记录数: ${YELLOW}$FINAL_COUNT${NC} 条"
echo -e "数据库总记录: ${YELLOW}$TOTAL_RECORDS${NC} 条"
echo -e "执行批次: ${YELLOW}$BATCH_NUM${NC} 批"
echo -e "总耗时: ${YELLOW}${DURATION}${NC} 秒"
echo ""

if [ "$FINAL_COUNT" = "0" ]; then
  echo -e "${GREEN}✓ 删除成功! 所有记录已清除${NC}"
else
  echo -e "${YELLOW}⚠ 警告: 仍有 $FINAL_COUNT 条记录未删除${NC}"
  echo -e "${YELLOW}建议: 可以再次运行脚本继续删除${NC}"
fi

echo ""
echo "详细日志已保存至: $LOG_FILE"
echo ""

# 记录到日志文件
echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "删除汇总" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "初始记录数: $INITIAL_COUNT" >> "$LOG_FILE"
echo "删除记录数: $TOTAL_DELETED" >> "$LOG_FILE"
echo "剩余记录数: $FINAL_COUNT" >> "$LOG_FILE"
echo "数据库总记录: $TOTAL_RECORDS" >> "$LOG_FILE"
echo "执行批次: $BATCH_NUM" >> "$LOG_FILE"
echo "总耗时: ${DURATION}秒" >> "$LOG_FILE"
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
