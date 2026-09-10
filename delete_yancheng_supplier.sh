#!/bin/bash
###############################################################################
# 盐城新连接电子信息科技有限公司数据删除脚本
# 采用分批删除策略，每批1000条，安全可控
###############################################################################

cd /home/user/webapp

echo "========================================"
echo "  数据删除操作"
echo "========================================"
echo "供应商: 盐城新连接电子信息科技有限公司"
echo "目标记录数: 14,208 条"
echo "删除策略: 分批删除 (1000条/批)"
echo "========================================"
echo ""

# 删除前确认
echo "⚠️  即将开始删除操作，3秒后自动开始..."
sleep 3

DELETED=0
BATCH_SIZE=1000
BATCH_COUNT=0
SUPPLIER_NAME="盐城新连接电子信息科技有限公司"

echo "🚀 开始删除..."
echo ""

# 循环删除直到没有记录为止
while true; do
    BATCH_COUNT=$((BATCH_COUNT + 1))
    
    echo "📦 批次 $BATCH_COUNT: 删除最多 $BATCH_SIZE 条记录..."
    
    # 执行删除
    RESULT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
      --command="DELETE FROM products WHERE company_name = '$SUPPLIER_NAME' LIMIT $BATCH_SIZE" 2>&1)
    
    # 检查是否成功
    if echo "$RESULT" | grep -q "success.*true"; then
        echo "   ✅ 批次 $BATCH_COUNT 删除成功"
        DELETED=$((DELETED + BATCH_SIZE))
        
        # 检查还有多少剩余
        REMAINING=$(npx wrangler d1 execute webapp-csv-import-production --remote \
          --command="SELECT COUNT(*) as count FROM products WHERE company_name = '$SUPPLIER_NAME'" 2>&1 | \
          grep -o '"count":[0-9]*' | grep -o '[0-9]*')
        
        echo "   📊 预计已删除: $DELETED 条"
        echo "   📊 剩余记录: $REMAINING 条"
        echo ""
        
        # 如果没有剩余记录，退出循环
        if [ "$REMAINING" = "0" ]; then
            echo "✅ 所有记录已删除完毕！"
            break
        fi
        
        # 每批次后休息1秒，避免数据库压力
        sleep 1
    else
        echo "   ❌ 批次 $BATCH_COUNT 删除失败，查看错误信息："
        echo "$RESULT"
        echo ""
        echo "⚠️  删除操作已暂停，请检查错误后手动处理。"
        exit 1
    fi
    
    # 安全限制：最多删除20批次（20,000条）
    if [ $BATCH_COUNT -ge 20 ]; then
        echo "⚠️  已达到安全限制（20批次），停止删除。"
        echo "   如需继续，请再次运行此脚本。"
        break
    fi
done

echo ""
echo "========================================"
echo "  删除操作完成"
echo "========================================"
echo ""

# 最终验证
echo "🔍 最终验证..."
FINAL_COUNT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
  --command="SELECT COUNT(*) as count FROM products WHERE company_name = '$SUPPLIER_NAME'" 2>&1 | \
  grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "📊 供应商剩余记录数: $FINAL_COUNT"

# 查询数据库总记录数
TOTAL_COUNT=$(npx wrangler d1 execute webapp-csv-import-production --remote \
  --command="SELECT COUNT(*) as count FROM products" 2>&1 | \
  grep -o '"count":[0-9]*' | grep -o '[0-9]*')

echo "📊 数据库总记录数: $TOTAL_COUNT"
echo ""

if [ "$FINAL_COUNT" = "0" ]; then
    echo "🎉 删除成功！供应商数据已完全清除。"
else
    echo "⚠️  仍有 $FINAL_COUNT 条记录未删除，可能需要再次运行脚本。"
fi

echo ""
echo "========================================"
