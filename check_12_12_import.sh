#!/bin/bash
# 12.12数据汇总表批量导入进度检查脚本
# 实时显示导入进度、统计数据和预计剩余时间

PROGRESS_FILE="./12_12_import_progress.json"
STATS_FILE="./12_12_import_stats.json"
LOG_FILE="./12_12_import.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 12.12数据汇总表批量导入 - 实时进度监控"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查进程是否运行
if pgrep -f "optimized_batch_import.mjs" > /dev/null; then
    echo "✅ 导入进程运行中"
    PID=$(pgrep -f "optimized_batch_import.mjs")
    echo "   PID: $PID"
else
    echo "⏹️  导入进程未运行"
fi

echo ""

# 显示统计数据
if [ -f "$STATS_FILE" ]; then
    echo "📈 导入统计:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 使用jq解析JSON（如果可用）
    if command -v jq &> /dev/null; then
        STATUS=$(jq -r '.status' "$STATS_FILE" 2>/dev/null || echo "unknown")
        TOTAL_FILES=$(jq -r '.totalFiles' "$STATS_FILE" 2>/dev/null || echo "0")
        PROCESSED_FILES=$(jq -r '.processedFiles' "$STATS_FILE" 2>/dev/null || echo "0")
        CURRENT_FILE=$(jq -r '.currentFile' "$STATS_FILE" 2>/dev/null || echo "N/A")
        TOTAL_RECORDS=$(jq -r '.totalRecords' "$STATS_FILE" 2>/dev/null || echo "0")
        IMPORTED_RECORDS=$(jq -r '.importedRecords' "$STATS_FILE" 2>/dev/null || echo "0")
        TOTAL_CHUNKS=$(jq -r '.totalChunks' "$STATS_FILE" 2>/dev/null || echo "0")
        PROCESSED_CHUNKS=$(jq -r '.processedChunks' "$STATS_FILE" 2>/dev/null || echo "0")
        START_TIME=$(jq -r '.startTime' "$STATS_FILE" 2>/dev/null || echo "N/A")
        
        echo "📊 状态: $STATUS"
        echo "📁 文件进度: $PROCESSED_FILES / $TOTAL_FILES"
        echo "📦 分块进度: $PROCESSED_CHUNKS / $TOTAL_CHUNKS"
        echo "📈 已导入记录: $IMPORTED_RECORDS"
        echo "📊 预计总记录: $TOTAL_RECORDS"
        echo "📄 当前文件: $CURRENT_FILE"
        echo "🕐 开始时间: $START_TIME"
        
        # 计算进度百分比
        if [ "$TOTAL_FILES" -gt 0 ]; then
            FILE_PERCENTAGE=$(awk "BEGIN {printf \"%.2f\", ($PROCESSED_FILES / $TOTAL_FILES) * 100}")
            echo "📊 文件完成度: ${FILE_PERCENTAGE}%"
        fi
        
        if [ "$TOTAL_CHUNKS" -gt 0 ]; then
            CHUNK_PERCENTAGE=$(awk "BEGIN {printf \"%.2f\", ($PROCESSED_CHUNKS / $TOTAL_CHUNKS) * 100}")
            echo "📊 分块完成度: ${CHUNK_PERCENTAGE}%"
        fi
        
        # 显示预计剩余时间
        if [ "$PROCESSED_CHUNKS" -gt 0 ] && [ "$START_TIME" != "null" ] && [ "$START_TIME" != "N/A" ]; then
            CURRENT_TIME=$(date +%s)
            START_TIMESTAMP=$(date -d "$START_TIME" +%s 2>/dev/null)
            
            if [ ! -z "$START_TIMESTAMP" ]; then
                ELAPSED=$((CURRENT_TIME - START_TIMESTAMP))
                AVG_TIME_PER_CHUNK=$((ELAPSED / PROCESSED_CHUNKS))
                REMAINING_CHUNKS=$((TOTAL_CHUNKS - PROCESSED_CHUNKS))
                ESTIMATED_REMAINING=$((AVG_TIME_PER_CHUNK * REMAINING_CHUNKS))
                
                HOURS=$((ESTIMATED_REMAINING / 3600))
                MINUTES=$(((ESTIMATED_REMAINING % 3600) / 60))
                
                echo "⏱️  已运行时间: $((ELAPSED / 60)) 分钟"
                echo "⏱️  预计剩余: ${HOURS}小时${MINUTES}分钟"
            fi
        fi
    else
        echo "⚠️  jq未安装，显示原始数据:"
        cat "$STATS_FILE" | head -20
    fi
else
    echo "⚠️  未找到统计文件: $STATS_FILE"
fi

echo ""

# 显示进度文件
if [ -f "$PROGRESS_FILE" ]; then
    echo "📋 进度信息:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if command -v jq &> /dev/null; then
        CURRENT_FILE_INDEX=$(jq -r '.currentFileIndex' "$PROGRESS_FILE" 2>/dev/null || echo "0")
        COMPLETED_FILES=$(jq -r '.completedFiles' "$PROGRESS_FILE" 2>/dev/null || echo "0")
        LAST_COMPLETED=$(jq -r '.lastCompletedFile' "$PROGRESS_FILE" 2>/dev/null || echo "N/A")
        TIMESTAMP=$(jq -r '.timestamp' "$PROGRESS_FILE" 2>/dev/null || echo "N/A")
        
        echo "📁 当前文件索引: $CURRENT_FILE_INDEX"
        echo "✅ 已完成文件数: $COMPLETED_FILES"
        echo "📄 最后完成文件: $LAST_COMPLETED"
        echo "🕐 最后更新时间: $TIMESTAMP"
    else
        cat "$PROGRESS_FILE"
    fi
else
    echo "⚠️  未找到进度文件: $PROGRESS_FILE"
fi

echo ""

# 显示最近日志
if [ -f "$LOG_FILE" ]; then
    echo "📋 最近日志 (最后20行):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -n 20 "$LOG_FILE"
else
    echo "⚠️  未找到日志文件: $LOG_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示:"
echo "   - 实时监控: watch -n 5 ./check_12_12_import.sh"
echo "   - 查看日志: tail -f 12_12_import.log"
echo "   - 停止任务: pkill -f \"optimized_batch_import.mjs\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
