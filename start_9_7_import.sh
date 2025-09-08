#!/bin/bash
#
# 9.7数据汇总表批量导入进程管理脚本
# 支持启动、停止、重启、状态检查功能
# 100个文件的大规模导入专用脚本
#

SCRIPT_NAME="optimized_batch_import.mjs"
PID_FILE="./9_7_import.pid"
LOG_FILE="./9_7_import.log"
STATS_FILE="./9_7_import_stats.json"
PROGRESS_FILE="./9_7_import_progress.json"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_msg() {
    echo -e "${2:-$NC}$1${NC}"
}

# 检查进程是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            # PID文件存在但进程不在，清理PID文件
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 启动导入进程
start_import() {
    if is_running; then
        print_msg "❌ 导入进程已在运行 (PID: $(cat $PID_FILE))" $RED
        return 1
    fi
    
    print_msg "🚀 启动9.7数据汇总表批量导入..." $GREEN
    print_msg "📍 导入范围: part_01 到 part_100 (共100个文件)" $BLUE
    print_msg "📍 后台运行模式，支持断点续传" $BLUE
    
    # 启动后台进程
    nohup node "$SCRIPT_NAME" > "$LOG_FILE" 2>&1 &
    PID=$!
    
    # 保存PID
    echo $PID > "$PID_FILE"
    
    # 等待几秒检查进程是否成功启动
    sleep 3
    
    if is_running; then
        print_msg "✅ 导入进程启动成功 (PID: $PID)" $GREEN
        print_msg "📋 日志文件: $LOG_FILE" $BLUE
        print_msg "📊 统计文件: $STATS_FILE" $BLUE
        print_msg "💡 使用 '$0 status' 查看实时状态" $YELLOW
        print_msg "💡 使用 '$0 logs' 实时查看日志" $YELLOW
    else
        print_msg "❌ 导入进程启动失败" $RED
        return 1
    fi
}

# 停止导入进程
stop_import() {
    if ! is_running; then
        print_msg "⚠️ 导入进程未运行" $YELLOW
        return 0
    fi
    
    PID=$(cat "$PID_FILE")
    print_msg "🛑 停止导入进程 (PID: $PID)..." $YELLOW
    
    # 优雅停止
    kill $PID
    
    # 等待进程结束
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # 如果进程仍在运行，强制终止
    if ps -p $PID > /dev/null 2>&1; then
        print_msg "⚠️ 进程未响应，强制终止..." $YELLOW
        kill -9 $PID
        sleep 2
    fi
    
    # 清理PID文件
    rm -f "$PID_FILE"
    
    print_msg "✅ 导入进程已停止" $GREEN
}

# 重启导入进程
restart_import() {
    print_msg "🔄 重启导入进程..." $BLUE
    stop_import
    sleep 2
    start_import
}

# 显示进程状态
show_status() {
    print_msg "🔍 9.7数据汇总表导入状态检查" $BLUE
    echo "=================================="
    
    # 检查进程状态
    if is_running; then
        PID=$(cat "$PID_FILE")
        print_msg "✅ 导入进程运行中 (PID: $PID)" $GREEN
        
        # 显示进程信息
        if command -v ps >/dev/null 2>&1; then
            ps -p $PID -o pid,ppid,pcpu,pmem,etime,cmd 2>/dev/null
        fi
    else
        print_msg "❌ 导入进程未运行" $RED
    fi
    
    echo
    
    # 显示文件状态
    print_msg "📁 相关文件状态:" $BLUE
    for file in "$LOG_FILE" "$STATS_FILE" "$PROGRESS_FILE"; do
        if [ -f "$file" ]; then
            size=$(du -h "$file" | cut -f1)
            mtime=$(stat -c %y "$file" 2>/dev/null | cut -d'.' -f1 || stat -f %m "$file" 2>/dev/null)
            print_msg "  ✅ $file (${size}, 修改时间: ${mtime})" $GREEN
        else
            print_msg "  ❌ $file (不存在)" $RED
        fi
    done
    
    echo
    
    # 运行状态检查脚本
    if [ -f "check_9_7_import_status.mjs" ]; then
        print_msg "📊 详细状态信息:" $BLUE
        node check_9_7_import_status.mjs
    else
        print_msg "⚠️ 状态检查脚本不存在 (check_9_7_import_status.mjs)" $YELLOW
    fi
}

# 实时查看日志
show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_msg "❌ 日志文件不存在: $LOG_FILE" $RED
        return 1
    fi
    
    print_msg "📋 实时查看导入日志 (按 Ctrl+C 退出):" $BLUE
    echo "=================================="
    
    # 显示最后20行，然后实时跟踪
    tail -20f "$LOG_FILE"
}

# 显示帮助信息
show_help() {
    echo "9.7数据汇总表批量导入管理脚本"
    echo
    echo "用法: $0 {start|stop|restart|status|logs|help}"
    echo
    echo "命令说明:"
    echo "  start     - 启动导入进程 (后台运行)"
    echo "  stop      - 停止导入进程"
    echo "  restart   - 重启导入进程"
    echo "  status    - 查看详细状态信息"
    echo "  logs      - 实时查看导入日志"
    echo "  help      - 显示此帮助信息"
    echo
    echo "文件说明:"
    echo "  📋 日志文件: $LOG_FILE"
    echo "  📊 统计文件: $STATS_FILE"
    echo "  🔄 进度文件: $PROGRESS_FILE"
    echo "  🆔 PID文件: $PID_FILE"
    echo
    echo "特性:"
    echo "  ✅ 支持100个文件的大规模批量导入"
    echo "  ✅ 后台运行，支持断点续传"
    echo "  ✅ 实时进度统计和日志记录"
    echo "  ✅ 智能重试和错误恢复机制"
}

# 主逻辑
case "$1" in
    start)
        start_import
        ;;
    stop)
        stop_import
        ;;
    restart)
        restart_import
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_msg "❌ 无效的命令: $1" $RED
        echo
        show_help
        exit 1
        ;;
esac

exit 0