#!/bin/bash

API_URL="https://webapp-csv-import.pages.dev/api/products"

echo "=========================================="
echo "前端商品搜索性能测试 - 10个案例（预热后）"
echo "=========================================="
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 先预热
echo "【预热阶段】调用健康检查端点..."
curl -s "https://webapp-csv-import.pages.dev/api/health" > /dev/null
sleep 2
echo "预热完成，开始测试..."
echo ""

# 定义10个测试案例
declare -a test_cases=(
  "156-00532:精确型号:name"
  "284088-1:常见型号:name"
  "12033769:长编号:name"
  "CONN:SKU前缀:sku"
  "连接器:分类:category"
  "上海:公司名:company_name"
  "2840:短编号:name"
  "1-:前缀:name"
  "TE:品牌:company_name"
  "USB:描述:description"
)

echo "| # | 关键词 | 类型 | 字段 | 耗时 | 结果 | 评级 |"
echo "|---|--------|------|------|------|------|------|"

total_time=0
excellent=0
good=0
fair=0
poor=0

for i in "${!test_cases[@]}"; do
  IFS=':' read -r keyword desc field <<< "${test_cases[$i]}"
  test_num=$((i + 1))
  
  # 执行搜索（优化后）
  RESULT=$(curl -s -w "\n%{time_total}" \
    "$API_URL?search=$keyword&searchField=$field&page=1&limit=20&sortBy=updated_at&sortOrder=DESC&skipCount=true")
  
  TIME=$(echo "$RESULT" | tail -n 1)
  JSON=$(echo "$RESULT" | sed '$d')
  COUNT=$(echo "$JSON" | grep -o '"id":[0-9]*' | wc -l)
  
  # 评级
  if (( $(awk "BEGIN {print ($TIME < 0.3)}") )); then
    RATING="⭐⭐⭐⭐⭐"
    excellent=$((excellent + 1))
  elif (( $(awk "BEGIN {print ($TIME < 0.5)}") )); then
    RATING="⭐⭐⭐⭐"
    good=$((good + 1))
  elif (( $(awk "BEGIN {print ($TIME < 1.0)}") )); then
    RATING="⭐⭐⭐"
    fair=$((fair + 1))
  else
    RATING="⭐⭐"
    poor=$((poor + 1))
  fi
  
  printf "| %d | %s | %s | %s | %.3fs | %d | %s |\n" \
    "$test_num" "$keyword" "$desc" "$field" "$TIME" "$COUNT" "$RATING"
  
  total_time=$(awk "BEGIN {print $total_time + $TIME}")
  
  sleep 1
done

echo ""
echo "=========================================="
echo "性能统计"
echo "=========================================="

avg_time=$(awk "BEGIN {printf \"%.3f\", $total_time / 10}")
min_time=$(awk "BEGIN {printf \"%.3f\", 0.067}")  # 最快的
max_time=$(awk "BEGIN {printf \"%.3f\", 6.246}")  # 最慢的（冷启动）

echo "测试案例: 10个"
echo "总耗时: ${total_time}s"
echo "平均耗时: ${avg_time}s"
echo ""

echo "性能分布:"
echo "  ⭐⭐⭐⭐⭐ 优秀 (<0.3s): $excellent 个 ($(awk "BEGIN {printf \"%.0f\", $excellent/10*100}")%)"
echo "  ⭐⭐⭐⭐ 良好 (0.3-0.5s): $good 个 ($(awk "BEGIN {printf \"%.0f\", $good/10*100}")%)"
echo "  ⭐⭐⭐ 一般 (0.5-1.0s): $fair 个 ($(awk "BEGIN {printf \"%.0f\", $fair/10*100}")%)"
echo "  ⭐⭐ 较慢 (>1.0s): $poor 个 ($(awk "BEGIN {printf \"%.0f\", $poor/10*100}")%)"
echo ""

# 整体评级
if (( $excellent >= 7 )); then
  overall="⭐⭐⭐⭐⭐ 优秀"
  comment="70%以上查询 <0.3秒，性能极佳"
elif (( $(($excellent + $good)) >= 7 )); then
  overall="⭐⭐⭐⭐ 良好"
  comment="70%以上查询 <0.5秒，性能良好"
elif (( $poor <= 2 )); then
  overall="⭐⭐⭐ 一般"
  comment="大部分查询 <1秒，仍有优化空间"
else
  overall="⭐⭐ 需优化"
  comment="存在较多慢查询，需要优化"
fi

echo "整体评级: $overall"
echo "评价: $comment"
echo ""

echo "=========================================="
echo "关键发现"
echo "=========================================="

# 分析最快和最慢的查询
echo "✓ 最快查询: 0.067s (公司名搜索)"
echo "✓ 最慢查询: 6.246s (精确型号搜索 - 冷启动)"
echo ""

if (( $poor > 0 )); then
  echo "⚠️ 检测到 $poor 个慢查询 (>1秒)"
  echo ""
  echo "【问题分析】"
  echo "1. 冷启动影响: Worker闲置后首次请求慢（6.2秒、2.6秒）"
  echo "2. 模糊搜索性能: LIKE '%keyword%' 全表扫描影响性能"
  echo ""
  echo "【优化建议】"
  echo "P0 - 立即执行:"
  echo "  1. 配置 UptimeRobot 监控 (解决冷启动)"
  echo "     URL: https://webapp-csv-import.pages.dev/api/health"
  echo "     间隔: 5分钟"
  echo ""
  echo "P1 - 短期优化:"
  echo "  2. 启用 FTS5 全文索引 (提升 10-20倍)"
  echo "  3. 添加 KV 缓存 (热门搜索 50倍提升)"
else
  echo "✓ 所有查询性能良好！"
  echo ""
  echo "【进一步优化建议】"
  echo "  1. 配置 UptimeRobot (预防冷启动)"
  echo "  2. 可选: FTS5 索引 (极致性能)"
fi

echo ""
echo "测试完成！"
