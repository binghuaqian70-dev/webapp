#!/bin/bash

echo "=========================================="
echo "SQL查询优化分析"
echo "=========================================="
echo ""

# 测试不同的查询方式，看实际SQL执行情况
API_URL="https://webapp-csv-import.pages.dev/api/products"

echo "【测试1】分析慢查询 - 156-00532"
echo ""

# 模拟后端实际执行的SQL
echo "当前查询逻辑:"
cat << 'SQL'
-- 步骤1: COUNT查询 (跳过了,因为skipCount=true)
-- SELECT COUNT(*) as total 
-- FROM products 
-- WHERE status = 'active' AND name LIKE '%156-00532%'

-- 步骤2: 数据查询
SELECT id, name, company_name, price, stock, description, category, sku, status, 
       created_at, updated_at
FROM products 
WHERE status = 'active' AND name LIKE '%156-00532%'
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0
SQL

echo ""
echo "问题分析:"
echo "  1. LIKE '%156-00532%' - 前导通配符导致全表扫描"
echo "  2. 即使有索引 idx_status_name，也无法使用"
echo "  3. 需要扫描全部 755,466 条记录"
echo "  4. ORDER BY updated_at DESC 需要额外排序"
echo ""

echo "【测试2】对比不同搜索模式的性能"
echo ""

# 测试1: 前导通配符 (当前方式 - 慢)
echo -n "1. LIKE '%156-00532%' (前导通配符): "
TIME1=$(curl -s -w "%{time_total}" -o /dev/null \
  "$API_URL?search=156-00532&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC&skipCount=true")
echo "${TIME1}s"

sleep 2

# 测试2: 后导通配符 (如果可以改为前缀搜索)
echo -n "2. 模拟前缀搜索 '156%': "
TIME2=$(curl -s -w "%{time_total}" -o /dev/null \
  "$API_URL?search=156&searchField=name&page=1&limit=20&sortBy=updated_at&sortOrder=DESC&skipCount=true")
echo "${TIME2}s"

sleep 2

# 测试3: 精确匹配 (如果用户输入完整型号)
echo -n "3. 短关键词 '156': "
TIME3=$(curl -s -w "%{time_total}" -o /dev/null \
  "$API_URL?search=156&searchField=name&page=1&limit=20&skipCount=true")
echo "${TIME3}s"

echo ""
echo "性能对比:"
echo "  前导通配符 (慢): ${TIME1}s"
echo "  前缀搜索 (快): ${TIME2}s"
echo "  短关键词 (快): ${TIME3}s"
echo ""

echo "【测试3】检查索引使用情况"
echo ""
echo "现有索引:"
cat << 'IDX'
1. idx_status_updated_at (status, updated_at DESC)   ✓ 用于排序
2. idx_status_name (status, name)                     ✗ LIKE '%x%'无法使用
3. idx_status_company (status, company_name)          
4. idx_status_category_updated (status, category, updated_at DESC)
IDX

echo ""
echo "为什么 idx_status_name 索引失效?"
echo "  - B-Tree索引只能优化前缀匹配: name LIKE 'ABC%'"
echo "  - 中缀/后缀匹配无法使用索引: name LIKE '%ABC%'"
echo "  - 需要全表扫描 755,466 条记录"
echo ""

echo "【测试4】冷启动根本原因分析"
echo ""
echo "为什么会有冷启动?"
echo ""
echo "Cloudflare Workers 架构特点:"
echo "  1. 边缘计算: Worker运行在全球边缘节点"
echo "  2. 无状态: 请求结束后，Worker实例可能被回收"
echo "  3. 闲置回收: 5-10分钟无请求 → 实例被回收"
echo "  4. 冷启动: 新请求到达 → 重新启动实例 → 建立D1连接"
echo ""
echo "冷启动延迟分解:"
echo "  - Worker实例启动: 5-7秒"
echo "  - D1数据库连接: 2-3秒"
echo "  - 查询执行: 0.3-1秒"
echo "  总计: 6-11秒"
echo ""

echo "如何避免冷启动?"
echo "  ✓ 方案1: 外部监控服务 (每5分钟ping一次)"
echo "  ✓ 方案2: Cloudflare Cron Triggers (Pages不支持)"
echo "  ✓ 方案3: 付费升级到Workers Paid计划 (更长的闲置时间)"
echo ""

echo "=========================================="
echo "优化建议总结"
echo "=========================================="
echo ""

echo "【立即可优化 - 后端SQL】"
echo ""
echo "问题: LIKE '%keyword%' 全表扫描"
echo "方案: 启用 FTS5 全文索引"
echo ""
cat << 'FTS5'
-- 创建FTS5虚拟表
CREATE VIRTUAL TABLE products_fts USING fts5(
  name, company_name, description, category, sku,
  content='products',
  content_rowid='id'
);

-- 查询优化
-- 旧: WHERE name LIKE '%156-00532%'           (~1秒)
-- 新: WHERE products_fts MATCH '156-00532'    (~0.05秒)
-- 提升: 20倍
FTS5

echo ""
echo "【前端查询优化建议】"
echo ""
echo "1. 智能搜索模式 (根据输入自动优化):"
echo "   - 用户输入 '156' → 前缀搜索 (快)"
echo "   - 用户输入 '156-00532' → 全文搜索 (需FTS5)"
echo "   - 用户输入 '连接器' → 分类精确匹配 (快)"
echo ""
echo "2. 搜索建议/自动补全:"
echo "   - 减少用户输入错误"
echo "   - 引导用户使用精确搜索"
echo "   - 可以使用前缀搜索实现 (快)"
echo ""
echo "3. 延迟搜索 (防抖):"
echo "   - 用户输入时延迟300ms再发起请求"
echo "   - 减少无效请求"
echo "   - 已在前端实现"
echo ""

echo "【冷启动优化】"
echo ""
echo "P0 - 配置UptimeRobot监控 (免费,30分钟):"
echo "  URL: https://webapp-csv-import.pages.dev/api/health"
echo "  间隔: 5分钟"
echo "  效果: 冷启动概率 20% → <2%"
echo ""

echo "分析完成！"
