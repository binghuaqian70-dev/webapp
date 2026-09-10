#!/bin/bash
###############################################################################
# 8.18数据汇总表批量导入系统验证脚本（优化版）
# 功能：检查Node.js环境、脚本文件、AI Drive目标文件
###############################################################################

echo "============================================"
echo "  8.18批量导入系统验证（优化版）"
echo "============================================"
echo ""

CHECKS_PASSED=0
CHECKS_TOTAL=0

# 检查1: Node.js环境
echo "🔍 [1/4] 检查Node.js环境..."
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js已安装: $NODE_VERSION"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "   ❌ Node.js未安装"
fi
echo ""

# 检查2: 导入脚本
echo "🔍 [2/4] 检查导入脚本..."
CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
if [ -f "/home/user/webapp/optimized_batch_import.mjs" ]; then
    echo "   ✅ optimized_batch_import.mjs 存在"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo "   ❌ optimized_batch_import.mjs 不存在"
fi
echo ""

# 检查3: 辅助脚本
echo "🔍 [3/4] 检查辅助脚本..."
CHECKS_TOTAL=$((CHECKS_TOTAL + 3))
for script in "start_8_18_optimized_import.sh" "check_8_18_optimized_import.sh" "verify_8_18_optimized_system.sh"; do
    if [ -f "/home/user/webapp/$script" ]; then
        echo "   ✅ $script"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo "   ⚠️ $script 不存在"
    fi
done
echo ""

# 检查4: AI Drive目标文件
echo "🔍 [4/4] 检查AI Drive目标文件（3个文件）..."
AI_DRIVE_PATH="/mnt/aidrive"
TARGET_FILES=(
    "8.18数据汇总表-utf8_part_1.csv"
    "8.18数据汇总表-utf8_part_2.csv"
    "8.18数据汇总表-utf8_part_3.csv"
)

FILES_FOUND=0
TOTAL_SIZE=0

for file in "${TARGET_FILES[@]}"; do
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    FILE_PATH="$AI_DRIVE_PATH/$file"
    if [ -f "$FILE_PATH" ]; then
        SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
        SIZE_KB=$((SIZE / 1024))
        echo "   ✅ $file (${SIZE_KB}KB)"
        FILES_FOUND=$((FILES_FOUND + 1))
        TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo "   ❌ $file 不存在"
    fi
done

TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))
echo ""
echo "   📊 找到 $FILES_FOUND / 3 个文件，总大小: ${TOTAL_SIZE_MB}MB"
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 验证总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PASS_RATE=$((CHECKS_PASSED * 100 / CHECKS_TOTAL))
echo "   通过: $CHECKS_PASSED / $CHECKS_TOTAL 项 ($PASS_RATE%)"
echo ""

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo "✅ 系统验证通过！可以开始导入"
    echo ""
    echo "🚀 启动命令: ./start_8_18_optimized_import.sh"
    exit 0
elif [ $FILES_FOUND -eq 3 ]; then
    echo "⚠️ 基础验证通过，但部分辅助脚本缺失"
    echo "   仍可以使用: node optimized_batch_import.mjs"
    exit 0
else
    echo "❌ 验证失败！请检查缺失的文件"
    exit 1
fi
