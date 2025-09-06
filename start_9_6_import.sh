#!/bin/bash

# 9.6数据汇总表批量导入启动脚本
# 支持后台运行、进度监控、自动重启功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="/tmp/9_6_import_batch.log"
PID_FILE="/tmp/9_6_import.pid"

# 颜色输出函数
print_status() {
    echo -e "\033[1;34m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

# 清理函数
cleanup() {
    print_status "正在清理..."
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 检查是否有进程在运行
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # 进程正在运行
        else
            rm -f "$PID_FILE"
            return 1  # 进程不存在
        fi
    fi
    return 1  # PID文件不存在
}

# 停止运行中的导入
stop_import() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        print_warning "停止运行中的导入进程 (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 3
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "强制终止进程..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
        print_success "导入进程已停止"
    else
        print_status "没有运行中的导入进程"
    fi
}

# 显示状态
show_status() {
    print_status "=== 9.6数据汇总表导入状态 ==="
    
    if check_running; then
        local pid=$(cat "$PID_FILE")
        print_success "✅ 导入进程正在运行 (PID: $pid)"
        
        # 显示最近的日志
        if [ -f "$LOG_FILE" ]; then
            print_status "📋 最近日志 (最后10行):"
            tail -10 "$LOG_FILE" | sed 's/^/   /'
        fi
        
        # 检查进度
        if [ -f "9_6_import_stats.json" ]; then
            print_status "\n📊 实时进度:"
            node check_9_6_import_status.mjs
        fi
    else
        print_status "⏸️ 导入进程未运行"
        
        # 检查是否有进度文件
        if [ -f "9_6_import_progress.json" ]; then
            print_warning "🔄 发现断点续传文件，可从上次中断处继续"
        fi
    fi
}

# 启动导入
start_import() {
    if check_running; then
        print_error "❌ 导入进程已在运行中，请先停止或使用状态命令查看"
        exit 1
    fi
    
    print_status "🚀 启动9.6数据汇总表批量导入..."
    
    # 检查必要文件
    if [ ! -f "optimized_batch_import.mjs" ]; then
        print_error "❌ 找不到导入脚本: optimized_batch_import.mjs"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 显示启动信息
    print_status "📍 工作目录: $SCRIPT_DIR"
    print_status "📋 日志文件: $LOG_FILE" 
    print_status "🔧 进程文件: $PID_FILE"
    
    # 启动后台进程
    nohup node optimized_batch_import.mjs > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    # 等待一下确保进程启动
    sleep 2
    
    if kill -0 "$pid" 2>/dev/null; then
        print_success "✅ 导入进程已启动 (PID: $pid)"
        print_status "📋 使用以下命令监控进度:"
        print_status "   tail -f $LOG_FILE"
        print_status "   ./start_9_6_import.sh status"
        print_status "   node check_9_6_import_status.mjs"
    else
        print_error "❌ 导入进程启动失败"
        rm -f "$PID_FILE"
        if [ -f "$LOG_FILE" ]; then
            print_error "错误日志:"
            tail -20 "$LOG_FILE" | sed 's/^/   /'
        fi
        exit 1
    fi
}

# 主逻辑
case "${1:-start}" in
    "start")
        start_import
        ;;
    "stop")
        stop_import
        ;;
    "restart")
        stop_import
        sleep 2
        start_import
        ;;
    "status")
        show_status
        ;;
    "logs")
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            print_error "❌ 日志文件不存在: $LOG_FILE"
        fi
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动9.6数据导入 (默认)"
        echo "  stop    - 停止导入进程"
        echo "  restart - 重启导入进程" 
        echo "  status  - 查看导入状态和进度"
        echo "  logs    - 实时查看导入日志"
        exit 1
        ;;
esac