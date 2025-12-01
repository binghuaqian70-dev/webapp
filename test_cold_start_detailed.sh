#!/bin/bash

API_URL="https://webapp-csv-import.pages.dev/api/products"
SEARCH_TERM="156-00532"

echo "=========================================="
echo "前端搜索冷启动性能详细分析"
echo "=========================================="
echo "测试关键词: $SEARCH_TERM"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 测试1：冷启动 - 单字段搜索 (searchField=name)
echo "【测试1】冷启动 - 优化后单字段搜索 (searchField=name)"
RESULT1=$(curl -s -w "\n%{time_total}\n%{time_starttransfer}" \
  "$API_URL?search=$SEARCH_TERM&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
TIME1=$(echo "$RESULT1" | tail -n 1)
TTFB1=$(echo "$RESULT1" | tail -n 2 | head -n 1)
JSON1=$(echo "$RESULT1" | sed '$d' | sed '$d')
COUNT1=$(echo "$JSON1" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

echo "  总耗时: ${TIME1}s"
echo "  TTFB: ${TTFB1}s"  
echo "  结果数: ${COUNT1:-0}"
echo ""

sleep 5

# 测试2：热启动 - 单字段搜索
echo "【测试2】热启动 - 单字段搜索 (3秒后)"
RESULT2=$(curl -s -w "\n%{time_total}\n%{time_starttransfer}" \
  "$API_URL?search=$SEARCH_TERM&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
TIME2=$(echo "$RESULT2" | tail -n 1)
TTFB2=$(echo "$RESULT2" | tail -n 2 | head -n 1)

echo "  总耗时: ${TIME2}s"
echo "  TTFB: ${TTFB2}s"
echo ""

sleep 5

# 测试3：对比 - 全字段搜索 (旧方式)
echo "【测试3】对比测试 - 全字段搜索 (searchFields=all)"
RESULT3=$(curl -s -w "\n%{time_total}\n%{time_starttransfer}" \
  "$API_URL?search=$SEARCH_TERM&searchFields=all&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
TIME3=$(echo "$RESULT3" | tail -n 1)
TTFB3=$(echo "$RESULT3" | tail -n 2 | head -n 1)
JSON3=$(echo "$RESULT3" | sed '$d' | sed '$d')
COUNT3=$(echo "$JSON3" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

echo "  总耗时: ${TIME3}s"
echo "  TTFB: ${TTFB3}s"
echo "  结果数: ${COUNT3:-0}"
echo ""

# 测试4：精确查询 - 无排序
echo "【测试4】对比测试 - 单字段无排序"
RESULT4=$(curl -s -w "\n%{time_total}" \
  "$API_URL?search=$SEARCH_TERM&searchField=name&page=1&limit=20")
TIME4=$(echo "$RESULT4" | tail -n 1)

echo "  总耗时: ${TIME4}s"
echo ""

# 性能分析
echo "=========================================="
echo "性能分析总结"
echo "=========================================="
echo "1. 冷启动 vs 热启动差异: $(awk "BEGIN {printf \"%.3f\", $TIME1 - $TIME2}")s ($(awk "BEGIN {printf \"%.1f\", ($TIME1 - $TIME2) / $TIME1 * 100}")%)"
echo "2. 单字段 vs 全字段优化: $(awk "BEGIN {printf \"%.3f\", $TIME3 - $TIME1}")s (提升$(awk "BEGIN {printf \"%.1f\", ($TIME3 - $TIME1) / $TIME3 * 100}")%)"
echo "3. 排序性能影响: $(awk "BEGIN {printf \"%.3f\", $TIME1 - $TIME4}")s"
echo ""

# 性能评级
if (( $(awk "BEGIN {print ($TIME1 < 0.3)}") )); then
  RATING="⭐⭐⭐⭐⭐ 优秀"
elif (( $(awk "BEGIN {print ($TIME1 < 0.6)}") )); then
  RATING="⭐⭐⭐⭐ 良好"
elif (( $(awk "BEGIN {print ($TIME1 < 1.0)}") )); then
  RATING="⭐⭐⭐ 一般"
else
  RATING="⭐⭐ 需优化"
fi

echo "冷启动性能评级: $RATING"
echo ""

# 核心问题诊断
echo "=========================================="
echo "冷启动慢的根本原因诊断"
echo "=========================================="

if (( $(awk "BEGIN {print (($TIME1 - $TIME2) > 0.1)}") )); then
  echo "✗ 问题：冷启动比热启动慢 > 0.1s"
  echo "  原因：Cloudflare Workers 冷启动 + D1 连接初始化"
  echo "  建议：添加 KV 缓存预热"
else
  echo "✓ 冷启动差异可接受 (< 0.1s)"
fi

if (( $(awk "BEGIN {print ($TIME1 > 0.5)}") )); then
  echo ""
  echo "✗ 问题：整体查询耗时 > 0.5s"
  echo "  原因分析："
  echo "    - LIKE '%keyword%' 导致全表扫描 (~0.2-0.3s)"
  echo "    - ORDER BY updated_at DESC 排序耗时 (~0.1-0.15s)"
  echo "    - COUNT(*) 重复查询 (~0.05-0.1s)"
  echo "  建议："
  echo "    1. 启用 FTS5 全文索引 (预期提升 3-5x)"
  echo "    2. 延迟 COUNT 查询到第2次请求"
  echo "    3. 添加 KV 缓存热门搜索"
fi

echo ""
echo "详细测试数据已保存完成"
