# 1.11数据汇总表批量导入 - 完整指南

## 🎯 项目概述

本项目是一个完整的批量CSV数据导入解决方案，用于将AI Drive中的1.11数据汇总表（8个分割CSV文件）导入到生产环境的商品数据库。

### 核心特性

- ✅ **批量导入**: 自动处理8个CSV文件（part1-part8）
- 🔄 **断点续传**: 支持中断后从上次位置继续
- 📊 **实时监控**: 显示文件进度、分块进度、导入记录数
- 🧠 **智能分块**: 根据文件大小自动调整分块策略
- 📝 **详细日志**: 所有操作记录到日志文件
- 🛡️ **错误重试**: 自动重试失败的请求（最多3次）
- 🎯 **后台运行**: 支持后台执行，不阻塞终端
- 🔧 **易于管理**: 提供完整的管理脚本

## 📁 文件清单

### 核心文件

| 文件名 | 说明 | 大小 |
|--------|------|------|
| `optimized_batch_import.mjs` | 主导入脚本（Node.js） | 25KB |
| `start_1.11_import.sh` | 管理脚本（可执行） | 9.4KB |
| `verify_1.11_setup.sh` | 环境验证脚本（可执行） | 5.8KB |

### 文档文件

| 文件名 | 说明 | 大小 |
|--------|------|------|
| `1.11_IMPORT_README.md` | 详细使用文档 | 7.8KB |
| `QUICK_START_1.11.md` | 快速开始指南 | 6.2KB |
| `1.11_IMPORT_SUMMARY.md` | 修改总结 | 5.4KB |
| `README_1.11_IMPORT.md` | 本文件（总览） | - |

### 运行时生成的文件

| 文件名 | 说明 |
|--------|------|
| `1_11_import.log` | 详细操作日志 |
| `1_11_import_stats.json` | 统计数据（JSON） |
| `1_11_import_progress.json` | 进度信息（用于断点续传） |
| `import_1.11_output.log` | 后台运行输出 |

## 🚀 快速开始（60秒上手）

### 1️⃣ 验证环境（可选但推荐）

```bash
cd /home/user/webapp
./verify_1.11_setup.sh
```

应该看到：
```
✅ 所有检查通过 (20/20) - 100%
🎉 环境配置完美！可以开始导入了
```

### 2️⃣ 启动导入

```bash
./start_1.11_import.sh start
```

### 3️⃣ 监控进度

```bash
# 方式1: 持续监控（推荐）
watch -n 5 ./start_1.11_import.sh progress

# 方式2: 手动查看
./start_1.11_import.sh progress

# 方式3: 实时日志
./start_1.11_import.sh logs
```

### 4️⃣ 等待完成

导入会自动完成，预计15-20分钟。

## 📊 目标数据

### 文件信息

| 文件名 | 大小 | 预计行数 | 状态 |
|--------|------|----------|------|
| 1.11数据汇总表-utf8_part1.csv | 25KB | ~400 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part2.csv | 25KB | ~400 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part3.csv | 27KB | ~430 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part4.csv | 29KB | ~460 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part5.csv | 29KB | ~460 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part6.csv | 29KB | ~450 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part7.csv | 29KB | ~450 | ✅ 已验证 |
| 1.11数据汇总表-utf8_part8.csv | 29KB | ~450 | ✅ 已验证 |
| **总计** | **225KB** | **~3500条** | ✅ 全部就绪 |

### 数据来源

- **位置**: `/mnt/aidrive/`（AI Drive）
- **格式**: UTF-8编码的CSV文件
- **分隔符**: 逗号
- **编码**: UTF-8

### 目标环境

- **生产环境**: https://webapp-csv-import.pages.dev
- **API端点**: `/api/products/import-csv`
- **认证方式**: JWT Bearer Token
- **数据库**: Cloudflare D1（生产环境）

## 🔧 管理命令

### 基本命令

