-- 启用 FTS5 全文索引优化（简化版本，只索引 name 和 company_name）
-- 预期效果: 查询性能提升 10-20 倍

-- 1. 创建 FTS5 虚拟表（仅索引 name 和 company_name）
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,           -- 商品名称
  company_name,   -- 公司名称
  content='products',      -- 关联主表
  content_rowid='id',      -- 主表行ID
  tokenize='unicode61'     -- Unicode 分词器（支持中文）
);

-- 2. 初始化 FTS5 数据（从主表同步）
INSERT INTO products_fts(rowid, name, company_name)
SELECT id, name, company_name
FROM products;

-- 3. 创建触发器：INSERT 时同步到 FTS5
CREATE TRIGGER IF NOT EXISTS products_fts_insert 
AFTER INSERT ON products 
BEGIN
  INSERT INTO products_fts(rowid, name, company_name)
  VALUES (new.id, new.name, new.company_name);
END;

-- 4. 创建触发器：UPDATE 时同步到 FTS5
CREATE TRIGGER IF NOT EXISTS products_fts_update 
AFTER UPDATE ON products 
BEGIN
  UPDATE products_fts 
  SET name = new.name,
      company_name = new.company_name
  WHERE rowid = new.id;
END;

-- 5. 创建触发器：DELETE 时从 FTS5 删除
CREATE TRIGGER IF NOT EXISTS products_fts_delete 
AFTER DELETE ON products 
BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;
