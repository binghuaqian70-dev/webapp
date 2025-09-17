#!/bin/bash

# 9.16数据汇总表导入系统进程管理脚本
# 支持启动、停止、重启、状态查询、日志查看等功能
# 适用于300个文件的大规模导入系统

SCRIPT_NAME="9.16数据汇总表导入系统 (大规模300文件)"
IMPORT_SCRIPT="./optimized_batch_import.mjs"
PID_FILE="./9_16_import.pid"
LOG_FILE="./9_16_import.log"
STATUS_SCRIPT="./check_9_16_import_status.mjs"
STATS_FILE="./9_16_import_stats.json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${CYAN}🚀 $SCRIPT_NAME 管理工具${NC}"
    echo -e "${CYAN}=====================================================${NC}"
    echo ""
    echo -e "${YELLOW}用法:${NC}"
    echo "  $0 {start|stop|restart|status|logs|follow|help}"
    echo ""
    echo -e "${YELLOW}命令说明:${NC}"
    echo -e "  ${GREEN}start${NC}   - 启动导入进程 (后台运行)"
    echo -e "  ${GREEN}stop${NC}    - 停止导入进程"
    echo -e "  ${GREEN}restart${NC} - 重启导入进程"
    echo -e "  ${GREEN}status${NC}  - 显示详细状态信息"
    echo -e "  ${GREEN}logs${NC}    - 显示历史日志 (最后100行)"
    echo -e "  ${GREEN}follow${NC}  - 实时跟踪日志输出"
    echo -e "  ${GREEN}help${NC}    - 显示此帮助信息"
    echo ""
    echo -e "${YELLOW}文件位置:${NC}"
    echo -e "  导入脚本: ${IMPORT_SCRIPT}"
    echo -e "  进程文件: ${PID_FILE}"
    echo -e "  日志文件: ${LOG_FILE}"
    echo -e "  统计文件: ${STATS_FILE}"
    echo ""
    echo -e "${YELLOW}大规模导入注意事项:${NC}"
    echo -e "  📊 文件数量: 300个 (part001到part300)"
    echo -e "  ⏱️ 预计时长: 2-4小时"
    echo -e "  🔄 批次处理: 每批5个文件，共60个批次"
    echo -e "  💾 进度保存: 每10个文件自动保存进度"
    echo -e "  🛡️ 断点续传: 支持中断后从断点继续"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 start     # 启动9.16数据导入"
    echo "  $0 status    # 查看导入状态"
    echo "  $0 follow    # 实时监控导入日志"
}

# 检查进程是否运行
check_running() {
    if [ -f "$PID_FILE" ]; then
        local PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0  # 进程正在运行
        else
            # PID文件存在但进程不运行，清理PID文件
            rm -f "$PID_FILE"
            return 1  # 进程未运行
        fi
    else
        return 1  # PID文件不存在
    fi
}

