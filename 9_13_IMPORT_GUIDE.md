# 🚀 9.13数据汇总表导入系统使用指南

## 📋 系统概览

**系统版本**: 9.13数据汇总表批量导入系统  
**创建时间**: 2025年9月13日  
**适用范围**: AI Drive中10个CSV文件批量导入  
**文件格式**: `9.13数据汇总表-partX.csv` (part1到part10)  

## 🎯 核心特性

### ✨ 主要功能
- **批量导入**: 自动处理10个CSV分片文件
- **后台运行**: 支持nohup守护进程模式
- **断点续传**: 支持中断后从断点继续
- **进度跟踪**: 实时显示导入进度和统计
- **错误重试**: 自动重试失败的数据块
- **智能分块**: 根据文件大小自适应分块策略

### 🔧 技术特点
- **小规模优化**: 专为10文件设计的处理策略
- **高精度价格**: 支持6位小数价格精度
- **分阶段处理**: 2文件/批次，5个批次
- **稳定延迟**: 文件间2秒，批次间8秒
- **详细日志**: 完整的执行日志和统计数据

## 📁 系统文件结构

### 🔧 核心脚本文件
```
9.13导入系统/
├── optimized_batch_import.mjs      # 主导入脚本 (已更新为9.13版本)
├── start_9_13_import.sh           # 进程管理脚本
├── check_9_13_import_status.mjs   # 状态监控脚本
└── import_single_9_13_file.mjs    # 单文件导入工具
```

### 📊 数据和日志文件
```
运行数据/
├── 9_13_import.log                # 详细执行日志
├── 9_13_import_stats.json         # 统计数据文件
├── 9_13_import_progress.json      # 进度数据 (断点续传)
└── 9_13_import.pid               # 进程ID文件
```

## 🚀 快速开始

### 1. 环境准备
```bash
# 确保AI Drive中有9.13数据文件
ls /mnt/aidrive/9.13数据汇总表-utf8_part*.csv

# 检查文件完整性 (应该有part1到part10)
ls /mnt/aidrive/ | grep "9.13数据汇总表" | sort
```

### 2. 启动导入系统
```bash
# 启动批量导入 (后台运行)
./start_9_13_import.sh start

# 查看启动状态
./start_9_13_import.sh status
```

### 3. 监控导入进度
```bash
# 实时监控日志
./start_9_13_import.sh follow

# 查看详细状态
node check_9_13_import_status.mjs

# 查看历史日志
./start_9_13_import.sh logs
```

## 🔧 管理命令详解

### 进程管理 (start_9_13_import.sh)
```bash
# 基本命令
./start_9_13_import.sh start     # 启动导入进程
./start_9_13_import.sh stop      # 停止导入进程
./start_9_13_import.sh restart   # 重启导入进程
./start_9_13_import.sh status    # 显示详细状态
./start_9_13_import.sh logs      # 显示历史日志
./start_9_13_import.sh follow    # 实时跟踪日志
./start_9_13_import.sh help      # 显示帮助信息
```

### 状态监控
```bash
# 快速状态检查
node check_9_13_import_status.mjs

# 查看统计数据
cat 9_13_import_stats.json

# 查看进度文件
cat 9_13_import_progress.json
```

### 单文件导入 (调试和补充)
```bash
# 按part编号导入
node import_single_9_13_file.mjs part1
node import_single_9_13_file.mjs part5

# 按完整文件名导入
node import_single_9_13_file.mjs 9.13数据汇总表-utf8_part3.csv

# 显示帮助
node import_single_9_13_file.mjs
```

## 📊 系统配置说明

### 导入范围配置
- **文件范围**: part1 到 part10 (共10个文件)
- **文件模式**: `9.13数据汇总表-partX.csv`
- **批次大小**: 2个文件/批次 (小规模优化)
- **总批次数**: 5个批次

### 性能配置
- **文件间延迟**: 2秒 (稳定处理)
- **批次间延迟**: 8秒 (服务器恢复)
- **最大重试**: 3次/数据块
- **进度保存**: 每3个文件保存一次

### 分块策略
- **大文件 (>2000行)**: 80行/块
- **中文件 (1000-2000行)**: 100行/块
- **小文件 (500-1000行)**: 130行/块
- **微文件 (<500行)**: 200行/块

## ⏱️ 时间预估

