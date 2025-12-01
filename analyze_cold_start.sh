#!/bin/bash

echo "========================================================"
echo "🔍 Cloudflare Workers 冷启动性能分析"
echo "========================================================"
echo "测试商品: 156-00532"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "========================================================"
echo "【测试1】第1次请求 (冷启动)"
echo "========================================================"

time1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "\nDNS解析: %{time_namelookup}s\nTCP连接: %{time_connect}s\nSSL握手: %{time_appconnect}s\n首字节: %{time_starttransfer}s\n总耗时: %{time_total}s\n" \
  -s -o /tmp/cold_test1.json 2>&1)

echo "$time1"
count1=$(cat /tmp/cold_test1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "结果数: ${count1} 条"
echo ""

echo "========================================================"
echo "【等待5秒后】第2次请求 (可能仍在缓存中)"
echo "========================================================"
sleep 5

time2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "\nDNS解析: %{time_namelookup}s\nTCP连接: %{time_connect}s\nSSL握手: %{time_appconnect}s\n首字节: %{time_starttransfer}s\n总耗时: %{time_total}s\n" \
  -s -o /tmp/cold_test2.json 2>&1)

echo "$time2"
count2=$(cat /tmp/cold_test2.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "结果数: ${count2} 条"
echo ""

echo "========================================================"
echo "【等待5秒后】第3次请求 (热启动)"
echo "========================================================"
sleep 5

time3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "\nDNS解析: %{time_namelookup}s\nTCP连接: %{time_connect}s\nSSL握手: %{time_appconnect}s\n首字节: %{time_starttransfer}s\n总耗时: %{time_total}s\n" \
  -s -o /tmp/cold_test3.json 2>&1)

echo "$time3"
count3=$(cat /tmp/cold_test3.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "结果数: ${count3} 条"
echo ""

echo "========================================================"
echo "【等待60秒后】第4次请求 (可能冷启动)"
echo "========================================================"
echo "等待60秒,让Worker进入睡眠状态..."
sleep 60

time4=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "\nDNS解析: %{time_namelookup}s\nTCP连接: %{time_connect}s\nSSL握手: %{time_appconnect}s\n首字节: %{time_starttransfer}s\n总耗时: %{time_total}s\n" \
  -s -o /tmp/cold_test4.json 2>&1)

echo "$time4"
count4=$(cat /tmp/cold_test4.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "结果数: ${count4} 条"
echo ""

echo "========================================================"
echo "📊 冷启动分析总结"
echo "========================================================"
echo ""
echo "测试说明:"
echo "  - 第1次: 首次请求 (极可能冷启动)"
echo "  - 第2-3次: 5秒间隔 (热启动)"
echo "  - 第4次: 60秒后 (可能重新冷启动)"
echo ""
echo "Cloudflare Workers 冷启动原因:"
echo "  1. Worker实例被回收 (闲置一段时间)"
echo "  2. D1数据库连接池冷启动"
echo "  3. TypeScript/Hono框架初始化"
echo "  4. 全球边缘节点初次加载"
echo ""

