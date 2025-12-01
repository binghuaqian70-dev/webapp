#!/bin/bash

echo "======================================"
echo "索引优化后性能验证测试"
echo "执行时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

echo "【优化前基线数据】"
echo "- 精确搜索 '284088-1' + 排序: 27.94秒"
echo "- 模糊搜索 '2840' + 排序: 1.48秒"
echo "- 公司名搜索 '上海路悠': 0.13秒"
echo ""

echo "======================================"
echo "【优化后实测数据】"
echo "======================================"
echo ""

# 测试1: 精确搜索 "284088-1" + 排序 (主要优化目标)
echo "【测试1】精确搜索 '284088-1' + updated_at排序"
for i in {1..3}; do
  time=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
    -H "Content-Type: application/json" \
    -w "%{time_total}" \
    -s -o /dev/null)
  echo "  第${i}次: ${time}s"
done
echo ""

# 测试2: 模糊搜索 "2840"
echo "【测试2】模糊搜索 '2840' + 排序"
time2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=2840&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "  耗时: ${time2}s"
echo ""

# 测试3: 公司名搜索
echo "【测试3】公司名搜索 '上海路悠'"
time3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=上海路悠&searchField=company&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "  耗时: ${time3}s"
echo ""

# 测试4: 分类搜索
echo "【测试4】分类搜索 '连接器' + 排序"
time4=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?category=连接器&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "  耗时: ${time4}s"
echo ""

echo "======================================"
echo "性能对比总结"
echo "======================================"
echo "| 测试场景 | 优化前 | 优化后 | 提升倍数 |"
echo "|---------|--------|--------|---------|"
echo "| 精确搜索+排序 | 27.94s | (见上方3次测试) | TBD |"
echo "| 模糊搜索+排序 | 1.48s  | ${time2}s | TBD |"
echo "| 公司名搜索 | 0.13s  | ${time3}s | TBD |"
echo "| 分类搜索+排序 | 2-5s  | ${time4}s | TBD |"
echo ""

