# 商品管理系统

## 项目概述
- **名称**: 商品管理系统
- **目标**: 支持2万条商品数据的管理、查询、添加和批量导入
- **技术栈**: Hono + TypeScript + Cloudflare D1 + TailwindCSS

## 在线访问
- **开发环境**: https://3000-i83lokb7dctds9y855dsf-6532622b.e2b.dev
- **API健康检查**: https://3000-i83lokb7dctds9y855dsf-6532622b.e2b.dev/api/stats

## 功能特性

### ✅ 已完成功能
1. **数据统计仪表板**
   - 商品总数、总库存、总价值、公司数量统计
   - 分类分布图表展示
   - 实时数据更新

2. **商品管理**
   - 商品列表分页显示（每页20条）
   - 多字段搜索：商品名、公司名、描述
   - 高级筛选：公司、分类、价格范围、库存
   - 字段排序：创建时间、商品名、公司名、价格、库存
   - 商品编辑和删除（软删除）

3. **商品添加**
   - 表单验证：必填字段检查
   - SKU唯一性验证
   - 商品信息完整录入

4. **批量导入**
   - CSV文件上传（拖拽支持）
   - 数据格式验证和预览
   - 批量处理结果报告
   - 错误详情展示

### 🔄 核心API接口

#### 商品管理接口
- `GET /api/products` - 分页查询商品（支持搜索和过滤）
- `GET /api/products/:id` - 获取单个商品详情  
- `POST /api/products` - 添加新商品
- `PUT /api/products/:id` - 更新商品信息
- `DELETE /api/products/:id` - 删除商品（软删除）

#### 批量操作接口
- `POST /api/products/batch` - 批量导入商品

#### 统计和搜索接口
- `GET /api/stats` - 获取统计信息
- `GET /api/search` - 全文搜索商品（FTS5）

### 📊 数据架构

#### 数据模型
```sql
商品表 (products):
- id: 主键
- name: 商品名称（必填）
- company_name: 公司名称（必填） 
- price: 售价（必填）
- stock: 库存（必填）
- description: 商品描述
- category: 商品分类
- sku: 商品编号（唯一）
- status: 商品状态（active/inactive）
- created_at/updated_at: 时间戳
```

#### 存储服务
- **Cloudflare D1**: SQLite-based分布式数据库
- **索引优化**: 为高频查询字段创建索引
- **FTS5全文搜索**: 支持商品名和公司名模糊搜索
- **触发器同步**: 自动维护全文搜索索引

#### 性能优化
- 复合索引支持复杂查询
- 分页查询减少数据传输
- 本地开发使用SQLite缓存
- 软删除避免数据丢失

## 用户指南

### 基础操作
1. **查看统计**: 首页显示商品总数、库存、价值等关键指标
2. **浏览商品**: 商品管理页面支持分页浏览和搜索
3. **添加商品**: 填写商品基本信息，系统自动验证
4. **批量导入**: 上传CSV文件，支持数千条商品一键导入

### CSV导入格式
```csv
name,company_name,price,stock,description,category,sku
iPhone 15 Pro,苹果公司,8999.00,50,最新款iPhone,数码电子,APPLE-IP15P-001
```

### 搜索技巧
- **关键词搜索**: 在商品名、公司名、描述中查找
- **精确筛选**: 使用公司名、分类、价格范围过滤
- **组合查询**: 多个条件同时使用，提高查询精度

## 技术实现

### 后端架构
- **框架**: Hono (轻量级 Web 框架)
- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (全球分布式SQLite)
- **API设计**: RESTful API + JSON响应

### 前端技术
- **样式**: TailwindCSS + 自定义CSS
- **图表**: Chart.js
- **HTTP客户端**: Axios
- **图标**: Font Awesome

### 开发工具
- **构建工具**: Vite
- **部署工具**: Wrangler
- **进程管理**: PM2
- **版本控制**: Git

## 部署信息
- **平台**: Cloudflare Pages (开发中)
- **状态**: ✅ 开发环境运行正常
- **数据库**: 本地SQLite开发环境
- **最后更新**: 2025-08-31

## 后续规划
1. 部署到Cloudflare Pages生产环境
2. 添加商品图片上传功能
3. 实现用户权限管理
4. 添加库存预警功能
5. 导出功能和报表生成