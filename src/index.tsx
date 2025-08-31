import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { jwt, sign, verify } from 'hono/jwt'

// 定义环境绑定类型
type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
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

// 认证配置
const AUTH_CONFIG = {
  username: 'admin',
  password: 'admin',
  jwtSecret: 'your-jwt-secret-key-2025', // 在生产环境中应使用环境变量
  tokenExpiry: '24h'
}

// 启用CORS
app.use('/api/*', cors())

// JWT认证中间件
const authMiddleware = async (c: any, next: any) => {
  // 跳过登录和公共API
  const path = c.req.path
  if (path === '/api/auth/login' || path === '/api/search-fields' || path === '/' || path.startsWith('/static/')) {
    return next()
  }
  
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未授权访问' }, 401)
  }
  
  const token = authHeader.substring(7)
  try {
    const payload = await verify(token, AUTH_CONFIG.jwtSecret)
    c.set('user', payload)
    return next()
  } catch (error) {
    return c.json({ success: false, error: '令牌无效或已过期' }, 401)
  }
}

// 应用认证中间件到受保护的API路由
app.use('/api/products*', authMiddleware)
app.use('/api/stats', authMiddleware)
app.use('/api/search', authMiddleware)

// 静态文件服务
app.use('/static/*', serveStatic({ root: './public' }))

// 认证相关API
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    // 验证用户名和密码
    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
      // 生成JWT令牌
      const payload = {
        username: username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
      }
      
      const token = await sign(payload, AUTH_CONFIG.jwtSecret)
      
      return c.json({
        success: true,
        data: {
          token,
          user: {
            username: username,
            role: 'admin'
          }
        }
      })
    } else {
      return c.json({ 
        success: false, 
        error: '用户名或密码错误' 
      }, 401)
    }
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ 
      success: false, 
      error: '登录失败，请检查输入格式' 
    }, 400)
  }
})

// 验证令牌API
app.get('/api/auth/verify', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未提供令牌' }, 401)
  }
  
  const token = authHeader.substring(7)
  try {
    const payload = await verify(token, AUTH_CONFIG.jwtSecret)
    return c.json({
      success: true,
      data: {
        user: {
          username: payload.username,
          role: payload.role
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: '令牌无效或已过期' }, 401)
  }
})

