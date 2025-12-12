# 12.12数据汇总表批量导入指南

## 📋 概述
本指南用于批量导入50个12.12数据汇总表CSV文件到生产环境商品数据库。

## 🎯 目标文件
- **文件数量**: 50个
- **文件命名**: `12.12数据汇总表-utf8_part_01.csv` 到 `12.12数据汇总表-utf8_part_50.csv`
- **文件位置**: `/mnt/aidrive/` (AI Drive)
- **目标环境**: `https://webapp-csv-import.pages.dev` (生产环境D1数据库)

## 🚀 快速开始

### 1️⃣ 启动批量导入
```bash
cd /home/user/webapp
./start_12_12_import.sh
```

**预期输出**:
```
🚀 启动12.12数据汇总表批量导入任务...
📁 文件数量: 50个 (12.12数据汇总表-utf8_part_01.csv 到 part_50.csv)
📍 AI Drive路径: /mnt/aidrive
🎯 目标环境: https://webapp-csv-import.pages.dev (生产环境)
✅ 导入任务已在后台启动 (PID: xxxxx)
```

### 2️⃣ 实时监控进度
```bash
# 方式1: 单次查看进度
./check_12_12_import.sh

# 方式2: 每5秒自动刷新（推荐）
watch -n 5 ./check_12_12_import.sh
```

**进度信息包括**:
- ✅ 进程运行状态
- 📁 文件进度 (已处理/总数)
- 📦 分块进度 (已处理/总数)
- 📈 已导入记录数
- 📄 当前处理文件名
- ⏱️ 预计剩余时间

### 3️⃣ 查看详细日志
```bash
# 实时查看日志
tail -f 12_12_import.log

# 查看最近100行
tail -n 100 12_12_import.log

# 搜索错误日志
grep ERROR 12_12_import.log
```

### 4️⃣ 停止导入任务（如需）
```bash
# 方式1: 使用pkill
pkill -f "optimized_batch_import.mjs"

# 方式2: 使用PID
kill <PID>
```

## 📊 导入特性

### 智能分块策略
根据文件实际行数自动调整分块大小：
- **超大文件** (>10万行): 100行/块
- **大文件** (5-10万行): 120行/块
- **中等文件** (1-5万行): 150行/块
- **小文件** (1千-1万行): 200行/块
- **超小文件** (<1千行): 300行/块

### 断点续传
- ✅ 支持中断后继续导入
- ✅ 自动保存进度到 `12_12_import_progress.json`
- ✅ 重启脚本自动从断点继续

### 错误处理
- ✅ 自动重试（最多3次）
- ✅ 失败分块详细日志
- ✅ 速率限制自动延迟

### 进度跟踪
- ✅ 文件级别进度
- ✅ 分块级别进度
- ✅ 实时统计数据
- ✅ 预计剩余时间

## 📁 生成文件说明

### 1. 进度文件 (`12_12_import_progress.json`)
```json
{
  "currentFileIndex": 10,
  "completedFiles": 9,
  "currentChunkIndex": 45,
  "completedChunks": 44,
  "timestamp": "2025-12-12T10:30:00.000Z",
  "lastCompletedFile": "12.12数据汇总表-utf8_part_09.csv"
}
```

**用途**: 断点续传、进度恢复

### 2. 统计数据 (`12_12_import_stats.json`)
```json
{
  "totalFiles": 50,
  "processedFiles": 9,
  "currentFile": "12.12数据汇总表-utf8_part_10.csv",
  "totalRecords": 500000,
  "processedChunks": 450,
  "totalChunks": 5000,
  "importedRecords": 90000,
  "startTime": "2025-12-12T10:00:00.000Z",
  "status": "running",
  "fileResults": [...]
}
```

**用途**: 实时统计、性能分析

### 3. 详细日志 (`12_12_import.log`)
```
[2025-12-12T10:00:00.000Z] [INFO] 🚀 12.12数据汇总表批量导入系统启动
[2025-12-12T10:00:01.000Z] [INFO] 📁 开始处理文件 1/50: 12.12数据汇总表-utf8_part_01.csv
[2025-12-12T10:00:02.000Z] [INFO] 📦 [12.12数据汇总表-utf8_part_01.csv] 智能分块策略: 总数据行10000行 → 每块150行
[2025-12-12T10:00:03.000Z] [INFO] ✅ [12.12数据汇总表-utf8_part_01.csv] 分块 1 完成 (2.35s)
```

**用途**: 问题排查、详细记录

### 4. Nohup日志 (`12_12_import_nohup.log`)
**用途**: 后台进程标准输出/错误

## ⏱️ 预估时间

