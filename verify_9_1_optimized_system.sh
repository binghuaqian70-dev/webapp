#!/bin/bash
###############################################################################
# 9.1数据汇总表批量导入系统验证脚本
# 功能：检查所有必需的文件、脚本和环境是否就绪
###############################################################################

SCRIPT_DIR="/home/user/webapp"
AI_DRIVE_PATH="/mnt/aidrive"
LOCAL_CACHE_PATH="/tmp/9_1_import_cache"

cd "$SCRIPT_DIR" || exit 1

echo "=========================================="
echo "  9.1数据汇总表导入系统验证"
echo "=========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# 验证项1：检查Node.js环境
echo "🔍 [1/8] 检查Node.js环境..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js已安装: $NODE_VERSION"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ❌ Node.js未安装"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 验证项2：检查主导入脚本
echo "🔍 [2/8] 检查主导入脚本..."
if [ -f "optimized_batch_import.mjs" ]; then
    echo "   ✅ optimized_batch_import.mjs 存在"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ❌ optimized_batch_import.mjs 不存在"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 验证项3：检查辅助脚本
echo "🔍 [3/8] 检查辅助脚本..."
SCRIPTS=("start_9_1_optimized_import.sh" "check_9_1_optimized_import.sh" "QUICKSTART_9_1_OPTIMIZED.sh")
SCRIPT_PASS=0
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        SCRIPT_PASS=$((SCRIPT_PASS + 1))
    fi
done
if [ $SCRIPT_PASS -eq ${#SCRIPTS[@]} ]; then
    echo "   ✅ 所有辅助脚本存在 ($SCRIPT_PASS/${#SCRIPTS[@]})"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ⚠️ 部分辅助脚本缺失 ($SCRIPT_PASS/${#SCRIPTS[@]})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 验证项4-8：检查AI Drive中的15个目标文件
TARGET_FILES=(
    "9.1数据汇总表-utf8_part_1.csv"
    "9.1数据汇总表-utf8_part_2.csv"
    "9.1数据汇总表-utf8_part_3.csv"
    "9.1数据汇总表-utf8_part_4.csv"
    "9.1数据汇总表-utf8_part_5.csv"
    "9.1数据汇总表-utf8_part_6.csv"
    "9.1数据汇总表-utf8_part_7.csv"
    "9.1数据汇总表-utf8_part_8.csv"
    "9.1数据汇总表-utf8_part_9.csv"
    "9.1数据汇总表-utf8_part_10.csv"
    "9.1数据汇总表-utf8_part_11.csv"
    "9.1数据汇总表-utf8_part_12.csv"
    "9.1数据汇总表-utf8_part_13.csv"
    "9.1数据汇总表-utf8_part_14.csv"
    "9.1数据汇总表-utf8_part_15.csv"
)

echo "🔍 [4/8] 检查AI Drive源文件..."
FILE_COUNT=0
for file in "${TARGET_FILES[@]}"; do
    if [ -f "$AI_DRIVE_PATH/$file" ]; then
        SIZE=$(stat -f%z "$AI_DRIVE_PATH/$file" 2>/dev/null || stat -c%s "$AI_DRIVE_PATH/$file" 2>/dev/null)
        SIZE_KB=$((SIZE / 1024))
        echo "   ✅ $file (${SIZE_KB}KB)"
        FILE_COUNT=$((FILE_COUNT + 1))
    else
        echo "   ❌ $file 不存在"
    fi
done

if [ $FILE_COUNT -eq ${#TARGET_FILES[@]} ]; then
    echo "   ✅ 所有源文件就绪 ($FILE_COUNT/${#TARGET_FILES[@]})"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ❌ 部分源文件缺失 ($FILE_COUNT/${#TARGET_FILES[@]})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 验证项5：检查本地缓存目录
echo "🔍 [5/8] 检查本地缓存目录..."
if [ -d "$LOCAL_CACHE_PATH" ]; then
    CACHE_COUNT=$(ls -1 "$LOCAL_CACHE_PATH" | wc -l)
    echo "   ✅ 缓存目录存在: $LOCAL_CACHE_PATH ($CACHE_COUNT 个文件)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ⚠️ 缓存目录不存在（将在启动时自动创建）"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# 验证项6：检查生产环境连通性
echo "🔍 [6/8] 检查生产环境连通性..."
PROD_URL="https://webapp-csv-import.pages.dev"
if curl -s --head --request GET "$PROD_URL" | grep "200\|301\|302" > /dev/null; then
    echo "   ✅ 生产环境可访问: $PROD_URL"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo "   ⚠️ 生产环境无法访问（可能影响导入）"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 验证项7：检查磁盘空间
echo "🔍 [7/8] 检查磁盘空间..."
AVAILABLE_SPACE=$(df -h "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
echo "   ✅ 可用空间: $AVAILABLE_SPACE"
PASS_COUNT=$((PASS_COUNT + 1))

# 验证项8：检查系统资源
echo "🔍 [8/8] 检查系统资源..."
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1 | xargs)
echo "   ✅ 系统负载: $LOAD_AVG"
PASS_COUNT=$((PASS_COUNT + 1))

# 总结
echo ""
echo "=========================================="
echo "  验证结果总结"
echo "=========================================="
echo "✅ 通过: $PASS_COUNT 项"
echo "❌ 失败: $FAIL_COUNT 项"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 系统验证通过！可以开始导入"
    echo ""
    echo "快速启动命令："
    echo "  bash QUICKSTART_9_1_OPTIMIZED.sh"
    echo ""
    exit 0
else
    echo "⚠️ 系统验证未完全通过，请检查失败项"
    echo ""
    exit 1
fi
