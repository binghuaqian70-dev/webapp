#!/bin/bash

echo "=========================================="
echo "前端加载性能测试"
echo "=========================================="
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 测试不同的搜索关键词
declare -a keywords=("156-00532" "284088-1" "CONN-123" "12033769" "新商品ABC")

for keyword in "${keywords[@]}"; do
  echo "---"
  echo "测试关键词: $keyword"
  
  # 测试API响应时间
  echo -n "  后端API耗时: "
  time_result=$(curl -s -w "%{time_total}" -o /dev/null \
    "https://webapp-csv-import.pages.dev/api/products?search=$keyword&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC")
  echo "${time_result}s"
  
  # 测试完整响应大小
  echo -n "  响应数据大小: "
  size=$(curl -s "https://webapp-csv-import.pages.dev/api/products?search=$keyword&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" | wc -c)
  echo "$((size / 1024))KB"
  
  sleep 2
done

echo ""
echo "=========================================="
echo "检查可能的前端性能问题"
echo "=========================================="

# 检查前端JS文件大小
echo "前端资源文件大小:"
ls -lh /home/user/webapp/public/static/*.js 2>/dev/null | awk '{print "  " $9 ": " $5}'

echo ""
echo "检查是否有大量DOM操作或内存泄漏的可能..."

# 检查renderProductTable函数的复杂度
echo "renderProductTable 函数代码行数:"
grep -A 100 "function renderProductTable" /home/user/webapp/public/static/app-simple.js | wc -l

