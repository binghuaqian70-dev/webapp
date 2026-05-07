#!/bin/bash
###############################################################################
# 5.7数据汇总表批量导入启动脚本
# 功能：后台运行导入脚本，并提供进度监控功能
###############################################################################

SCRIPT_DIR="/home/user/webapp"
SCRIPT_NAME="optimized_batch_import.mjs"
OUTPUT_LOG="import_5.7_output.log"
PROGRESS_FILE="5_7_import_progress.json"
STATS_FILE="5_7_import_stats.json"
LOG_FILE="5_7_import.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

# 检查脚本是否正在运行
check_running() {
    if pgrep -f "$SCRIPT_NAME" > /dev/null; then
        return 0  # 正在运行
    else
        return 1  # 未运行
    fi
}

# 显示使用说明
show_usage() {
    echo "======================================================================"
    echo "  5.7数据汇总表批量导入管理脚本"
    echo "======================================================================"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start      - 启动导入脚本（后台运行）"
    echo "  stop       - 停止导入脚本"
    echo "  status     - 查看运行状态"
    echo "  progress   - 查看导入进度"
    echo "  logs       - 实时查看日志"
    echo "  stats      - 查看统计数据"
    echo "  clean      - 清理临时文件"
    echo "  help       - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start              # 启动导入"
    echo "  $0 progress           # 查看进度"
    echo "  $0 logs               # 查看日志"
    echo ""
}

# 启动导入
start_import() {
    cd "$SCRIPT_DIR" || exit 1
    
    if check_running; then
        print_msg "$YELLOW" "⚠️  导入脚本已在运行中"
        return 1
    fi
    
    print_msg "$BLUE" "🚀 启动5.7数据汇总表批量导入..."
    print_msg "$BLUE" "📍 工作目录: $SCRIPT_DIR"
    print_msg "$BLUE" "📝 输出日志: $OUTPUT_LOG"
    print_msg "$BLUE" "📊 详细日志: $LOG_FILE"
    echo ""
    
    # 后台运行脚本
    nohup node "$SCRIPT_NAME" > "$OUTPUT_LOG" 2>&1 &
    local pid=$!
    
    sleep 2
    
    if check_running; then
        print_msg "$GREEN" "✅ 导入脚本已启动 (PID: $pid)"
        print_msg "$BLUE" "💡 使用以下命令查看进度:"
        echo "   $0 progress   # 查看实时进度"
        echo "   $0 logs       # 查看详细日志"
        echo "   $0 stats      # 查看统计数据"
    else
        print_msg "$RED" "❌ 启动失败，请检查日志: $OUTPUT_LOG"
        return 1
    fi
}

# 停止导入
stop_import() {
    if ! check_running; then
        print_msg "$YELLOW" "⚠️  导入脚本未运行"
        return 1
    fi
    
    print_msg "$YELLOW" "🛑 正在停止导入脚本..."
    pkill -f "$SCRIPT_NAME"
    sleep 2
    
    if ! check_running; then
        print_msg "$GREEN" "✅ 导入脚本已停止"
    else
        print_msg "$RED" "❌ 停止失败"
        return 1
    fi
}

# 查看状态
show_status() {
    if check_running; then
        local pid=$(pgrep -f "$SCRIPT_NAME")
        print_msg "$GREEN" "✅ 导入脚本正在运行 (PID: $pid)"
        
        if [ -f "$STATS_FILE" ]; then
            echo ""
            print_msg "$BLUE" "📊 最新状态:"
            cat "$STATS_FILE" | grep -E '"processedFiles"|"totalFiles"|"currentFile"|"status"' || echo "无统计数据"
        fi
    else
        print_msg "$YELLOW" "⚠️  导入脚本未运行"
    fi
}

# 查看进度
show_progress() {
    if [ ! -f "$STATS_FILE" ]; then
        print_msg "$YELLOW" "⚠️  统计文件不存在"
        return 1
    fi
    
    print_msg "$BLUE" "📊 5.7数据汇总表导入进度"
    echo "======================================================================"
    cat "$STATS_FILE"
    echo ""
    echo "======================================================================"
}

# 查看日志
show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_msg "$YELLOW" "⚠️  日志文件不存在"
        return 1
    fi
    
    print_msg "$BLUE" "📝 实时日志 (Ctrl+C 退出):"
    echo "======================================================================"
    tail -f "$LOG_FILE"
}

# 查看统计
show_stats() {
    if [ ! -f "$STATS_FILE" ]; then
        print_msg "$YELLOW" "⚠️  统计文件不存在"
        return 1
    fi
    
    print_msg "$BLUE" "📈 导入统计数据"
    echo "======================================================================"
    cat "$STATS_FILE" | python3 -m json.tool 2>/dev/null || cat "$STATS_FILE"
    echo ""
    echo "======================================================================"
}

# 清理临时文件
clean_files() {
    print_msg "$YELLOW" "🧹 清理临时文件..."
    
    rm -f "$PROGRESS_FILE" 2>/dev/null
    rm -f "$OUTPUT_LOG" 2>/dev/null
    
    print_msg "$GREEN" "✅ 临时文件已清理 (保留日志和统计文件)"
}

# 主逻辑
case "$1" in
    start)
        start_import
        ;;
    stop)
        stop_import
        ;;
    status)
        show_status
        ;;
    progress)
        show_progress
        ;;
    logs)
        show_logs
        ;;
    stats)
        show_stats
        ;;
    clean)
        clean_files
        ;;
    help|--help|-h|"")
        show_usage
        ;;
    *)
        print_msg "$RED" "❌ 未知选项: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
