#!/bin/bash

echo "========================================================"
echo "🔍 前端搜索冷启动性能分析"
echo "========================================================"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "========================================================"
echo "【测试1】冷启动 - 第1次搜索"
echo "========================================================"

result1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "DNS:%{time_namelookup}s|TCP:%{time_connect}s|SSL:%{time_appconnect}s|TTFB:%{time_starttransfer}s|Total:%{time_total}s" \
  -s -o /tmp/test1.json)

echo "$result1"
count1=$(cat /tmp/test1.json | grep -o '"total":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
echo "结果数: ${count1} 条"
echo ""

echo "【等待3秒】"
sleep 3

echo "========================================================"
echo "【测试2】热启动 - 第2次搜索 (3秒后)"
echo "========================================================"

result2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "DNS:%{time_namelookup}s|TCP:%{time_connect}s|SSL:%{time_appconnect}s|TTFB:%{time_starttransfer}s|Total:%{time_total}s" \
  -s -o /tmp/test2.json)

echo "$result2"
count2=$(cat /tmp/test2.json | grep -o '"total":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
echo "结果数: ${count2} 条"
echo ""

echo "【等待3秒】"
sleep 3

echo "========================================================"
echo "【测试3】热启动 - 第3次搜索 (6秒后)"
echo "========================================================"

result3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "DNS:%{time_namelookup}s|TCP:%{time_connect}s|SSL:%{time_appconnect}s|TTFB:%{time_starttransfer}s|Total:%{time_total}s" \
  -s -o /tmp/test3.json)

echo "$result3"
count3=$(cat /tmp/test3.json | grep -o '"total":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
echo "结果数: ${count3} 条"
echo ""

