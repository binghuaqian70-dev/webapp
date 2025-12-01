#!/bin/bash

echo "========================================================"
echo "🧪 商品管理界面 - 综合搜索性能测试"
echo "========================================================"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "数据库: webapp-csv-import-production (755,466 records)"
echo ""

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 性能评级函数
rate_performance() {
  time=$1
  if (( $(echo "$time < 0.3" | awk '{print ($1 < $2)}') )); then
    echo -e "${GREEN}⭐⭐⭐⭐⭐ 优秀${NC}"
  elif (( $(echo "$time < 0.6" | awk '{print ($1 < $2)}') )); then
    echo -e "${GREEN}⭐⭐⭐⭐ 良好${NC}"
  elif (( $(echo "$time < 1.0" | awk '{print ($1 < $2)}') )); then
    echo -e "${YELLOW}⭐⭐⭐ 一般${NC}"
  elif (( $(echo "$time < 2.0" | awk '{print ($1 < $2)}') )); then
    echo -e "${YELLOW}⭐⭐ 需优化${NC}"
  else
    echo -e "${RED}⭐ 较慢${NC}"
  fi
}

echo "========================================================"
echo "【场景1】精确商品型号搜索 (常用场景)"
echo "========================================================"
echo ""

# 测试1.1: 搜索 284088-1
echo "🔍 测试 1.1: 精确搜索 '284088-1'"
time1_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test1_1.json)
count1_1=$(cat /tmp/test1_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time1_1}s | 结果: ${count1_1} 条 | 评级: $(rate_performance $time1_1)"
echo ""

# 测试1.2: 搜索 12033769
echo "🔍 测试 1.2: 精确搜索 '12033769'"
time1_2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=12033769&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test1_2.json)
count1_2=$(cat /tmp/test1_2.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time1_2}s | 结果: ${count1_2} 条 | 评级: $(rate_performance $time1_2)"
echo ""

# 测试1.3: 搜索 7047-1892-30
echo "🔍 测试 1.3: 精确搜索 '7047-1892-30'"
time1_3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=7047-1892-30&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test1_3.json)
count1_3=$(cat /tmp/test1_3.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time1_3}s | 结果: ${count1_3} 条 | 评级: $(rate_performance $time1_3)"
echo ""

echo "========================================================"
echo "【场景2】模糊搜索 (部分型号)"
echo "========================================================"
echo ""

# 测试2.1: 短关键词 "2840"
echo "🔍 测试 2.1: 模糊搜索 '2840'"
time2_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=2840&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test2_1.json)
count2_1=$(cat /tmp/test2_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time2_1}s | 结果: ${count2_1} 条 | 评级: $(rate_performance $time2_1)"
echo ""

# 测试2.2: 中等关键词 "7047"
echo "🔍 测试 2.2: 模糊搜索 '7047'"
time2_2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=7047&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test2_2.json)
count2_2=$(cat /tmp/test2_2.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time2_2}s | 结果: ${count2_2} 条 | 评级: $(rate_performance $time2_2)"
echo ""

# 测试2.3: 单字符 "1" (压力测试)
echo "🔍 测试 2.3: 模糊搜索 '1' (压力测试)"
time2_3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=1&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test2_3.json 2>/dev/null)
count2_3=$(cat /tmp/test2_3.json | grep -o '"total":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "超时")
echo "   耗时: ${time2_3}s | 结果: ${count2_3} 条 | 评级: $(rate_performance $time2_3)"
echo ""

echo "========================================================"
echo "【场景3】公司名搜索 (高频场景)"
echo "========================================================"
echo ""

# 测试3.1: 搜索 "上海路悠"
echo "🔍 测试 3.1: 公司名 '上海路悠'"
time3_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=上海路悠&searchField=company&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test3_1.json)
count3_1=$(cat /tmp/test3_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time3_1}s | 结果: ${count3_1} 条 | 评级: $(rate_performance $time3_1)"
echo ""

# 测试3.2: 搜索 "深圳"
echo "🔍 测试 3.2: 公司名 '深圳'"
time3_2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=深圳&searchField=company&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test3_2.json)
count3_2=$(cat /tmp/test3_2.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time3_2}s | 结果: ${count3_2} 条 | 评级: $(rate_performance $time3_2)"
echo ""

# 测试3.3: 搜索 "电子科技"
echo "🔍 测试 3.3: 公司名 '电子科技'"
time3_3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=电子科技&searchField=company&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test3_3.json)
count3_3=$(cat /tmp/test3_3.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time3_3}s | 结果: ${count3_3} 条 | 评级: $(rate_performance $time3_3)"
echo ""

echo "========================================================"
echo "【场景4】分类筛选 (业务场景)"
echo "========================================================"
echo ""

# 测试4.1: 分类 "连接器"
echo "🔍 测试 4.1: 分类筛选 '连接器'"
time4_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?category=连接器&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test4_1.json)
count4_1=$(cat /tmp/test4_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time4_1}s | 结果: ${count4_1} 条 | 评级: $(rate_performance $time4_1)"
echo ""

echo "========================================================"
echo "【场景5】价格区间筛选"
echo "========================================================"
echo ""

