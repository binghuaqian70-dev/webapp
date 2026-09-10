#!/bin/bash
###############################################################################
# 8.17数据汇总表批量导入 - 一键启动向导（优化版）
# 功能：集成验证、启动、监控的完整工作流
###############################################################################

clear
echo "╔══════════════════════════════════════════╗"
echo "║  8.17数据汇总表批量导入向导（优化版）  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Step 1: 系统验证
echo "📋 [步骤 1/3] 系统验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./verify_8_17_optimized_system.sh
VERIFY_RESULT=$?

if [ $VERIFY_RESULT -ne 0 ]; then
    echo ""
    echo "❌ 系统验证失败！请先解决上述问题"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: 启动导入
echo "🚀 [步骤 2/3] 启动导入"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "❓ 是否清除旧的进度文件并重新开始？(y/N)"
read -r CLEAN_PROGRESS

if [ "$CLEAN_PROGRESS" = "y" ] || [ "$CLEAN_PROGRESS" = "Y" ]; then
    echo "🧹 清除旧的进度文件..."
    rm -f 8_17_import_progress.json 8_17_import_stats.json 8_17_import.log 8_17_import_nohup.log
    echo "✅ 清除完成"
fi

echo ""
./start_8_17_optimized_import.sh
START_RESULT=$?

if [ $START_RESULT -ne 0 ]; then
    echo ""
    echo "❌ 导入启动失败！"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: 监控选项
echo "📊 [步骤 3/3] 监控选项"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "选择监控方式:"
echo "  1) 实时日志 (tail -f)"
echo "  2) 进度监控 (每2秒刷新)"
echo "  3) 稍后监控 (退出)"
echo ""
echo -n "请选择 [1-3]: "
read -r MONITOR_CHOICE

case $MONITOR_CHOICE in
    1)
        echo ""
        echo "📝 按 Ctrl+C 退出日志查看..."
        sleep 2
        tail -f 8_17_import.log
        ;;
    2)
        echo ""
        echo "📊 按 Ctrl+C 退出进度监控..."
        sleep 2
        watch -n 2 ./check_8_17_optimized_import.sh
        ;;
    3)
        echo ""
        echo "✅ 导入已在后台运行"
        echo ""
        echo "💡 稍后查看进度:"
        echo "   ./check_8_17_optimized_import.sh"
        echo ""
        ;;
    *)
        echo ""
        echo "⚠️ 无效选择，跳过监控"
        echo ""
        ;;
esac

echo "╔══════════════════════════════════════════╗"
echo "║           导入系统启动完成               ║"
echo "╚══════════════════════════════════════════╝"
