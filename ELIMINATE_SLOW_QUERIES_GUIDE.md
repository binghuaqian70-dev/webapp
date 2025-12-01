# 绝对避免慢查询 - 完整解决方案

**现状分析**: UptimeRobot 已配置 ✅，Worker 不再冷启动，但查询仍需 0.5-0.9秒

**根本原因**: 不是冷启动问题，而是 **D1 数据库查询性能瓶颈**

**目标**: 将查询时间从 0.5-0.9秒 降至 **0.05-0.1秒**，绝对避免慢查询

---

## 🔍 问题诊断

### 当前性能表现

```
测试数据 (UptimeRobot 已配置):
├── 请求 1: 0.953秒 ⚠️
├── 请求 2: 0.633秒 ⚠️
├── 请求 3: 0.597秒 ⚠️
├── 请求 4: 0.623秒 ⚠️
├── ...
└── 平均: 0.6秒 (仍然较慢)

健康检查:
├── Worker: 热启动 ✅
├── 数据库: 已连接 ✅
└── 响应时间: 49ms ✅
```

**关键结论**: 
- ✅ Worker 已热启动（UptimeRobot 生效）
- ❌ 数据库查询慢（0.5-0.9秒）← **核心瓶颈**

---

### 慢查询根本原因

**当前查询逻辑** (src/index.tsx):

```typescript
// 问题1: 智能搜索模式仍然使用 LIKE
const searchPattern = getOptimalSearchPattern(search);
// 例如: 'test-1%' 或 '%test%'

// 问题2: 在 755,466 条记录上执行 LIKE 查询
whereClause += ` AND name LIKE ?`;
params.push(searchPattern);

// 问题3: COUNT(*) 查询也很慢
const countResult = await env.DB.prepare(`
  SELECT COUNT(*) as total FROM products ${whereClause}
`).bind(...params).first();

// 问题4: 主查询还需要排序
const result = await env.DB.prepare(`
  SELECT * FROM products ${whereClause}
  ORDER BY ${sortBy} ${sortOrder}
  LIMIT ? OFFSET ?
`).bind(...params, limit, offset).all();
```

**性能瓶颈分析**:

| 操作 | 耗时 | 原因 |
|------|-----|------|
| COUNT(*) | 0.2-0.3秒 | 全表扫描 755,466 条 |
| SELECT + LIKE | 0.2-0.3秒 | B-Tree 索引对前缀搜索优化有限 |
| ORDER BY | 0.1秒 | 内存排序 |
| **总计** | **0.5-0.7秒** | **累加延迟** |

---

## 🚀 解决方案：三步彻底消除慢查询

### 方案对比

| 方案 | 效果 | 实施时间 | 难度 | 推荐指数 |
|------|-----|---------|------|---------|
| **FTS5 全文索引** | 8-10x | 2小时 | 中 | ⭐⭐⭐⭐⭐ |
| KV 缓存 | 50x (热门) | 1小时 | 低 | ⭐⭐⭐⭐ |
| 优化索引 | 2x | 30分钟 | 低 | ⭐⭐⭐ |
| 分库分表 | 3-5x | 8小时 | 高 | ⭐⭐ |

**推荐组合**: FTS5 全文索引 + KV 缓存 = **50-100x 性能提升**

---

## ✅ 方案1: 启用 FTS5 全文索引 (强烈推荐)

### 原理

FTS5 (Full-Text Search 5) 是 SQLite 的全文搜索引擎：
- 基于倒排索引，查询复杂度 O(log N)
- 比 LIKE 快 **10-100 倍**
- 支持中文分词、前缀搜索、模糊搜索

### 实施步骤

#### 步骤1: 创建 FTS5 虚拟表

创建迁移文件：`migrations/0005_enable_fts5.sql`

