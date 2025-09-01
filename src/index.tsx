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

// 用户数据类型
type User = {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  role: 'admin' | 'user' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  failed_login_attempts?: number;
  account_locked_until?: string;
}

// 简单密码哈希函数 (生产环境应使用更强的加密)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 验证邮箱格式
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证密码强度
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' };
  }
  return { valid: true };
}

const app = new Hono<{ Bindings: Bindings }>()

// 认证配置
const AUTH_CONFIG = {
  jwtSecret: 'your-jwt-secret-key-2025', // 在生产环境中应使用环境变量
  tokenExpiry: 24 * 60 * 60, // 24小时（秒）
  maxFailedAttempts: 5, // 最大失败登录次数
  lockoutDuration: 30 * 60 // 锁定时长30分钟（秒）
}

// 启用CORS
app.use('/api/*', cors())

// JWT认证中间件
const authMiddleware = async (c: any, next: any) => {
  // 跳过登录、注册和公共API
  const path = c.req.path
  const publicPaths = [
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/search-fields', 
    '/',
    '/register.html'
  ];
  
  if (publicPaths.includes(path) || path.startsWith('/static/')) {
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

// 管理员权限中间件
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  return next();
}

// 应用认证中间件到受保护的API路由
app.use('/api/products*', authMiddleware)
app.use('/api/stats', authMiddleware)
app.use('/api/search', authMiddleware)
// 用户管理API需要认证和管理员权限  
app.use('/api/users', authMiddleware)
app.use('/api/users/*', authMiddleware)

// 静态文件服务
app.use('/static/*', serveStatic({ root: './public' }))

// 认证相关API
app.post('/api/auth/login', async (c) => {
  try {
    const { env } = c;
    const { username, password } = await c.req.json()
    
    if (!username || !password) {
      return c.json({ 
        success: false, 
        error: '用户名和密码不能为空' 
      }, 400)
    }
    
    // 从数据库查询用户
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ? AND status = "active"'
    ).bind(username).first<User>();
    
    if (!user) {
      return c.json({ 
        success: false, 
        error: '用户名或密码错误' 
      }, 401)
    }
    
    // 简化版：直接比较明文密码
    if (password !== user.password) {
      return c.json({ 
        success: false, 
        error: '用户名或密码错误'
      }, 401)
    }
    
    // 生成JWT令牌
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + AUTH_CONFIG.tokenExpiry
    }
    
    const token = await sign(payload, AUTH_CONFIG.jwtSecret)
    
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          last_login: user.last_login
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ 
      success: false, 
      error: '登录失败，请稍后重试' 
    }, 500)
  }
})

// 用户注册API
app.post('/api/auth/register', async (c) => {
  try {
    const { env } = c;
    const { username, email, password, role = 'user' } = await c.req.json();
    
    // 验证输入数据
    if (!username || !email || !password) {
      return c.json({
        success: false,
        error: '用户名、邮箱和密码不能为空'
      }, 400);
    }
    
    // 验证用户名格式
    if (username.length < 3 || username.length > 20) {
      return c.json({
        success: false,
        error: '用户名长度必须在3-20个字符之间'
      }, 400);
    }
    
    // 验证邮箱格式
    if (!validateEmail(email)) {
      return c.json({
        success: false,
        error: '邮箱格式不正确'
      }, 400);
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: passwordValidation.message
      }, 400);
    }
    
    // 验证角色
    const validRoles = ['user', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return c.json({
        success: false,
        error: '无效的用户角色'
      }, 400);
    }
    
    // 检查用户名是否已存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();
    
    if (existingUser) {
      return c.json({
        success: false,
        error: '用户名或邮箱已存在'
      }, 409);
    }
    
    // 加密密码
    const passwordHash = await hashPassword(password);
    
    // 创建用户
    const result = await env.DB.prepare(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, "active")'
    ).bind(username, email, passwordHash, role).run();
    
    return c.json({
      success: true,
      message: '用户注册成功',
      data: {
        userId: result.meta.last_row_id,
        username,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return c.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, 500);
  }
});

