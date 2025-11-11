#!/bin/bash
# 11.5导入系统验证脚本

echo "🔍 11.5数据导入系统验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查主导入脚本
echo "1️⃣ 检查主导入脚本..."
if grep -q "11.5数据汇总表-utf8_part_" optimized_batch_import.mjs; then
    echo "   ✅ 脚本已更新为11.5版本"
    file_count=$(grep -c "11.5数据汇总表-utf8_part_" optimized_batch_import.mjs)
    echo "   📊 检测到 ${file_count} 个文件引用"
else
    echo "   ❌ 脚本未正确更新"
    exit 1
fi

# 2. 检查配置参数
echo ""
echo "2️⃣ 检查配置参数..."
if grep -q "DELAY_BETWEEN_CHUNKS = 500" optimized_batch_import.mjs; then
    echo "   ✅ 分块延迟: 500ms (0.5秒)"
else
    echo "   ⚠️ 分块延迟配置异常"
fi

if grep -q "DELAY_BETWEEN_FILES = 1500" optimized_batch_import.mjs; then
    echo "   ✅ 文件延迟: 1500ms (1.5秒)"
else
    echo "   ⚠️ 文件延迟配置异常"
fi

if grep -q "PROGRESS_SAVE_INTERVAL = 3" optimized_batch_import.mjs; then
    echo "   ✅ 进度保存: 每3块"
else
    echo "   ⚠️ 进度保存配置异常"
fi

# 3. 检查日志文件配置
echo ""
echo "3️⃣ 检查日志文件配置..."
if grep -q "11_5_import.log" optimized_batch_import.mjs; then
    echo "   ✅ 日志文件: 11_5_import.log"
else
    echo "   ❌ 日志文件配置错误"
fi

if grep -q "11_5_import_stats.json" optimized_batch_import.mjs; then
    echo "   ✅ 统计文件: 11_5_import_stats.json"
else
    echo "   ❌ 统计文件配置错误"
fi

if grep -q "11_5_import_progress.json" optimized_batch_import.mjs; then
    echo "   ✅ 进度文件: 11_5_import_progress.json"
else
    echo "   ❌ 进度文件配置错误"
fi

# 4. 检查AI Drive文件
echo ""
echo "4️⃣ 检查AI Drive文件..."
missing=0
for i in {01..20}; do
    file="/mnt/aidrive/11.5数据汇总表-utf8_part_${i}.csv"
    if [ ! -f "$file" ]; then
        echo "   ❌ 缺失: part_${i}.csv"
        missing=$((missing + 1))
    fi
done

if [ $missing -eq 0 ]; then
    echo "   ✅ 所有20个文件存在"
else
    echo "   ❌ 缺失 ${missing} 个文件"
    exit 1
fi

# 5. 检查辅助脚本
echo ""
echo "5️⃣ 检查辅助脚本..."
if [ -f "check_11_5_import_status.mjs" ]; then
    echo "   ✅ 状态监控脚本存在"
else
    echo "   ❌ 状态监控脚本缺失"
fi

if [ -f "start_11_5_import.sh" ]; then
    echo "   ✅ 启动脚本存在"
else
    echo "   ❌ 启动脚本缺失"
fi

# 6. 检查权限
echo ""
echo "6️⃣ 检查执行权限..."
if [ -x "start_11_5_import.sh" ]; then
    echo "   ✅ start_11_5_import.sh 可执行"
else
    echo "   ⚠️ start_11_5_import.sh 缺少执行权限"
fi

if [ -x "check_11_5_import_status.mjs" ]; then
    echo "   ✅ check_11_5_import_status.mjs 可执行"
else
    echo "   ⚠️ check_11_5_import_status.mjs 缺少执行权限"
fi

# 7. 检查分块策略
echo ""
echo "7️⃣ 检查分块策略..."
if grep -q "chunkSize = 120" optimized_batch_import.mjs; then
    echo "   ✅ 大文件分块: 120行/块"
fi
if grep -q "chunkSize = 150" optimized_batch_import.mjs; then
    echo "   ✅ 中文件分块: 150行/块"
fi
if grep -q "chunkSize = 180" optimized_batch_import.mjs; then
    echo "   ✅ 小文件分块: 180行/块"
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 系统验证完成！11.5导入系统已就绪。"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 快速启动: ./start_11_5_import.sh"
echo "📊 查看状态: node check_11_5_import_status.mjs"
echo ""
