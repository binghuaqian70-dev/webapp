#!/bin/bash
###############################################################################
# 9.24数据汇总表批量导入启动脚本（优化版）
# 功能：后台启动optimized_batch_import_9_24.mjs，支持进度统计和断点续传
# 用法：
#   ./start_9_24_optimized_import.sh        # 交互式确认后启动
#   ./start_9_24_optimized_import.sh -y      # 跳过确认，直接后台启动
###############################################################################

SCRIPT_DIR="/home/user/webapp"
IMPORT_SCRIPT="optimized_batch_import_9_24.mjs"
LOG_FILE="9_24_import_nohup.log"
STATS_FILE="9_24_import_stats.json"
AUTO_YES=0

if [ "$1" == "-y" ] || [ "$1" == "--yes" ]; then
    AUTO_YES=1
fi

cd "$SCRIPT_DIR" || exit 1

echo "============================================"
echo "  9.24数据汇总表批量导入系统（优化版）"
echo "============================================"
echo ""

# 检查脚本是否存在
if [ ! -f "$IMPORT_SCRIPT" ]; then
    echo "❌ 错误：找不到导入脚本 $IMPORT_SCRIPT"
    exit 1
fi

# 检查AI Drive文件
echo "📂 检查AI Drive中的目标文件..."
MISSING_FILES=0
for i in {1..8}; do
    FILE="/mnt/aidrive/9.24数据汇总表-utf8_part_${i}.csv"
    if [ ! -f "$FILE" ]; then
        echo "   ⚠️ 文件不存在: 9.24数据汇总表-utf8_part_${i}.csv"
        MISSING_FILES=$((MISSING_FILES + 1))
    else
        SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
        LINES=$(wc -l < "$FILE" 2>/dev/null)
        echo "   ✅ part_${i}.csv ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo ${SIZE}B), 约${LINES}行)"
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo ""
    echo "⚠️ 警告：有 $MISSING_FILES 个文件缺失！"
    if [ $AUTO_YES -eq 0 ]; then
        echo "❓ 是否继续导入？(y/N)"
        read -r CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            echo "❌ 已取消导入"
            exit 0
        fi
    else
        echo "   -y 模式：忽略缺失文件，继续导入"
    fi
fi

echo ""
echo "🚀 准备启动导入..."
echo "   📄 导入脚本: $IMPORT_SCRIPT"
echo "   📊 统计文件: $STATS_FILE"
echo "   📝 后台日志: $LOG_FILE"
echo ""

if [ $AUTO_YES -eq 0 ]; then
    echo "❓ 确认启动9.24批量导入？(y/N)"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "❌ 已取消导入"
        exit 0
    fi
fi

# 启动导入（后台运行）
echo ""
echo "🎯 正在启动后台导入进程..."
nohup node "$IMPORT_SCRIPT" > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > /tmp/9_24_import.pid

echo "✅ 导入进程已启动！"
echo "   🆔 进程ID: $PID (已保存到 /tmp/9_24_import.pid)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 监控命令："
echo "   实时监控: tail -f $LOG_FILE"
echo "   查看进度: cat $STATS_FILE | jq ."
echo "   快速脚本: ./check_9_24_optimized_import.sh"
echo ""
echo "⏸️  停止导入: kill $PID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 等待几秒确保进程启动
sleep 2

# 检查进程是否还在运行
if ps -p $PID > /dev/null; then
    echo "✅ 导入进程运行正常"
    echo "💡 提示：您可以安全地关闭此终端，导入将继续在后台运行"
else
    echo "❌ 警告：导入进程可能已退出，请检查日志："
    echo "   cat $LOG_FILE"
fi

echo ""
