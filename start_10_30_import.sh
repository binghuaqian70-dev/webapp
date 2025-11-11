#!/bin/bash

# 10.30数据汇总表批量导入启动脚本
# 提供完整的预检查、用户确认和后台启动功能

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置常量
AI_DRIVE_PATH="/mnt/aidrive"
SCRIPT_NAME="optimized_batch_import.mjs"
LOG_FILE="10_30_import.log"
STATS_FILE="10_30_import_stats.json"
PROGRESS_FILE="10_30_import_progress.json"
STATUS_SCRIPT="check_10_30_import_status.mjs"

TARGET_FILES=(
    "10.30数据汇总表-part1.csv"
    "10.30数据汇总表-part2.csv"
    "10.30数据汇总表-part3.csv"
    "10.30数据汇总表-part4.csv"
)

# 工具函数
print_header() {
    echo -e "${BLUE}🚀 10.30数据汇总表批量导入系统${NC}"
    echo -e "${BLUE}==================================${NC}"
    echo ""
}

print_section() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}   ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}   ⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}   ❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}   📊 $1${NC}"
}

# 格式化文件大小
format_file_size() {
    local size=$1
    if command -v bc >/dev/null 2>&1; then
        if [ $size -lt 1024 ]; then
            echo "${size} B"
        elif [ $size -lt 1048576 ]; then
            echo "$(echo "scale=2; $size/1024" | bc) KB"
        elif [ $size -lt 1073741824 ]; then
            echo "$(echo "scale=2; $size/1048576" | bc) MB"
        else
            echo "$(echo "scale=2; $size/1073741824" | bc) GB"
        fi
    else
        echo "$(($size / 1024)) KB"
    fi
}

# 检查必需文件
check_required_files() {
    print_section "📋 系统预检查..."
    
    local missing_files=0
    
    # 检查脚本文件
    if [[ ! -f "$SCRIPT_NAME" ]]; then
        print_error "导入脚本不存在: $SCRIPT_NAME"
        missing_files=$((missing_files + 1))
    fi
    
    if [[ ! -f "$STATUS_SCRIPT" ]]; then
        print_warning "状态检查脚本不存在: $STATUS_SCRIPT"
    fi
    
    if [[ $missing_files -gt 0 ]]; then
        echo -e "${RED}❌ 系统检查失败，缺少必需文件${NC}"
        exit 1
    fi
}

# 检查目标文件
check_target_files() {
    print_section "📁 检查目标文件..."
    
    local existing_files=0
    local missing_files=0
    local total_size=0
    local missing_list=()
    
    for file in "${TARGET_FILES[@]}"; do
        local file_path="$AI_DRIVE_PATH/$file"
        if [[ -f "$file_path" ]]; then
            print_success "$file"
            existing_files=$((existing_files + 1))
            local size=$(stat -c%s "$file_path" 2>/dev/null || echo 0)
            total_size=$((total_size + size))
        else
            print_error "$file (缺失)"
            missing_files=$((missing_files + 1))
            missing_list+=("$file")
        fi
    done
    
    echo ""
    print_info "文件统计:"
    print_info "总文件数: ${#TARGET_FILES[@]}"
    print_info "存在文件: $existing_files"
    print_info "缺失文件: $missing_files"
    print_info "总文件大小: $(format_file_size $total_size)"
    
    if [[ $missing_files -gt 0 ]]; then
        echo ""
        print_error "以下文件缺失，导入无法继续:"
        for missing_file in "${missing_list[@]}"; do
            echo -e "${RED}     • $missing_file${NC}"
        done
        echo ""
        echo -e "${YELLOW}💡 解决方案:${NC}"
        echo -e "${YELLOW}   1. 确认文件已上传到 AI Drive${NC}"
        echo -e "${YELLOW}   2. 检查文件命名是否正确${NC}"
        echo -e "${YELLOW}   3. 验证文件路径: $AI_DRIVE_PATH${NC}"
        exit 1
    fi
}

# 显示导入配置
show_import_config() {
    echo ""
    print_section "⚙️ 导入配置:"
    print_info "导入方式: 逐个文件导入"
    print_info "分块策略: 智能分块 (100-150行/块，4文件优化)"
    print_info "重试机制: 最多3次重试"
    print_info "断点续传: 支持"
    print_info "进度追踪: 实时统计"
    print_info "价格精度: 6位小数"
    print_info "分块间延迟: 0.7秒"
    print_info "文件间延迟: 1.8秒"
}

