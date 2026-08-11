# 🚀 2.24数据汇总表批量导入 - 快速启动指南

## 📋 任务概览

**数据源**: AI Drive (`/mnt/aidrive`)  
**目标**: 生产环境商品数据库  
**文件数**: 10个 (part1 - part10)  
**预计记录数**: ~6,370条 (每文件约637行)  
**预计耗时**: 10-15分钟

---

## 📁 文件详情

| 文件名 | 行数 | 大小 | 预计记录 |
|--------|------|------|----------|
| 2.24数据汇总表-utf8_part1.csv | 638 | 36KB | 637 |
| 2.24数据汇总表-utf8_part2.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part3.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part4.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part5.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part6.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part7.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part8.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part9.csv | 638 | 35KB | 637 |
| 2.24数据汇总表-utf8_part10.csv | 637 | 35KB | 636 |

**总大小**: ~350KB  
**总记录**: ~6,370条

---

## 🚀 快速启动（3步）

### 1️⃣ 进入项目目录
```bash
cd /home/user/webapp
```

### 2️⃣ 后台启动导入
```bash
./start_2.24_import.sh start
```

### 3️⃣ 监控进度
```bash
# 实时监控进度（每5秒更新）
watch -n 5 ./start_2.24_import.sh progress

# 或者手动查看
./start_2.24_import.sh progress
```

---

## 📊 监控命令

```bash
# 查看运行状态
./start_2.24_import.sh status

# 查看实时进度
./start_2.24_import.sh progress

# 查看详细统计
./start_2.24_import.sh stats

# 查看最新日志（50行）
./start_2.24_import.sh logs

# 查看完整日志
./start_2.24_import.sh logs all
```

---

## ⚙️ 导入配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **生产环境** | https://webapp-csv-import.pages.dev | 目标数据库 |
| **数据源** | /mnt/aidrive | AI Drive挂载点 |
| **文件前缀** | 2.24数据汇总表-utf8_part | 文件命名规则 |
| **文件数量** | 10 | part1 - part10 |
| **分块大小** | 300行/块 | 智能分块 |
| **最大重试** | 3次 | 失败自动重试 |
| **分块间延迟** | 600ms | 避免限流 |
| **文件间延迟** | 2000ms | 稳定性保证 |

---

## 📈 预期性能

基于历史数据预测：

| 指标 | 预期值 |
|------|--------|
| **平均速度** | 450-600条/分钟 |
| **总耗时** | 10-15分钟 |
| **分块数** | 约21-22块 (10文件 × ~2.1块) |
| **成功率** | 99%+ |

---

## 📂 生成的文件

### 运行时文件
- `2_24_import.log` - 详细导入日志
- `2_24_import_progress.json` - 实时进度数据
- `2_24_import_stats.json` - 统计数据
- `import_2.24_output.log` - 后台运行输出

### 脚本文件
- `optimized_batch_import.mjs` - 主导入脚本 (v2.24)
- `start_2.24_import.sh` - 管理脚本

---

## ❗ 注意事项

1. **AI Drive 延迟**: 脚本会自动处理 AI Drive 初始访问延迟
2. **后台运行**: 导入在后台进行，终端可关闭
3. **断点续传**: 支持中断后继续（使用进度文件）
4. **自动重试**: 失败分块自动重试最多3次
5. **日志完整**: 所有操作都有详细日志记录

---

## 🔍 故障排查

### 问题：导入未启动
```bash
# 检查脚本语法
node --check optimized_batch_import.mjs

# 检查AI Drive
ls -lh /mnt/aidrive/2.24数据汇总表-utf8_part*.csv
```

### 问题：导入速度慢
```bash
# 查看详细日志
tail -f 2_24_import.log

# 检查网络连接
curl -I https://webapp-csv-import.pages.dev
```

### 问题：导入失败
```bash
# 查看错误日志
grep ERROR 2_24_import.log

# 查看统计数据
cat 2_24_import_stats.json
```

---

## 🎯 验证导入结果

导入完成后验证：

```bash
# 方法1：查看统计文件
cat 2_24_import_stats.json

# 方法2：查看日志总结
tail -100 2_24_import.log

# 方法3：登录生产环境验证
# 访问 https://webapp-csv-import.pages.dev
# 用户名: admin
# 密码: admin123
```

---

## 📞 获取帮助

```bash
# 显示所有可用命令
./start_2.24_import.sh help
```

---

**准备就绪！现在可以开始导入了** 🚀

```bash
cd /home/user/webapp && ./start_2.24_import.sh start
```
