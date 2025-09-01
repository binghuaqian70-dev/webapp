# 智能CSV导入商品管理系统

## 项目概述
- **名称**: 智能CSV导入商品管理系统  
- **目标**: 支持4列最简CSV格式的智能批量导入，自动补全缺失字段
- **主要功能**: 商品管理、用户管理、智能CSV批量导入、SKU自动生成

## 🌐 线上地址
- **生产环境**: https://5fefc5e6.webapp-csv-import.pages.dev
- **智能导入页面**: https://5fefc5e6.webapp-csv-import.pages.dev/static/smart-csv-import.html
- **GitHub仓库**: https://github.com/binghuaqian70-dev/webapp

## 🚀 核心功能

### 1. 智能CSV导入
- ✅ **最简4列格式支持**: `name,company_name,price,stock`
- ✅ **智能字段补全**: 自动生成SKU、分类、描述
- ✅ **唯一SKU生成**: 格式`CONN-{NAME}-{TIMESTAMP}-{RANDOM}`
- ✅ **冲突智能处理**: 自动解决SKU重复问题
- ✅ **拖拽上传界面**: 用户友好的前端体验
- ✅ **实时处理反馈**: 详细的成功/错误统计

### 2. 商品管理
- ✅ **分页查询**: 支持多字段搜索和筛选
- ✅ **全文搜索**: 支持名称、公司、描述、分类、SKU搜索
- ✅ **CRUD操作**: 完整的增删改查功能
- ✅ **批量导入**: 支持JSON和CSV两种格式

### 3. 用户管理
- ✅ **身份认证**: JWT token认证系统
- ✅ **角色管理**: 管理员/用户角色权限控制
- ✅ **安全登录**: 密码验证和会话管理

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Hono (轻量级Web框架)
- **运行环境**: Cloudflare Workers (边缘计算)
- **数据库**: Cloudflare D1 SQLite (分布式数据库)
- **认证**: JWT Token + 角色权限控制

### 前端技术栈
- **样式**: TailwindCSS (CDN)
- **图标**: FontAwesome (CDN)
- **HTTP客户端**: Axios (CDN)
- **交互**: 原生JavaScript + 拖拽API

### 数据模型

#### Products表
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL, 
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Users表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active', 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📋 API端点

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### 商品管理
- `GET /api/products` - 分页查询商品(支持搜索筛选)
- `GET /api/products/:id` - 获取单个商品
- `POST /api/products` - 创建新商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品
- `POST /api/products/batch` - JSON批量导入
- `POST /api/products/import-csv` - **智能CSV导入** (核心功能)

### 系统信息
- `GET /api/stats` - 获取系统统计信息
- `GET /api/search-fields` - 获取搜索字段信息

## 🛠️ 智能CSV导入功能详解

### 支持的CSV格式

#### 最简格式 (4列)
```csv
name,company_name,price,stock
USB Type-C 连接器,苹果公司,15.99,100
HDMI 高清连接器,三星电子,25.50,50
```

#### 完整格式 (7列)  
```csv
name,company_name,price,stock,sku,category,description
USB连接器,苹果公司,15.99,100,APPLE-USB-001,连接器,高质量USB连接器
```

### 智能补全规则
- **SKU自动生成**: `CONN-{名称前缀}-{时间戳}-{随机码}`
- **默认分类**: "连接器"
- **自动描述**: "连接器产品 - {商品名称}"
- **冲突处理**: 自动重新生成唯一SKU

### 使用方法
1. 访问智能导入页面
2. 拖拽或选择CSV文件
3. 系统自动解析并预览
4. 点击导入开始批量处理
5. 查看详细的成功/错误统计

## 🔐 默认账户
- **用户名**: admin
- **密码**: admin
- **角色**: 管理员

## 🚀 部署状态
- **平台**: Cloudflare Pages
- **状态**: ✅ 生产环境运行中
- **数据库**: Cloudflare D1 (远程)
- **最后更新**: 2025-09-01

## 💡 使用指南
1. **登录系统**: 使用admin/admin登录管理界面
2. **智能导入**: 访问智能导入页面上传4列CSV文件
3. **商品管理**: 在主界面查看、搜索、编辑商品
4. **批量操作**: 使用智能导入功能批量添加商品数据

系统已完全部署并可投入生产使用！