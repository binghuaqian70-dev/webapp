#!/bin/bash

API_URL="https://webapp-csv-import.pages.dev/api/products"

echo "=========================================="
echo "多个商品名称搜索性能测试"
echo "=========================================="
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 测试用例列表
declare -a test_cases=(
  "156-00532:精确型号"
  "284088-1:常见型号"
  "12033769:长编号"
  "2840:短编号模糊搜索"
  "CONN:SKU前缀搜索"
)

echo "| 测试编号 | 搜索关键词 | 类型 | 冷启动耗时 | 热启动耗时 | 结果数 |"
echo "|---------|-----------|------|-----------|-----------|-------|"

for test_case in "${test_cases[@]}"; do
  IFS=':' read -r keyword desc <<< "$test_case"
  
  # 冷启动测试（等待10秒确保缓存过期）
  sleep 10
  
  RESULT_COLD=$(curl -s -w "\n%{time_total}" \
    "$API_URL?search=$keyword&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
  TIME_COLD=$(echo "$RESULT_COLD" | tail -n 1)
  JSON_COLD=$(echo "$RESULT_COLD" | sed '$d')
  COUNT=$(echo "$JSON_COLD" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' | head -1)
  
  # 热启动测试（立即执行）
  sleep 2
  RESULT_HOT=$(curl -s -w "\n%{time_total}" \
    "$API_URL?search=$keyword&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
  TIME_HOT=$(echo "$RESULT_HOT" | tail -n 1)
  
  # 输出结果
  printf "| %d | %s | %s | %.3fs | %.3fs | %s |\n" \
    $((RANDOM % 100)) \
    "$keyword" \
    "$desc" \
    "$TIME_COLD" \
    "$TIME_HOT" \
    "${COUNT:-N/A}"
done

echo ""
echo "测试完成"
