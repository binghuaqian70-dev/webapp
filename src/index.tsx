import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// 定义环境绑定类型
type Bindings = {
  DB: D1Database;
}

// 商品数据类型
type Product = {
  id?: number;
  name: string;
  company_name: string;
  price: number;
  stock: number;
  description?: string;
  category?: string;
  sku?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// 启用CORS
app.use('/api/*', cors())

// 静态文件服务
app.use('/static/*', serveStatic({ root: './public' }))

// 分页查询商品 - 支持多字段搜索
app.get('/api/products', async (c) => {
  const { env } = c;
  
  // 获取查询参数
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search') || '';
  const company = c.req.query('company') || '';
  const category = c.req.query('category') || '';
  const minPrice = c.req.query('minPrice') || '';
  const maxPrice = c.req.query('maxPrice') || '';
  const minStock = c.req.query('minStock') || '';
  const sortBy = c.req.query('sortBy') || 'id';
  const sortOrder = c.req.query('sortOrder') || 'DESC';
  
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = "WHERE status = 'active'";
    let params: any[] = [];
    
    // 构建动态WHERE条件
    if (search) {
      whereClause += " AND (name LIKE ? OR company_name LIKE ? OR description LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    if (company) {
      whereClause += " AND company_name LIKE ?";
      params.push(`%${company}%`);
    }
    
    if (category) {
      whereClause += " AND category LIKE ?";
      params.push(`%${category}%`);
    }
    
    if (minPrice) {
      whereClause += " AND price >= ?";
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice) {
      whereClause += " AND price <= ?";
      params.push(parseFloat(maxPrice));
    }
    
    if (minStock) {
      whereClause += " AND stock >= ?";
      params.push(parseInt(minStock));
    }
    
    // 验证排序字段安全性
    const allowedSortFields = ['id', 'name', 'company_name', 'price', 'stock', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    
    // 查询商品数据
    const dataQuery = `
      SELECT id, name, company_name, price, stock, description, category, sku, status, 
             created_at, updated_at
      FROM products 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const result = await env.DB.prepare(dataQuery)
      .bind(...params, limit, offset)
      .all();
    
    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Query products error:', error);
    return c.json({ success: false, error: '查询商品失败' }, 500);
  }
});

// 根据ID获取单个商品
app.get('/api/products/:id', async (c) => {
  const { env } = c;
  const id = c.req.param('id');
  
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND status = 'active'
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: '商品不存在' }, 404);
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ success: false, error: '获取商品失败' }, 500);
  }
});

// 添加新商品
app.post('/api/products', async (c) => {
  const { env } = c;
  
  try {
    const product: Product = await c.req.json();
    
    // 验证必填字段
    if (!product.name || !product.company_name || !product.price || product.stock === undefined) {
      return c.json({ 
        success: false, 
        error: '商品名称、公司名称、价格和库存为必填字段' 
      }, 400);
    }
    
    // 检查SKU唯一性
    if (product.sku) {
      const existingSku = await env.DB.prepare(`
        SELECT id FROM products WHERE sku = ? AND status = 'active'
      `).bind(product.sku).first();
      
      if (existingSku) {
        return c.json({ success: false, error: 'SKU已存在' }, 400);
      }
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO products (name, company_name, price, stock, description, category, sku, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      product.name,
      product.company_name,
      product.price,
      product.stock,
      product.description || '',
      product.category || '',
      product.sku || '',
      product.status || 'active'
    ).run();
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id, ...product }
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ success: false, error: '创建商品失败' }, 500);
  }
});

// 更新商品
app.put('/api/products/:id', async (c) => {
  const { env } = c;
  const id = c.req.param('id');
  
  try {
    const product: Product = await c.req.json();
    
    // 检查商品是否存在
    const existing = await env.DB.prepare(`
      SELECT id FROM products WHERE id = ? AND status = 'active'
    `).bind(id).first();
    
    if (!existing) {
      return c.json({ success: false, error: '商品不存在' }, 404);
    }
    
    // 检查SKU唯一性（排除当前商品）
    if (product.sku) {
      const existingSku = await env.DB.prepare(`
        SELECT id FROM products WHERE sku = ? AND id != ? AND status = 'active'
      `).bind(product.sku, id).first();
      
      if (existingSku) {
        return c.json({ success: false, error: 'SKU已存在' }, 400);
      }
    }
    
    const result = await env.DB.prepare(`
      UPDATE products 
      SET name = ?, company_name = ?, price = ?, stock = ?, 
          description = ?, category = ?, sku = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      product.name,
      product.company_name,
      product.price,
      product.stock,
      product.description || '',
      product.category || '',
      product.sku || '',
      id
    ).run();
    
    return c.json({ success: true, data: { id: parseInt(id), ...product } });
    
  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ success: false, error: '更新商品失败' }, 500);
  }
});

// 删除商品（软删除）
app.delete('/api/products/:id', async (c) => {
  const { env } = c;
  const id = c.req.param('id');
  
  try {
    const result = await env.DB.prepare(`
      UPDATE products SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status = 'active'
    `).bind(id).run();
    
    if (result.changes === 0) {
      return c.json({ success: false, error: '商品不存在' }, 404);
    }
    
    return c.json({ success: true, message: '商品已删除' });
    
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ success: false, error: '删除商品失败' }, 500);
  }
});