```bash
# 启动导入（后台运行）
./start_1.11_import.sh start

# 停止导入
./start_1.11_import.sh stop

# 查看运行状态
./start_1.11_import.sh status

# 查看导入进度
./start_1.11_import.sh progress

# 实时查看日志（Ctrl+C退出）
./start_1.11_import.sh logs

# 查看统计数据
./start_1.11_import.sh stats

# 清理临时文件
./start_1.11_import.sh clean

# 显示帮助信息
./start_1.11_import.sh help
```

### 高级用法

```bash
# 持续监控进度（每5秒刷新）
watch -n 5 ./start_1.11_import.sh progress

# 搜索错误日志
grep "ERROR" 1_11_import.log

# 查看最后100行日志
tail -n 100 1_11_import.log

# 格式化查看统计数据
cat 1_11_import_stats.json | jq '.'

# 查看特定统计字段
cat 1_11_import_stats.json | jq '.processedFiles, .importedRecords'
```

## 📈 预期执行情况

### 时间估算

| 阶段 | 预计时间 | 说明 |
|------|----------|------|
| 启动&登录 | ~5秒 | 连接生产环境，验证凭据 |
| 文件检查 | ~10秒 | 扫描AI Drive中的8个文件 |
| 数据导入 | ~15分钟 | 分块导入所有数据 |
| 验证统计 | ~5秒 | 汇总结果，生成报告 |
| **总计** | **~15-20分钟** | 完全自动化执行 |

### 性能指标

- **处理速度**: 200-250条/分钟
- **分块大小**: 300行/块（智能调整）
- **总分块数**: 约16个分块
- **分块间延迟**: 0.6秒
- **文件间延迟**: 2秒
- **重试次数**: 最多3次
- **并发请求**: 1（顺序执行）

## 🔍 监控和统计

### 进度指标

- **文件进度**: 已完成文件数/总文件数（8个）
- **分块进度**: 已完成分块数/总分块数（约16个）
- **导入记录**: 已成功导入的记录数
- **当前文件**: 正在处理的文件名
- **预计剩余时间**: 基于平均速度计算

### 统计数据结构

```json
{
  "totalFiles": 8,
  "processedFiles": 0,
  "currentFile": "",
  "totalRecords": 0,
  "processedChunks": 0,
  "totalChunks": 0,
  "importedRecords": 0,
  "startTime": null,
  "endTime": null,
  "status": "pending",
  "estimatedTimeRemaining": 0,
  "fileResults": []
}
```

### 日志级别

- **INFO**: 正常操作信息
- **WARN**: 警告信息（重试、延迟等）
- **ERROR**: 错误信息（失败操作）

## 🛡️ 错误处理

### 自动重试机制

| 错误类型 | 重试次数 | 延迟策略 |
|----------|----------|----------|
| 网络错误 | 3次 | 3s → 6s → 9s |
| 服务器错误 (5xx) | 3次 | 3s → 6s → 9s |
| 速率限制 (429) | 3次 | 5s → 10s → 15s |

### 常见问题处理

#### 问题1: 导入失败

```bash
# 查看错误日志
grep "ERROR" 1_11_import.log | tail -20

# 重新启动（会自动从断点继续）
./start_1.11_import.sh start
```

#### 问题2: 进程卡住

```bash
# 停止进程
./start_1.11_import.sh stop

# 等待几秒
sleep 5

# 重新启动
./start_1.11_import.sh start
```

#### 问题3: 网络超时

```bash
# 脚本会自动重试，如果持续失败：
# 1. 检查生产环境状态
curl -I https://webapp-csv-import.pages.dev

# 2. 检查网络连接
ping -c 3 webapp-csv-import.pages.dev

# 3. 增加延迟时间（编辑脚本）
# DELAY_BETWEEN_CHUNKS = 1000  # 从600ms增加到1000ms
```

## ✅ 验证和测试

### 导入前验证

```bash
# 运行环境验证脚本
./verify_1.11_setup.sh

# 应该看到所有检查通过
```

### 导入中监控

```bash
# 方式1: 使用管理脚本
./start_1.11_import.sh progress

# 方式2: 查看日志
tail -f 1_11_import.log

# 方式3: 查看统计文件
watch -n 5 'cat 1_11_import_stats.json | jq "."'
```

