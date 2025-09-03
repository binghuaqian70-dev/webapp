# 9.3数据汇总表批量导入说明

## 概述
修改后的 `optimized_batch_import.mjs` 脚本现在支持从 AI Drive 中导入100个9.3数据汇总表分片文件（part_001 到 part_100）到生产环境。

## 主要特性

### 🎯 文件支持
- **文件格式**: `9.3数据汇总表-utf8_part_XXX.csv` (XXX = 001-100)
- **文件位置**: `/mnt/aidrive/`
- **文件数量**: 100个分片文件
- **总数据大小**: 约2.28 MB

### ⚙️ 导入配置
- **批次大小**: 每批2个文件（保守策略）
- **文件间延迟**: 4秒
- **批次间延迟**: 20秒
- **分块大小**: 20-30行（根据文件大小动态调整）
- **重试机制**: 最多5次重试
- **预估时间**: 总计约50分钟

### 🔄 进度恢复功能
- **进度保存**: 每10个文件自动保存进度
- **断点续传**: 支持从中断处继续导入
- **进度文件**: `./9_3_import_progress.json`

## 使用方法

### 1. 检查文件完整性
```bash
node test_9_3_files.js
```

### 2. 开始导入
```bash
node optimized_batch_import.mjs
```

### 3. 如果中断后继续
脚本会自动检测进度文件，从中断处继续导入

## 数据结构
CSV文件包含以下字段：
- `name`: 产品名称
- `company_name`: 公司名称
- `price`: 价格（支持6位小数）
- `stock`: 库存数量

## 监控建议

### 导入过程监控
```bash
# 检查服务器状态
curl https://fc9bc1cb.webapp-csv-import.pages.dev/api/products?page=1&pageSize=1

# 监控进度（另一个终端）
watch -n 30 "curl -s https://fc9bc1cb.webapp-csv-import.pages.dev/api/products?page=1\&pageSize=1 | jq '.pagination.total'"
```

### 进度文件内容
```json
{
  "currentIndex": 45,
  "results": [...],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 导入策略

### 保守配置原因
1. **100个文件**: 比之前的10个文件增加10倍，需要更保守
2. **服务器稳定性**: 避免给Cloudflare Workers造成压力
3. **错误恢复**: 更多重试机会和进度保存

### 性能优化
- 动态分块：根据文件大小调整块大小
- 批次处理：减少并发压力
- 延迟控制：避免速率限制

## 故障排除

### 常见问题
1. **文件缺失**: 运行 `test_9_3_files.js` 检查
2. **网络超时**: 脚本会自动重试
3. **进度丢失**: 检查 `9_3_import_progress.json` 文件

### 手动清理
```bash
# 清理进度文件（重新开始）
rm -f 9_3_import_progress.json

# 检查数据库状态
curl https://fc9bc1cb.webapp-csv-import.pages.dev/api/products?page=1&pageSize=1
```

## 预期结果
- **成功率**: 预期95%+的导入成功率
- **总记录数**: 估计约80,000-120,000条记录
- **导入时间**: 约45-60分钟（包含延迟）
- **最终状态**: 所有9.3数据成功导入生产环境

## 注意事项
1. 导入过程中请不要关闭终端
2. 如需中断，使用 Ctrl+C，下次运行时会从断点继续
3. 导入完成后会自动清理进度文件
4. 建议在非高峰时段运行导入任务