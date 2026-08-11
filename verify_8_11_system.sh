#!/bin/bash
# verify_8_11_system.sh - 8.11数据汇总表批量导入系统完整性检查

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   8.11数据汇总表批量导入系统 - 完整性检查脚本                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 定义目标文件列表（6个文件）
TARGET_FILES=(
  "8.11数据汇总表-utf8_part_1.csv"
  "8.11数据汇总表-utf8_part_2.csv"
  "8.11数据汇总表-utf8_part_3.csv"
  "8.11数据汇总表-utf8_part_4.csv"
  "8.11数据汇总表-utf8_part_5.csv"
  "8.11数据汇总表-utf8_part_6.csv"
)

AI_DRIVE_PATH="/mnt/aidrive"
PRODUCTION_URL="https://webapp-csv-import.pages.dev"

pass_count=0
fail_count=0
total_checks=0

check() {
  local test_name="$1"
  local test_command="$2"
  
  total_checks=$((total_checks + 1))
  echo -n "[$total_checks] $test_name ... "
  
  if eval "$test_command" > /dev/null 2>&1; then
    echo "✅ PASS"
    pass_count=$((pass_count + 1))
    return 0
  else
    echo "❌ FAIL"
    fail_count=$((fail_count + 1))
    return 1
  fi
}

echo "🔍 开始系统检查..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Node.js环境检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Node.js 已安装" "which node"
check "Node.js 版本 >= 16" "node -v | grep -E 'v(1[6-9]|[2-9][0-9])'"
check "npm 已安装" "which npm"

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 核心脚本检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "主导入脚本存在" "test -f import_8_11_batch.mjs"
check "主导入脚本可执行" "test -x import_8_11_batch.mjs"
check "启动脚本存在" "test -f start_8_11_import.sh"
check "进度检查脚本存在" "test -f check_8_11_import.sh"

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 AI Drive 数据源检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "AI Drive 目录可访问" "test -d $AI_DRIVE_PATH"

existing_files=0
missing_files=0
total_records=0
total_size=0

echo ""
echo "📋 检查6个目标CSV文件..."
echo ""

for file in "${TARGET_FILES[@]}"; do
  file_path="$AI_DRIVE_PATH/$file"
  if [ -f "$file_path" ]; then
    existing_files=$((existing_files + 1))
    
    file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
    total_size=$((total_size + file_size))
    
    lines=$(wc -l < "$file_path" | tr -d ' ')
    records=$((lines - 1))
    total_records=$((total_records + records))
    
    if [ $file_size -lt 1024 ]; then
      size_str="${file_size}B"
    elif [ $file_size -lt 1048576 ]; then
      size_str="$((file_size / 1024))KB"
    else
      size_str="$((file_size / 1048576))MB"
    fi
    
    echo "   ✅ $file: $size_str, $records条记录"
    pass_count=$((pass_count + 1))
  else
    missing_files=$((missing_files + 1))
    echo "   ❌ $file: 文件不存在"
    fail_count=$((fail_count + 1))
  fi
  total_checks=$((total_checks + 1))
done

echo ""
echo "📊 文件统计:"
echo "   总文件数: 6"
echo "   存在文件: $existing_files"
echo "   缺失文件: $missing_files"
echo "   预计总记录数: $total_records 条"

if [ $total_size -lt 1048576 ]; then
  total_size_str="$((total_size / 1024))KB"
else
  total_size_str="$((total_size / 1048576))MB"
fi
echo "   总文件大小: $total_size_str"

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 网络连通性检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "生产环境可访问" "curl -s -o /dev/null -w '%{http_code}' $PRODUCTION_URL | grep -E '200|301|302'"

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 检查结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 通过检查: $pass_count/$total_checks"
echo "❌ 失败检查: $fail_count/$total_checks"

success_rate=$((pass_count * 100 / total_checks))
echo "📈 通过率: $success_rate%"

echo ""

if [ $fail_count -eq 0 ]; then
  echo "🎉 所有检查通过！系统已就绪，可以开始导入。"
  echo ""
  echo "💡 下一步操作："
  echo "   ./start_8_11_import.sh     # 启动导入任务"
  echo "   ./check_8_11_import.sh     # 检查导入进度"
  exit 0
elif [ $success_rate -ge 80 ]; then
  echo "⚠️  部分检查失败，但核心功能可用。"
  exit 0
else
  echo "❌ 系统未就绪，请修复失败的检查项后再试。"
  exit 1
fi
