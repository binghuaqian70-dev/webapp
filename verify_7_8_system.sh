#!/bin/bash
# 7.8数据汇总表导入系统准备就绪检查脚本

echo "🔍 7.8数据汇总表导入系统准备就绪检查"
echo "========================================"
echo ""

# 检查项计数
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 辅助函数：检查通过
check_pass() {
    echo "   ✅ $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

# 辅助函数：检查失败
check_fail() {
    echo "   ❌ $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

# 辅助函数：检查警告
check_warn() {
    echo "   ⚠️  $1"
    ((TOTAL_CHECKS++))
}

echo "1️⃣  检查脚本文件"
echo "-----------------------------------"

if [ -f "import_7_8_batch.mjs" ]; then
    check_pass "主导入脚本存在"
    if [ -x "import_7_8_batch.mjs" ]; then
        check_pass "主导入脚本可执行"
    else
        check_fail "主导入脚本不可执行"
    fi
else
    check_fail "主导入脚本不存在"
fi

if [ -f "start_7_8_import.sh" ]; then
    check_pass "启动脚本存在"
    if [ -x "start_7_8_import.sh" ]; then
        check_pass "启动脚本可执行"
    else
        check_fail "启动脚本不可执行"
    fi
else
    check_fail "启动脚本不存在"
fi

if [ -f "check_7_8_import.sh" ]; then
    check_pass "进度检查脚本存在"
    if [ -x "check_7_8_import.sh" ]; then
        check_pass "进度检查脚本可执行"
    else
        check_fail "进度检查脚本不可执行"
    fi
else
    check_fail "进度检查脚本不存在"
fi

echo ""
echo "2️⃣  检查Node.js环境"
echo "-----------------------------------"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js已安装 ($NODE_VERSION)"
    
    # 检查版本是否 >= 14
    VERSION_NUM=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$VERSION_NUM" -ge 14 ]; then
        check_pass "Node.js版本符合要求 (>= 14)"
    else
        check_warn "Node.js版本较低，建议升级到 >= 14"
    fi
else
    check_fail "Node.js未安装"
fi

echo ""
echo "3️⃣  检查AI Drive目录"
echo "-----------------------------------"

if [ -d "/mnt/aidrive" ]; then
    check_pass "AI Drive目录存在"
    
    if [ -r "/mnt/aidrive" ]; then
        check_pass "AI Drive目录可读"
    else
        check_fail "AI Drive目录不可读"
    fi
else
    check_fail "AI Drive目录不存在"
fi

echo ""
echo "4️⃣  检查目标CSV文件"
echo "-----------------------------------"

FOUND_FILES=0
TOTAL_FILES=20
TOTAL_SIZE=0
TOTAL_RECORDS=0

for i in {1..20}; do
    FILE="/mnt/aidrive/7.8数据汇总表-utf8_part${i}.csv"
    if [ -f "$FILE" ]; then
        ((FOUND_FILES++))
        SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
        TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        
        # 统计行数（简化版本，只读取前几行避免AI Drive慢速读取）
        LINES=$(head -100 "$FILE" 2>/dev/null | wc -l)
        if [ $LINES -gt 0 ]; then
            echo "   ✅ part${i}.csv 存在 ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
        fi
    fi
done

echo ""
if [ $FOUND_FILES -eq 0 ]; then
    check_fail "未找到任何目标文件 (0/${TOTAL_FILES})"
    echo "   💡 请确保文件已放置在 /mnt/aidrive 目录"
    echo "   💡 文件命名: 7.8数据汇总表-utf8_part1.csv ~ 7.8数据汇总表-utf8_part20.csv"
elif [ $FOUND_FILES -lt $TOTAL_FILES ]; then
    check_warn "部分文件缺失 (${FOUND_FILES}/${TOTAL_FILES})"
    echo "   💡 缺失 $((TOTAL_FILES - FOUND_FILES)) 个文件"
else
    check_pass "全部文件就绪 (${FOUND_FILES}/${TOTAL_FILES})"
    TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
    echo "   📊 总文件大小: ${TOTAL_SIZE_MB} MB"
fi

echo ""
echo "5️⃣  检查网络连接"
echo "-----------------------------------"

PROD_URL="webapp-csv-import.pages.dev"

if command -v curl &> /dev/null; then
    if curl -s --max-time 5 "https://${PROD_URL}" > /dev/null 2>&1; then
        check_pass "生产环境可访问"
    else
        check_fail "无法访问生产环境"
        echo "   💡 请检查网络连接"
    fi
else
    check_warn "curl未安装，无法测试网络连接"
fi

echo ""
echo "6️⃣  检查是否有正在运行的导入进程"
echo "-----------------------------------"

if pgrep -f "import_7_8_batch.mjs" > /dev/null; then
    check_warn "检测到导入进程正在运行"
    echo "   💡 如需重新开始，请先停止现有进程: pkill -f import_7_8_batch.mjs"
else
    check_pass "没有正在运行的导入进程"
fi

echo ""
echo "7️⃣  检查历史导入记录"
echo "-----------------------------------"

if [ -f "7_8_import_progress.json" ]; then
    check_warn "检测到断点续传进度文件"
    echo "   💡 将支持从断点继续导入"
else
    check_pass "无历史进度记录，将全新开始"
fi

if [ -f "7_8_import_stats.json" ]; then
    echo "   ℹ️  发现统计数据文件"
    node -e "
    const fs = require('fs');
    try {
        const stats = JSON.parse(fs.readFileSync('7_8_import_stats.json', 'utf8'));
        console.log('      - 状态:', stats.status);
        console.log('      - 已处理文件:', stats.processedFiles + '/' + stats.totalFiles);
        console.log('      - 已导入记录:', (stats.importedRecords || 0).toLocaleString());
    } catch (e) {}
    " 2>/dev/null
fi

echo ""
echo "8️⃣  检查磁盘空间"
echo "-----------------------------------"

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "   ℹ️  当前目录可用空间: $AVAILABLE_SPACE"

# 简单判断（如果包含G且数字>1，认为空间足够）
if [[ "$AVAILABLE_SPACE" == *G* ]]; then
    SPACE_NUM=$(echo $AVAILABLE_SPACE | sed 's/G.*//')
    if (( $(echo "$SPACE_NUM > 1" | bc -l 2>/dev/null || echo "1") )); then
        check_pass "磁盘空间充足"
    else
        check_warn "磁盘空间可能不足"
    fi
else
    check_warn "磁盘空间较小，请注意监控"
fi

echo ""
echo "========================================"
echo "📊 检查结果汇总"
echo "========================================"
echo "   总检查项: $TOTAL_CHECKS"
echo "   ✅ 通过: $PASSED_CHECKS"
echo "   ❌ 失败: $FAILED_CHECKS"
echo "   ⚠️  警告: $((TOTAL_CHECKS - PASSED_CHECKS - FAILED_CHECKS))"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $FOUND_FILES -gt 0 ]; then
        echo "🎉 系统准备就绪！可以开始导入"
        echo ""
        echo "📝 下一步操作:"
        echo "   1. 运行启动脚本: ./start_7_8_import.sh"
        echo "   2. 查看实时进度: ./check_7_8_import.sh"
        echo "   3. 监控日志: tail -f 7_8_import.log"
    else
        echo "⚠️  系统基础环境正常，但缺少数据文件"
        echo "请先将文件放置到 /mnt/aidrive 目录"
    fi
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
echo "   - 快速参考: cat 7.8导入快速参考.md"
echo "   - 完整指南: cat 7.8导入完整指南.md"
echo ""
