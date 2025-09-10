# 9.9数据汇总表批量导入系统

## 📋 系统概述

这是一个专门用于导入9.9数据汇总表文件（part_01到part_10，共10个文件）的自动化导入系统。系统支持后台运行、进度统计、断点续传和失败恢复。

## 📁 文件结构

- `optimized_batch_import.mjs` - 主批量导入程序
- `check_9_9_import_status.mjs` - 状态监控脚本
- `start_9_9_import.sh` - 进程管理脚本
- `import_single_9_9_file.mjs` - 单文件导入工具

## 🚀 快速开始

### 1. 检查文件状态
```bash
# 检查AI Drive中的文件和系统状态
node check_9_9_import_status.mjs
```

### 2. 启动批量导入
```bash
# 启动后台导入进程
./start_9_9_import.sh start
```

### 3. 监控进度
```bash
# 查看详细状态
./start_9_9_import.sh status

# 查看实时日志
./start_9_9_import.sh follow

# 快速进度检查
node check_9_9_import_status.mjs
```

## 📊 系统配置

### 文件配置
- **源文件**: AI Drive `/mnt/aidrive/` 目录下的 `9.9数据汇总表-utf8_part_01.csv` 到 `part_10.csv`
- **批次大小**: 每批处理2个文件
- **延迟设置**: 文件间2秒，批次间8秒
- **分块策略**: 根据文件行数自动调整（80-200行/块）

### 预期结果
- **文件数量**: 10个CSV文件
- **预估记录**: 约3,810条数据记录
- **预计耗时**: 约5-10分钟（取决于文件大小和网络状况）

## 🔧 进程管理命令

```bash
# 启动导入进程
./start_9_9_import.sh start

# 停止导入进程
./start_9_9_import.sh stop

# 重启导入进程
./start_9_9_import.sh restart

# 查看进程状态
./start_9_9_import.sh status

# 查看日志（最后50行）
./start_9_9_import.sh logs

# 实时跟踪日志
./start_9_9_import.sh follow

# 清理所有文件
./start_9_9_import.sh clean
```

## 🛠️ 单文件导入

如果某个文件导入失败，可以使用单文件导入工具：

```bash
# 导入特定文件
node import_single_9_9_file.mjs part_01
node import_single_9_9_file.mjs 9.9数据汇总表-utf8_part_01.csv
node import_single_9_9_file.mjs /mnt/aidrive/9.9数据汇总表-utf8_part_01.csv
```

## 📈 进度监控

### 实时状态检查
```bash
node check_9_9_import_status.mjs
```

显示内容：
- ✅ AI Drive文件检查（10个文件状态）
- 📊 导入进度统计（已处理文件数量）
- 🗄️ 数据库状态（记录数变化）
- 📋 最新日志信息

### 详细状态信息
```bash
./start_9_9_import.sh status
```

显示内容：
- 🔄 进程运行状态（PID、CPU、内存使用）
- 📁 相关文件状态（日志、统计、进度文件）
- 📊 完整的状态检查报告

## 🗂️ 日志和数据文件

### 主要文件
- `9_9_import.log` - 详细执行日志
- `9_9_import_stats.json` - 统计数据（文件数、记录数、耗时等）
- `9_9_import_progress.json` - 进度数据（支持断点续传）
- `9_9_import.pid` - 进程ID文件
- `single_import.log` - 单文件导入日志

### 日志查看
```bash
# 查看主日志最后50行
tail -50 9_9_import.log

# 实时跟踪日志
tail -f 9_9_import.log

# 查看统计数据
cat 9_9_import_stats.json
```

## 🔄 断点续传

系统支持断点续传功能：

1. **自动检测**: 重新启动时自动检测已完成的文件
2. **进度恢复**: 从上次中断的位置继续导入
3. **状态保持**: 保留已完成文件的统计信息

## ⚠️ 故障排除

### 常见问题

1. **文件找不到**
   ```bash
   ls -la /mnt/aidrive/9.9数据汇总表-utf8_part_*.csv
   ```

2. **登录失败**
   - 检查网络连接
   - 确认生产环境地址正确

3. **进程无法启动**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep 3000
   
   # 清理进程
   ./start_9_9_import.sh clean
   ```

4. **导入失败**
   ```bash
   # 查看详细错误日志
   tail -100 9_9_import.log
   
   # 使用单文件工具重试
   node import_single_9_9_file.mjs part_XX
   ```

### 手动修复
```bash
# 停止进程
./start_9_9_import.sh stop

# 清理文件
./start_9_9_import.sh clean

# 重新开始
./start_9_9_import.sh start
```

## 📊 预期结果

### 成功标准
- ✅ 10个文件全部处理完成
- ✅ 数据库记录数正确增长
- ✅ 无失败文件或失败文件已修复

### 完成报告
导入完成后，系统会生成详细报告：
- 📈 总导入记录数
- ⏱️ 总耗时统计
- 📊 成功率分析
- 💾 数据库状态对比

## 🎯 技术特性

- **智能分块**: 根据文件大小自动调整分块策略
- **错误重试**: 自动重试失败的操作（最多3次）
- **性能优化**: 针对中小规模文件优化的延迟和批次配置
- **完整日志**: 详细的操作日志和统计数据
- **状态监控**: 实时进度跟踪和状态报告

---

**支持**: 如有问题，请查看日志文件或使用单文件导入工具进行故障排除。