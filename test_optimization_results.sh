#!/bin/bash

API_URL="https://webapp-csv-import.pages.dev/api"

echo "=========================================="
echo "冷启动性能优化验证测试"
echo "=========================================="
echo "部署URL: https://394d7ad1.webapp-csv-import.pages.dev"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 测试1：健康检查端点
echo "【测试1】健康检查端点 /api/health"
curl -s -w "\n总耗时: %{time_total}s\n" "$API_URL/health" | grep -E '"status"|总耗时'
echo ""

sleep 3

# 测试2：优化后的商品搜索（skipCount=true）
echo "【测试2】商品搜索 - 跳过COUNT (skipCount=true)"
RESULT=$(curl -s -w "\n%{time_total}" \
  "$API_URL/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC&skipCount=true")
TIME=$(echo "$RESULT" | tail -n 1)
TOTAL=$(echo "$RESULT" | grep -o '"total":-\?[0-9]*' | grep -o -- '-\?[0-9]*')
DATA_COUNT=$(echo "$RESULT" | grep -o '"id":[0-9]*' | wc -l)

echo "  总耗时: ${TIME}s"
echo "  返回数据: ${DATA_COUNT} 条"
echo "  total值: ${TOTAL} (-1表示跳过COUNT)"
echo ""

sleep 3

# 测试3：异步COUNT查询
echo "【测试3】异步COUNT查询 /api/products/count"
COUNT_RESULT=$(curl -s -w "\n%{time_total}" \
  "$API_URL/products/count?search=156-00532&searchField=name")
COUNT_TIME=$(echo "$COUNT_RESULT" | tail -n 1)
TOTAL_COUNT=$(echo "$COUNT_RESULT" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

echo "  COUNT耗时: ${COUNT_TIME}s"
echo "  商品总数: ${TOTAL_COUNT}"
echo ""

sleep 3

# 测试4：对比 - 原方式（不跳过COUNT）
echo "【测试4】对比 - 原方式不跳过COUNT"
OLD_RESULT=$(curl -s -w "\n%{time_total}" \
  "$API_URL/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
OLD_TIME=$(echo "$OLD_RESULT" | tail -n 1)
OLD_TOTAL=$(echo "$OLD_RESULT" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

echo "  总耗时: ${OLD_TIME}s"
echo "  total值: ${OLD_TOTAL}"
echo ""

# 性能对比
echo "=========================================="
echo "性能提升分析"
echo "=========================================="

# 使用 awk 计算（避免 bc 依赖）
IMPROVEMENT=$(awk "BEGIN {printf \"%.1f\", $OLD_TIME / $TIME}")
SAVINGS=$(awk "BEGIN {printf \"%.3f\", $OLD_TIME - $TIME}")

echo "【数据查询速度】"
echo "  优化前（含COUNT）: ${OLD_TIME}s"
echo "  优化后（跳过COUNT）: ${TIME}s"
echo "  性能提升: ${IMPROVEMENT}x"
echo "  节省时间: ${SAVINGS}s"
echo ""

echo "【用户体验】"
echo "  ✓ 数据展示速度: ${TIME}s（立即看到数据）"
echo "  ✓ 总数加载速度: +${COUNT_TIME}s（后台异步加载）"
echo "  ✓ 总用户感知时间: ${TIME}s（vs 原来 ${OLD_TIME}s）"
echo ""

echo "【优化效果评级】"
if (( $(awk "BEGIN {print ($TIME < 0.3)}") )); then
  RATING="⭐⭐⭐⭐⭐ 优秀"
elif (( $(awk "BEGIN {print ($TIME < 0.6)}") )); then
  RATING="⭐⭐⭐⭐ 良好"
elif (( $(awk "BEGIN {print ($TIME < 1.0)}") )); then
  RATING="⭐⭐⭐ 一般"
else
  RATING="⭐⭐ 需进一步优化"
fi

echo "  性能评级: $RATING"
echo ""

echo "=========================================="
echo "冷启动预防机制"
echo "=========================================="
echo "✓ 健康检查端点已部署: $API_URL/health"
echo "⚠️ 建议配置外部监控服务:"
echo "   - UptimeRobot (https://uptimerobot.com) - 每5分钟检查一次"
echo "   - Cron-job.org (https://cron-job.org) - 定时调用健康检查"
echo "   - 目标: 保持Worker热启动，避免冷启动延迟"
echo ""

echo "测试完成！"
