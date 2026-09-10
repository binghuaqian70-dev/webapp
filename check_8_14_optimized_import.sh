#!/bin/bash
###############################################################################
# 8.14数据汇总表批量导入进度监控脚本（优化版）
# 功能：实时查看optimized_batch_import.mjs的导入进度和统计信息
###############################################################################

STATS_FILE="/home/user/webapp/8_14_import_stats.json"
LOG_FILE="/home/user/webapp/8_14_import.log"

# 清屏
clear

echo "============================================"
echo "  8.14数据汇总表批量导入进度监控（优化版）"
echo "============================================"
echo ""

# 检查统计文件是否存在
if [ ! -f "$STATS_FILE" ]; then
    echo "⚠️ 统计文件不存在: $STATS_FILE"
    echo "💡 可能导入尚未开始或文件已被删除"
    exit 1
fi

# 检查是否安装了jq
if ! command -v jq &> /dev/null; then
    echo "⚠️ 未安装jq工具，使用原始JSON显示"
    echo ""
    cat "$STATS_FILE"
    exit 0
fi

# 读取统计数据
TOTAL_FILES=$(jq -r '.totalFiles // 0' "$STATS_FILE")
PROCESSED_FILES=$(jq -r '.processedFiles // 0' "$STATS_FILE")
CURRENT_FILE=$(jq -r '.currentFile // "无"' "$STATS_FILE")
TOTAL_RECORDS=$(jq -r '.totalRecords // 0' "$STATS_FILE")
IMPORTED_RECORDS=$(jq -r '.importedRecords // 0' "$STATS_FILE")
PROCESSED_CHUNKS=$(jq -r '.processedChunks // 0' "$STATS_FILE")
TOTAL_CHUNKS=$(jq -r '.totalChunks // 0' "$STATS_FILE")
STATUS=$(jq -r '.status // "unknown"' "$STATS_FILE")
START_TIME=$(jq -r '.startTime // "未知"' "$STATS_FILE")
ESTIMATED_TIME=$(jq -r '.estimatedTimeRemaining // 0' "$STATS_FILE")

# 计算进度百分比
if [ "$TOTAL_FILES" -gt 0 ]; then
    FILE_PROGRESS=$(echo "scale=2; ($PROCESSED_FILES / $TOTAL_FILES) * 100" | bc)
else
    FILE_PROGRESS="0.00"
fi

if [ "$TOTAL_CHUNKS" -gt 0 ]; then
    CHUNK_PROGRESS=$(echo "scale=2; ($PROCESSED_CHUNKS / $TOTAL_CHUNKS) * 100" | bc)
else
    CHUNK_PROGRESS="0.00"
fi

if [ "$TOTAL_RECORDS" -gt 0 ]; then
    RECORD_PROGRESS=$(echo "scale=2; ($IMPORTED_RECORDS / $TOTAL_RECORDS) * 100" | bc)
else
    RECORD_PROGRESS="0.00"
fi

# 显示状态
echo "📊 导入状态: $STATUS"
echo "⏰ 开始时间: $START_TIME"
echo ""

# 显示文件进度
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 文件进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   已处理: $PROCESSED_FILES / $TOTAL_FILES ($FILE_PROGRESS%)"
echo "   当前文件: $CURRENT_FILE"
echo ""

# 显示分块进度
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 分块进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   已处理: $PROCESSED_CHUNKS / $TOTAL_CHUNKS ($CHUNK_PROGRESS%)"
echo ""

# 显示记录进度
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 记录进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   已导入: $IMPORTED_RECORDS / $TOTAL_RECORDS ($RECORD_PROGRESS%)"
echo ""

# 显示预估时间
if [ "$ESTIMATED_TIME" -gt 0 ]; then
    MINUTES=$((ESTIMATED_TIME / 60))
    SECONDS=$((ESTIMATED_TIME % 60))
    echo "⏱️  预估剩余时间: ${MINUTES}分${SECONDS}秒"
    echo ""
fi

# 显示文件详情
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 文件详情"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
jq -r '.fileResults[] | "   \(.filename): \(.status) (\(.importedRecords)/\(.totalRecords) 记录)"' "$STATS_FILE" 2>/dev/null || echo "   暂无文件详情"
echo ""

# 显示最新日志（最后5行）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📜 最新日志（最后5行）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "$LOG_FILE" ]; then
    tail -5 "$LOG_FILE"
else
    echo "   日志文件不存在"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 刷新命令: watch -n 2 ./check_8_14_optimized_import.sh"
echo "📝 查看完整日志: tail -f $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
