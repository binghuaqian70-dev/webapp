# 6.26数据汇总表导入快速参考

## 📋 导入概况

| 项目 | 详情 |
|------|------|
| **版本** | 6.26 |
| **文件数量** | 5个文件 |
| **文件命名** | `6.26数据汇总表-utf8_part1.csv` 到 `part5.csv` (无前导零) |
| **总记录数** | 1,898条 |
| **预计耗时** | 2-3分钟 |

## 📊 文件分布

| 文件 | 记录数 | 大小 |
|------|--------|------|
| part1.csv | 380条 | 28K |
| part2.csv | 380条 | 26K |
| part3.csv | 380条 | 21K |
| part4.csv | 379条 | 21K |
| part5.csv | 379条 | 21K |
| **总计** | **1,898条** | **117K** |

## 🚀 快速启动

### 1️⃣ 启动导入
```bash
cd /home/user/webapp
./start_6.26_import.sh start
```

### 2️⃣ 查看进度
```bash
# 查看统计进度
./start_6.26_import.sh progress

# 查看运行状态
./start_6.26_import.sh status

# 实时查看日志（Ctrl+C 退出）
./start_6.26_import.sh logs
```

### 3️⃣ 查看统计
```bash
# 查看详细统计数据
./start_6.26_import.sh stats

# 或直接查看JSON文件
cat 6_26_import_stats.json
```

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `optimized_batch_import.mjs` | 核心导入脚本（已配置6.26版本） |
| `start_6.26_import.sh` | 管理脚本（启动/停止/监控） |
| `6_26_import_stats.json` | 统计数据文件 |
| `6_26_import.log` | 详细日志文件 |
| `6_26_import_progress.json` | 进度文件（断点续传） |
| `import_6.26_output.log` | 标准输出日志 |

## 🔧 管理命令

```bash
./start_6.26_import.sh start      # 启动导入
./start_6.26_import.sh stop       # 停止导入
./start_6.26_import.sh status     # 查看状态
./start_6.26_import.sh progress   # 查看进度
./start_6.26_import.sh logs       # 实时日志
./start_6.26_import.sh stats      # 统计数据
./start_6.26_import.sh clean      # 清理临时文件
```

## ⚙️ 技术配置

- **分块策略**: 智能分块（根据文件大小自动调整）
- **并发控制**: 逐个文件串行导入
- **重试机制**: 最多3次重试
- **断点续传**: 支持从中断处继续
- **进度跟踪**: 实时JSON统计
- **日志记录**: 双重日志（控制台+文件）

## 📈 预期结果

- ✅ 5个文件全部导入成功
- ✅ 1,898条记录全部导入
- ✅ 数据库记录数增加1,898条
- ✅ 导入成功率：100%

## 🎯 注意事项

1. **后台运行**: 导入脚本在后台执行，关闭终端不影响
2. **AI Drive**: 文件从 `/mnt/aidrive` 读取（访问较慢）
3. **断点续传**: 意外中断可重新运行继续导入
4. **日志保留**: 日志和统计文件会保留，便于追溯

---

**当前状态**: ✅ 配置完成，随时可以启动导入
