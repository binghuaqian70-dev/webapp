#!/bin/bash
###############################################################################
# 2.25数据汇总表批量导入启动脚本
# 功能：后台运行导入脚本，并提供进度监控功能
###############################################################################

SCRIPT_DIR="/home/user/webapp"
SCRIPT_NAME="optimized_batch_import.mjs"
OUTPUT_LOG="import_2.25_output.log"
PROGRESS_FILE="2_25_import_progress.json"
STATS_FILE="2_25_import_stats.json"
LOG_FILE="2_25_import.log"

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
    echo "  1.15数据汇总表批量导入管理脚本"
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
    
    print_msg "$BLUE" "🚀 启动1.15数据汇总表批量导入..."
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
    
    print_msg "$BLUE" "🛑 停止导入脚本..."
    
    # 查找并终止进程
    pkill -f "$SCRIPT_NAME"
    
    sleep 2
    
    if ! check_running; then
        print_msg "$GREEN" "✅ 导入脚本已停止"
        print_msg "$BLUE" "💡 进度已保存，可以稍后继续导入"
    else
        print_msg "$RED" "❌ 停止失败，请手动终止进程"
        return 1
    fi
}

# 查看运行状态
show_status() {
    echo "======================================================================"
    echo "  运行状态"
    echo "======================================================================"
    echo ""
    
    if check_running; then
        local pid=$(pgrep -f "$SCRIPT_NAME")
        print_msg "$GREEN" "✅ 运行中 (PID: $pid)"
        echo ""
        
        # 显示进程信息
        echo "进程信息:"
        ps aux | grep "$SCRIPT_NAME" | grep -v grep | awk '{printf "  PID: %s, CPU: %s%%, MEM: %s%%, 运行时间: %s\n", $2, $3, $4, $10}'
        echo ""
        
        # 显示文件状态
        echo "文件状态:"
        [ -f "$PROGRESS_FILE" ] && echo "  ✓ 进度文件: $PROGRESS_FILE" || echo "  ✗ 进度文件: 不存在"
        [ -f "$STATS_FILE" ] && echo "  ✓ 统计文件: $STATS_FILE" || echo "  ✗ 统计文件: 不存在"
        [ -f "$LOG_FILE" ] && echo "  ✓ 日志文件: $LOG_FILE ($(wc -l < "$LOG_FILE") 行)" || echo "  ✗ 日志文件: 不存在"
        
    else
        print_msg "$YELLOW" "⚠️  未运行"
        echo ""
        
        # 检查是否有遗留的进度文件
        if [ -f "$PROGRESS_FILE" ]; then
            print_msg "$BLUE" "💡 检测到进度文件，可以继续导入"
        fi
    fi
    
    echo ""
}