### 保守估计（基于历史数据）
假设：
- 每个文件平均 10,000 条记录
- 50个文件总计约 500,000 条记录
- 平均处理速度: 300-400 条/分钟

**预计总耗时**: 20-30 小时

### 影响因素
1. **AI Drive访问速度** (较慢)
2. **网络延迟** (API请求)
3. **D1数据库写入速度**
4. **文件大小差异**

## 🔄 断点续传使用

### 场景1: 主动停止后继续
```bash
# 1. 停止导入
pkill -f "optimized_batch_import.mjs"

# 2. 稍后继续（自动从断点开始）
./start_12_12_import.sh
```

### 场景2: 意外中断后恢复
```bash
# 直接重启即可，自动检测进度文件并继续
./start_12_12_import.sh
```

### 场景3: 清空进度重新开始
```bash
# 删除进度文件
rm 12_12_import_progress.json

# 重新开始导入
./start_12_12_import.sh
```

## 📊 验证导入结果

### 1. 查看数据库总记录数
```bash
curl -s "https://webapp-csv-import.pages.dev/api/products" | jq '.pagination.total'
```

### 2. 查看统计数据
```bash
cat 12_12_import_stats.json | jq '.'
```

### 3. 检查最终状态
```bash
cat 12_12_import_stats.json | jq '.status, .importedRecords, .fileResults'
```

### 4. 查看各文件导入结果
```bash
cat 12_12_import_stats.json | jq '.fileResults[] | {filename, imported, success}'
```

## ⚠️ 注意事项

### 1. AI Drive性能
- ⚠️ AI Drive访问速度较慢
- ⚠️ 文件检查阶段需要较长时间（每10个文件显示一次进度）
- ✅ 建议启动后耐心等待

### 2. 生产环境
- ⚠️ 直接导入到生产数据库 (`https://webapp-csv-import.pages.dev`)
- ⚠️ 建议在低峰期执行
- ✅ 支持断点续传，可随时中断

### 3. 资源占用
- ✅ 后台运行，不占用终端
- ✅ 内存占用较小
- ✅ 可关闭SSH连接，任务继续运行

### 4. 错误处理
- ✅ 自动重试机制（最多3次）
- ✅ 失败分块不影响其他分块
- ✅ 详细错误日志便于排查

## 📞 问题排查

### Q1: 导入速度很慢
**原因**: AI Drive访问较慢、网络延迟、D1写入速度限制

**解决**: 
- 正常现象，耐心等待
- 查看日志确认是否正常运行
- 可以适当增加 `DELAY_BETWEEN_CHUNKS` 值

### Q2: 部分文件导入失败
**原因**: 网络问题、文件格式问题、API限流

**解决**:
- 查看 `12_12_import.log` 错误日志
- 检查失败文件格式
- 重启脚本会自动跳过已成功文件

### Q3: 进度文件损坏
**原因**: 异常终止、磁盘问题

**解决**:
```bash
# 删除损坏的进度文件
rm 12_12_import_progress.json 12_12_import_stats.json

# 重新开始导入
./start_12_12_import.sh
```

### Q4: 如何加速导入
**建议**:
1. 减少 `DELAY_BETWEEN_CHUNKS` 值（但可能触发限流）
2. 增加块大小（修改脚本中的 `chunkSize` 逻辑）
3. 使用多个导入进程（需手动分配文件，不推荐）

## 📚 相关文档
- `optimized_batch_import.mjs` - 导入脚本主文件
- `start_12_12_import.sh` - 启动脚本
- `check_12_12_import.sh` - 进度检查脚本
- `12_12_import.log` - 详细日志
- `12_12_import_stats.json` - 统计数据
- `12_12_import_progress.json` - 进度文件

## ✅ 完成后操作

### 1. 验证导入成功
```bash
# 检查最终状态
cat 12_12_import_stats.json | jq '.status, .importedRecords'

# 验证数据库记录数
curl -s "https://webapp-csv-import.pages.dev/api/products" | jq '.pagination.total'
```

### 2. 清理临时文件（可选）
```bash
# 保留日志和统计数据，删除进度文件
rm 12_12_import_progress.json
rm 12_12_import_nohup.log
```

### 3. 备份重要文件
```bash
# 备份日志和统计数据
cp 12_12_import.log 12_12_import_$(date +%Y%m%d).log.bak
cp 12_12_import_stats.json 12_12_import_stats_$(date +%Y%m%d).json.bak
```

---

**生成时间**: 2025-12-12  
**适用版本**: optimized_batch_import.mjs (12.12版本)  
**目标环境**: https://webapp-csv-import.pages.dev
