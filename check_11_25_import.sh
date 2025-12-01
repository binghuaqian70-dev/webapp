#!/bin/bash

echo "🔍 检查11.25数据导入状态"
echo ""

# 检查日志文件
if [ -f "11_25_import.log" ]; then
    echo "📋 查看导入日志（最后30行）:"
    echo "----------------------------------------"
    tail -30 11_25_import.log
    echo ""
else
    echo "❌ 日志文件不存在: 11_25_import.log"
    echo ""
fi

# 检查统计数据
if [ -f "11_25_import_stats.json" ]; then
    echo "📊 导入统计数据:"
    echo "----------------------------------------"
    if command -v jq &> /dev/null; then
        cat 11_25_import_stats.json | jq '.'
    else
        cat 11_25_import_stats.json
    fi
    echo ""
else
    echo "❌ 统计文件不存在: 11_25_import_stats.json"
    echo ""
fi

# 检查进程状态
echo "🔍 检查导入进程:"
echo "----------------------------------------"
PROCESS=$(ps aux | grep optimized_batch_import | grep -v grep)
if [ -z "$PROCESS" ]; then
    echo "✅ 导入进程已完成"
else
    echo "🔄 导入进程仍在运行:"
    echo "$PROCESS"
fi
echo ""

# 提供有用的命令
echo "📌 有用的命令:"
echo "  查看实时日志: tail -f 11_25_import.log"
echo "  查看统计: cat 11_25_import_stats.json | jq"
echo "  验证导入: npx wrangler d1 execute webapp-csv-import-production --remote --command=\"SELECT COUNT(*) FROM products WHERE updated_at >= '2025-11-25 11:44:00' AND updated_at <= '2025-11-25 11:48:00'\""
