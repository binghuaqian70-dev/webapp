# 12.12数据汇总表批量导入 - 快速开始

## 🚀 三步完成导入

### 步骤1️⃣: 启动导入
```bash
cd /home/user/webapp
./start_12_12_import.sh
```

### 步骤2️⃣: 监控进度
```bash
# 实时监控（每5秒刷新）
watch -n 5 ./check_12_12_import.sh
```

### 步骤3️⃣: 验证结果
```bash
# 查看数据库总记录数
curl -s "https://webapp-csv-import.pages.dev/api/products" | jq '.pagination.total'
```

## 📊 关键信息

- **文件数量**: 50个 (part_01 到 part_50)
- **文件位置**: `/mnt/aidrive/`
- **目标环境**: `https://webapp-csv-import.pages.dev`
- **预计耗时**: 20-30小时
- **断点续传**: ✅ 支持
- **后台运行**: ✅ 支持

## 📋 常用命令

```bash
# 查看实时日志
tail -f 12_12_import.log

# 查看统计数据
cat 12_12_import_stats.json | jq '.'

# 停止导入任务
pkill -f "optimized_batch_import.mjs"
```

## 💡 提示

- ✅ 任务在后台运行，可关闭终端
- ✅ 支持中断后继续导入（断点续传）
- ✅ AI Drive访问较慢，请耐心等待
- ✅ 详细文档: `12_12_IMPORT_GUIDE.md`

---
**快速开始文档** | 详细指南请查看: `12_12_IMPORT_GUIDE.md`
