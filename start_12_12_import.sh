#!/bin/bash
# 12.12数据汇总表批量导入启动脚本
# 支持50个文件(part_01 到 part_50)的后台批量导入

echo "🚀 启动12.12数据汇总表批量导入任务..."
echo "📁 文件数量: 50个 (12.12数据汇总表-utf8_part_01.csv 到 part_50.csv)"
echo "📍 AI Drive路径: /mnt/aidrive"
echo "🎯 目标环境: https://webapp-csv-import.pages.dev (生产环境)"
echo ""

# 进入项目目录
cd /home/user/webapp

# 清理旧的nohup日志
if [ -f "12_12_import_nohup.log" ]; then
    rm 12_12_import_nohup.log
    echo "🧹 已清理旧的nohup日志"
fi

# 后台启动导入脚本
nohup node optimized_batch_import.mjs > 12_12_import_nohup.log 2>&1 &
PID=$!

echo "✅ 导入任务已在后台启动 (PID: $PID)"
echo ""
echo "📋 查看实时进度:"
echo "   ./check_12_12_import.sh"
echo ""
echo "📋 查看详细日志:"
echo "   tail -f 12_12_import.log"
echo ""
echo "⏹️  停止导入任务:"
echo "   kill $PID"
echo ""
echo "💡 提示: 导入任务在后台运行，您可以关闭终端"
echo "💡 进度保存在: ./12_12_import_progress.json"
echo "💡 统计数据保存在: ./12_12_import_stats.json"
