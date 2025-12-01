#!/bin/bash

API_URL="https://webapp-csv-import.pages.dev/api/products"

echo "=========================================="
echo "前端商品搜索性能测试 - 10个测试案例"
echo "=========================================="
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "API地址: $API_URL"
echo ""

# 定义10个测试案例
declare -a test_cases=(
  "156-00532:精确型号搜索:name"
  "284088-1:常见型号搜索:name"
  "12033769:长编号搜索:name"
  "CONN:SKU前缀搜索:sku"
  "连接器:分类搜索:category"
  "上海:公司名搜索:company_name"
  "2840:短编号模糊搜索:name"
  "1-:前缀模糊搜索:name"
  "TE:品牌缩写搜索:company_name"
  "USB:描述关键词:description"
)

echo "| # | 搜索关键词 | 搜索类型 | 搜索字段 | 耗时 | 结果数 | 评级 |"
echo "|---|-----------|---------|---------|------|--------|------|"

total_time=0
test_count=0

for i in "${!test_cases[@]}"; do
  IFS=':' read -r keyword desc field <<< "${test_cases[$i]}"
  test_num=$((i + 1))
  
  # 执行搜索请求（优化后方式：skipCount=true）
  RESULT=$(curl -s -w "\n%{time_total}" \
    "$API_URL?search=$keyword&searchField=$field&page=1&limit=20&sortBy=updated_at&sortOrder=DESC&skipCount=true")
  
  TIME=$(echo "$RESULT" | tail -n 1)
  JSON=$(echo "$RESULT" | sed '$d')
  
  # 提取结果数
  DATA_COUNT=$(echo "$JSON" | grep -o '"id":[0-9]*' | wc -l)
  
  # 评级
  if (( $(awk "BEGIN {print ($TIME < 0.3)}") )); then
    RATING="⭐⭐⭐⭐⭐"
  elif (( $(awk "BEGIN {print ($TIME < 0.5)}") )); then
    RATING="⭐⭐⭐⭐"
  elif (( $(awk "BEGIN {print ($TIME < 1.0)}") )); then
    RATING="⭐⭐⭐"
  elif (( $(awk "BEGIN {print ($TIME < 2.0)}") )); then
    RATING="⭐⭐"
  else
    RATING="⭐"
  fi
  
  # 输出结果
  printf "| %d | %s | %s | %s | %.3fs | %d | %s |\n" \
    "$test_num" \
    "$keyword" \
    "$desc" \
    "$field" \
    "$TIME" \
    "$DATA_COUNT" \
    "$RATING"
  
  # 累计统计
  total_time=$(awk "BEGIN {print $total_time + $TIME}")
  test_count=$((test_count + 1))
  
  # 间隔避免请求过快
  sleep 2
done

echo ""
echo "=========================================="
echo "统计分析"
echo "=========================================="

avg_time=$(awk "BEGIN {printf \"%.3f\", $total_time / $test_count}")

echo "测试案例数: $test_count"
echo "总耗时: ${total_time}s"
echo "平均耗时: ${avg_time}s"
echo ""

# 性能评级分布
excellent_count=$(grep "⭐⭐⭐⭐⭐" /tmp/test_results_$$.tmp 2>/dev/null | wc -l || echo 0)
good_count=$(grep "⭐⭐⭐⭐" /tmp/test_results_$$.tmp 2>/dev/null | wc -l || echo 0)
fair_count=$(grep "⭐⭐⭐" /tmp/test_results_$$.tmp 2>/dev/null | wc -l || echo 0)

echo "性能分布:"

# 基于平均耗时判断整体性能
if (( $(awk "BEGIN {print ($avg_time < 0.3)}") )); then
  echo "  整体评级: ⭐⭐⭐⭐⭐ 优秀"
  echo "  评价: 所有搜索响应迅速，用户体验极佳"
elif (( $(awk "BEGIN {print ($avg_time < 0.5)}") )); then
  echo "  整体评级: ⭐⭐⭐⭐ 良好"
  echo "  评价: 大部分搜索响应快速，用户体验良好"
elif (( $(awk "BEGIN {print ($avg_time < 0.8)}") )); then
  echo "  整体评级: ⭐⭐⭐ 一般"
  echo "  评价: 搜索速度可接受，仍有优化空间"
else
  echo "  整体评级: ⭐⭐ 需优化"
  echo "  评价: 搜索速度较慢，建议进一步优化"
fi

echo ""
echo "=========================================="
echo "优化建议"
echo "=========================================="

if (( $(awk "BEGIN {print ($avg_time > 0.5)}") )); then
  echo "⚠️ 检测到平均响应时间 > 0.5秒，建议："
  echo "  1. 启用 FTS5 全文索引（预期提升 10-20倍）"
  echo "  2. 添加 KV 缓存（热门搜索提升 50倍）"
  echo "  3. 配置外部监控服务（减少冷启动）"
else
  echo "✓ 当前性能表现良好！"
  echo "  进一步优化建议："
  echo "  1. 配置 UptimeRobot 监控（减少冷启动）"
  echo "  2. 可选: 启用 FTS5 索引（进一步提升性能）"
fi

echo ""
echo "测试完成！"
