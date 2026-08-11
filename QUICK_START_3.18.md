# 🚀 3.18数据汇总表批量导入快速启动指南

## 📋 基本信息

- **数据集**: 3.18数据汇总表
- **文件数量**: 8个CSV文件
- **文件名**: 3.18数据汇总表-utf8_part1.csv ~ part8.csv
- **数据源**: AI Drive (`/mnt/aidrive`)
- **目标环境**: 生产数据库

## 🎯 快速启动

### 1. 启动导入任务

```bash
cd /home/user/webapp
./start_3.18_import.sh start
```

### 2. 监控进度（实时）

```bash
# 每5秒自动刷新进度
watch -n 5 ./start_3.18_import.sh progress
```

### 3. 手动查看进度

```bash
./start_3.18_import.sh progress
```

## 📊 常用命令

| 命令 | 说明 |
|------|------|
| `./start_3.18_import.sh start` | 启动导入任务 |
| `./start_3.18_import.sh status` | 查看运行状态 |
| `./start_3.18_import.sh progress` | 查看导入进度 |
| `./start_3.18_import.sh stats` | 查看统计数据 |
| `./start_3.18_import.sh logs` | 查看详细日志 |
| `./start_3.18_import.sh stop` | 停止导入任务 |

## 📁 生成的文件

- `3_18_import.log` - 详细日志文件
- `3_18_import_stats.json` - 统计数据文件
- `3_18_import_progress.json` - 进度文件（临时）
- `import_3.18_output.log` - 后台运行输出日志

## 🔍 故障排查

### 查看最近日志
```bash
tail -50 3_18_import.log
```

### 查看统计数据
```bash
cat 3_18_import_stats.json | python3 -m json.tool
```

### 检查脚本是否运行
```bash
./start_3.18_import.sh status
```

## ⚙️ 配置参数

- **分块大小**: 300行/块
- **分块间延迟**: 600ms
- **文件间延迟**: 2000ms
- **最大重试次数**: 3次
- **进度保存间隔**: 每3个分块

## 📝 注意事项

1. 脚本在后台运行，可以关闭终端
2. 支持断点续传，中断后可继续
3. 所有日志和统计数据自动保存
4. 导入完成后自动清理临时文件