// 登出API（客户端处理，服务端返回成功）
app.post('/api/auth/logout', (c) => {
  return c.json({
    success: true,
    message: '登出成功'
  })
})

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
    
    // 构建动态WHERE条件 - 支持多字段搜索
    if (search) {
      // 获取搜索字段参数，默认搜索所有字段
      const searchFields = c.req.query('searchFields') || 'all';
      const searchPattern = `%${search}%`;
      
      if (searchFields === 'all') {
        // 搜索所有字段
        whereClause += " AND (name LIKE ? OR company_name LIKE ? OR description LIKE ? OR category LIKE ? OR sku LIKE ?)";
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      } else {
        // 搜索指定字段
        const fields = searchFields.split(',');
        const validFields = ['name', 'company_name', 'description', 'category', 'sku'];
        const fieldConditions = [];
        
        fields.forEach(field => {
          if (validFields.includes(field.trim())) {
            fieldConditions.push(`${field.trim()} LIKE ?`);
            params.push(searchPattern);
          }
        });
        
        if (fieldConditions.length > 0) {
          whereClause += " AND (" + fieldConditions.join(' OR ') + ")";
        }
      }
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

// 获取搜索字段信息
app.get('/api/search-fields', async (c) => {
  const { env } = c;
  
  try {
    // 获取各字段的统计信息
    const fieldStats = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT company_name) as unique_companies,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(DISTINCT SUBSTR(sku, 1, 3)) as sku_prefixes
      FROM products WHERE status = 'active'
    `).first();
    
    return c.json({
      success: true,
      data: {
        searchableFields: [
          { field: 'name', label: '商品名称', description: '搜索商品名称' },
          { field: 'company_name', label: '公司名称', description: `搜索 ${fieldStats?.unique_companies || 0} 家公司` },
          { field: 'description', label: '商品描述', description: '搜索商品详细描述' },
          { field: 'category', label: '商品分类', description: `搜索 ${fieldStats?.unique_categories || 0} 个分类` },
          { field: 'sku', label: '商品编号', description: `搜索商品SKU编号` }
        ],
        searchModes: [
          { mode: 'all', label: '全字段搜索', description: '在所有字段中搜索关键词' },
          { mode: 'specific', label: '指定字段搜索', description: '在选定的字段中搜索' }
        ]
      }
    });
    
  } catch (error) {
    console.error('Get search fields error:', error);
    return c.json({ success: false, error: '获取搜索字段信息失败' }, 500);
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

// 全文搜索商品 - 支持字段指定搜索
app.get('/api/search', async (c) => {
  const { env } = c;
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  const searchFields = c.req.query('searchFields') || 'all';
  
  if (!query.trim()) {
    return c.json({ success: false, error: '搜索关键词不能为空' }, 400);
  }
  
  try {
    let ftsQuery = `"${query}"`;
    
    // 如果指定了搜索字段，构建字段特定的FTS查询
    if (searchFields !== 'all') {
      const fields = searchFields.split(',');
      const validFields = ['name', 'company_name', 'description'];
      const fieldQueries = [];
      
      fields.forEach(field => {
        if (validFields.includes(field.trim())) {
          fieldQueries.push(`${field.trim()}:"${query}"`);
        }
      });
      
      if (fieldQueries.length > 0) {
        ftsQuery = fieldQueries.join(' OR ');
      }
    }
    
    // 使用FTS5全文搜索
    const result = await env.DB.prepare(`
      SELECT p.id, p.name, p.company_name, p.price, p.stock, p.description, 
             p.category, p.sku, p.status, p.created_at
      FROM products_fts fts
      JOIN products p ON p.id = fts.rowid
      WHERE products_fts MATCH ? AND p.status = 'active'
      ORDER BY bm25(products_fts)
      LIMIT ?
    `).bind(ftsQuery, limit).all();
    
    return c.json({
      success: true,
      data: result.results,
      query,
      searchFields,
      ftsQuery
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ success: false, error: '搜索失败' }, 500);
  }
});

// 测试登录页面
app.get('/test', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login Test</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="p-8">
        <h1 class="text-2xl mb-4">Login Test</h1>
        <form id="test-form" class="space-y-4">
            <div>
                <label class="block">Username:</label>
                <input type="text" id="test-username" value="admin" class="border p-2 rounded">
            </div>
            <div>
                <label class="block">Password:</label>
                <input type="password" id="test-password" value="admin" class="border p-2 rounded">
            </div>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Test Login</button>
        </form>
        <div id="test-result" class="mt-4"></div>
        
        <script>
        document.getElementById('test-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('test-username').value;
            const password = document.getElementById('test-password').value;
            
            console.log('Testing login with:', username, password);
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(r => r.json())
            .then(data => {
                console.log('Login result:', data);
                document.getElementById('test-result').innerHTML = 
                    '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            })
            .catch(err => {
                console.error('Error:', err);
                document.getElementById('test-result').innerHTML = 
                    '<p class="text-red-500">Error: ' + err.message + '</p>';
            });
        });
        </script>
    </body>
    </html>
  `)
})

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
        <!-- 登录页面 -->
        <div id="login-page" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <div class="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-boxes text-4xl text-blue-600 mb-4"></i>
                    <h1 class="text-2xl font-bold text-gray-800">商品管理系统</h1>
                    <p class="text-gray-600 mt-2">请登录以继续使用</p>
                </div>
                
                <form id="login-form" class="space-y-6" onsubmit="return handleLogin(event)">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                        <input type="text" id="username" class="form-input" placeholder="请输入用户名" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                        <input type="password" id="password" class="form-input" placeholder="请输入密码" required>
                    </div>
                    
                    <button type="submit" class="w-full btn-primary justify-center">
                        <i class="fas fa-sign-in-alt mr-2"></i>登录
                    </button>
                    
                    <div id="loginError" class="hidden text-red-600 text-sm text-center"></div>
                </form>
                

            </div>
        </div>
        
        <!-- 主应用页面 -->
        <div id="main-app" class="hidden">
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
                    
                    <!-- 用户信息和登出 -->
                    <div class="absolute bottom-0 w-64 p-6 border-t border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <i class="fas fa-user-circle text-2xl text-gray-600 mr-3"></i>
                                <span id="username-display" class="text-sm text-gray-700">admin</span>
                            </div>
                            <button onclick="handleLogout()" class="text-gray-500 hover:text-red-600" title="登出">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
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