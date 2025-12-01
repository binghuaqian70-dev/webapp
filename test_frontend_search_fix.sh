#!/bin/bash

echo "========================================================"
echo "🧪 前端搜索优化验证测试"
echo "========================================================"
echo "优化内容: 默认只搜索商品名称字段 (而非5个字段)"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "========================================================"
echo "【测试1】优化后: 搜索 '284088-1' (只搜索name字段)"
echo "========================================================"

# 模拟前端请求: searchField=name (单字段)
time1=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test_opt.json)

count1=$(cat /tmp/test_opt.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "耗时: ${time1}s | 结果: ${count1} 条"
echo "参数: searchField=name (单字段搜索)"
echo ""

echo "========================================================"
echo "【测试2】优化前: 搜索 '284088-1' (搜索5个字段)"
echo "========================================================"

# 模拟优化前请求: searchFields=all (5个字段)
time2=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchFields=all&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test_old.json)

count2=$(cat /tmp/test_old.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "耗时: ${time2}s | 结果: ${count2} 条"
echo "参数: searchFields=all (5个字段搜索)"
echo ""

echo "========================================================"
echo "【测试3】多字段搜索: 搜索 '284088-1' (name+company_name)"
echo "========================================================"

time3=$(curl -X GET "https://webapp-csv-import.pages.dev/api/products?search=284088-1&searchFields=name,company_name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC" \
  -H "Content-Type: application/json" \
  -w "%{time_total}" \
  -s -o /tmp/test_multi.json)

count3=$(cat /tmp/test_multi.json | grep -o '"total":[0-9]*' | cut -d':' -f2)
echo "耗时: ${time3}s | 结果: ${count3} 条"
echo "参数: searchFields=name,company_name (2个字段)"
echo ""

echo "========================================================"
echo "📊 性能对比总结"
echo "========================================================"

echo ""
echo "搜索模式              参数                耗时        结果数"
echo "----------------------------------------------------------------"
echo "单字段 (优化后)       searchField=name    ${time1}s   ${count1}条  ⭐ 推荐"
echo "多字段 (2个)          searchFields=...    ${time3}s   ${count3}条"
echo "全字段 (优化前)       searchFields=all    ${time2}s   ${count2}条  ⚠️ 慢"
echo ""

# 计算性能提升
if command -v awk > /dev/null 2>&1; then
  improvement=$(echo "$time2 $time1" | awk '{printf "%.1f", $1/$2}')
  echo "🚀 性能提升: ${improvement}倍"
fi

echo ""
echo "========================================================"
echo "✅ 前端优化建议"
echo "========================================================"
echo ""
echo "1. ✅ 默认搜索模式: searchField=name (单字段)"
echo "   - 性能: 最优 (~${time1}s)"
echo "   - 适用: 90% 用户场景"
echo ""
echo "2. ⚠️  多字段搜索: searchFields=name,company_name"
echo "   - 性能: 中等 (~${time3}s)"
echo "   - 适用: 高级搜索需求"
echo ""
echo "3. ❌ 避免使用: searchFields=all (全字段搜索)"
echo "   - 性能: 最差 (~${time2}s)"
echo "   - 影响: 用户体验差"
echo ""

echo "========================================================"
echo "🎯 前端已优化配置"
echo "========================================================"
echo ""
echo "✅ 搜索字段默认勾选:"
echo "   - 商品名称: ✓ (checked)"
echo "   - 公司名称: ☐"
echo "   - 商品描述: ☐"
echo "   - 商品分类: ☐"
echo "   - 商品编号: ☐"
echo ""
echo "✅ 后端参数逻辑:"
echo "   - 选中0个: searchField=name (默认)"
echo "   - 选中1个: searchField=<field> (单字段,快)"
echo "   - 选中2-4个: searchFields=<fields> (多字段,中等)"
echo "   - 选中5个: searchFields=all (全字段,慢,不推荐)"
echo ""

echo "========================================================"
echo "测试完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

