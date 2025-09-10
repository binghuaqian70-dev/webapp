#!/bin/bash

# 9.9数据汇总表导入进程管理脚本
# 支持启动、停止、重启、状态检查和日志查看

SCRIPT_NAME="optimized_batch_import.mjs"
PID_FILE="./9_9_import.pid"
LOG_FILE="./9_9_import.log"
STATS_FILE="./9_9_import_stats.json"
PROGRESS_FILE="./9_9_import_progress.json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_status() {
    echo -e "${BLUE}🔍 9.9数据汇总表导入状态检查${NC}"
    echo "=================================="
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}$1${NC}"
}

# 检查进程是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # 进程运行中
        else
            rm -f "$PID_FILE"  # 清理无效的PID文件
            return 1  # 进程未运行
        fi
    else
        return 1  # PID文件不存在
    fi
}

# 获取进程信息
get_process_info() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            ps -p "$pid" -o pid,ppid,pcpu,pmem,etime,cmd --no-headers
        fi
    fi
}

# 启动导入进程
start() {
    print_status
    
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_warning "导入进程已经运行中 (PID: $pid)"
        return 1
    fi
    
    print_info "🚀 启动9.9数据汇总表导入进程..."
    
    # 确保脚本存在
    if [ ! -f "$SCRIPT_NAME" ]; then
        print_error "导入脚本不存在: $SCRIPT_NAME"
        return 1
    fi
    
    # 后台启动进程
    nohup node "$SCRIPT_NAME" > /dev/null 2>&1 & 
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # 等待一会儿检查进程是否成功启动
    sleep 3
    
    if is_running; then
        print_success "导入进程启动成功 (PID: $pid)"
        print_info "📋 日志文件: $LOG_FILE"
        print_info "📊 统计文件: $STATS_FILE"
        print_info "🔄 进度文件: $PROGRESS_FILE"
        print_info ""
        print_info "💡 使用以下命令监控进度:"
        print_info "   ./start_9_9_import.sh status    # 查看详细状态"
        print_info "   ./start_9_9_import.sh logs      # 查看实时日志"
        print_info "   node check_9_9_import_status.mjs # 详细进度报告"
    else
        print_error "导入进程启动失败"
        rm -f "$PID_FILE"
        return 1
    fi
}

# 停止导入进程
stop() {
    print_status
    
    if ! is_running; then
        print_warning "导入进程未运行"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    print_info "🛑 停止导入进程 (PID: $pid)..."
    
    # 优雅停止 
    kill -TERM "$pid" 2>/dev/null
    
    # 等待进程停止
    local count=0
    while is_running && [ $count -lt 10 ]; do
        sleep 1
        ((count++))
    done
    
    # 如果还在运行，强制停止
    if is_running; then
        print_warning "优雅停止失败，强制终止进程..."
        kill -KILL "$pid" 2>/dev/null
        sleep 1
    fi
    
    if ! is_running; then
        print_success "导入进程已停止"
        rm -f "$PID_FILE"
    else
        print_error "无法停止导入进程"
        return 1
    fi
}

# 重启导入进程
restart() {
    print_info "🔄 重启导入进程..."
    stop
    sleep 2
    start
}

# 查看进程状态
status() {
    print_status
    
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_success "导入进程运行中 (PID: $pid)"
        echo "    PID    PPID %CPU %MEM     ELAPSED CMD"
        get_process_info
    else
        print_error "导入进程未运行"
    fi
    
    echo ""
    print_info "📁 相关文件状态:"
    
    # 检查文件状态
    for file in "$LOG_FILE" "$STATS_FILE" "$PROGRESS_FILE"; do
        if [ -f "$file" ]; then
            local size=$(du -h "$file" 2>/dev/null | cut -f1)
            local mtime=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1)
            print_success "  ✅ $file ($size, 修改时间: $mtime)"
        else
            print_error "  ❌ $file (不存在)"
        fi
    done
    
    echo ""
    print_info "📊 详细状态信息:"
    
    # 运行状态检查脚本
    if [ -f "check_9_9_import_status.mjs" ]; then
        node check_9_9_import_status.mjs
    else
        print_warning "状态检查脚本不存在: check_9_9_import_status.mjs"
    fi
}

# 查看日志
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_error "日志文件不存在: $LOG_FILE"
        return 1
    fi
    
    print_info "📋 查看导入日志 (最后50行):"
    echo "=================================="
    tail -50 "$LOG_FILE"
    echo "=================================="
    print_info "💡 使用 tail -f $LOG_FILE 查看实时日志"
}

# 查看实时日志
follow() {
    if [ ! -f "$LOG_FILE" ]; then
        print_error "日志文件不存在: $LOG_FILE"
        return 1
    fi
    
    print_info "📋 实时跟踪导入日志 (按 Ctrl+C 退出):"
    echo "=================================="
    tail -f "$LOG_FILE"
}

# 清理文件
clean() {
    print_info "🧹 清理导入相关文件..."
    
    if is_running; then
        print_error "进程正在运行，请先停止进程"
        return 1
    fi
    
    local files_to_clean=("$PID_FILE" "$LOG_FILE" "$STATS_FILE" "$PROGRESS_FILE")
    
    for file in "${files_to_clean[@]}"; do
        if [ -f "$file" ]; then
            rm -f "$file"
            print_info "  删除: $file"
        fi
    done
    
    print_success "清理完成"
}

# 显示帮助信息
help() {
    echo "9.9数据汇总表导入进程管理脚本"
    echo ""
    echo "使用方法: $0 {start|stop|restart|status|logs|follow|clean|help}"
    echo ""
    echo "命令说明:"
    echo "  start   - 启动导入进程"
    echo "  stop    - 停止导入进程" 
    echo "  restart - 重启导入进程"
    echo "  status  - 查看进程状态和详细信息"
    echo "  logs    - 查看日志 (最后50行)"
    echo "  follow  - 实时跟踪日志"
    echo "  clean   - 清理所有导入相关文件"
    echo "  help    - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start           # 启动导入"
    echo "  $0 status          # 检查状态"
    echo "  $0 logs            # 查看日志"
    echo "  $0 stop            # 停止导入"
}

# 主逻辑
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    follow)
        follow
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        help
        exit 1
        ;;
esac

exit $?