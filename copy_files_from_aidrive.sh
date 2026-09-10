#!/bin/bash
###############################################################################
# 将8.14文件从AI Drive复制到本地临时目录
# 解决AI Drive在Node.js中的访问延迟问题
###############################################################################

echo "🔄 开始复制8.14文件从AI Drive到本地..."
echo ""

SOURCE_DIR="/mnt/aidrive"
TARGET_DIR="/tmp/8_14_import_cache"

# 创建目标目录
mkdir -p "$TARGET_DIR"

# 复制所有20个文件
COPIED=0
FAILED=0

for i in {1..20}; do
    SOURCE_FILE="$SOURCE_DIR/8.14数据汇总表-utf8_part_${i}.csv"
    TARGET_FILE="$TARGET_DIR/8.14数据汇总表-utf8_part_${i}.csv"
    
    if [ -f "$SOURCE_FILE" ]; then
        cp "$SOURCE_FILE" "$TARGET_FILE" 2>/dev/null
        if [ $? -eq 0 ]; then
            SIZE=$(stat -c%s "$TARGET_FILE" 2>/dev/null || stat -f%z "$TARGET_FILE" 2>/dev/null)
            SIZE_KB=$((SIZE / 1024))
            echo "   ✅ part_${i}.csv (${SIZE_KB}KB)"
            COPIED=$((COPIED + 1))
        else
            echo "   ❌ part_${i}.csv - 复制失败"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "   ⚠️ part_${i}.csv - 源文件不存在"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 复制结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 成功: $COPIED / 20"
echo "   ❌ 失败: $FAILED / 20"
echo ""

if [ $COPIED -eq 20 ]; then
    echo "✅ 所有文件复制完成！可以开始导入"
    echo ""
    echo "📂 本地缓存目录: $TARGET_DIR"
    exit 0
else
    echo "❌ 部分文件复制失败"
    exit 1
fi
