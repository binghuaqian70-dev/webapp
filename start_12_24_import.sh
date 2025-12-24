#!/bin/bash
# 12.24数据汇总表批量导入启动脚本
# 后台运行导入任务，支持进度跟踪

echo "🚀 启动12.24数据汇总表批量导入任务..."
echo "📁 文件数量: 3个 (12.24数据汇总表-utf8_part1.csv 到 part3.csv)"
echo "📍 AI Drive路径: /mnt/aidrive"
echo "🎯 目标环境: https://webapp-csv-import.pages.dev (生产环境)"
echo ""

# 检查脚本是否存在
if [ ! -f "optimized_batch_import.mjs" ]; then
    echo "❌ 错误: 找不到 optimized_batch_import.mjs 脚本"
    exit 1
fi

# 后台运行导入脚本
nohup node optimized_batch_import.mjs > 12_24_import.log 2>&1 &
PID=$!

echo "✅ 导入任务已在后台启动 (PID: $PID)"
echo ""
echo "📋 查看实时进度:"
echo "   ./check_12_24_import.sh"
echo ""
echo "📋 查看详细日志:"
echo "   tail -f 12_24_import.log"
echo ""
echo "⏹️  停止导入任务:"
echo "   kill $PID"
echo ""
echo "💡 提示: 导入任务在后台运行，您可以关闭终端"
echo "💡 进度保存在: ./12_24_import_progress.json"
echo "💡 统计数据保存在: ./12_24_import_stats.json"
