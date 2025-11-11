# 11.11数据批量导入系统 - 快速使用指南

## 📋 系统概述

这是一个专为11.11数据汇总表设计的批量导入系统，支持从AI Drive导入10个CSV分割文件到生产环境数据库。

### 🎯 系统特性

- ✅ **多文件批量导入**: 支持10个CSV文件顺序导入
- ✅ **智能分块**: 根据文件大小自动调整块大小（100-200行/块）
- ✅ **断点续传**: 支持从上次中断处继续导入
- ✅ **后台运行**: 使用nohup后台执行，不会因终端关闭而中断
- ✅ **实时进度**: 详细的进度统计和日志记录
- ✅ **错误重试**: 自动重试机制，最多3次重试
- ✅ **6位小数精度**: 完整支持价格的6位小数精度

---

## 📁 文件结构

```
webapp/
├── optimized_batch_import.mjs          # 主导入脚本
├── check_11_11_import_status.mjs       # 状态检查脚本
├── start_11_11_import.sh               # 一键启动脚本
├── verify_11_11_system.sh              # 系统验证脚本
├── 11_11_import.log                    # 详细日志文件（运行时生成）
├── 11_11_import.log.console            # 控制台日志（运行时生成）
├── 11_11_import_progress.json          # 进度文件（运行时生成）
└── 11_11_import_stats.json             # 统计文件（运行时生成）
```

---

## 🚀 快速开始

### 1️⃣ 准备CSV文件

确保以下10个CSV文件已上传到AI Drive (`/mnt/aidrive/`)：

```
11.11数据汇总表-utf8_part01.csv
11.11数据汇总表-utf8_part02.csv
11.11数据汇总表-utf8_part03.csv
11.11数据汇总表-utf8_part04.csv
11.11数据汇总表-utf8_part05.csv
11.11数据汇总表-utf8_part06.csv
11.11数据汇总表-utf8_part07.csv
11.11数据汇总表-utf8_part08.csv
11.11数据汇总表-utf8_part09.csv
11.11数据汇总表-utf8_part10.csv
```

### 2️⃣ 验证系统准备

```bash
cd /home/user/webapp
bash verify_11_11_system.sh
```

**预期输出**：
- ✅ 所有脚本文件存在
- ✅ 10个CSV文件全部存在
- ✅ Node.js环境正常
- ✅ 生产环境连接正常

### 3️⃣ 启动导入

```bash
bash start_11_11_import.sh
```

**启动脚本会执行以下步骤**：
1. 检查系统环境（Node.js、脚本文件）
2. 验证AI Drive文件（10个CSV文件）
3. 测试生产环境连接
4. 检查并清理旧进程
5. 处理现有导入记录（断点续传或重新开始）
6. 启动后台导入进程

### 4️⃣ 监控导入进度

**查看实时日志**：
```bash
tail -f 11_11_import.log
```

**查看导入状态**：
```bash
node check_11_11_import_status.mjs
```

**查看进程状态**：
```bash
ps aux | grep optimized_batch_import.mjs | grep -v grep
```

---

## 📊 导入配置参数

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **生产环境URL** | `https://webapp-csv-import.pages.dev` | 生产环境地址 |
| **目标文件数** | 10个 | part01 到 part10 |
| **块大小** | 100-200行 | 根据文件大小智能调整 |
| **块间延迟** | 600ms | 分块之间的延迟 |
| **文件间延迟** | 2000ms | 文件之间的延迟 |
| **最大重试次数** | 3次 | 失败后自动重试 |
| **进度保存间隔** | 每3个块 | 定期保存进度 |

---

## 📈 监控和日志

### 日志文件说明

1. **`11_11_import.log`** - 详细导入日志
   - 记录每个文件、每个块的处理情况
   - 记录成功/失败的详细信息
   - 记录时间戳和进度信息

2. **`11_11_import.log.console`** - 控制台输出日志
   - 捕获标准输出和错误输出
   - 用于调试和问题排查

3. **`11_11_import_progress.json`** - 进度文件
   - 记录当前处理的文件和块
   - 支持断点续传
   - 导入完成后自动清理

4. **`11_11_import_stats.json`** - 统计文件
   - 记录总体进度和统计信息
   - 记录每个文件的处理结果
   - 记录开始/结束时间和总耗时

### 状态检查脚本输出

运行 `node check_11_11_import_status.mjs` 会显示：

- **📂 AI Drive文件状态**: 所有CSV文件的存在情况和大小
- **📊 导入进度**: 当前处理的文件和块
- **📈 统计信息**: 已导入记录数、总进度、预计剩余时间
- **🔍 进程状态**: 导入进程是否正在运行
- **📝 日志预览**: 最近20行日志