// 获取用户列表API（仅管理员）
app.get('/api/users', async (c) => {
  // 验证管理员权限
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  try {
    const { env } = c;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const role = c.req.query('role') || '';
    const status = c.req.query('status') || '';
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    // 获取用户列表
    const users = await env.DB.prepare(
      `SELECT id, username, email, role, status, created_at, last_login, failed_login_attempts 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all<User>();
    
    // 获取总数
    const totalResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM users ${whereClause}`
    ).bind(...params).first<{ count: number }>();
    
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      success: true,
      data: {
        users: users.results,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({
      success: false,
      error: '获取用户列表失败'
    }, 500);
  }
});

// 更新用户信息API（仅管理员）
app.put('/api/users/:id', async (c) => {
  // 验证管理员权限
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  try {
    const { env } = c;
    const userId = c.req.param('id');
    const { email, role, status } = await c.req.json();
    
    // 验证输入
    if (email && !validateEmail(email)) {
      return c.json({
        success: false,
        error: '邮箱格式不正确'
      }, 400);
    }
    
    const validRoles = ['user', 'manager', 'admin'];
    if (role && !validRoles.includes(role)) {
      return c.json({
        success: false,
        error: '无效的用户角色'
      }, 400);
    }
    
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: '无效的用户状态'
      }, 400);
    }
    
    // 检查用户是否存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();
    
    if (!existingUser) {
      return c.json({
        success: false,
        error: '用户不存在'
      }, 404);
    }
    
    // 构建更新SQL
    const updates: string[] = [];
    const params: any[] = [];
    
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (updates.length === 0) {
      return c.json({
        success: false,
        error: '没有提供要更新的字段'
      }, 400);
    }
    
    params.push(userId);
    
    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...params).run();
    
    return c.json({
      success: true,
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({
      success: false,
      error: '更新用户信息失败'
    }, 500);
  }
});

// 删除用户API（仅管理员）
app.delete('/api/users/:id', async (c) => {
  // 验证管理员权限
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  try {
    const { env } = c;
    const userId = c.req.param('id');
    const currentUser = c.get('user');
    
    // 防止删除自己
    if (currentUser.userId == userId) {
      return c.json({
        success: false,
        error: '不能删除自己的账户'
      }, 400);
    }
    
    // 检查用户是否存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();
    
    if (!existingUser) {
      return c.json({
        success: false,
        error: '用户不存在'
      }, 404);
    }
    
    // 软删除：将状态设置为inactive
    await env.DB.prepare(
      'UPDATE users SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(userId).run();
    
    return c.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({
      success: false,
      error: '删除用户失败'
    }, 500);
  }
});

// 重置用户密码API（仅管理员）
app.post('/api/users/:id/reset-password', async (c) => {
  // 验证管理员权限
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  try {
    const { env } = c;
    const userId = c.req.param('id');
    const { newPassword } = await c.req.json();
    
    if (!newPassword) {
      return c.json({
        success: false,
        error: '新密码不能为空'
      }, 400);
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: passwordValidation.message
      }, 400);
    }
    
    // 检查用户是否存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();
    
    if (!existingUser) {
      return c.json({
        success: false,
        error: '用户不存在'
      }, 404);
    }
    
    // 加密新密码
    const passwordHash = await hashPassword(newPassword);
    
    // 更新密码并重置失败登录记录
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, failed_login_attempts = 0, account_locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(passwordHash, userId).run();
    
    return c.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({
      success: false,
      error: '重置密码失败'
    }, 500);
  }
});

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
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
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

