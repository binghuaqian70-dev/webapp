# 8.17数据汇总表批量导入系统（优化版）

## 📋 系统概述

基于 `optimized_batch_import.mjs` 的8.17数据导入系统，支持从AI Drive批量导入5个CSV分割文件到生产环境商品数据库。

## 🎯 目标文件

从AI Drive (`/mnt/aidrive`) 导入以下2个文件：

```
8.17数据汇总表-utf8_part_1.csv  (~400条记录, 19KB)
8.17数据汇总表-utf8_part_2.csv  (~350条记录, 17KB)
8.17数据汇总表-utf8_part_3.csv  (~350条记录, 16KB)
8.17数据汇总表-utf8_part_4.csv  (~350条记录, 16KB)
8.17数据汇总表-utf8_part_2.csv  (~350条记录, 16KB)

预估总计: ~1,800条记录, 84KB
```

## ✨ 核心特性

### 1. 智能导入策略
- **逐个文件导入**：按顺序处理每个文件，避免资源争用
- **按内容行数导入**：根据实际CSV行数智能分块（100-300行/块）
- **后台运行**：使用nohup在后台执行，不阻塞终端
- **6位小数精度**：价格字段支持6位小数精度（parseFloat）

### 2. 进度跟踪
- **实时统计**：JSON格式保存导入进度和统计数据
- **多维度监控**：文件级、分块级、记录级三重进度跟踪
- **预估时间**：根据已处理速度计算剩余时间

### 3. 容错机制
- **断点续传**：支持从中断点继续导入
- **自动重试**：每个分块最多重试3次
- **详细日志**：记录所有操作和错误信息

## 📁 文件清单

### 核心脚本
- `optimized_batch_import.mjs` - 主导入脚本（已修改为8.17配置）
- `start_8_17_optimized_import.sh` - 启动脚本
- `check_8_17_optimized_import.sh` - 进度监控脚本
- `verify_8_17_optimized_system.sh` - 系统验证脚本
- `QUICKSTART_8_17_OPTIMIZED.sh` - 一键启动向导

### 运行时文件（自动生成）
- `8_17_import_progress.json` - 断点续传进度文件
- `8_17_import_stats.json` - 统计数据文件
- `8_17_import.log` - 详细日志文件
- `8_17_import_nohup.log` - 后台进程输出

## 🚀 快速开始

### 方法1：一键启动（推荐）

```bash
./QUICKSTART_8_17_OPTIMIZED.sh
```

这将自动执行：
1. ✅ 系统验证（Node.js、脚本、文件）
2. 🚀 启动导入（后台运行）
3. 📊 选择监控方式

### 方法2：手动执行

```bash
# 1. 验证系统
./verify_8_17_optimized_system.sh

# 2. 启动导入
./start_8_17_optimized_import.sh

# 3. 监控进度
./check_8_17_optimized_import.sh
```

### 方法3：直接运行脚本

```bash
# 清除旧进度（可选）
rm -f 8_17_import_progress.json 8_17_import_stats.json 8_17_import.log

# 后台启动
nohup node optimized_batch_import.mjs > 8_17_import_nohup.log 2>&1 &

# 查看进度
cat 8_17_import_stats.json | jq .
tail -f 8_17_import.log
```

## 📊 监控进度

### 实时监控（推荐）

```bash
# 每2秒自动刷新
watch -n 2 ./check_8_17_optimized_import.sh
```

### 查看统计数据

```bash
# 格式化显示
cat 8_17_import_stats.json | jq .

# 查看关键指标
cat 8_17_import_stats.json | jq '{status, processedFiles, totalFiles, importedRecords, totalRecords}'
```

### 查看日志

```bash
# 实时日志
tail -f 8_17_import.log

# 最近50行
tail -50 8_17_import.log

# 查看错误
grep ERROR 8_17_import.log

# 查看成功记录
grep "成功" 8_17_import.log
```

## 📈 统计数据格式

