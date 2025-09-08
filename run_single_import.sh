#!/bin/bash
#
# 9.7数据汇总表单文件导入管理脚本
# 支持导入失败或遗漏的单个文件
#

SCRIPT_NAME="import_single_9_7_file.mjs"
LOG_FILE="./single_import.log"

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

# 检查AI Drive中的9.7文件
check_files() {
    print_msg "🔍 检查AI Drive中的9.7数据汇总表文件..." $BLUE
    echo "================================================="
    
    if [ ! -d "/mnt/aidrive" ]; then
        print_msg "❌ AI Drive目录不存在: /mnt/aidrive" $RED
        return 1
    fi
    
    # 查找所有9.7数据汇总表文件
    local files=$(ls /mnt/aidrive/9.7数据汇总表-utf8_part_*.csv 2>/dev/null || true)
    
    if [ -z "$files" ]; then
        print_msg "❌ 未找到9.7数据汇总表文件" $RED
        return 1
    fi
    
    print_msg "✅ 找到以下9.7数据汇总表文件:" $GREEN
    echo
    
    for file in $files; do
        local filename=$(basename "$file")
        local size=$(ls -lh "$file" | awk '{print $5}')
        local part=$(echo "$filename" | grep -o 'part_[0-9]*')
        printf "  %-40s | %8s | %s\n" "$filename" "$size" "$part"
    done
    
    echo
    local count=$(echo "$files" | wc -l)
    print_msg "📊 总计: $count 个文件" $BLUE
}

# 导入单个文件
import_file() {
    local target_file="$1"
    
    if [ -z "$target_file" ]; then
        print_msg "💡 使用默认文件: 9.7数据汇总表-utf8_part_006.csv" $YELLOW
        target_file="9.7数据汇总表-utf8_part_006.csv"
    fi
    
    print_msg "🚀 开始导入单文件: $target_file" $GREEN
    echo "================================================="
    
    # 检查文件是否存在
    local file_path="/mnt/aidrive/$target_file"
    if [ ! -f "$file_path" ]; then
        print_msg "❌ 文件不存在: $file_path" $RED
        
        # 尝试查找相似文件
        print_msg "🔍 搜索相似文件..." $YELLOW
        local similar_files=$(ls /mnt/aidrive/ | grep -i "9.7.*part.*csv" | head -5)
        
        if [ -n "$similar_files" ]; then
            print_msg "📋 找到相似文件:" $BLUE
            echo "$similar_files" | while read file; do
                echo "  - $file"
            done
        fi
        
        return 1
    fi
    
    # 显示文件信息
    local file_size=$(ls -lh "$file_path" | awk '{print $5}')
    local file_date=$(ls -l "$file_path" | awk '{print $6, $7, $8}')
    
    print_msg "📁 文件信息:" $BLUE
    echo "  路径: $file_path"
    echo "  大小: $file_size"
    echo "  日期: $file_date"
    echo
    
    # 执行导入
    print_msg "⏳ 正在导入，请稍候..." $YELLOW
    
    if node "$SCRIPT_NAME" "$target_file"; then
        print_msg "✅ 导入完成!" $GREEN
    else
        print_msg "❌ 导入失败!" $RED
        return 1
    fi
    
    # 显示日志信息
    if [ -f "$LOG_FILE" ]; then
        echo
        print_msg "📋 最新日志 (最后10行):" $BLUE
        echo "================================================="
        tail -10 "$LOG_FILE"
    fi
}

# 查看导入日志
show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_msg "❌ 日志文件不存在: $LOG_FILE" $RED
        return 1
    fi
    
    print_msg "📋 查看导入日志:" $BLUE
    echo "================================================="
    
    # 显示最后30行日志
    tail -30 "$LOG_FILE"
    
    echo
    print_msg "💡 使用 'tail -f $LOG_FILE' 实时查看日志" $YELLOW
}

# 清理日志文件
clean_logs() {
    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        print_msg "✅ 已清理日志文件: $LOG_FILE" $GREEN
    else
        print_msg "⚠️ 日志文件不存在: $LOG_FILE" $YELLOW
    fi
}

# 显示帮助信息
show_help() {
    echo "9.7数据汇总表单文件导入管理脚本"
    echo
    echo "用法: $0 {import|check|logs|clean|help} [文件名]"
    echo
    echo "命令说明:"
    echo "  import [文件名]  - 导入指定文件 (默认: part_006)"
    echo "  check           - 检查AI Drive中的9.7文件"
    echo "  logs            - 查看导入日志"
    echo "  clean           - 清理日志文件"
    echo "  help            - 显示此帮助信息"
    echo
    echo "使用示例:"
    echo "  $0 import                                        # 导入默认文件(part_006)"
    echo "  $0 import 9.7数据汇总表-utf8_part_010.csv        # 导入指定文件"
    echo "  $0 check                                         # 检查所有文件"
    echo "  $0 logs                                          # 查看日志"
    echo
    echo "文件说明:"
    echo "  📋 日志文件: $LOG_FILE"
    echo "  📍 文件路径: /mnt/aidrive/"
    echo "  🎯 默认文件: 9.7数据汇总表-utf8_part_006.csv"
    echo
    echo "特性:"
    echo "  ✅ 支持单文件精确导入"
    echo "  ✅ 智能文件查找和匹配"
    echo "  ✅ 分块处理和重试机制"
    echo "  ✅ 详细日志和错误处理"
}

# 主逻辑
case "$1" in
    import)
        import_file "$2"
        ;;
    check)
        check_files
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "$1" ]; then
            print_msg "❌ 请指定命令" $RED
        else
            print_msg "❌ 无效的命令: $1" $RED
        fi
        echo
        show_help
        exit 1
        ;;
esac

exit 0