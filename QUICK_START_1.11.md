# 🚀 1.11数据汇总表导入快速指南

## 📋 快速开始（3步完成）

### 1️⃣ 启动导入

```bash
cd /home/user/webapp
./start_1.11_import.sh start
```

输出示例：
```
🚀 启动1.11数据汇总表批量导入...
📍 工作目录: /home/user/webapp
📝 输出日志: import_1.11_output.log
📊 详细日志: 1_11_import.log

✅ 导入脚本已启动 (PID: 12345)
💡 使用以下命令查看进度:
   ./start_1.11_import.sh progress   # 查看实时进度
   ./start_1.11_import.sh logs       # 查看详细日志
   ./start_1.11_import.sh stats      # 查看统计数据
```

### 2️⃣ 查看进度

```bash
./start_1.11_import.sh progress
```

输出示例：
```
======================================================================
  导入进度
======================================================================

📊 状态: running
⏰ 开始时间: 2026-01-11T10:30:00.000Z

📁 文件进度: 3/8 (37.50%)
📦 分块进度: 12/16 (75.00%)
📈 已导入记录: 1200 条
📊 当前文件: 1.11数据汇总表-utf8_part4.csv
⏱️  预计剩余时间: 0小时8分钟
```

### 3️⃣ 等待完成

导入会自动完成，完成后脚本会自动退出。可以通过以下命令确认：

```bash
./start_1.11_import.sh status
```

## 📊 所有可用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `start` | 启动导入（后台运行） | `./start_1.11_import.sh start` |
| `stop` | 停止导入 | `./start_1.11_import.sh stop` |
| `status` | 查看运行状态 | `./start_1.11_import.sh status` |
| `progress` | 查看导入进度 | `./start_1.11_import.sh progress` |
| `logs` | 实时查看日志（Ctrl+C退出） | `./start_1.11_import.sh logs` |
| `stats` | 查看统计数据 | `./start_1.11_import.sh stats` |
| `clean` | 清理临时文件 | `./start_1.11_import.sh clean` |
| `help` | 显示帮助信息 | `./start_1.11_import.sh help` |

## 🔍 监控技巧

### 方式1：使用管理脚本（推荐）

```bash
# 查看实时进度（每隔5秒刷新一次）
watch -n 5 ./start_1.11_import.sh progress

# 实时查看日志
./start_1.11_import.sh logs
```

### 方式2：直接查看日志文件

```bash
# 实时查看详细日志
tail -f 1_11_import.log

# 查看最后50行日志
tail -n 50 1_11_import.log

# 搜索错误信息
grep "ERROR" 1_11_import.log
```

### 方式3：查看统计文件

```bash
# 查看格式化的统计数据
cat 1_11_import_stats.json | jq '.'

# 查看特定字段
cat 1_11_import_stats.json | jq '.processedFiles, .importedRecords'
```

## 🛡️ 常见场景处理

### 场景1：中途停止导入

```bash
# 停止导入
./start_1.11_import.sh stop

# 稍后继续导入（会自动从断点继续）
./start_1.11_import.sh start
```

### 场景2：导入出错

```bash
# 查看错误日志
grep "ERROR" 1_11_import.log

# 查看最后的错误
tail -f 1_11_import.log | grep "ERROR"

# 重新启动（会从断点继续）
./start_1.11_import.sh start
```

### 场景3：查看导入了多少数据

```bash
# 查看统计数据
./start_1.11_import.sh stats

# 或直接查询生产环境
curl -s https://webapp-csv-import.pages.dev/api/products?page=1&pageSize=1 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.pagination.total'
```

### 场景4：清理重新开始

```bash
# 停止导入
./start_1.11_import.sh stop

# 清理所有临时文件
./start_1.11_import.sh clean

# 重新开始导入
./start_1.11_import.sh start
```

## ⏱️ 预计时间线

基于8个文件，约3500条记录：

| 阶段 | 时间 | 说明 |
|------|------|------|
| 启动&登录 | ~5秒 | 连接生产环境 |
| 文件检查 | ~10秒 | 扫描AI Drive中的文件 |
| 导入数据 | ~15分钟 | 分块导入所有数据 |
| 验证统计 | ~5秒 | 汇总结果 |
| **总计** | **~15-20分钟** | 全程自动化 |

## 📁 生成的文件

导入过程中会生成以下文件：

```
/home/user/webapp/
├── 1_11_import.log              # 详细日志（保留审计）
├── 1_11_import_stats.json       # 统计数据（可视化分析）
├── 1_11_import_progress.json    # 进度信息（断点续传）
└── import_1.11_output.log       # 后台运行输出
```

## 🎯 导入完成标志

当看到以下日志时，表示导入完成：

```
🎉 1.11数据汇总表批量导入完成！
================================================================================
✅ 成功处理文件: 8/8
📈 成功导入记录: 3,500 条
📊 预期记录数: 3,500 条
🗄️ 数据库最终记录数: 125,500 条
⏱️ 总耗时: 15分30秒
📊 总体导入成功率: 100.00%
```

## 💡 专业提示

1. **后台运行**: 启动后可以关闭终端，脚本会继续运行
2. **断点续传**: 任何时候中断都可以继续，不会重复导入
3. **实时监控**: 使用 `watch -n 5 ./start_1.11_import.sh progress` 持续监控
4. **日志保留**: 导入完成后保留日志文件用于审计
5. **网络异常**: 脚本会自动重试，最多3次

## 🔧 故障排查

### 问题1：脚本无法启动

```bash
# 检查脚本权限
ls -l start_1.11_import.sh

# 如果没有执行权限，添加权限
chmod +x start_1.11_import.sh
```

### 问题2：找不到文件

```bash
# 检查AI Drive中的文件
ls -lh /mnt/aidrive/1.11数据汇总表-utf8_part*.csv

# 应该看到8个文件
```

### 问题3：导入速度很慢

```bash
# 查看网络连接
curl -I https://webapp-csv-import.pages.dev

# 查看当前进度
./start_1.11_import.sh progress

# 调整配置（编辑optimized_batch_import.mjs）
# DELAY_BETWEEN_CHUNKS = 300  # 从600ms减少到300ms
```

### 问题4：进程卡住不动

```bash
# 查看进程状态
./start_1.11_import.sh status

# 如果卡住，停止并重新启动
./start_1.11_import.sh stop
./start_1.11_import.sh start
```

## 📞 需要帮助？

1. 查看详细文档: `cat 1.11_IMPORT_README.md`
2. 查看最新日志: `tail -n 100 1_11_import.log`
3. 查看错误信息: `grep "ERROR" 1_11_import.log`

## ✅ 完成后验证

```bash
# 1. 查看导入统计
./start_1.11_import.sh stats

# 2. 验证数据库记录数
# 访问 https://webapp-csv-import.pages.dev/api/products

# 3. 检查导入成功率
grep "总体导入成功率" 1_11_import.log
```

---

**祝导入顺利！** 🎉
