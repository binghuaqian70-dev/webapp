# 12.3数据导入 - 快速开始

## 🚀 一键启动

```bash
cd /home/user/webapp
./start_12_3_import.sh
```

## 📊 查看进度

```bash
./check_12_3_import.sh
```

## 📋 数据信息

- **文件数量**: 2个
- **总记录数**: 582条 (291 + 291)
- **预计时间**: 12-15秒
- **来源**: /mnt/aidrive/12.3数据汇总表-utf8_part1.csv + part2.csv
- **目标**: https://webapp-csv-import.pages.dev

## 🔍 监控命令

```bash
# 持续监控（每5秒刷新）
watch -n 5 ./check_12_3_import.sh

# 查看详细日志
tail -f 12_3_import.log

# 查看后台输出
tail -f 12_3_import_nohup.log
```

## 🛑 停止任务

```bash
# 查看进程
pgrep -f "optimized_batch_import.mjs"

# 停止任务
pkill -f "optimized_batch_import.mjs"
```

## ✅ 验证结果

```bash
# 查看最终统计
./check_12_3_import.sh

# 验证数据库
curl -s "https://webapp-csv-import.pages.dev/api/products?page=1&limit=1" | jq '.pagination.total'
```

## 📚 完整文档

详细说明请查看: [12_3_IMPORT_GUIDE.md](./12_3_IMPORT_GUIDE.md)
