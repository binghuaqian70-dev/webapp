#!/bin/bash
# 1.8数据汇总表批量导入进度检查脚本
# 实时显示导入进度和统计信息

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 1.8数据汇总表批量导入 - 实时进度监控"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查进程是否运行
if pgrep -f "optimized_batch_import.mjs" > /dev/null; then
    echo "✅ 导入进程运行中"
    echo "   PID: $(pgrep -f 'optimized_batch_import.mjs')"
else
    echo "⏹️  导入进程未运行"
fi

echo ""

# 显示统计数据
if [ -f "1_8_import_stats.json" ]; then
    echo "📈 导入统计:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 使用 jq 解析 JSON 数据
    if command -v jq &> /dev/null; then
        STATUS=$(jq -r '.status' 1_8_import_stats.json)
        PROCESSED_FILES=$(jq -r '.processedFiles' 1_8_import_stats.json)
        TOTAL_FILES=$(jq -r '.totalFiles' 1_8_import_stats.json)
        PROCESSED_CHUNKS=$(jq -r '.processedChunks' 1_8_import_stats.json)
        TOTAL_CHUNKS=$(jq -r '.totalChunks' 1_8_import_stats.json)
        IMPORTED=$(jq -r '.importedRecords' 1_8_import_stats.json)
        TOTAL_RECORDS=$(jq -r '.totalRecords' 1_8_import_stats.json)
        CURRENT_FILE=$(jq -r '.currentFile' 1_8_import_stats.json)
        START_TIME=$(jq -r '.startTime' 1_8_import_stats.json)
        
        echo "📊 状态: $STATUS"
        echo "📁 文件进度: $PROCESSED_FILES / $TOTAL_FILES"
        echo "📦 分块进度: $PROCESSED_CHUNKS / $TOTAL_CHUNKS"
        echo "📈 已导入记录: $IMPORTED"
        echo "📊 预计总记录: $TOTAL_RECORDS"
        echo "📄 当前文件: $CURRENT_FILE"
        echo "🕐 开始时间: $START_TIME"
        
        # 计算完成度
        if [ "$TOTAL_FILES" != "0" ] && [ "$TOTAL_FILES" != "null" ]; then
            FILE_PERCENT=$(awk "BEGIN {printf \"%.2f\", $PROCESSED_FILES * 100 / $TOTAL_FILES}")
            echo "📊 文件完成度: $FILE_PERCENT%"
        fi
        
        if [ "$TOTAL_CHUNKS" != "0" ] && [ "$TOTAL_CHUNKS" != "null" ]; then
            CHUNK_PERCENT=$(awk "BEGIN {printf \"%.2f\", $PROCESSED_CHUNKS * 100 / $TOTAL_CHUNKS}")
            echo "📊 分块完成度: $CHUNK_PERCENT%"
        fi
        
        # 计算已运行时间
        if [ "$START_TIME" != "null" ] && [ "$START_TIME" != "" ]; then
            START_TIMESTAMP=$(date -d "$START_TIME" +%s 2>/dev/null || echo "0")
            CURRENT_TIMESTAMP=$(date +%s)
            if [ "$START_TIMESTAMP" != "0" ]; then
                ELAPSED=$((CURRENT_TIMESTAMP - START_TIMESTAMP))
                ELAPSED_MINUTES=$((ELAPSED / 60))
                echo "⏱️  已运行时间: $ELAPSED_MINUTES 分钟"
                
                # 预计剩余时间
                if [ "$PROCESSED_CHUNKS" != "0" ] && [ "$TOTAL_CHUNKS" != "0" ] && [ "$TOTAL_CHUNKS" != "null" ]; then
                    REMAINING_CHUNKS=$((TOTAL_CHUNKS - PROCESSED_CHUNKS))
                    AVG_TIME_PER_CHUNK=$((ELAPSED / PROCESSED_CHUNKS))
                    REMAINING_SECONDS=$((AVG_TIME_PER_CHUNK * REMAINING_CHUNKS))
                    REMAINING_HOURS=$((REMAINING_SECONDS / 3600))
                    REMAINING_MINUTES=$(((REMAINING_SECONDS % 3600) / 60))
                    echo "⏱️  预计剩余: ${REMAINING_HOURS}小时${REMAINING_MINUTES}分钟"
                fi
            fi
        fi
    else
        cat 1_8_import_stats.json
    fi
else
    echo "⚠️  未找到统计数据文件: ./1_8_import_stats.json"
fi

echo ""

# 显示进度信息
if [ -f "1_8_import_progress.json" ]; then
    echo "📋 进度信息:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if command -v jq &> /dev/null; then
        CURRENT_FILE_INDEX=$(jq -r '.currentFileIndex' 1_8_import_progress.json)
        COMPLETED_FILES=$(jq -r '.completedFiles' 1_8_import_progress.json)
        LAST_FILE=$(jq -r '.lastCompletedFile' 1_8_import_progress.json)
        TIMESTAMP=$(jq -r '.timestamp' 1_8_import_progress.json)
        
        echo "📁 当前文件索引: $CURRENT_FILE_INDEX"
        echo "✅ 已完成文件数: $COMPLETED_FILES"
        echo "📄 最后完成文件: $LAST_FILE"
        echo "🕐 最后更新时间: $TIMESTAMP"
    else
        cat 1_8_import_progress.json
    fi
else
    echo "⚠️  未找到进度文件: ./1_8_import_progress.json"
fi

echo ""

# 显示最近日志
if [ -f "1_8_import.log" ]; then
    echo "📋 最近日志 (最后20行):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -n 20 1_8_import.log
else
    echo "⚠️  未找到日志文件: ./1_8_import.log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示:"
echo "   - 实时监控: watch -n 5 ./check_1_8_import.sh"
echo "   - 查看日志: tail -f 1_8_import.log"
echo "   - 停止任务: pkill -f \"optimized_batch_import.mjs\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
