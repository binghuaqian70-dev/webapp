#!/bin/bash
# 7.11数据汇总表导入系统准备就绪检查脚本

SCRIPT_DIR="/home/user/webapp"
IMPORT_SCRIPT="import_7_11_batch.mjs"
START_SCRIPT="start_7_11_import.sh"
CHECK_SCRIPT="check_7_11_import.sh"
AI_DRIVE_PATH="/mnt/aidrive"

# 目标文件列表(3个文件)
TARGET_FILES=(
  "7.11数据汇总表-utf8_part_1.csv"
  "7.11数据汇总表-utf8_part_2.csv"
  "7.11数据汇总表-utf8_part_3.csv"
)

cd "$SCRIPT_DIR" || exit 1

echo "🔍 7.11数据汇总表导入系统准备就绪检查"
echo "========================================"
echo ""

# 计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 1. 检查脚本文件
echo "1️⃣  检查脚本文件"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 6))

if [ -f "$IMPORT_SCRIPT" ]; then
    echo "   ✅ 主导入脚本存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 主导入脚本不存在: $IMPORT_SCRIPT"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -x "$IMPORT_SCRIPT" ]; then
    echo "   ✅ 主导入脚本可执行"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 主导入脚本不可执行"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -f "$START_SCRIPT" ]; then
    echo "   ✅ 启动脚本存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 启动脚本不存在: $START_SCRIPT"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -x "$START_SCRIPT" ]; then
    echo "   ✅ 启动脚本可执行"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 启动脚本不可执行"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -f "$CHECK_SCRIPT" ]; then
    echo "   ✅ 进度检查脚本存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 进度检查脚本不存在: $CHECK_SCRIPT"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -x "$CHECK_SCRIPT" ]; then
    echo "   ✅ 进度检查脚本可执行"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 进度检查脚本不可执行"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# 2. 检查Node.js环境
echo "2️⃣  检查Node.js环境"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js已安装 ($NODE_VERSION)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 14 ]; then
        echo "   ✅ Node.js版本符合要求 (>= 14)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo "   ❌ Node.js版本过低，需要 >= 14"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo "   ❌ Node.js未安装"
    echo "   ❌ Node.js版本检查跳过"
    FAILED_CHECKS=$((FAILED_CHECKS + 2))
fi

echo ""

# 3. 检查AI Drive目录
echo "3️⃣  检查AI Drive目录"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))

if [ -d "$AI_DRIVE_PATH" ]; then
    echo "   ✅ AI Drive目录存在"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ AI Drive目录不存在: $AI_DRIVE_PATH"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if [ -r "$AI_DRIVE_PATH" ]; then
    echo "   ✅ AI Drive目录可读"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ AI Drive目录不可读"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# 4. 检查目标CSV文件
echo "4️⃣  检查目标CSV文件"
echo "-----------------------------------"

FILE_COUNT=0
TOTAL_FILE_SIZE=0

for file in "${TARGET_FILES[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FULL_PATH="$AI_DRIVE_PATH/$file"
    
    if [ -f "$FULL_PATH" ]; then
        FILE_SIZE=$(stat -f%z "$FULL_PATH" 2>/dev/null || stat -c%s "$FULL_PATH" 2>/dev/null || echo "0")
        FILE_SIZE_KB=$((FILE_SIZE / 1024))
        echo "   ✅ $file 存在 (${FILE_SIZE_KB}KiB)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        FILE_COUNT=$((FILE_COUNT + 1))
        TOTAL_FILE_SIZE=$((TOTAL_FILE_SIZE + FILE_SIZE))
    else
        echo "   ❌ $file 不存在"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
done

echo ""
if [ $FILE_COUNT -eq ${#TARGET_FILES[@]} ]; then
    echo "   ✅ 全部文件就绪 ($FILE_COUNT/${#TARGET_FILES[@]})"
    TOTAL_SIZE_MB=$((TOTAL_FILE_SIZE / 1024 / 1024))
    if [ $TOTAL_SIZE_MB -gt 0 ]; then
        echo "   📊 总文件大小: $TOTAL_SIZE_MB MB"
    else
        TOTAL_SIZE_KB=$((TOTAL_FILE_SIZE / 1024))
        echo "   📊 总文件大小: $TOTAL_SIZE_KB KB"
    fi
else
    echo "   ❌ 文件不完整 ($FILE_COUNT/${#TARGET_FILES[@]})"
    echo "   💡 请确保文件已放置在 $AI_DRIVE_PATH 目录"
    echo "   💡 文件命名: 7.11数据汇总表-utf8_part_1.csv ~ 7.11数据汇总表-utf8_part_3.csv"
fi

echo ""

# 5. 检查网络连接
echo "5️⃣  检查网络连接"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if curl -s -I https://webapp-csv-import.pages.dev > /dev/null 2>&1; then
    echo "   ✅ 生产环境可访问"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ❌ 生产环境无法访问"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# 6. 检查是否有正在运行的导入进程
echo "6️⃣  检查是否有正在运行的导入进程"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if pgrep -f "import_7_11_batch.mjs" > /dev/null; then
    echo "   ⚠️  检测到导入进程正在运行"
    echo "   💡 如需重新开始，请先停止现有进程: pkill -f import_7_11_batch.mjs"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
else
    echo "   ✅ 没有正在运行的导入进程"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""

# 7. 检查历史导入记录
echo "7️⃣  检查历史导入记录"
echo "-----------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if [ -f "7_11_import_progress.json" ]; then
    echo "   ℹ️  检测到历史进度记录"
    echo "   💡 将从断点继续导入"
    echo "   💡 如需全新开始，请删除: rm 7_11_import_progress.json"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo "   ✅ 无历史进度记录，将全新开始"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

echo ""

# 8. 检查磁盘空间
echo "8️⃣  检查磁盘空间"
echo "-----------------------------------"

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "   ℹ️  当前目录可用空间: $AVAILABLE_SPACE"

AVAILABLE_KB=$(df -k . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_KB" -gt 1048576 ]; then
    echo "   ✅ 磁盘空间充足"
else
    echo "   ⚠️  磁盘空间可能不足，建议清理"
fi

echo ""
echo "========================================"
echo "📊 检查结果汇总"
echo "========================================"
echo "   总检查项: $TOTAL_CHECKS"
echo "   ✅ 通过: $PASSED_CHECKS"
echo "   ❌ 失败: $FAILED_CHECKS"
echo "   ⚠️  警告: $WARNING_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo "🎉 系统准备就绪！可以开始导入"
    echo ""
    echo "📝 下一步操作:"
    echo "   1. 运行启动脚本: ./start_7_11_import.sh"
    echo "   2. 查看实时进度: ./check_7_11_import.sh"
    echo "   3. 监控日志: tail -f 7_11_import.log"
else
    echo "❌ 系统存在 $FAILED_CHECKS 个问题，请先解决"
    echo ""
    echo "💡 常见解决方案:"
    echo "   - 脚本不可执行: chmod +x *.sh *.mjs"
    echo "   - Node.js未安装: 安装 Node.js >= 14"
    echo "   - 文件缺失: 检查AI Drive目录和文件命名"
fi

echo ""
echo "📋 参考文档:"
echo "   - 快速参考: cat 7.11导入快速参考.md"
echo "   - 完整指南: cat 7.11导入完整指南.md"
echo ""

exit $FAILED_CHECKS
