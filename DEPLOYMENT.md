# 部署文档

## 项目概述
商品管理系统 - 基于Cloudflare Pages + Hono + D1数据库的现代化产品管理平台

## 技术栈
- **后端框架**: Hono (轻量级Web框架)
- **运行环境**: Cloudflare Workers
- **数据库**: Cloudflare D1 (分布式SQLite)
- **前端**: 原生JavaScript + TailwindCSS
- **构建工具**: Vite
- **部署工具**: Wrangler
- **版本控制**: Git

## 环境要求
- Node.js 18+
- npm 或 yarn
- Cloudflare账户
- Wrangler CLI

## 本地开发设置

### 1. 项目初始化
```bash
# 克隆仓库
git clone <repository-url>
cd webapp

# 安装依赖
npm install

# 初始化数据库（本地开发）
npx wrangler d1 migrations apply webapp-production --local
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .dev.vars

# 编辑本地环境变量
# 在 .dev.vars 中配置必要的环境变量
```

### 3. 本地开发
```bash
# 构建项目
npm run build

# 启动开发服务器（使用PM2）
pm2 start ecosystem.config.cjs

# 或直接启动（阻塞式）
npm run dev:sandbox
```

### 4. 访问应用
- **本地地址**: http://localhost:3000
- **API文档**: http://localhost:3000/api/stats

## 生产环境部署

### 1. Cloudflare认证
```bash
# 使用API Token（推荐）
export CLOUDFLARE_API_TOKEN="your-api-token"

# 验证认证
npx wrangler whoami
```

### 2. 数据库设置
```bash
# 创建生产数据库
npx wrangler d1 create webapp-production

# 复制database_id到wrangler.jsonc

# 应用迁移
npx wrangler d1 migrations apply webapp-production
```

### 3. 项目部署
```bash
# 创建Pages项目
npx wrangler pages project create webapp-product-mgmt

# 构建项目
npm run build

# 部署到生产
npx wrangler pages deploy dist --project-name webapp-product-mgmt
```

### 4. 环境变量配置
```bash
# 添加生产环境密钥
npx wrangler pages secret put API_KEY --project-name webapp-product-mgmt
```

## 数据管理

### 数据库迁移
```bash
# 本地迁移
npm run db:migrate:local

# 生产迁移
npm run db:migrate:prod

# 数据播种
npm run db:seed
```

### 数据导入导出
```bash
# 导出数据
python3 export_to_sql.py

# 导入到生产环境
npx wrangler d1 execute webapp-production --remote --file=./migration_data.sql
```

## 性能优化

### 数据库优化
- 使用复合索引优化查询
- FTS5全文搜索提升搜索性能
- 分页查询减少数据传输

### 前端优化
- CDN资源加载
- JavaScript代码简化
- 图片和资源压缩

## 监控和维护

### 日志查看
```bash
# PM2日志（开发环境）
pm2 logs --nostream

# Cloudflare日志
npx wrangler pages deployment tail
```

### 数据库维护
```bash
# 数据库控制台
npm run db:console:prod

# 数据库重置（仅开发环境）
npm run db:reset
```

## 故障排除

### 常见问题
1. **API 500错误**: 检查数据库连接和字段匹配
2. **前端按钮无响应**: 检查JavaScript加载和控制台错误
3. **部署失败**: 验证wrangler.jsonc配置
4. **数据库错误**: 检查迁移是否正确应用

### 解决方案
- 查看浏览器控制台错误
- 检查Cloudflare Workers日志
- 验证环境变量配置
- 确认数据库架构一致性

## 安全注意事项
- 永远不要在前端暴露API密钥
- 使用环境变量存储敏感信息
- 定期更新依赖包
- 启用CORS安全策略

## 备份策略
- 定期备份生产数据库
- 保存重要的配置文件
- 维护git提交历史
- 使用ProjectBackup工具