# 启动导入进程
start_import() {
    echo -e "${CYAN}🚀 启动 $SCRIPT_NAME${NC}"
    echo "====================================================="
    
    # 检查是否已经运行
    if check_running; then
        local PID=$(cat "$PID_FILE")
        echo -e "${YELLOW}⚠️ 导入进程已在运行中 (PID: $PID)${NC}"
        echo -e "${BLUE}💡 使用 '$0 status' 查看状态${NC}"
        return 1
    fi
    
    # 检查导入脚本是否存在
    if [ ! -f "$IMPORT_SCRIPT" ]; then
        echo -e "${RED}❌ 导入脚本不存在: $IMPORT_SCRIPT${NC}"
        return 1
    fi
    
    # 赋予执行权限
    chmod +x "$IMPORT_SCRIPT" 2>/dev/null
    
    # 显示启动信息
    echo -e "${GREEN}📋 启动配置:${NC}"
    echo "   脚本路径: $IMPORT_SCRIPT"
    echo "   日志文件: $LOG_FILE"
    echo "   PID文件: $PID_FILE"
    echo "   运行模式: 后台守护进程"
    echo ""
    
    # 大规模导入警告
    echo -e "${YELLOW}⚠️ 大规模导入警告:${NC}"
    echo "   📊 文件数量: 300个CSV文件"
    echo "   ⏱️ 预计时长: 2-4小时"
    echo "   💻 系统要求: 建议保持系统稳定运行"
    echo "   🔄 断点续传: 支持中断后继续导入"
    echo ""
    
    # 确认启动
    echo -e "${PURPLE}🤔 确认启动大规模导入吗? (y/N)${NC}"
    read -t 10 -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z "$REPLY" ]]; then
        echo -e "${YELLOW}❌ 用户取消启动${NC}"
        return 1
    fi
    
    # 启动进程 (使用nohup在后台运行)
    echo -e "${BLUE}🔄 正在启动导入进程...${NC}"
    nohup node "$IMPORT_SCRIPT" > /dev/null 2>&1 &
    local PID=$!
    
    # 等待一会确认进程启动
    sleep 3
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "$PID" > "$PID_FILE"
        echo -e "${GREEN}✅ 导入进程启动成功!${NC}"
        echo -e "${GREEN}   进程ID: $PID${NC}"
        echo -e "${GREEN}   状态: 运行中${NC}"
        echo ""
        echo -e "${YELLOW}💡 监控命令:${NC}"
        echo "   实时状态: $0 status"
        echo "   实时日志: $0 follow"
        echo "   停止导入: $0 stop"
        echo ""
        
        # 显示预估信息
        echo -e "${CYAN}📊 大规模导入预估:${NC}"
        echo "   文件范围: part001 到 part300"
        echo "   批次策略: 60个批次，每批5个文件"
        echo "   预计时长: 2-4小时 (含延迟和服务器恢复时间)"
        echo "   处理方式: 逐文件顺序导入，智能分块处理"
        echo ""
        
        echo -e "${PURPLE}🎯 建议监控方式:${NC}"
        echo "   1. 使用 '$0 follow' 实时查看日志"
        echo "   2. 定期使用 '$0 status' 检查进度"
        echo "   3. 保持系统稳定，避免不必要的重启"
        echo ""
        
        return 0
    else
        echo -e "${RED}❌ 导入进程启动失败!${NC}"
        rm -f "$PID_FILE"
        echo -e "${BLUE}💡 请检查日志文件: $LOG_FILE${NC}"
        return 1
    fi
}

# 停止导入进程
stop_import() {
    echo -e "${CYAN}🛑 停止 $SCRIPT_NAME${NC}"
    echo "====================================================="
    
    if ! check_running; then
        echo -e "${YELLOW}ℹ️ 导入进程未在运行${NC}"
        return 0
    fi
    
    local PID=$(cat "$PID_FILE")
    echo -e "${BLUE}🔄 正在停止导入进程 (PID: $PID)...${NC}"
    echo -e "${YELLOW}⚠️ 大规模导入停止中 - 等待当前批次完成...${NC}"
    
    # 发送终止信号
    kill -TERM "$PID" 2>/dev/null
    
    # 等待进程优雅退出 (大规模导入需要更长时间)
    local count=0
    while [ $count -lt 30 ]; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    
    # 如果进程仍在运行，强制终止
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 进程未响应，强制终止...${NC}"
        kill -KILL "$PID" 2>/dev/null
        sleep 2
    fi
    
    # 清理PID文件
    rm -f "$PID_FILE"
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${RED}❌ 进程停止失败!${NC}"
        return 1
    else
        echo -e "${GREEN}✅ 导入进程已停止${NC}"
        echo ""
        echo -e "${YELLOW}💡 提示:${NC}"
        echo "   查看日志: $0 logs"
        echo "   查看统计: cat $STATS_FILE"
        echo "   断点续传: 再次启动将从断点继续"
        return 0
    fi
}

# 重启导入进程
restart_import() {
    echo -e "${CYAN}🔄 重启 $SCRIPT_NAME${NC}"
    echo "====================================================="
    
    if check_running; then
        echo -e "${BLUE}🛑 正在停止当前进程...${NC}"
        stop_import
        sleep 3
    fi
    
    echo -e "${BLUE}🚀 重新启动进程...${NC}"
    start_import
}