```json
{
  "totalFiles": 5,           // 总文件数
  "processedFiles": 3,       // 已处理文件数
  "currentFile": "8.17数据汇总表-utf8_part_4.csv",
  "totalRecords": 1800,      // 总记录数
  "processedChunks": 10,     // 已处理分块数
  "totalChunks": 15,         // 总分块数
  "importedRecords": 1200,   // 已导入记录数
  "startTime": "2026-08-12T10:00:00.000Z",
  "estimatedTimeRemaining": 120,  // 预估剩余秒数
  "status": "importing",     // 状态: pending/importing/completed/completed_with_errors/error
  "fileResults": [           // 每个文件的详细结果
    {
      "filename": "8.17数据汇总表-utf8_part_1.csv",
      "status": "completed",
      "totalRecords": 400,
      "importedRecords": 400,
      "chunks": 2,
      "startTime": "...",
      "endTime": "...",
      "duration": 45
    }
  ]
}
```

## 🔧 高级配置

### 修改导入参数

编辑 `optimized_batch_import.mjs`：

```javascript
// 优化配置
const MAX_RETRIES = 3;          // 最大重试次数
const DELAY_BETWEEN_CHUNKS = 600; // 分块间延迟（毫秒）
const DELAY_BETWEEN_FILES = 2000;  // 文件间延迟（毫秒）
const PROGRESS_SAVE_INTERVAL = 3; // 每N个分块保存一次进度
```

### 断点续传

系统自动支持断点续传。如需重新开始：

```bash
# 清除进度文件
rm -f 8_17_import_progress.json 8_17_import_stats.json

# 重新启动
./start_8_17_optimized_import.sh
```

## ⚠️ 注意事项

### 1. AI Drive访问
- AI Drive是远程目录，首次访问可能较慢
- 预检查会扫描所有文件，需要耐心等待
- 如遇文件不存在错误，等待几秒后重试

### 2. 生产环境
- 目标环境：`https://webapp-csv-import.pages.dev`
- 认证信息：`admin / admin123`
- 确保生产环境API正常运行

### 3. 资源占用
- 导入过程消耗CPU和网络资源
- 建议在低峰期执行
- 预计总耗时：3-5分钟（取决于网络）

### 4. 错误处理
- 检查 `8_17_import.log` 获取详细错误信息
- 每个分块最多自动重试3次
- 如持续失败，检查网络和API状态

## 📝 常见问题

### Q1: 如何停止正在运行的导入？

```bash
# 查找进程ID
ps aux | grep optimized_batch_import.mjs

# 停止进程
kill <PID>
```

### Q2: 导入失败如何继续？

系统自动支持断点续传，直接重新运行即可：

```bash
./start_8_17_optimized_import.sh
```

### Q3: 如何验证导入结果？

```bash
# 查看统计文件
cat 8_17_import_stats.json | jq '.status, .importedRecords, .totalRecords'

# 查看每个文件的状态
cat 8_17_import_stats.json | jq '.fileResults[]'

# 检查数据库记录数（需要API支持）
curl -H "Authorization: Bearer <token>" \
  https://webapp-csv-import.pages.dev/api/products/count
```

### Q4: 如何调整导入速度？

编辑 `optimized_batch_import.mjs`：

```javascript
// 加快速度（减少延迟）
const DELAY_BETWEEN_CHUNKS = 300;  // 从600改为300
const DELAY_BETWEEN_FILES = 1000;  // 从2000改为1000

// 减慢速度（增加延迟，减少服务器压力）
const DELAY_BETWEEN_CHUNKS = 1000;
const DELAY_BETWEEN_FILES = 3000;
```

## 🎯 与8.11系统对比

| 特性 | 8.11系统 | 8.17系统 |
|------|---------|---------|
| 文件数量 | 6个文件 | 2个文件 |
| 预估记录 | 2,614条 | ~1,800条 |
| 文件大小 | 134KB | 84KB |
| 其他配置 | 完全相同 | 完全相同 |

## 📞 技术支持

如遇问题，请提供：
1. `8_17_import_stats.json` 统计文件
2. `8_17_import.log` 日志文件（最后100行）
3. 错误截图或描述

---

**创建时间**: 2026-08-12  
**版本**: 1.0.0  
**基于**: optimized_batch_import.mjs (8.11系统改造)
