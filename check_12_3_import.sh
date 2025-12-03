#!/bin/bash
# 12.3数据汇总表批量导入 - 进度查看脚本

echo "📊 12.3数据汇总表批量导入 - 实时进度监控"
echo "========================================"
echo ""

# 检查进程状态
if pgrep -f "optimized_batch_import.mjs" > /dev/null; then
    IMPORT_PID=$(pgrep -f "optimized_batch_import.mjs")
    echo "✅ 导入任务运行中 (PID: $IMPORT_PID)"
else
    echo "⚠️  导入任务未运行"
fi

echo ""

# 读取并显示统计数据
if [ -f "./12_3_import_stats.json" ]; then
    echo "📈 导入统计:"
    echo "----------------------------------------"
    
    # 提取关键统计信息
    TOTAL_FILES=$(jq -r '.totalFiles // 0' ./12_3_import_stats.json)
    PROCESSED_FILES=$(jq -r '.processedFiles // 0' ./12_3_import_stats.json)
    CURRENT_FILE=$(jq -r '.currentFile // "N/A"' ./12_3_import_stats.json)
    TOTAL_CHUNKS=$(jq -r '.totalChunks // 0' ./12_3_import_stats.json)
    PROCESSED_CHUNKS=$(jq -r '.processedChunks // 0' ./12_3_import_stats.json)
    IMPORTED_RECORDS=$(jq -r '.importedRecords // 0' ./12_3_import_stats.json)
    STATUS=$(jq -r '.status // "unknown"' ./12_3_import_stats.json)
    START_TIME=$(jq -r '.startTime // "N/A"' ./12_3_import_stats.json)
    
    # 计算文件进度百分比
    if [ "$TOTAL_FILES" -gt 0 ]; then
        FILE_PERCENT=$(echo "scale=2; $PROCESSED_FILES * 100 / $TOTAL_FILES" | bc)
    else
        FILE_PERCENT=0
    fi
    
    # 计算分块进度百分比
    if [ "$TOTAL_CHUNKS" -gt 0 ]; then
        CHUNK_PERCENT=$(echo "scale=2; $PROCESSED_CHUNKS * 100 / $TOTAL_CHUNKS" | bc)
    else
        CHUNK_PERCENT=0
    fi
    
    echo "📁 文件进度: $PROCESSED_FILES / $TOTAL_FILES ($FILE_PERCENT%)"
    echo "📦 分块进度: $PROCESSED_CHUNKS / $TOTAL_CHUNKS ($CHUNK_PERCENT%)"
    echo "📊 当前文件: $CURRENT_FILE"
    echo "📈 已导入记录: $IMPORTED_RECORDS 条"
    echo "📊 任务状态: $STATUS"
    echo "🕐 开始时间: $START_TIME"
    
    # 预估剩余时间
    if [ "$PROCESSED_CHUNKS" -gt 0 ] && [ "$START_TIME" != "N/A" ]; then
        CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
        START_EPOCH=$(date -d "$START_TIME" +%s 2>/dev/null || echo 0)
        CURRENT_EPOCH=$(date -d "$CURRENT_TIME" +%s 2>/dev/null || echo 0)
        
        if [ "$START_EPOCH" -gt 0 ] && [ "$CURRENT_EPOCH" -gt "$START_EPOCH" ]; then
            ELAPSED=$((CURRENT_EPOCH - START_EPOCH))
            AVG_TIME_PER_CHUNK=$((ELAPSED / PROCESSED_CHUNKS))
            REMAINING_CHUNKS=$((TOTAL_CHUNKS - PROCESSED_CHUNKS))
            ESTIMATED_REMAINING=$((AVG_TIME_PER_CHUNK * REMAINING_CHUNKS))
            
            HOURS=$((ESTIMATED_REMAINING / 3600))
            MINUTES=$(((ESTIMATED_REMAINING % 3600) / 60))
            SECONDS=$((ESTIMATED_REMAINING % 60))
            
            echo "⏱️  已耗时: $((ELAPSED / 60)) 分钟"
            echo "⏱️  预计剩余: ${HOURS}小时 ${MINUTES}分钟 ${SECONDS}秒"
        fi
    fi
    
    echo ""
    
    # 显示文件结果
    if [ "$(jq -r '.fileResults | length' ./12_3_import_stats.json)" -gt 0 ]; then
        echo "📋 文件导入结果:"
        echo "----------------------------------------"
        jq -r '.fileResults[] | "  \(if .success then "✅" else "❌" end) \(.filename): \(.imported // 0) 条记录"' ./12_3_import_stats.json
    fi
else
    echo "⚠️  未找到统计数据文件 (./12_3_import_stats.json)"
fi

echo ""
echo "========================================"
echo "💡 提示:"
echo "   查看详细日志: tail -f 12_3_import.log"
echo "   查看后台输出: tail -f 12_3_import_nohup.log"
echo "   持续监控: watch -n 5 ./check_12_3_import.sh"