# 测试5.1: 价格 0.1-1.0
echo "🔍 测试 5.1: 价格区间 0.1-1.0 元"
time5_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?minPrice=0.1&maxPrice=1.0&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test5_1.json)
count5_1=$(cat /tmp/test5_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time5_1}s | 结果: ${count5_1} 条 | 评级: $(rate_performance $time5_1)"
echo ""

echo "========================================================"
echo "【场景6】库存筛选"
echo "========================================================"
echo ""

# 测试6.1: 有库存商品
echo "🔍 测试 6.1: 库存 > 0 的商品"
time6_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?minStock=1&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test6_1.json)
count6_1=$(cat /tmp/test6_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time6_1}s | 结果: ${count6_1} 条 | 评级: $(rate_performance $time6_1)"
echo ""

echo "========================================================"
echo "【场景7】组合查询 (复杂场景)"
echo "========================================================"
echo ""

# 测试7.1: 公司名 + 分类
echo "🔍 测试 7.1: 公司 '上海' + 分类 '连接器'"
time7_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?company=上海&category=连接器&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test7_1.json)
count7_1=$(cat /tmp/test7_1.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time7_1}s | 结果: ${count7_1} 条 | 评级: $(rate_performance $time7_1)"
echo ""

# 测试7.2: 搜索 + 价格区间 + 库存
echo "🔍 测试 7.2: 搜索 '2840' + 价格 0.1-1.0 + 库存 > 0"
time7_2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=2840&searchField=name&minPrice=0.1&maxPrice=1.0&minStock=1&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test7_2.json)
count7_2=$(cat /tmp/test7_2.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "   耗时: ${time7_2}s | 结果: ${count7_2} 条 | 评级: $(rate_performance $time7_2)"
echo ""

echo "========================================================"
echo "【场景8】分页性能 (翻页测试)"
echo "========================================================"
echo ""

# 测试8.1: 第1页
echo "🔍 测试 8.1: 分类 '连接器' - 第1页"
time8_1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?category=连接器&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "   耗时: ${time8_1}s | 评级: $(rate_performance $time8_1)"
echo ""

# 测试8.2: 第10页
echo "🔍 测试 8.2: 分类 '连接器' - 第10页"
time8_2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?category=连接器&page=10&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "   耗时: ${time8_2}s | 评级: $(rate_performance $time8_2)"
echo ""

# 测试8.3: 第100页
echo "🔍 测试 8.3: 分类 '连接器' - 第100页"
time8_3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?category=连接器&page=100&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "   耗时: ${time8_3}s | 评级: $(rate_performance $time8_3)"
echo ""

echo "========================================================"
echo "📊 性能统计总结"
echo "========================================================"
echo ""

# 计算平均性能
echo "各场景平均耗时:"
echo "  场景1 (精确型号): 平均 $(echo "scale=3; ($time1_1 + $time1_2 + $time1_3) / 3" | bc)s"
echo "  场景2 (模糊搜索): 平均 $(echo "scale=3; ($time2_1 + $time2_2) / 2" | bc)s (排除超时测试)"
echo "  场景3 (公司名): 平均 $(echo "scale=3; ($time3_1 + $time3_2 + $time3_3) / 3" | bc)s"
echo "  场景7 (组合查询): 平均 $(echo "scale=3; ($time7_1 + $time7_2) / 2" | bc)s"
echo "  场景8 (分页): 平均 $(echo "scale=3; ($time8_1 + $time8_2 + $time8_3) / 3" | bc)s"
echo ""

echo "性能评级分布:"
excellent=0
good=0
average=0
needs_opt=0
slow=0

for time in $time1_1 $time1_2 $time1_3 $time2_1 $time2_2 $time3_1 $time3_2 $time3_3 $time4_1 $time5_1 $time6_1 $time7_1 $time7_2 $time8_1 $time8_2 $time8_3; do
  if (( $(echo "$time < 0.3" | awk '{print ($1 < $2)}') )); then
    excellent=$((excellent + 1))
  elif (( $(echo "$time < 0.6" | awk '{print ($1 < $2)}') )); then
    good=$((good + 1))
  elif (( $(echo "$time < 1.0" | awk '{print ($1 < $2)}') )); then
    average=$((average + 1))
  elif (( $(echo "$time < 2.0" | awk '{print ($1 < $2)}') )); then
    needs_opt=$((needs_opt + 1))
  else
    slow=$((slow + 1))
  fi
done

total=$((excellent + good + average + needs_opt + slow))

echo "  ⭐⭐⭐⭐⭐ 优秀 (<0.3s): ${excellent}/${total} ($(echo "scale=1; $excellent * 100 / $total" | bc)%)"
echo "  ⭐⭐⭐⭐ 良好 (0.3-0.6s): ${good}/${total} ($(echo "scale=1; $good * 100 / $total" | bc)%)"
echo "  ⭐⭐⭐ 一般 (0.6-1.0s): ${average}/${total} ($(echo "scale=1; $average * 100 / $total" | bc)%)"
echo "  ⭐⭐ 需优化 (1.0-2.0s): ${needs_opt}/${total} ($(echo "scale=1; $needs_opt * 100 / $total" | bc)%)"
echo "  ⭐ 较慢 (>2.0s): ${slow}/${total} ($(echo "scale=1; $slow * 100 / $total" | bc)%)"
echo ""

echo "========================================================"
echo "✅ 综合测试完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

# 清理临时文件
rm -f /tmp/test*.json