# 查看导入进度
show_progress() {
    cd "$SCRIPT_DIR" || exit 1
    
    echo "======================================================================"
    echo "  导入进度"
    echo "======================================================================"
    echo ""
    
    if [ ! -f "$STATS_FILE" ]; then
        print_msg "$YELLOW" "⚠️  统计文件不存在，导入可能尚未开始"
        return 1
    fi
    
    # 使用jq解析JSON（如果可用）
    if command -v jq &> /dev/null; then
        local stats=$(cat "$STATS_FILE")
        
        local totalFiles=$(echo "$stats" | jq -r '.totalFiles // 0')
        local processedFiles=$(echo "$stats" | jq -r '.processedFiles // 0')
        local currentFile=$(echo "$stats" | jq -r '.currentFile // "N/A"')
        local totalChunks=$(echo "$stats" | jq -r '.totalChunks // 0')
        local processedChunks=$(echo "$stats" | jq -r '.processedChunks // 0')
        local importedRecords=$(echo "$stats" | jq -r '.importedRecords // 0')
        local status=$(echo "$stats" | jq -r '.status // "unknown"')
        local startTime=$(echo "$stats" | jq -r '.startTime // "N/A"')
        
        # 计算进度百分比
        local fileProgress=0
        local chunkProgress=0
        [ "$totalFiles" -gt 0 ] && fileProgress=$(echo "scale=2; $processedFiles * 100 / $totalFiles" | bc)
        [ "$totalChunks" -gt 0 ] && chunkProgress=$(echo "scale=2; $processedChunks * 100 / $totalChunks" | bc)
        
        echo "📊 状态: $status"
        echo "⏰ 开始时间: $startTime"
        echo ""
        echo "📁 文件进度: $processedFiles/$totalFiles ($fileProgress%)"
        echo "📦 分块进度: $processedChunks/$totalChunks ($chunkProgress%)"
        echo "📈 已导入记录: $importedRecords 条"
        echo "📊 当前文件: $currentFile"
        
        # 预计剩余时间
        local estimatedTime=$(echo "$stats" | jq -r '.estimatedTimeRemaining // 0')
        if [ "$estimatedTime" -gt 0 ]; then
            local hours=$((estimatedTime / 3600))
            local minutes=$(((estimatedTime % 3600) / 60))
            echo "⏱️  预计剩余时间: ${hours}小时${minutes}分钟"
        fi
        
    else
        # 没有jq，直接显示JSON
        print_msg "$BLUE" "统计数据 (JSON):"
        cat "$STATS_FILE"
    fi
    
    echo ""
    echo "💡 使用 '$0 logs' 查看详细日志"
}

# 实时查看日志
show_logs() {
    cd "$SCRIPT_DIR" || exit 1
    
    if [ ! -f "$LOG_FILE" ]; then
        print_msg "$YELLOW" "⚠️  日志文件不存在"
        return 1
    fi
    
    print_msg "$BLUE" "📋 实时日志 (Ctrl+C 退出):"
    echo ""
    tail -f "$LOG_FILE"
}

# 查看统计数据
show_stats() {
    cd "$SCRIPT_DIR" || exit 1
    
    if [ ! -f "$STATS_FILE" ]; then
        print_msg "$YELLOW" "⚠️  统计文件不存在"
        return 1
    fi
    
    echo "======================================================================"
    echo "  统计数据"
    echo "======================================================================"
    echo ""
    
    if command -v jq &> /dev/null; then
        cat "$STATS_FILE" | jq '.'
    else
        cat "$STATS_FILE"
    fi
    
    echo ""
}

# 清理临时文件
clean_files() {
    cd "$SCRIPT_DIR" || exit 1
    
    if check_running; then
        print_msg "$RED" "❌ 导入脚本正在运行，请先停止"
        return 1
    fi
    
    print_msg "$BLUE" "🧹 清理临时文件..."
    
    local cleaned=0
    
    if [ -f "$PROGRESS_FILE" ]; then
        rm -f "$PROGRESS_FILE"
        echo "  ✓ 删除: $PROGRESS_FILE"
        ((cleaned++))
    fi
    
    if [ -f "$OUTPUT_LOG" ]; then
        rm -f "$OUTPUT_LOG"
        echo "  ✓ 删除: $OUTPUT_LOG"
        ((cleaned++))
    fi
    
    # 询问是否删除日志和统计文件
    read -p "是否删除日志和统计文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "$LOG_FILE" ]; then
            rm -f "$LOG_FILE"
            echo "  ✓ 删除: $LOG_FILE"
            ((cleaned++))
        fi
        
        if [ -f "$STATS_FILE" ]; then
            rm -f "$STATS_FILE"
            echo "  ✓ 删除: $STATS_FILE"
            ((cleaned++))
        fi
    fi
    
    if [ $cleaned -eq 0 ]; then
        print_msg "$YELLOW" "⚠️  没有文件需要清理"
    else
        print_msg "$GREEN" "✅ 已清理 $cleaned 个文件"
    fi
}

# 主逻辑
case "${1:-help}" in
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
    help|*)
        show_usage
        ;;
esac
