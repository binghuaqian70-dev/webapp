# 🚀 1.15数据汇总表导入快速指南

## 📋 快速开始（3步完成）

### 1️⃣ 启动导入

```bash
cd /home/user/webapp
./start_1.15_import.sh start
```

### 2️⃣ 查看进度

```bash
./start_1.15_import.sh progress
```

### 3️⃣ 等待完成

导入会自动完成，预计30-40分钟。

## 📊 目标数据

### 文件信息

- **文件数量**: 20个CSV文件
- **文件名范围**: 1.15数据汇总表-utf8_part1.csv 到 part20.csv
- **总大小**: 约590KB
- **预计记录数**: 约11,000条

## 📊 所有可用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `start` | 启动导入（后台运行） | `./start_1.15_import.sh start` |
| `stop` | 停止导入 | `./start_1.15_import.sh stop` |
| `status` | 查看运行状态 | `./start_1.15_import.sh status` |
| `progress` | 查看导入进度 | `./start_1.15_import.sh progress` |
| `logs` | 实时查看日志 | `./start_1.15_import.sh logs` |
| `stats` | 查看统计数据 | `./start_1.15_import.sh stats` |
| `clean` | 清理临时文件 | `./start_1.15_import.sh clean` |
| `help` | 显示帮助信息 | `./start_1.15_import.sh help` |

## 🔍 监控技巧

### 方式1：使用管理脚本（推荐）

```bash
# 查看实时进度（每隔5秒刷新一次）
watch -n 5 ./start_1.15_import.sh progress

# 实时查看日志
./start_1.15_import.sh logs
```

### 方式2：直接查看日志文件

```bash
# 实时查看详细日志
tail -f 1_15_import.log

# 查看最后50行日志
tail -n 50 1_15_import.log

# 搜索错误信息
grep "ERROR" 1_15_import.log
```

## ⏱️ 预计时间线

基于20个文件，约11,000条记录：

| 阶段 | 时间 | 说明 |
|------|------|------|
| 启动&登录 | ~5秒 | 连接生产环境 |
| 文件检查 | ~20秒 | 扫描AI Drive中的文件 |
| 导入数据 | ~30分钟 | 分块导入所有数据 |
| 验证统计 | ~5秒 | 汇总结果 |
| **总计** | **~30-40分钟** | 全程自动化 |

## 📁 生成的文件

导入过程中会生成以下文件：

```
/home/user/webapp/
├── 1_15_import.log              # 详细日志（保留审计）
├── 1_15_import_stats.json       # 统计数据（可视化分析）
├── 1_15_import_progress.json    # 进度信息（断点续传）
└── import_1.15_output.log       # 后台运行输出
```

## 🎯 导入完成标志

当看到以下日志时，表示导入完成：

```
🎉 1.15数据汇总表批量导入完成！
================================================================================
✅ 成功处理文件: 20/20
📈 成功导入记录: ~11,000 条
```

## 💡 专业提示

1. **后台运行**: 启动后可以关闭终端，脚本会继续运行
2. **断点续传**: 任何时候中断都可以继续，不会重复导入
3. **实时监控**: 使用 `watch -n 5 ./start_1.15_import.sh progress` 持续监控
4. **日志保留**: 导入完成后保留日志文件用于审计

## 🔧 故障排查

### 问题1：脚本无法启动

```bash
# 检查脚本权限
ls -l start_1.15_import.sh

# 如果没有执行权限，添加权限
chmod +x start_1.15_import.sh
```

### 问题2：找不到文件

```bash
# 检查AI Drive中的文件
ls -lh /mnt/aidrive/1.15数据汇总表-utf8_part*.csv

# 应该看到20个文件
```

## ✅ 完成后验证

```bash
# 1. 查看导入统计
./start_1.15_import.sh stats

# 2. 检查导入成功率
grep "总体导入成功率" 1_15_import.log
```

---

**祝导入顺利！** 🎉
