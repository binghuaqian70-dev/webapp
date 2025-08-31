-- 商品表结构，支持2万条数据的高效查询
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 商品名
  company_name TEXT NOT NULL,            -- 公司名  
  price DECIMAL(10,2) NOT NULL,          -- 售价
  stock INTEGER NOT NULL DEFAULT 0,      -- 库存
  description TEXT,                      -- 商品描述
  category TEXT,                         -- 商品分类
  sku TEXT UNIQUE,                       -- 商品编号
  status TEXT DEFAULT 'active',          -- 商品状态：active/inactive
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为高频查询字段创建索引，优化2万条数据的检索性能
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 复合索引用于复杂查询
CREATE INDEX IF NOT EXISTS idx_products_company_category ON products(company_name, category);
CREATE INDEX IF NOT EXISTS idx_products_price_stock ON products(price, stock);

-- 全文搜索索引（SQLite FTS5）用于商品名和公司名的模糊搜索
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name, 
  company_name, 
  description,
  content='products',
  content_rowid='id'
);

-- 触发器：插入时同步到FTS表
CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, company_name, description) 
  VALUES (new.id, new.name, new.company_name, new.description);
END;

-- 触发器：更新时同步到FTS表
CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
  UPDATE products_fts SET 
    name = new.name, 
    company_name = new.company_name, 
    description = new.description
  WHERE rowid = new.id;
END;

-- 触发器：删除时同步到FTS表
CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;