# 6.18数据导入快速参考

## 🚀 快速启动

```bash
cd /home/user/webapp
./start_6.18_import.sh start
```

## 📊 进度监控

```bash
# 查看状态
./start_6.18_import.sh status

# 查看进度
./start_6.18_import.sh progress

# 实时日志
./start_6.18_import.sh logs

# 统计数据
./start_6.18_import.sh stats
```

## 📋 数据概览

| 项目 | 数值 |
|------|------|
| 文件数 | 2个 |
| 总记录数 | 约745条 |
| 文件命名 | part1, part2 (无前导零) |
| 每文件记录 | part1: 373条, part2: 372条 |

## 🎯 关键信息

**启动时间**: 2026-06-18  
**进程PID**: 1540123  
**预计耗时**: 2-3分钟  
**处理速度**: 300-400条/分钟

## 📁 相关文件

- `optimized_batch_import.mjs` - 主脚本
- `start_6.18_import.sh` - 管理脚本
- `6_18_import.log` - 详细日志
- `6_18_import_stats.json` - 统计数据

## 🔗 生产环境

**URL**: https://webapp-csv-import.pages.dev  
**数据库**: 导入前 888,606 → 预计 889,351 (+745)

## ✅ 完成标志

导入成功会显示：
```
🎉 6.18数据汇总表批量导入完成！
✅ 成功处理文件: 2/2
📈 成功导入记录: 745 条
```

---
**版本**: 6.18  
**状态**: 导入中 ⏳  
**特点**: 小批量快速导入
