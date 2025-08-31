-- 修复远程数据库结构以匹配代码期望
-- 添加缺失的status字段
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active';

-- 创建新的临时表，使用正确的字段名
CREATE TABLE products_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  sku TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 从旧表复制数据到新表，处理字段名差异
INSERT INTO products_new (id, name, company_name, price, stock, description, category, sku, status, created_at, updated_at)
SELECT id, name, company as company_name, price, stock, description, category, sku, 'active' as status, created_at, updated_at
FROM products;

-- 删除旧表
DROP TABLE products;

-- 重命名新表
ALTER TABLE products_new RENAME TO products;

-- 重新创建索引
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_products_company_category ON products(company_name, category);
CREATE INDEX IF NOT EXISTS idx_products_price_stock ON products(price, stock);