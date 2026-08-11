# 3.9数据汇总表批量导入快速启动指南

## 📋 任务概览

**数据版本**: 3.9数据汇总表
**文件来源**: AI Drive (`/mnt/aidrive`)
**文件数量**: 16个分割文件 (part1-part16)
**预计总记录数**: ~7,867条 (约 467KB)
**预计导入时间**: 15-20分钟

## 📁 文件清单

```
3.9数据汇总表-utf8_part1.csv   (30KB, 491条记录)
3.9数据汇总表-utf8_part2.csv   (30KB, 491条记录)
3.9数据汇总表-utf8_part3.csv   (30KB, 491条记录)
...
3.9数据汇总表-utf8_part15.csv  (29KB, 491条记录)
3.9数据汇总表-utf8_part16.csv  (29KB, 494条记录)
```

## 🚀 快速启动

### 1. 启动导入任务（后台运行）

```bash
cd /home/user/webapp
./start_3.9_import.sh start
```

### 2. 监控导入进度（实时刷新）

```bash
# 持续监控（每5秒刷新一次）
watch -n 5 ./start_3.9_import.sh progress

# 或手动查看进度
./start_3.9_import.sh progress
```

### 3. 查看运行状态

```bash
./start_3.9_import.sh status
```

### 4. 查看统计信息

```bash
./start_3.9_import.sh stats
```

### 5. 查看详细日志

```bash
./start_3.9_import.sh logs
```

## 🛠️ 管理命令

```bash
./start_3.9_import.sh start      # 启动导入任务
./start_3.9_import.sh stop       # 停止导入任务
./start_3.9_import.sh status     # 查看运行状态
./start_3.9_import.sh progress   # 查看导入进度
./start_3.9_import.sh stats      # 查看统计信息
./start_3.9_import.sh logs       # 查看日志
./start_3.9_import.sh help       # 显示帮助
```

## 📊 导入策略

- **智能分块**: 按文件内容行数自动分块（每块最多300行）
- **分块延迟**: 0.6秒（避免服务器压力）
- **文件延迟**: 2秒（文件间等待）
- **最大重试**: 3次（出错自动重试）
- **断点续传**: 支持中断后继续
- **进度保存**: 每3个分块保存一次

## 📝 生成的文件

- `3_9_import.log` - 详细导入日志
- `3_9_import_stats.json` - 导入统计数据
- `3_9_import_progress.json` - 导入进度文件
- `import_3.9_output.log` - 后台运行输出日志

## ⚠️ 注意事项

1. **后台运行**: 脚本会自动在后台运行，可以安全关闭终端
2. **断点续传**: 如果中断，再次启动会从断点继续
3. **日志查看**: 使用 `logs` 命令查看详细日志，而不是直接 `cat`
4. **并发限制**: 同时只能运行一个导入任务
5. **数据格式**: CSV格式为 `name,company_name,price,stock`

## 🎯 预期结果

- **成功率**: >99%
- **平均速度**: 450-550条/分钟
- **预计耗时**: 15-20分钟
- **预计重试**: 0-2次
- **分块成功率**: 100%

## 📞 问题排查

如果导入失败，请检查：
1. AI Drive文件是否存在且可读
2. 生产环境是否可访问
3. 账号密码是否正确
4. 网络连接是否稳定
5. 查看详细日志 `./start_3.9_import.sh logs`

---

**生产环境**: https://webapp-csv-import.pages.dev
**项目路径**: /home/user/webapp
**创建时间**: 2026-03-09
