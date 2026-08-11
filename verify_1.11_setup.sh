#!/bin/bash
###############################################################################
# 1.11数据汇总表导入环境验证脚本
# 功能：验证所有必要文件和配置是否正确
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

echo "═══════════════════════════════════════════════════════════════════════"
echo "  1.11数据汇总表导入环境验证"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

total_checks=0
passed_checks=0

# 检查1: 脚本文件
echo "1. 检查脚本文件..."
total_checks=$((total_checks + 1))
if [ -f "/home/user/webapp/optimized_batch_import.mjs" ]; then
    print_msg "$GREEN" "   ✓ optimized_batch_import.mjs 存在"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$RED" "   ✗ optimized_batch_import.mjs 不存在"
fi

# 检查2: 管理脚本
echo "2. 检查管理脚本..."
total_checks=$((total_checks + 1))
if [ -x "/home/user/webapp/start_1.11_import.sh" ]; then
    print_msg "$GREEN" "   ✓ start_1.11_import.sh 存在且可执行"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$RED" "   ✗ start_1.11_import.sh 不存在或不可执行"
fi

# 检查3: 文档文件
echo "3. 检查文档文件..."
total_checks=$((total_checks + 3))
doc_count=0
[ -f "/home/user/webapp/1.11_IMPORT_README.md" ] && doc_count=$((doc_count + 1))
[ -f "/home/user/webapp/QUICK_START_1.11.md" ] && doc_count=$((doc_count + 1))
[ -f "/home/user/webapp/1.11_IMPORT_SUMMARY.md" ] && doc_count=$((doc_count + 1))

if [ $doc_count -eq 3 ]; then
    print_msg "$GREEN" "   ✓ 所有文档文件存在 (3/3)"
    passed_checks=$((passed_checks + 3))
elif [ $doc_count -gt 0 ]; then
    print_msg "$YELLOW" "   ⚠ 部分文档文件存在 ($doc_count/3)"
    passed_checks=$((passed_checks + doc_count))
else
    print_msg "$RED" "   ✗ 文档文件不存在"
fi

# 检查4: Node.js环境
echo "4. 检查Node.js环境..."
total_checks=$((total_checks + 1))
if command -v node &> /dev/null; then
    node_version=$(node --version)
    print_msg "$GREEN" "   ✓ Node.js 已安装: $node_version"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$RED" "   ✗ Node.js 未安装"
fi

# 检查5: AI Drive访问
echo "5. 检查AI Drive访问..."
total_checks=$((total_checks + 1))
if [ -d "/mnt/aidrive" ]; then
    print_msg "$GREEN" "   ✓ AI Drive 可访问: /mnt/aidrive"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$RED" "   ✗ AI Drive 不可访问"
fi

# 检查6: 目标CSV文件
echo "6. 检查目标CSV文件..."
csv_files=(
    "1.11数据汇总表-utf8_part1.csv"
    "1.11数据汇总表-utf8_part2.csv"
    "1.11数据汇总表-utf8_part3.csv"
    "1.11数据汇总表-utf8_part4.csv"
    "1.11数据汇总表-utf8_part5.csv"
    "1.11数据汇总表-utf8_part6.csv"
    "1.11数据汇总表-utf8_part7.csv"
    "1.11数据汇总表-utf8_part8.csv"
)

found_files=0
total_size=0
total_checks=$((total_checks + 8))

for file in "${csv_files[@]}"; do
    filepath="/mnt/aidrive/$file"
    if [ -f "$filepath" ]; then
        size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
        size_kb=$((size / 1024))
        total_size=$((total_size + size))
        found_files=$((found_files + 1))
        passed_checks=$((passed_checks + 1))
        print_msg "$GREEN" "   ✓ $file (${size_kb}KB)"
    else
        print_msg "$RED" "   ✗ $file 不存在"
    fi
done

total_size_kb=$((total_size / 1024))
echo ""
print_msg "$BLUE" "   找到 $found_files/8 个文件，总大小: ${total_size_kb}KB"

# 检查7: 生产环境连接
echo ""
echo "7. 检查生产环境连接..."
total_checks=$((total_checks + 1))
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://webapp-csv-import.pages.dev | grep -q "200\|301\|302"; then
    print_msg "$GREEN" "   ✓ 生产环境可访问"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$YELLOW" "   ⚠ 生产环境连接超时或不可访问（可能是网络问题）"
fi

# 检查8: 脚本语法
echo "8. 检查脚本语法..."
total_checks=$((total_checks + 1))
if node --check /home/user/webapp/optimized_batch_import.mjs 2>/dev/null; then
    print_msg "$GREEN" "   ✓ 脚本语法正确"
    passed_checks=$((passed_checks + 1))
else
    print_msg "$RED" "   ✗ 脚本语法错误"
fi

# 检查9: 必要工具
echo "9. 检查必要工具..."
tools_count=0
tools_total=3
total_checks=$((total_checks + tools_total))

if command -v curl &> /dev/null; then
    tools_count=$((tools_count + 1))
    passed_checks=$((passed_checks + 1))
fi

if command -v jq &> /dev/null; then
    tools_count=$((tools_count + 1))
    passed_checks=$((passed_checks + 1))
fi

if command -v watch &> /dev/null; then
    tools_count=$((tools_count + 1))
    passed_checks=$((passed_checks + 1))
fi

if [ $tools_count -eq $tools_total ]; then
    print_msg "$GREEN" "   ✓ 所有必要工具已安装 (curl, jq, watch)"
elif [ $tools_count -gt 0 ]; then
    print_msg "$YELLOW" "   ⚠ 部分工具已安装 ($tools_count/$tools_total)"
    [ ! command -v jq &> /dev/null ] && print_msg "$YELLOW" "      - jq 未安装（可选，用于JSON格式化）"
    [ ! command -v watch &> /dev/null ] && print_msg "$YELLOW" "      - watch 未安装（可选，用于实时监控）"
else
    print_msg "$RED" "   ✗ 必要工具未安装"
fi

# 总结
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  验证总结"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

percentage=$((passed_checks * 100 / total_checks))

if [ $passed_checks -eq $total_checks ]; then
    print_msg "$GREEN" "✅ 所有检查通过 ($passed_checks/$total_checks) - 100%"
    echo ""
    print_msg "$GREEN" "🎉 环境配置完美！可以开始导入了"
    echo ""
    echo "快速开始命令："
    echo "  cd /home/user/webapp"
    echo "  ./start_1.11_import.sh start"
    echo ""
elif [ $percentage -ge 80 ]; then
    print_msg "$YELLOW" "⚠️  大部分检查通过 ($passed_checks/$total_checks) - ${percentage}%"
    echo ""
    print_msg "$YELLOW" "🔧 环境基本就绪，可以尝试运行（可能需要手动处理一些问题）"
    echo ""
else
    print_msg "$RED" "❌ 检查未通过 ($passed_checks/$total_checks) - ${percentage}%"
    echo ""
    print_msg "$RED" "🛑 请先解决上述问题再开始导入"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════════════"
exit $((total_checks - passed_checks))