// 辅助函数：生成唯一SKU
function generateUniqueSKU(name: string, index: number): string {
  const timestamp = Date.now().toString().slice(-6);
  const namePrefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CONN-${namePrefix || 'PROD'}-${timestamp}-${randomSuffix}`;
}

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
        
        // 智能填充缺失字段
        if (!product.sku) {
          product.sku = generateUniqueSKU(product.name, i);
        }
        
        if (!product.category) {
          product.category = '连接器'; // 默认分类
        }
        
        if (!product.description) {
          product.description = `连接器产品 - ${product.name}`;
        }
        
        // 先检查SKU是否已存在（用于统计）
        let isUpdate = false;
        if (product.sku) {
          const existingProduct = await env.DB.prepare(`
            SELECT id FROM products WHERE sku = ? AND status = 'active'
          `).bind(product.sku).first();
          
          if (existingProduct) {
            isUpdate = true;
            errors.push(`第${i + 1}行: SKU ${product.sku} 已存在，跳过导入`);
            errorCount++;
            continue;
          }
        }
        
        // 使用INSERT OR IGNORE来安全插入，避免约束冲突
        const result = await env.DB.prepare(`
          INSERT OR IGNORE INTO products (name, company_name, price, stock, description, category, sku, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        
        // 检查是否实际插入了记录
        if (result.changes === 0 && product.sku) {
          // 记录未插入，说明存在冲突（但这不应该发生，因为我们已经检查过了）
          errors.push(`第${i + 1}行: SKU ${product.sku} 插入失败，可能存在冲突`);
          errorCount++;
          continue;
        }
        
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

// CSV文本批量导入API
app.post('/api/products/import-csv', async (c) => {
  const { env } = c;
  
  try {
    const { csvData }: { csvData: string } = await c.req.json();
    
    if (!csvData || typeof csvData !== 'string') {
      return c.json({ success: false, error: 'CSV数据格式错误' }, 400);
    }
    
    // 解析CSV数据
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return c.json({ success: false, error: 'CSV文件至少需要包含表头和一行数据' }, 400);
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const products: Product[] = [];
    
    // 验证必须的列是否存在
    const requiredFields = ['name', 'company_name', 'price', 'stock'];
    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        return c.json({ 
          success: false, 
          error: `CSV文件缺少必须的列: ${field}。需要包含: ${requiredFields.join(', ')}` 
        }, 400);
      }
    }
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const product: any = {};
      
      // 映射数据到对应字段
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        if (header === 'price') {
          product[header] = parseFloat(value) || 0;
        } else if (header === 'stock') {
          product[header] = parseInt(value) || 0;
        } else {
          product[header] = value;
        }
      });
      
      // 智能填充缺失字段
      if (!product.sku) {
        product.sku = generateUniqueSKU(product.name, i);
      }
      
      if (!product.category) {
        product.category = '连接器';
      }
      
      if (!product.description) {
        product.description = `连接器产品 - ${product.name}`;
      }
      
      products.push(product);
    }
    
    // 调用现有的批量导入逻辑
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // 验证必填字段
        if (!product.name || !product.company_name || !product.price || product.stock === undefined) {
          errors.push(`第${i + 1}行: 商品名称、公司名称、价格和库存为必填字段`);
          errorCount++;
          continue;
        }
        
        // 检查SKU是否已存在（但允许重复的name作为sku使用）
        let isUpdate = false;
        if (product.sku) {
          const existingProduct = await env.DB.prepare(`
            SELECT id FROM products WHERE sku = ? AND status = 'active'
          `).bind(product.sku).first();
          
          if (existingProduct) {
            // SKU冲突，重新生成一个唯一的SKU
            product.sku = generateUniqueSKU(product.name, Date.now() + i);
          }
        }
        
        // 使用INSERT OR IGNORE来安全插入
        const result = await env.DB.prepare(`
          INSERT INTO products (name, company_name, price, stock, description, category, sku, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        console.error(`Import error for row ${i + 1}:`, error);
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
        errors: errors.slice(0, 10) // 只返回前10个错误
      }
    });
    
  } catch (error) {
    console.error('CSV import error:', error);
    return c.json({ success: false, error: 'CSV导入失败' }, 500);
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
                
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-600">
                        没有账户？
                        <a href="/register" class="text-blue-600 hover:text-blue-700 font-medium">立即注册</a>
                    </p>
                </div>
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
                        <a href="#" onclick="showPage('users')" class="nav-link" id="user-management-link" style="display: none;">
                            <i class="fas fa-users mr-3"></i>用户管理
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

// 注册页面路由  
app.get('/register', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>用户注册 - 商品管理系统</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .form-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
        </style>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                <div class="bg-blue-600 text-white p-6 text-center">
                    <i class="fas fa-user-plus text-3xl mb-2"></i>
                    <h1 class="text-2xl font-bold">用户注册</h1>
                    <p class="text-blue-200 mt-2">创建您的商品管理系统账户</p>
                </div>
                
                <div class="p-6">
                    <form id="registerForm" class="space-y-4">
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-user mr-2"></i>用户名
                            </label>
                            <input type="text" id="username" name="username" 
                                   class="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                   placeholder="请输入用户名（3-20个字符）" required>
                        </div>
                        
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-envelope mr-2"></i>邮箱地址
                            </label>
                            <input type="email" id="email" name="email" 
                                   class="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
                                   placeholder="请输入邮箱地址" required>
                        </div>
                        
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-lock mr-2"></i>密码
                            </label>
                            <div class="relative">
                                <input type="password" id="password" name="password" 
                                       class="form-input w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none"
                                       placeholder="请输入密码（至少6位，包含字母和数字）" required>
                                <button type="button" onclick="togglePassword('password')" 
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i class="fas fa-eye text-gray-400"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-lock mr-2"></i>确认密码
                            </label>
                            <div class="relative">
                                <input type="password" id="confirmPassword" name="confirmPassword" 
                                       class="form-input w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none"
                                       placeholder="请再次输入密码" required>
                                <button type="button" onclick="togglePassword('confirmPassword')" 
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i class="fas fa-eye text-gray-400"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label for="role" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-user-tag mr-2"></i>用户角色
                            </label>
                            <select id="role" name="role" 
                                    class="form-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none">
                                <option value="user">普通用户</option>
                                <option value="manager">管理员</option>
                            </select>
                        </div>
                        
                        <div class="flex items-center">
                            <input type="checkbox" id="agreement" name="agreement" required
                                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                            <label for="agreement" class="ml-2 block text-sm text-gray-700">
                                我同意《用户协议》和《隐私政策》
                            </label>
                        </div>
                        
                        <button type="submit" 
                                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200">
                            <i class="fas fa-user-plus mr-2"></i>注册账户
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center">
                        <p class="text-sm text-gray-600">
                            已有账户？
                            <a href="/" class="text-blue-600 hover:text-blue-700 font-medium">立即登录</a>
                        </p>
                    </div>
                    
                    <div class="mt-4 text-center">
                        <a href="/" class="text-sm text-gray-500 hover:text-gray-700">
                            <i class="fas fa-arrow-left mr-1"></i>返回首页
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 消息提示 -->
        <div id="message" class="fixed top-4 right-4 max-w-sm hidden">
            <div class="bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-red-500"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-gray-700" id="messageText"></p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            function togglePassword(inputId) {
                const input = document.getElementById(inputId);
                const icon = input.nextElementSibling.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
            
            function showMessage(text, type = 'error') {
                const message = document.getElementById('message');
                const messageText = document.getElementById('messageText');
                const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';
                const iconClass = type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-red-500';
                
                message.firstElementChild.className = \`bg-white rounded-lg shadow-lg border-l-4 \${borderColor} p-4\`;
                message.querySelector('i').className = \`fas \${iconClass}\`;
                messageText.textContent = text;
                message.classList.remove('hidden');
                
                setTimeout(() => {
                    message.classList.add('hidden');
                }, 5000);
            }
            
            document.getElementById('registerForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                // 验证密码确认
                if (data.password !== data.confirmPassword) {
                    showMessage('两次输入的密码不一致', 'error');
                    return;
                }
                
                // 验证用户协议
                if (!data.agreement) {
                    showMessage('请先同意用户协议', 'error');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: data.username,
                            email: data.email,
                            password: data.password,
                            role: data.role
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showMessage('注册成功！正在跳转到登录页...', 'success');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2000);
                    } else {
                        showMessage(result.error || '注册失败，请重试', 'error');
                    }
                } catch (error) {
                    console.error('Registration error:', error);
                    showMessage('注册失败，请检查网络连接', 'error');
                }
            });
            
            // 密码强度验证
            document.getElementById('password').addEventListener('input', function(e) {
                const password = e.target.value;
                const feedback = document.createElement('div');
                
                // 移除已有的反馈
                const existingFeedback = e.target.parentNode.parentNode.querySelector('.password-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
                
                if (password.length > 0) {
                    feedback.className = 'password-feedback text-xs mt-1';
                    let message = '';
                    let color = '';
                    
                    if (password.length < 6) {
                        message = '密码长度至少6位';
                        color = 'text-red-500';
                    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
                        message = '密码必须包含字母和数字';
                        color = 'text-orange-500';
                    } else {
                        message = '密码强度良好';
                        color = 'text-green-500';
                    }
                    
                    feedback.className += \` \${color}\`;
                    feedback.textContent = message;
                    e.target.parentNode.parentNode.appendChild(feedback);
                }
            });
        </script>
    </body>
    </html>
  `)
})

export default app