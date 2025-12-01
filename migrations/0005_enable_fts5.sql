-- 启用 FTS5 全文索引优化
-- 预期效果: 查询性能提升 10-20 倍

-- 1. 创建 FTS5 虚拟表
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

-- 2. 初始化 FTS5 数据（从主表同步）
INSERT INTO products_fts(rowid, name, company_name, description, category, sku)
SELECT id, name, company_name, description, category, sku 
FROM products 
WHERE status = 'active';

-- 3. 创建触发器：INSERT 时同步到 FTS5
CREATE TRIGGER IF NOT EXISTS products_fts_insert 
AFTER INSERT ON products 
BEGIN
  INSERT INTO products_fts(rowid, name, company_name, description, category, sku)
  VALUES (new.id, new.name, new.company_name, new.description, new.category, new.sku);
END;

-- 4. 创建触发器：UPDATE 时同步到 FTS5
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

-- 5. 创建触发器：DELETE 时从 FTS5 删除
CREATE TRIGGER IF NOT EXISTS products_fts_delete 
AFTER DELETE ON products 
BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;