// 批量导入商品
app.post('/api/products/batch', async (c) => {
  const { env } = c;
  
  try {
    const { products }: { products: Product[] } = await c.req.json();
    
    if (!Array.isArray(products) || products.length === 0) {
      return c.json({ success: false, error: '商品数据格式错误' }, 400);
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // 批量处理
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // 验证必填字段
        if (!product.name || !product.company_name || !product.price || product.stock === undefined) {
          errors.push(`第${i + 1}行: 商品名称、公司名称、价格和库存为必填字段`);
          errorCount++;
          continue;
        }
        
        // 检查SKU唯一性
        if (product.sku) {
          const existingSku = await env.DB.prepare(`
            SELECT id FROM products WHERE sku = ? AND status = 'active'
          `).bind(product.sku).first();
          
          if (existingSku) {
            errors.push(`第${i + 1}行: SKU ${product.sku} 已存在`);
            errorCount++;
            continue;
          }
        }
        
        await env.DB.prepare(`
          INSERT INTO products (name, company_name, price, stock, description, category, sku, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          product.name,
          product.company_name,
          product.price,
          product.stock,
          product.description || '',
          product.category || '',
          product.sku || '',
          product.status || 'active'
        ).run();
        
        successCount++;
        
      } catch (error) {
        errors.push(`第${i + 1}行: ${error}`);
        errorCount++;
      }
    }
    
    return c.json({
      success: true,
      data: {
        total: products.length,
        successCount,
        errorCount,
        errors
      }
    });
    
  } catch (error) {
    console.error('Batch import error:', error);
    return c.json({ success: false, error: '批量导入失败' }, 500);
  }
});

// 获取统计信息
app.get('/api/stats', async (c) => {
  const { env } = c;
  
  try {
    // 商品总数
    const totalProducts = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM products WHERE status = 'active'
    `).first();
    
    // 总库存
    const totalStock = await env.DB.prepare(`
      SELECT SUM(stock) as total FROM products WHERE status = 'active'
    `).first();
    
    // 总价值
    const totalValue = await env.DB.prepare(`
      SELECT SUM(price * stock) as total FROM products WHERE status = 'active'
    `).first();
    
    // 公司数量
    const totalCompanies = await env.DB.prepare(`
      SELECT COUNT(DISTINCT company_name) as count FROM products WHERE status = 'active'
    `).first();
    
    // 分类统计
    const categories = await env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      WHERE status = 'active' AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    return c.json({
      success: true,
      data: {
        totalProducts: totalProducts?.count || 0,
        totalStock: totalStock?.total || 0,
        totalValue: totalValue?.total || 0,
        totalCompanies: totalCompanies?.count || 0,
        topCategories: categories.results
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ success: false, error: '获取统计信息失败' }, 500);
  }
});

// 全文搜索商品
app.get('/api/search', async (c) => {
  const { env } = c;
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  
  if (!query.trim()) {
    return c.json({ success: false, error: '搜索关键词不能为空' }, 400);
  }
  
  try {
    // 使用FTS5全文搜索
    const result = await env.DB.prepare(`
      SELECT p.id, p.name, p.company_name, p.price, p.stock, p.description, 
             p.category, p.sku, p.status, p.created_at
      FROM products_fts fts
      JOIN products p ON p.id = fts.rowid
      WHERE products_fts MATCH ? AND p.status = 'active'
      ORDER BY bm25(products_fts)
      LIMIT ?
    `).bind(`"${query}"`, limit).all();
    
    return c.json({
      success: true,
      data: result.results,
      query
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ success: false, error: '搜索失败' }, 500);
  }
});

// 主页面
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>商品管理系统</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <div class="min-h-screen flex">
                <!-- 侧边栏 -->
                <div class="w-64 bg-white shadow-lg">
                    <div class="p-6">
                        <h1 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-boxes mr-2 text-blue-600"></i>
                            商品管理系统
                        </h1>
                    </div>
                    <nav class="mt-6">
                        <a href="#" onclick="showPage('dashboard')" class="nav-link active">
                            <i class="fas fa-chart-pie mr-3"></i>数据统计
                        </a>
                        <a href="#" onclick="showPage('products')" class="nav-link">
                            <i class="fas fa-box mr-3"></i>商品管理
                        </a>
                        <a href="#" onclick="showPage('add-product')" class="nav-link">
                            <i class="fas fa-plus mr-3"></i>添加商品
                        </a>
                        <a href="#" onclick="showPage('import')" class="nav-link">
                            <i class="fas fa-upload mr-3"></i>批量导入
                        </a>
                    </nav>
                </div>
                
                <!-- 主内容区 -->
                <div class="flex-1 overflow-hidden">
                    <div class="h-full overflow-y-auto p-8">
                        <div id="page-content">
                            <!-- 内容将通过JavaScript动态加载 -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 加载中的提示 -->
        <div id="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <i class="fas fa-spinner fa-spin text-2xl text-blue-600 mr-3"></i>
                <span>加载中...</span>
            </div>
        </div>
        
        <script src="/static/app-simple.js"></script>
    </body>
    </html>
  `)
})

export default app