#!/bin/bash

echo "======================================"
echo "商品搜索性能测试报告 (2025-12-01)"
echo "======================================"
echo ""

# 测试1: 精确搜索 "284088-1" (当前用户场景)
echo "【测试1】精确搜索 '284088-1'"
time1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "耗时: ${time1}s"
echo ""

# 测试2: 模糊搜索 "2840" (短关键词)
echo "【测试2】模糊搜索 '2840'"
time2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=2840&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "耗时: ${time2}s"
echo ""

# 测试3: 按ID搜索 (最快)
echo "【测试3】按ID搜索 '733913'"
time3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products/733913" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "耗时: ${time3}s"
echo ""

# 测试4: 无排序搜索 (对比排序影响)
echo "【测试4】精确搜索 '284088-1' (无排序)"
time4=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchField=name&page=1&limit=20" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "耗时: ${time4}s"
echo ""

# 测试5: 公司名搜索 (对比不同字段)
echo "【测试5】公司名搜索 '上海路悠'"
time5=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=上海路悠&searchField=company&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /dev/null)
echo "耗时: ${time5}s"
echo ""

echo "======================================"
echo "性能对比总结:"
echo "======================================"
echo "精确搜索+排序: ${time1}s ⭐ (当前用户场景)"
echo "模糊搜索+排序: ${time2}s"
echo "ID直接查询:    ${time3}s"
echo "精确搜索无排序: ${time4}s"
echo "公司名搜索:    ${time5}s"
echo ""