---

## 🔧 常见操作

### 停止导入进程

```bash
# 查找进程ID
ps aux | grep optimized_batch_import.mjs | grep -v grep

# 停止进程（替换PID为实际进程ID）
kill <PID>
```

### 从断点继续导入

如果导入中断，重新运行启动脚本会自动从上次中断处继续：

```bash
bash start_11_11_import.sh
# 选择 "y" 来从断点继续
```

### 重新开始导入

```bash
# 清理所有导入记录
rm -f 11_11_import.log 11_11_import.log.console
rm -f 11_11_import_progress.json 11_11_import_stats.json

# 重新启动
bash start_11_11_import.sh
```

### 手动运行导入脚本

```bash
# 直接运行（前台）
node optimized_batch_import.mjs

# 后台运行
nohup node optimized_batch_import.mjs > 11_11_import.log.console 2>&1 &
```

---

## ⏱️ 预计导入时间

基于以往经验和当前配置：

| 因素 | 估计值 |
|------|--------|
| **文件数量** | 10个文件 |
| **平均每个文件** | 约500-1000条记录 |
| **总记录数** | 预计5,000-10,000条 |
| **平均处理速度** | 约300-400条/分钟 |
| **预计总耗时** | 约15-30分钟 |

**实际时间可能受以下因素影响**：
- 网络延迟
- 服务器负载
- CSV文件大小
- 数据复杂度

---

## 🚨 故障排查

### 问题1: 脚本启动失败

**症状**: 运行启动脚本后立即退出

**解决方案**:
```bash
# 检查Node.js版本
node --version

# 检查脚本权限
ls -l optimized_batch_import.mjs

# 添加执行权限
chmod +x optimized_batch_import.mjs
```

### 问题2: 找不到CSV文件

**症状**: 验证脚本显示文件不存在

**解决方案**:
```bash
# 检查AI Drive挂载
ls -la /mnt/aidrive/

# 检查文件名是否正确
ls -la /mnt/aidrive/ | grep "11.11数据汇总表"
```

### 问题3: 生产环境连接失败

**症状**: 无法连接到生产环境

**解决方案**:
```bash
# 测试网络连接
curl -I https://webapp-csv-import.pages.dev

# 检查URL是否正确
# 如果URL变更，需要修改脚本中的PRODUCTION_URL
```

### 问题4: 导入中途停止

**症状**: 进程意外退出

**解决方案**:
```bash
# 查看错误日志
tail -50 11_11_import.log.console

# 查看详细日志
tail -100 11_11_import.log

# 从断点继续
bash start_11_11_import.sh
```

### 问题5: 进度文件损坏

**症状**: 无法读取进度文件

**解决方案**:
```bash
# 删除损坏的文件并重新开始
rm -f 11_11_import_progress.json
bash start_11_11_import.sh
```

---

## 📝 导入完成后

### 验证导入结果

1. **查看最终统计**:
```bash
cat 11_11_import_stats.json
```

2. **检查数据库记录数**:
```bash
# 通过生产环境API查询
curl "https://webapp-csv-import.pages.dev/api/products?page=1&limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **查看最新导入的产品**:
```bash
# 在生产环境中按更新时间排序查看
```

### 清理临时文件（可选）

```bash
# 保留统计文件，删除其他临时文件
rm -f 11_11_import.log 11_11_import.log.console
rm -f 11_11_import_progress.json

# 或全部清理
rm -f 11_11_import*
```

---

## 🔒 安全注意事项

1. **凭据管理**: 脚本中包含生产环境凭据，请勿分享或提交到公共仓库
2. **数据备份**: 导入前建议备份生产数据库
3. **测试验证**: 首次使用建议先测试单个文件导入
4. **监控进度**: 导入过程中定期检查进度和日志

---

## 📞 支持和反馈

如遇到问题或需要帮助：

1. 查看详细日志文件 (`11_11_import.log`)
2. 运行状态检查脚本 (`node check_11_11_import_status.mjs`)
3. 检查本文档的故障排查部分
4. 联系系统管理员

---

## 🎉 总结

11.11数据批量导入系统提供了一套完整的工具链，从验证、启动到监控，让批量导入变得简单可靠。通过智能分块、断点续传和详细日志，确保数据导入的稳定性和可追踪性。

**推荐工作流程**：
1. ✅ 验证系统 → 2. 🚀 启动导入 → 3. 👀 监控进度 → 4. ✔️ 验证结果

祝导入顺利！🎊