# 检查现有进程
check_existing_process() {
    print_section "🔍 检查进程状态..."
    
    local existing_process=$(ps aux | grep "$SCRIPT_NAME" | grep -v grep | awk '{print $2}' | head -1)
    
    if [[ -n "$existing_process" ]]; then
        print_warning "检测到已有导入进程运行 (PID: $existing_process)"
        echo ""
        echo -e "${YELLOW}选择操作:${NC}"
        echo -e "${YELLOW}   1. 停止现有进程并重新开始${NC}"
        echo -e "${YELLOW}   2. 查看现有进程状态${NC}"
        echo -e "${YELLOW}   3. 退出${NC}"
        echo ""
        read -p "请输入选择 (1-3): " choice
        
        case $choice in
            1)
                echo -e "${YELLOW}正在停止现有进程...${NC}"
                kill $existing_process 2>/dev/null || true
                sleep 2
                print_success "现有进程已停止"
                ;;
            2)
                if [[ -f "$STATUS_SCRIPT" ]]; then
                    node "$STATUS_SCRIPT"
                else
                    print_warning "状态检查脚本不存在"
                fi
                exit 0
                ;;
            3)
                echo -e "${YELLOW}用户取消操作${NC}"
                exit 0
                ;;
            *)
                print_error "无效选择"
                exit 1
                ;;
        esac
    fi
}

# 用户确认
get_user_confirmation() {
    echo ""
    print_section "🚨 重要提醒:"
    echo -e "${YELLOW}   • 本次导入将处理 4 个分割文件${NC}"
    echo -e "${YELLOW}   • 导入过程可能需要较短时间 (预计5-10分钟)${NC}"
    echo -e "${YELLOW}   • 导入过程中请勿关闭终端或中断程序${NC}"
    echo -e "${YELLOW}   • 支持断点续传，意外中断后可重新运行${NC}"
    echo -e "${YELLOW}   • 建议在稳定的网络环境下运行${NC}"
    echo -e "${YELLOW}   • 4个文件比之前6个文件处理更快${NC}"
    echo ""
    
    echo -e "${CYAN}❓ 确认开始导入吗？${NC}"
    echo -e "${CYAN}   输入 'yes' 确认开始${NC}"
    echo -e "${CYAN}   输入其他内容取消${NC}"
    echo ""
    
    read -p "" confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        echo -e "${YELLOW}用户取消导入操作${NC}"
        exit 0
    fi
}

# 启动导入进程
start_import_process() {
    echo ""
    print_success "确认开始导入"
    echo ""
    
    print_section "🚀 启动10.30数据汇总表批量导入..."
    print_section "=================================="
    echo ""
    
    # 清理旧的日志和进度文件
    [[ -f "$LOG_FILE" ]] && rm -f "$LOG_FILE"
    [[ -f "$PROGRESS_FILE" ]] && rm -f "$PROGRESS_FILE"
    
    # 启动后台进程
    nohup node "$SCRIPT_NAME" > /dev/null 2>&1 &
    local import_pid=$!
    
    # 等待一下确保进程启动
    sleep 1
    
    if kill -0 $import_pid 2>/dev/null; then
        print_success "导入进程已启动 (PID: $import_pid)"
        echo ""
        print_info "导入日志将保存到: $LOG_FILE"
        print_info "可以使用以下命令监控进度:"
        echo -e "${CYAN}   node $STATUS_SCRIPT${NC}"
        echo ""
        print_section "📋 监控命令:"
        echo -e "${CYAN}   检查状态: node $STATUS_SCRIPT${NC}"
        echo -e "${CYAN}   查看日志: tail -f $LOG_FILE${NC}"
        echo -e "${CYAN}   停止进程: kill $import_pid${NC}"
        echo ""
        print_section "⏳ 导入过程已在后台开始，可以关闭此终端"
        print_section "🎯 请使用状态检查命令监控导入进度"
    else
        print_error "导入进程启动失败"
        exit 1
    fi
}

# 主函数
main() {
    print_header
    check_required_files
    check_target_files
    show_import_config
    check_existing_process
    get_user_confirmation
    start_import_process
}

# 运行主函数
main "$@"