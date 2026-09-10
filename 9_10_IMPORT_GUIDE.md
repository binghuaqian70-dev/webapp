# 9.10数据汇总表批量导入系统 - 使用指南

## 📋 系统概述

本系统用于将AI Drive中的9.10数据汇总表CSV文件批量导入到生产环境的商品数据库。

### 数据文件
- **文件数量**: 8个CSV文件
- **文件名称**: `9.10数据汇总表-utf8_part_1.csv` 到 `9.10数据汇总表-utf8_part_8.csv`
- **存储位置**: `/mnt/aidrive/`
- **本地缓存**: `/tmp/9_10_import_cache/`

### 系统特性
✅ **后台运行** - 使用nohup在后台执行，可关闭终端
✅ **进度统计** - 实时记录导入进度和统计数据
✅ **断点续传** - 支持中断后继续导入
✅ **智能分块** - 根据文件内容行数自动调整分块大小
✅ **详细日志** - 完整记录导入过程和错误信息
✅ **多文件处理** - 自动逐个处理8个CSV文件

## 🚀 快速开始

### 方法1: 一键启动（推荐）
```bash
./QUICKSTART_9_10_OPTIMIZED.sh
```
此脚本会自动执行：
1. 系统验证
2. 开始导入
3. 显示实时进度

### 方法2: 分步执行
```bash
# 1. 验证系统
./verify_9_10_optimized_system.sh

# 2. 开始导入
./start_9_10_optimized_import.sh

# 3. 监控进度
./monitor_9_10_import.sh
```

## 📊 监控导入进度

### 实时监控（推荐）
```bash
./monitor_9_10_import.sh
```
每5秒自动刷新进度，按Ctrl+C退出

### 手动查看
```bash
# 查看统计数据
cat 9_10_import_stats.json | jq .

# 查看详细日志
tail -f 9_10_import.log

# 查看后台输出
tail -f 9_10_import_nohup.log
```

### 详细进度检查
```bash
./check_9_10_optimized_import.sh
```

## 📁 文件说明

### 核心脚本
- **optimized_batch_import_9_10.mjs** - 主导入脚本（Node.js）
- **start_9_10_optimized_import.sh** - 启动脚本
- **verify_9_10_optimized_system.sh** - 系统验证脚本
- **QUICKSTART_9_10_OPTIMIZED.sh** - 一键启动脚本

### 监控脚本
- **monitor_9_10_import.sh** - 简单实时监控
- **check_9_10_optimized_import.sh** - 详细进度检查

### 运行时文件
- **9_10_import_progress.json** - 断点续传进度文件
- **9_10_import_stats.json** - 统计数据文件
- **9_10_import.log** - 详细日志文件
- **9_10_import_nohup.log** - 后台运行输出

## 🔧 配置参数

### 导入配置（optimized_batch_import_9_10.mjs）
```javascript
// 生产环境
PRODUCTION_URL = 'https://webapp-csv-import.pages.dev'
USERNAME = 'admin'
PASSWORD = 'admin123'

// 文件配置
AI_DRIVE_PATH = '/tmp/9_10_import_cache'  // 本地缓存
TARGET_FILES = 8个CSV文件  // 自动生成文件列表

// 性能配置
MAX_RETRIES = 3               // 最大重试次数
DELAY_BETWEEN_CHUNKS = 600ms  // 分块间延迟
DELAY_BETWEEN_FILES = 2000ms  // 文件间延迟
PROGRESS_SAVE_INTERVAL = 3    // 每3个分块保存进度
```

## 📈 导入流程

```
1. 系统验证
   ├─ 检查脚本文件
   ├─ 验证AI Drive文件（8个）
   ├─ 测试缓存目录权限
   └─ 检查网络连接

2. 文件缓存
   └─ 复制8个CSV文件到本地缓存

3. 逐个导入
   ├─ part_1.csv → 智能分块 → 批量导入
   ├─ part_2.csv → 智能分块 → 批量导入
   ├─ part_3.csv → 智能分块 → 批量导入
   ├─ part_4.csv → 智能分块 → 批量导入
   ├─ part_5.csv → 智能分块 → 批量导入
   ├─ part_6.csv → 智能分块 → 批量导入
   ├─ part_7.csv → 智能分块 → 批量导入
   └─ part_8.csv → 智能分块 → 批量导入

4. 完成统计
   └─ 生成导入报告
```

## 🔍 故障排查

### 问题: 导入进程意外停止
```bash
# 查看错误日志
tail -100 9_10_import.log

# 检查后台输出
cat 9_10_import_nohup.log

# 重新启动（自动断点续传）
./start_9_10_optimized_import.sh
```

### 问题: 网络连接失败
```bash
# 测试生产环境连接
curl -I https://webapp-csv-import.pages.dev

# 检查重试配置
grep MAX_RETRIES optimized_batch_import_9_10.mjs
```

### 问题: 文件读取失败
```bash
# 检查AI Drive文件
ls -lh /mnt/aidrive/9.10数据汇总表-utf8_part_*.csv

# 检查本地缓存
ls -lh /tmp/9_10_import_cache/

# 手动复制到缓存
mkdir -p /tmp/9_10_import_cache
cp /mnt/aidrive/9.10数据汇总表-utf8_part_*.csv /tmp/9_10_import_cache/
```

### 问题: 进度文件损坏
```bash
# 备份当前进度
cp 9_10_import_progress.json 9_10_import_progress.json.bak

# 删除进度文件（将从头开始）
rm 9_10_import_progress.json

# 重新开始导入
./start_9_10_optimized_import.sh
```

## 📊 性能指标

### 预期性能
- **分块大小**: 100-300行（根据内容自动调整）
- **导入速度**: 约100-200条/秒
- **文件间隔**: 2秒
- **分块间隔**: 0.6秒

### 资源使用
- **内存占用**: ~200MB
- **磁盘空间**: 需要约500MB缓存空间
- **网络带宽**: 稳定HTTP连接

## ⚠️ 注意事项

1. **不要同时运行多个导入进程** - 可能导致数据冲突
2. **确保AI Drive文件完整** - 8个CSV文件都必须存在
3. **保持网络连接稳定** - 导入过程需要持续网络访问
4. **磁盘空间充足** - 至少需要1GB可用空间
5. **导入过程中可关闭终端** - 进程在后台运行

## 📞 技术支持

### 日志位置
- 详细日志: `9_10_import.log`
- 后台输出: `9_10_import_nohup.log`
- 统计数据: `9_10_import_stats.json`
- 进度文件: `9_10_import_progress.json`

### 命令速查
```bash
# 一键启动
./QUICKSTART_9_10_OPTIMIZED.sh

# 实时监控
./monitor_9_10_import.sh

# 查看统计
cat 9_10_import_stats.json | jq .

# 查看日志
tail -f 9_10_import.log

# 停止导入
# 查找进程ID
ps aux | grep optimized_batch_import_9_10
# 终止进程
kill <PID>
```

---

**版本**: 9.10 优化版
**更新时间**: 2026-09-10
**文件数量**: 8个CSV文件
**支持特性**: 后台运行、进度统计、断点续传、智能分块