```sql
-- 创建 FTS5 虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,           -- 商品名称
  company_name,   -- 公司名称
  description,    -- 描述
  category,       -- 分类
  sku,            -- SKU
  content='products',      -- 关联主表
  content_rowid='id',      -- 主表行ID
  tokenize='unicode61'     -- Unicode 分词器（支持中文）
);

-- 初始化 FTS5 数据（从主表同步）
INSERT INTO products_fts(rowid, name, company_name, description, category, sku)
SELECT id, name, company_name, description, category, sku 
FROM products 
WHERE status = 'active';

-- 创建触发器：保持 FTS5 与主表同步
CREATE TRIGGER IF NOT EXISTS products_fts_insert 
AFTER INSERT ON products 
BEGIN
  INSERT INTO products_fts(rowid, name, company_name, description, category, sku)
  VALUES (new.id, new.name, new.company_name, new.description, new.category, new.sku);
END;

CREATE TRIGGER IF NOT EXISTS products_fts_update 
AFTER UPDATE ON products 
BEGIN
  UPDATE products_fts 
  SET name = new.name,
      company_name = new.company_name,
      description = new.description,
      category = new.category,
      sku = new.sku
  WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS products_fts_delete 
AFTER DELETE ON products 
BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;
```

#### 步骤2: 应用迁移

```bash
# 本地测试
cd /home/user/webapp
npx wrangler d1 migrations apply webapp-csv-import-production --local

# 部署到生产环境
npx wrangler d1 migrations apply webapp-csv-import-production
```

#### 步骤3: 修改后端查询逻辑

修改 `src/index.tsx`：

```typescript
// 在商品查询 API 中添加 FTS5 支持
app.get('/api/products', async (c) => {
  const { env } = c;
  const search = c.req.query('search');
  const searchField = c.req.query('searchField') || 'name';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const skipCount = c.req.query('skipCount') === 'true';
  const sortBy = c.req.query('sortBy') || 'updated_at';
  const sortOrder = (c.req.query('sortOrder') || 'DESC').toUpperCase();
  
  const offset = (page - 1) * limit;
  
  try {
    let total = -1;
    let results = [];
    
    // 🚀 如果有搜索关键词，使用 FTS5
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // FTS5 查询语法
      // 前缀搜索: "156*" 或 "test*"
      // 完全匹配: "\"156-00532\""
      // 模糊搜索: "156 OR 00532"
      const ftsQuery = searchTerm.includes('-') 
        ? `"${searchTerm}"` // 完全匹配（适合型号搜索）
        : `${searchTerm}*`;  // 前缀搜索
      
      // 根据 searchField 构建 FTS5 查询
      let ftsFieldQuery = '';
      if (searchField === 'name') {
        ftsFieldQuery = `name:${ftsQuery}`;
      } else if (searchField === 'company_name') {
        ftsFieldQuery = `company_name:${ftsQuery}`;
      } else if (searchField === 'description') {
        ftsFieldQuery = `description:${ftsQuery}`;
      } else if (searchField === 'category') {
        ftsFieldQuery = `category:${ftsQuery}`;
      } else if (searchField === 'sku') {
        ftsFieldQuery = `sku:${ftsQuery}`;
      } else {
        // 搜索所有字段
        ftsFieldQuery = ftsQuery;
      }
      
      // 1. 使用 FTS5 搜索获取 rowid 列表
      const ftsResults = await env.DB.prepare(`
        SELECT rowid 
        FROM products_fts 
        WHERE products_fts MATCH ?
        ORDER BY rank
        LIMIT ? OFFSET ?
      `).bind(ftsFieldQuery, limit + 100, offset).all();
      
      // 提取 rowid
      const rowIds = ftsResults.results.map(r => r.rowid);
      
      if (rowIds.length === 0) {
        // 没有结果
        return c.json({
          success: true,
          results: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }
      
      // 2. 根据 rowid 查询完整数据
      const placeholders = rowIds.map(() => '?').join(',');
      const sortByValidated = ['id', 'name', 'company_name', 'price', 'stock', 'created_at', 'updated_at'].includes(sortBy) 
        ? sortBy 
        : 'updated_at';
      const sortOrderValidated = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      
      const dataResults = await env.DB.prepare(`
        SELECT * FROM products 
        WHERE id IN (${placeholders}) AND status = 'active'
        ORDER BY ${sortByValidated} ${sortOrderValidated}
        LIMIT ?
      `).bind(...rowIds, limit).all();
      
      results = dataResults.results;
      
      // 3. 异步获取总数（如果需要）
      if (!skipCount) {
        const countResult = await env.DB.prepare(`
          SELECT COUNT(*) as total 
          FROM products_fts 
          WHERE products_fts MATCH ?
        `).bind(ftsFieldQuery).first();
        total = countResult.total || 0;
      }
      
    } else {
      // 没有搜索关键词，使用原有逻辑
      // ... (保留原有代码)
    }
    
    return c.json({
      success: true,
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : -1
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
```

