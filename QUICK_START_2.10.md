# 2.10数据汇总表批量导入 - 快速启动指南

## 📋 概述

本指南用于快速启动2.10数据汇总表的批量导入任务。

### 目标文件
- **总文件数**: 4个
- **文件列表**: 
  - 2.10数据汇总表-utf8_part1.csv
  - 2.10数据汇总表-utf8_part2.csv
  - 2.10数据汇总表-utf8_part3.csv
  - 2.10数据汇总表-utf8_part4.csv
- **文件位置**: `/mnt/aidrive/`
- **预计记录数**: 约2,000条
- **预计耗时**: 5-8分钟

## 🚀 快速启动（3步）

### 步骤1: 进入项目目录
```bash
cd /home/user/webapp
```

### 步骤2: 后台启动导入
```bash
./start_2.10_import.sh start
```

### 步骤3: 监控进度
```bash
# 方式1: 实时刷新进度（推荐）
watch -n 5 ./start_2.10_import.sh progress

# 方式2: 手动查看进度
./start_2.10_import.sh progress

# 方式3: 查看详细日志
./start_2.10_import.sh logs
```

## 📊 管理命令

### 查看状态
```bash
./start_2.10_import.sh status
```

### 查看进度
```bash
./start_2.10_import.sh progress
```

### 查看日志
```bash
./start_2.10_import.sh logs
```

### 查看统计
```bash
./start_2.10_import.sh stats
```

### 停止导入
```bash
./start_2.10_import.sh stop
```

### 清理临时文件
```bash
./start_2.10_import.sh clean
```

### 查看帮助
```bash
./start_2.10_import.sh help
```

## 📈 预期结果

### 导入数据
- **文件数量**: 4个
- **总记录数**: 约2,000条
- **成功率**: 100%

### 时间估算
- **每个文件**: 约1-2分钟
- **总耗时**: 5-8分钟
- **平均速度**: 250-300条/分钟

### 数据库变化
- **新增记录**: 约+2,000条
- **数据完整性**: 100%

## ⚠️ 注意事项

1. **后台运行**: 导入脚本在后台运行，不会阻塞终端
2. **断点续传**: 支持中断后继续导入
3. **实时进度**: 可随时查看导入进度和统计信息
4. **详细日志**: 所有操作都有详细日志记录

## 🔧 故障排查

### 问题1: 脚本无法执行
```bash
chmod +x start_2.10_import.sh
```

### 问题2: 导入失败
```bash
# 查看详细错误日志
./start_2.10_import.sh logs | tail -n 50

# 查看统计信息
./start_2.10_import.sh stats
```

### 问题3: 进度卡住
```bash
# 检查进程状态
./start_2.10_import.sh status

# 查看最新日志
tail -f 2_10_import.log
```

### 问题4: 需要重新开始
```bash
# 停止当前导入
./start_2.10_import.sh stop

# 清理临时文件
./start_2.10_import.sh clean

# 重新启动
./start_2.10_import.sh start
```

## 📝 文件说明

### 脚本文件
- `optimized_batch_import.mjs` - 主导入脚本
- `start_2.10_import.sh` - 管理脚本

### 输出文件
- `2_10_import.log` - 详细日志
- `2_10_import_stats.json` - 统计数据
- `2_10_import_progress.json` - 进度记录
- `import_2.10_output.log` - 控制台输出

## 🎯 完成标志

当看到以下消息时，表示导入完成：
```
🎊 2.10数据汇总表批量导入任务完成！
```

此时可以查看最终统计：
```bash
./start_2.10_import.sh stats
```

---

**提示**: 导入过程中可以随时关闭终端，脚本会继续在后台运行。