### 导入后验证

```bash
# 1. 查看最终统计
./start_1.11_import.sh stats

# 2. 验证导入成功率
grep "总体导入成功率" 1_11_import.log

# 3. 检查数据库记录数
# 访问: https://webapp-csv-import.pages.dev/api/products?page=1&pageSize=1
```

## 📝 使用场景

### 场景1: 首次完整导入

```bash
# 1. 验证环境
./verify_1.11_setup.sh

# 2. 启动导入
./start_1.11_import.sh start

# 3. 监控进度
watch -n 5 ./start_1.11_import.sh progress

# 4. 等待完成
```

### 场景2: 断点续传

```bash
# 如果之前导入中断，直接重新启动即可
./start_1.11_import.sh start

# 脚本会自动检测进度文件并继续
```

### 场景3: 重新开始

```bash
# 1. 停止当前导入
./start_1.11_import.sh stop

# 2. 清理进度文件
./start_1.11_import.sh clean

# 3. 重新启动
./start_1.11_import.sh start
```

### 场景4: 后台运行

```bash
# 1. 启动后台导入
./start_1.11_import.sh start

# 2. 关闭终端（导入继续运行）

# 3. 重新连接后查看状态
./start_1.11_import.sh status
./start_1.11_import.sh progress
```

## 🎓 最佳实践

1. **首次使用前**
   - 阅读快速指南: `cat QUICK_START_1.11.md`
   - 运行环境验证: `./verify_1.11_setup.sh`

2. **执行导入时**
   - 使用后台运行: `./start_1.11_import.sh start`
   - 持续监控进度: `watch -n 5 ./start_1.11_import.sh progress`
   - 不要手动终止进程（如需停止，使用stop命令）

3. **导入完成后**
   - 保留日志文件用于审计
   - 验证数据库记录数
   - 检查导入成功率

4. **遇到问题时**
   - 查看详细日志: `./start_1.11_import.sh logs`
   - 搜索错误信息: `grep "ERROR" 1_11_import.log`
   - 使用断点续传继续导入

## 📞 获取帮助

### 文档资源

| 文档 | 用途 | 命令 |
|------|------|------|
| 快速指南 | 快速上手 | `cat QUICK_START_1.11.md` |
| 详细文档 | 完整说明 | `cat 1.11_IMPORT_README.md` |
| 修改总结 | 变更记录 | `cat 1.11_IMPORT_SUMMARY.md` |
| 管理帮助 | 命令说明 | `./start_1.11_import.sh help` |

### 调试信息

```bash
# 查看运行状态
./start_1.11_import.sh status

# 查看最新日志
tail -n 50 1_11_import.log

# 查看错误日志
grep "ERROR" 1_11_import.log

# 查看统计数据
cat 1_11_import_stats.json | jq '.'

# 查看进度文件
cat 1_11_import_progress.json | jq '.'
```

## 🔐 安全说明

- 用户名和密码配置在脚本中（生产环境）
- 使用JWT令牌进行API认证
- 所有API请求都需要授权
- 日志文件不包含敏感信息
- 进度文件和统计文件权限: 644

## 🎉 成功标志

当看到以下日志时，表示导入成功完成：

```
🎉 1.11数据汇总表批量导入完成！
================================================================================
✅ 成功处理文件: 8/8
📈 成功导入记录: 3,500 条
📊 预期记录数: 3,500 条
🗄️ 数据库最终记录数: XXX,XXX 条
⏱️ 总耗时: XX分XX秒
📊 总体导入成功率: 100.00%
🚀 平均处理速度: XXX 条/分钟
```

## 🔄 后续批次导入

如需导入其他批次的数据（如1.15、1.20等）：

1. 复制并重命名脚本
2. 修改配置（文件前缀、文件列表、日志路径）
3. 运行修改后的脚本

---

## ⚡ 立即开始

```bash
cd /home/user/webapp
./start_1.11_import.sh start
```

**祝导入顺利！** 🎉

---

*最后更新: 2026-01-11*  
*脚本版本: 1.0.0*  
*环境验证: ✅ 通过 (20/20)*