# 显示状态信息
show_status() {
    echo -e "${CYAN}📊 $SCRIPT_NAME 状态报告${NC}"
    echo "==========================================================="
    
    # 检查进程状态
    if check_running; then
        local PID=$(cat "$PID_FILE")
        echo -e "${GREEN}🟢 进程状态: 运行中${NC}"
        echo -e "   进程ID: $PID"
        
        # 获取进程运行时间
        if command -v ps >/dev/null 2>&1; then
            local RUNTIME=$(ps -p "$PID" -o etime= 2>/dev/null | tr -d ' ')
            if [ -n "$RUNTIME" ]; then
                echo -e "   运行时间: $RUNTIME"
            fi
        fi
        
        # 获取CPU和内存使用
        if command -v ps >/dev/null 2>&1; then
            local CPU_MEM=$(ps -p "$PID" -o %cpu,%mem --no-headers 2>/dev/null | tr -d ' ')
            if [ -n "$CPU_MEM" ]; then
                echo -e "   资源使用: CPU/内存 $CPU_MEM"
            fi
        fi
    else
        echo -e "${YELLOW}🟡 进程状态: 未运行${NC}"
    fi
    
    echo ""
    
    # 调用详细状态脚本
    if [ -f "$STATUS_SCRIPT" ]; then
        chmod +x "$STATUS_SCRIPT" 2>/dev/null
        echo -e "${BLUE}📈 详细状态信息:${NC}"
        echo "-----------------------------------------------------------"
        node "$STATUS_SCRIPT" 2>/dev/null || echo -e "${YELLOW}⚠️ 详细状态获取失败${NC}"
    else
        echo -e "${YELLOW}⚠️ 详细状态脚本不存在: $STATUS_SCRIPT${NC}"
        
        # 简单文件状态检查
        echo -e "${BLUE}📁 文件状态:${NC}"
        if [ -f "$LOG_FILE" ]; then
            local LOG_SIZE=$(du -h "$LOG_FILE" 2>/dev/null | cut -f1)
            echo -e "   日志文件: 存在 ($LOG_SIZE)"
        else
            echo -e "   日志文件: ${YELLOW}不存在${NC}"
        fi
        
        if [ -f "$STATS_FILE" ]; then
            echo -e "   统计文件: 存在"
            if command -v jq >/dev/null 2>&1; then
                local PROCESSED=$(jq -r '.processedFiles // 0' "$STATS_FILE" 2>/dev/null)
                local TOTAL=$(jq -r '.totalFiles // 0' "$STATS_FILE" 2>/dev/null)
                if [ "$PROCESSED" != "null" ] && [ "$TOTAL" != "null" ]; then
                    echo -e "   导入进度: $PROCESSED/$TOTAL"
                fi
            fi
        else
            echo -e "   统计文件: ${YELLOW}不存在${NC}"
        fi
    fi
}

# 显示日志
show_logs() {
    echo -e "${CYAN}📝 $SCRIPT_NAME 日志 (最后100行)${NC}"
    echo "==========================================================="
    
    if [ -f "$LOG_FILE" ]; then
        tail -n 100 "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠️ 日志文件不存在: $LOG_FILE${NC}"
    fi
}

# 实时跟踪日志
follow_logs() {
    echo -e "${CYAN}📝 $SCRIPT_NAME 实时日志${NC}"
    echo "==========================================================="
    echo -e "${YELLOW}💡 按 Ctrl+C 退出监控${NC}"
    echo -e "${PURPLE}🎯 大规模导入监控中... (300个文件)${NC}"
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠️ 日志文件不存在，等待创建...${NC}"
        # 等待文件创建
        while [ ! -f "$LOG_FILE" ]; do
            sleep 1
        done
        tail -f "$LOG_FILE"
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
    restart)
        restart_import
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    follow)
        follow_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac