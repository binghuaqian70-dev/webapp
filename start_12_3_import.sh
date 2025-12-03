#!/bin/bash
# 12.3数据汇总表批量导入 - 后台启动脚本

echo "🚀 启动 12.3数据汇总表批量导入任务..."
echo "📍 导入目标: 生产环境 https://webapp-csv-import.pages.dev"
echo "📁 数据来源: /mnt/aidrive/12.3数据汇总表-utf8_part1.csv + part2.csv"
echo ""

# 检查是否已有进程在运行
if pgrep -f "optimized_batch_import.mjs" > /dev/null; then
    echo "⚠️  检测到导入任务已在运行中"
    echo "📊 使用以下命令查看进度:"
    echo "   ./check_12_3_import.sh"
    exit 1
fi

# 确保脚本有执行权限
chmod +x optimized_batch_import.mjs

# 后台运行导入脚本
nohup node optimized_batch_import.mjs > 12_3_import_nohup.log 2>&1 &
IMPORT_PID=$!

echo "✅ 导入任务已在后台启动 (PID: $IMPORT_PID)"
echo ""
echo "📊 查看实时进度:"
echo "   ./check_12_3_import.sh"
echo ""
echo "📋 查看详细日志:"
echo "   tail -f 12_3_import.log"
echo ""
echo "📈 查看后台输出:"
echo "   tail -f 12_3_import_nohup.log"
echo ""
echo "🛑 停止导入任务:"
echo "   kill $IMPORT_PID"
echo ""
echo "💾 进度文件: ./12_3_import_progress.json"
echo "📊 统计文件: ./12_3_import_stats.json"
