# 🚀 9.3数据汇总表批量导入 - 使用指南

## ✅ 准备就绪状态
- **脚本状态**: ✅ 已修改完成
- **文件检测**: ✅ 找到100个完整文件
- **语法检查**: ✅ 通过
- **功能验证**: ✅ 8/8项检查通过

## 📋 导入配置概览
```
📊 文件信息:
   - 文件数量: 100个分片 (part_001 到 part_100)
   - 文件大小: 2.28 MB (平均23KB/文件)
   - 数据格式: name, company_name, price, stock
   
⚙️ 导入设置:
   - 批次大小: 2个文件/批次 (保守策略)
   - 文件延迟: 4秒/文件
   - 批次延迟: 20秒/批次
   - 分块大小: 20-30行动态调整
   - 重试次数: 5次
   
⏱️ 时间预估:
   - 总批次: 50批
   - 预估时间: 约50-60分钟
   - 进度保存: 每10个文件
```

## 🎯 立即开始导入

### 方法1：直接运行（推荐）
```bash
cd /home/user/webapp
node optimized_batch_import.mjs
```

### 方法2：后台运行
```bash
cd /home/user/webapp
nohup node optimized_batch_import.mjs > 9_3_import.log 2>&1 &
```

### 方法3：使用screen（推荐）
```bash
cd /home/user/webapp
screen -S import_9_3
node optimized_batch_import.mjs
# Ctrl+A+D 分离会话
# screen -r import_9_3 重新连接
```

## 🔍 导入监控

### 实时进度查看
```bash
# 查看日志（如果后台运行）
tail -f 9_3_import.log

# 查看进度文件
cat 9_3_import_progress.json

# 检查数据库状态
curl -s "https://fc9bc1cb.webapp-csv-import.pages.dev/api/products?page=1&pageSize=1" | jq '.pagination.total'
```

### 预期输出示例
```
🚀 9.3数据汇总表批量导入 - 100文件完整导入
📍 AI Drive: /mnt/aidrive
📍 生产环境: https://fc9bc1cb.webapp-csv-import.pages.dev
🎯 导入范围: part_001 到 part_100 (100 个文件)
⚙️ 配置: 每批2个文件, 保守分块大小(20-30行), 支持6位小数价格
⚙️ 延迟设置: 文件间4秒, 批次间20秒
⚙️ 预估时间: 总计约50分钟

🔐 正在登录生产环境...
✅ 登录成功
📊 初始记录数: XXX,XXX

📂 扫描9.3数据汇总表CSV文件...
📋 找到 100 个9.3数据汇总表文件
...
```

## ⚠️ 重要提醒

### 导入期间请勿
- ❌ 关闭终端窗口
- ❌ 中断网络连接
- ❌ 同时运行其他导入脚本

### 如果需要中断
1. **优雅停止**: 按 `Ctrl+C`
2. **查看进度**: `cat 9_3_import_progress.json`
3. **继续导入**: 重新运行脚本，会自动从断点继续

### 故障恢复
```bash
# 如果进度文件损坏，重新开始
rm -f 9_3_import_progress.json
node optimized_batch_import.mjs

# 检查服务器状态
curl https://fc9bc1cb.webapp-csv-import.pages.dev/api/products?page=1&pageSize=1
```

## 📈 成功标准
- ✅ 95%+ 导入成功率
- ✅ 数据库记录数显著增加
- ✅ 所有100个文件处理完成
- ✅ 自动清理进度文件

---

**准备好了吗？运行以下命令开始导入：**
```bash
cd /home/user/webapp && node optimized_batch_import.mjs
```