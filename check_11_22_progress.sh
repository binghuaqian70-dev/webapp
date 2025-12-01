#!/bin/bash

clear
echo "================================================================"
echo "  11.22大规模数据导入 - 实时进度监控"
echo "================================================================"
echo ""

# 检查进程状态
echo "🔍 进程状态:"
echo "----------------------------------------"
PROCESS=$(ps aux | grep "optimized_batch_import.mjs" | grep -v grep)
if [ -z "$PROCESS" ]; then
    echo "❌ 导入进程未运行（可能已完成或未启动）"
else
    echo "✅ 导入进程运行中"
    echo "$PROCESS" | awk '{print "   PID: " $2 "  CPU: " $3 "%  MEM: " $4 "%"}'
fi
echo ""

# 显示统计数据
if [ -f "11_22_import_stats.json" ]; then
    echo "📊 导入统计:"
    echo "----------------------------------------"
    
    # 使用jq解析JSON（如果可用）
    if command -v jq &> /dev/null; then
        TOTAL_FILES=$(jq -r '.totalFiles' 11_22_import_stats.json 2>/dev/null || echo "N/A")
        PROCESSED_FILES=$(jq -r '.processedFiles' 11_22_import_stats.json 2>/dev/null || echo "N/A")
        IMPORTED=$(jq -r '.importedRecords' 11_22_import_stats.json 2>/dev/null || echo "N/A")
        STATUS=$(jq -r '.status' 11_22_import_stats.json 2>/dev/null || echo "N/A")
        
        echo "   总文件数: $TOTAL_FILES"
        echo "   已处理文件: $PROCESSED_FILES"
        echo "   已导入记录: $IMPORTED"
        echo "   状态: $STATUS"
        
        if [ "$TOTAL_FILES" != "N/A" ] && [ "$PROCESSED_FILES" != "N/A" ] && [ "$TOTAL_FILES" != "0" ]; then
            PROGRESS=$(echo "scale=1; $PROCESSED_FILES * 100 / $TOTAL_FILES" | bc 2>/dev/null || echo "N/A")
            echo "   文件进度: $PROGRESS%"
        fi
    else
        cat 11_22_import_stats.json | head -20
    fi
else
    echo "⚠️  统计文件不存在"
fi
echo ""

# 显示最新日志
if [ -f "11_22_import.log" ]; then
    echo "📋 最新日志 (最后20行):"
    echo "----------------------------------------"
    tail -20 11_22_import.log | grep -E "(INFO|ERROR|WARN)" | tail -15
else
    echo "⚠️  日志文件不存在"
fi
echo ""

echo "================================================================"
echo "💡 有用的命令:"
echo "   查看实时日志: tail -f 11_22_import.log"
echo "   查看完整统计: cat 11_22_import_stats.json | jq"
echo "   再次检查进度: ./check_11_22_progress.sh"
echo "================================================================"