### 预期导入时间
- **总文件数**: 10个
- **预估单文件时间**: 1-2分钟
- **预估总时长**: 8-12分钟
- **包含延迟时间**: 文件间20秒 + 批次间40秒

### 处理速度参考
- **基于9.10版本**: 629条记录/分钟
- **9.13优化预期**: 600-650条记录/分钟
- **实际速度**: 取决于文件大小和网络状况

## 📈 监控和统计

### 实时状态信息
```json
{
  "totalFiles": 10,
  "processedFiles": 5,
  "successFiles": 5,
  "failedFiles": 0,
  "totalRecords": 123456,
  "importedRecords": 5678,
  "startTime": "2025-09-13T10:00:00Z",
  "endTime": null,
  "estimatedTimeRemaining": 300
}
```

### 关键指标
- **完成进度**: processedFiles/totalFiles
- **成功率**: successFiles/(successFiles+failedFiles)
- **处理速度**: importedRecords/运行时间(分钟)
- **剩余时间**: 基于当前速度的预估

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 文件找不到
```bash
# 检查AI Drive连接
ls -la /mnt/aidrive/

# 检查文件名格式
ls /mnt/aidrive/ | grep "9.13数据汇总表"

# 文件名必须完全匹配: 9.13数据汇总表-partX.csv
```

#### 2. 进程启动失败
```bash
# 检查文件权限
chmod +x optimized_batch_import.mjs
chmod +x start_9_13_import.sh

# 检查依赖
node --version
```

#### 3. 导入中断
```bash
# 查看进程状态
./start_9_13_import.sh status

# 查看错误日志
tail -n 50 9_13_import.log

# 从断点继续
./start_9_13_import.sh restart
```

#### 4. 数据库连接问题
```bash
# 检查生产环境连接
curl https://fc9bc1cb.webapp-csv-import.pages.dev/api/health

# 检查认证信息
node check_9_13_import_status.mjs
```

### 错误代码说明
- **HTTP 401**: 认证失败，检查用户名密码
- **HTTP 500**: 服务器内部错误，稍后重试
- **ENOENT**: 文件不存在，检查文件路径
- **ECONNREFUSED**: 网络连接失败，检查网络

## 🔍 高级功能

### 断点续传机制
系统自动保存进度，支持以下场景的断点续传：
- 手动停止后重启
- 系统异常中断后恢复
- 网络中断后继续
- 单个文件失败后跳过

### 智能重试策略
- **数据块级重试**: 每个数据块最多重试3次
- **指数退避**: 重试间隔逐渐增加
- **失败隔离**: 单块失败不影响其他块
- **批次恢复**: 批次失败后自动重试

### 性能监控
- **CPU使用率**: 通过ps命令监控
- **内存占用**: 实时内存使用统计
- **网络延迟**: 请求响应时间跟踪
- **吞吐量**: 每分钟处理记录数

## 📝 最佳实践

### 使用建议
1. **首次使用**: 先用single file工具测试单个文件
2. **生产环境**: 在低峰期进行批量导入
3. **监控策略**: 使用follow命令实时监控日志
4. **备份策略**: 重要导入前先备份数据库

### 性能优化
1. **网络稳定**: 确保与生产环境网络连接稳定
2. **资源充足**: 保证足够的CPU和内存资源
3. **并发控制**: 避免同时运行多个导入进程
4. **时间选择**: 选择服务器负载较低的时间段

## 📞 支持和帮助

### 快速命令参考
```bash
# 一键启动监控
./start_9_13_import.sh start && ./start_9_13_import.sh follow

# 快速状态检查
./start_9_13_import.sh status

# 应急停止
./start_9_13_import.sh stop

# 错误诊断
tail -f 9_13_import.log | grep -E "(ERROR|WARN|失败)"
```

### 联系支持
如遇到问题，请提供以下信息：
- 错误日志: `9_13_import.log`
- 统计数据: `9_13_import_stats.json`
- 系统状态: `check_9_13_import_status.mjs` 输出
- 文件列表: `ls /mnt/aidrive/ | grep 9.13数据汇总表`

---

**文档版本**: 1.0  
**创建时间**: 2025年9月13日  
**适用系统**: 9.13数据汇总表导入系统  
**更新说明**: 基于9.10版本优化，适配10文件小规模导入