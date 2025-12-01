#!/bin/bash

echo "⏳ 等待11.22导入任务完成..."
echo ""
echo "📊 任务信息:"
echo "   - 总文件数: 30个"
echo "   - 预计记录: 15,292条"
echo "   - 预计耗时: 30-40分钟"
echo ""
echo "💡 您可以随时按 Ctrl+C 退出监控（不影响后台导入）"
echo ""

LAST_STATUS=""
CHECK_COUNT=0

while true; do
    CHECK_COUNT=$((CHECK_COUNT + 1))
    
    # 检查进程是否还在运行
    if ! ps aux | grep "optimized_batch_import.mjs" | grep -v grep > /dev/null; then
        echo ""
        echo "✅ 导入进程已结束！"
        break
    fi
    
    # 每30秒显示一次进度
    if [ -f "11_22_import_stats.json" ]; then
        if command -v jq &> /dev/null; then
            PROCESSED=$(jq -r '.processedFiles' 11_22_import_stats.json 2>/dev/null || echo "0")
            IMPORTED=$(jq -r '.importedRecords' 11_22_import_stats.json 2>/dev/null || echo "0")
            STATUS=$(jq -r '.status' 11_22_import_stats.json 2>/dev/null || echo "unknown")
            
            CURRENT_STATUS="文件: $PROCESSED/30 | 记录: $IMPORTED"
            
            if [ "$CURRENT_STATUS" != "$LAST_STATUS" ]; then
                echo "[$(date '+%H:%M:%S')] 📊 进度更新: $CURRENT_STATUS"
                LAST_STATUS="$CURRENT_STATUS"
            fi
        fi
    fi
    
    # 每5分钟提醒一次
    if [ $((CHECK_COUNT % 10)) -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] ⏱️  已运行 $((CHECK_COUNT * 30 / 60)) 分钟，任务继续进行中..."
    fi
    
    sleep 30
done

echo ""
echo "================================================================"
echo "  导入任务完成分析"
echo "================================================================"
echo ""

# 显示最终统计
if [ -f "11_22_import_stats.json" ]; then
    echo "📊 最终统计:"
    if command -v jq &> /dev/null; then
        echo "   总文件数: $(jq -r '.totalFiles' 11_22_import_stats.json)"
        echo "   已处理: $(jq -r '.processedFiles' 11_22_import_stats.json)"
        echo "   导入记录: $(jq -r '.importedRecords' 11_22_import_stats.json)"
        echo "   状态: $(jq -r '.status' 11_22_import_stats.json)"
        
        START_TIME=$(jq -r '.startTime' 11_22_import_stats.json)
        END_TIME=$(jq -r '.endTime' 11_22_import_stats.json)
        if [ "$START_TIME" != "null" ] && [ "$END_TIME" != "null" ]; then
            echo "   开始时间: $START_TIME"
            echo "   结束时间: $END_TIME"
        fi
    else
        cat 11_22_import_stats.json
    fi
else
    echo "⚠️  统计文件不存在"
fi

echo ""
echo "📋 查看详细日志:"
echo "   tail -100 11_22_import.log"
echo ""
echo "🔍 验证导入结果:"
echo "   npx wrangler d1 execute webapp-csv-import-production --remote --command=\"SELECT COUNT(*) FROM products\""
echo ""