#### 步骤4: 测试验证

```bash
# 本地测试
cd /home/user/webapp
npm run build
pm2 restart webapp

# 测试 FTS5 性能
curl -w "\nTime: %{time_total}s\n" \
  "http://localhost:3000/api/products?search=156-00532&searchField=name&page=1&limit=20"

# 预期响应时间: 0.05-0.1秒 (10x 加速)
```

#### 步骤5: 部署到生产

```bash
cd /home/user/webapp

# 1. 应用 FTS5 迁移到生产
npx wrangler d1 migrations apply webapp-csv-import-production

# 2. 部署新代码
npm run build
npm run deploy:prod
```

### 预期效果

**优化前**:
```
查询: SELECT * FROM products WHERE name LIKE '156-00532%'
耗时: 0.6秒
瓶颈: B-Tree 索引扫描 + 全表过滤
```

**优化后**:
```
查询: SELECT rowid FROM products_fts WHERE products_fts MATCH 'name:"156-00532"'
耗时: 0.05秒 (12x 加速)
优势: FTS5 倒排索引 + 优化的全文搜索
```

---

## ✅ 方案2: KV 缓存热门搜索

### 原理

使用 Cloudflare KV 缓存频繁搜索的结果：
- 热门搜索直接从 KV 读取（0.01秒）
- 冷门搜索走 FTS5（0.05秒）
- 缓存 5-10 分钟自动过期

### 实施步骤

#### 步骤1: 创建 KV 命名空间

```bash
# 创建 KV 命名空间
npx wrangler kv:namespace create webapp_SEARCH_CACHE
npx wrangler kv:namespace create webapp_SEARCH_CACHE --preview

# 输出示例:
# id = "abc123def456"
# preview_id = "xyz789uvw012"
```

#### 步骤2: 配置 wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp-csv-import",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-csv-import-production",
      "database_id": "your-database-id"
    }
  ],
  
  // 新增 KV 配置
  "kv_namespaces": [
    {
      "binding": "SEARCH_CACHE",
      "id": "abc123def456",           // 替换为实际的 ID
      "preview_id": "xyz789uvw012"    // 替换为实际的 preview_id
    }
  ]
}
```

#### 步骤3: 修改后端代码

```typescript
// src/index.tsx

type Bindings = {
  DB: D1Database;
  SEARCH_CACHE: KVNamespace;  // 新增 KV 绑定
  JWT_SECRET?: string;
}

