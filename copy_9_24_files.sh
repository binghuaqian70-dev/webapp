#!/bin/bash
###############################################################################
# 9.24数据文件从AI Drive复制到本地缓存
###############################################################################

SOURCE_DIR="/mnt/aidrive"
TARGET_DIR="/tmp/9_24_import_cache"

echo "📂 9.24数据文件复制工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建目标目录
mkdir -p "$TARGET_DIR"
echo "✅ 已创建缓存目录: $TARGET_DIR"
echo ""

# 复制8个文件
echo "🚀 开始复制文件..."
COPIED=0
FAILED=0

for i in {1..8}; do
    SOURCE_FILE="${SOURCE_DIR}/9.24数据汇总表-utf8_part_${i}.csv"
    TARGET_FILE="${TARGET_DIR}/9.24数据汇总表-utf8_part_${i}.csv"

    if [ -f "$SOURCE_FILE" ]; then
        echo "   📄 复制 part_${i}.csv ..."
        cp "$SOURCE_FILE" "$TARGET_FILE" 2>/dev/null
        if [ $? -eq 0 ]; then
            SIZE=$(stat -c%s "$TARGET_FILE" 2>/dev/null)
            echo "      ✅ 成功 ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo ${SIZE}B))"
            COPIED=$((COPIED + 1))
        else
            echo "      ❌ 复制失败"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "   ⚠️ 源文件不存在: part_${i}.csv"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 复制结果汇总："
echo "   ✅ 成功: $COPIED 个文件"
echo "   ❌ 失败: $FAILED 个文件"
echo ""

if [ $COPIED -eq 8 ]; then
    echo "🎉 所有文件复制完成！可以开始导入了"
    echo "   运行: ./start_9_24_optimized_import.sh"
else
    echo "⚠️ 部分文件复制失败，请检查AI Drive"
fi
echo ""