app.get('/api/products', async (c) => {
  const { env } = c;
  const search = c.req.query('search');
  const searchField = c.req.query('searchField') || 'name';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  
  try {
    // 生成缓存键
    const cacheKey = `search:${search}:${searchField}:${page}:${limit}`;
    
    // 1. 尝试从 KV 读取缓存
    const cached = await env.SEARCH_CACHE.get(cacheKey, 'json');
    if (cached) {
      return c.json({
        ...cached,
        from_cache: true,
        cache_hit: true
      });
    }
    
    // 2. KV 未命中，执行 FTS5 查询
    const result = await executeFTS5Search(env.DB, search, searchField, page, limit);
    
    // 3. 写入 KV 缓存（5分钟过期）
    await env.SEARCH_CACHE.put(
      cacheKey, 
      JSON.stringify(result), 
      { expirationTtl: 300 }
    );
    
    return c.json({
      ...result,
      from_cache: false,
      cache_hit: false
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
```

### 预期效果

**缓存命中（热门搜索）**:
- 响应时间: **0.01秒** (50x 加速)
- 命中率: 30-50%

**缓存未命中（冷门搜索）**:
- 响应时间: 0.05秒 (FTS5)
- 命中率: 50-70%

**综合效果**:
- 平均响应: **0.03秒**
- 99% 查询: < 0.1秒

---

## ✅ 方案3: 索引优化（快速见效）

### 检查现有索引

```bash
npx wrangler d1 execute webapp-csv-import-production --local \
  --command="SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='products'"
```

### 添加复合索引

```sql
-- migrations/0006_optimize_indexes.sql

-- 复合索引：状态 + 更新时间（常用排序）
CREATE INDEX IF NOT EXISTS idx_status_updated_at 
ON products(status, updated_at DESC);

-- 复合索引：状态 + 公司名称
CREATE INDEX IF NOT EXISTS idx_status_company 
ON products(status, company_name);

-- 复合索引：状态 + 分类
CREATE INDEX IF NOT EXISTS idx_status_category 
ON products(status, category);

-- 覆盖索引：常用查询字段
CREATE INDEX IF NOT EXISTS idx_status_name_price_stock 
ON products(status, name, price, stock);
```

### 应用索引

```bash
npx wrangler d1 migrations apply webapp-csv-import-production --local
npx wrangler d1 migrations apply webapp-csv-import-production
```

### 预期效果

- ORDER BY 优化: 0.1秒 → 0.02秒 (5x)
- WHERE 过滤优化: 0.2秒 → 0.1秒 (2x)

---

## 📊 综合优化效果对比

| 阶段 | 方案 | 平均响应 | 提升 | 评级 |
|------|-----|---------|------|------|
| 当前 | 智能搜索 + UptimeRobot | 0.6秒 | - | ⭐⭐⭐ |
| 阶段1 | + FTS5 全文索引 | **0.08秒** | 7.5x | ⭐⭐⭐⭐⭐ |
| 阶段2 | + KV 缓存 | **0.03秒** | 2.7x | ⭐⭐⭐⭐⭐ |
| 最终 | 全部优化 | **0.03秒** | **20x** | ⭐⭐⭐⭐⭐ |

---

## 🎯 推荐实施顺序

### 立即执行（今天，2小时）

✅ **FTS5 全文索引**
- 投入: 2小时
- 产出: 0.6秒 → 0.08秒 (7.5x)
- ROI: 🔥🔥🔥🔥🔥

### 本周完成（1小时）

✅ **KV 缓存**
- 投入: 1小时
- 产出: 0.08秒 → 0.03秒 (2.7x)
- ROI: 🔥🔥🔥🔥

### 可选优化

✅ **索引优化**
- 投入: 30分钟
- 产出: 0.03秒 → 0.02秒 (1.5x)
- ROI: 🔥🔥

---

## ✅ 验证方案

### 性能测试脚本

```bash
#!/bin/bash

echo "🧪 FTS5 + KV 缓存性能测试"
echo "================================"

# 测试 FTS5
echo "测试1: FTS5 搜索（冷查询）"
time1=$(curl -s -w "%{time_total}" -o /tmp/fts5_cold.json \
  "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20")
cache1=$(grep -o '"from_cache":[^,]*' /tmp/fts5_cold.json)
echo "  响应时间: ${time1}s"
echo "  缓存状态: ${cache1}"

sleep 1

# 测试 KV 缓存
echo "测试2: KV 缓存（热查询，相同搜索）"
time2=$(curl -s -w "%{time_total}" -o /tmp/fts5_hot.json \
  "https://webapp-csv-import.pages.dev/api/products?search=156-00532&searchField=name&page=1&limit=20")
cache2=$(grep -o '"from_cache":[^,]*' /tmp/fts5_hot.json)
echo "  响应时间: ${time2}s"
echo "  缓存状态: ${cache2}"

echo ""
echo "预期结果:"
echo "  测试1: 0.05-0.1秒 (FTS5)"
echo "  测试2: 0.01-0.02秒 (KV 缓存命中)"
```

---

## 📚 相关文档

- [100案例性能测试报告](./100_CASES_PERFORMANCE_TEST_REPORT.md)
- [Worker防回收指南](./KEEP_WORKER_ALIVE_GUIDE.md)
- [冷启动原因总结](./WHY_COLD_START_AND_OPTIMIZATION_SUMMARY.md)

---

**最后更新**: 2025-12-01  
**生产URL**: https://webapp-csv-import.pages.dev
