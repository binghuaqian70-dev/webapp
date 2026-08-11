#!/bin/bash
# 7.9导入实时监控

while true; do
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         7.9数据导入实时监控 - $(date '+%H:%M:%S')              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # 检查进程
    if pgrep -f import_7_9_batch.mjs > /dev/null; then
        echo "✅ 导入进程: 运行中"
    else
        echo "❌ 导入进程: 已停止"
        break
    fi
    
    echo ""
    echo "📊 统计信息:"
    echo "----------------------------------------"
    
    if [ -f 7_9_import_stats.json ]; then
        node -e "
        const fs = require('fs');
        const stats = JSON.parse(fs.readFileSync('7_9_import_stats.json', 'utf8'));
        console.log('   文件进度:', stats.processedFiles + '/' + stats.totalFiles, '(' + (stats.processedFiles/stats.totalFiles*100).toFixed(1) + '%)');
        console.log('   当前文件:', stats.currentFile || '无');
        console.log('   运行状态:', stats.status);
        " 2>/dev/null
    fi
    
    echo ""
    echo "📝 最新日志 (最后5行):"
    echo "----------------------------------------"
    tail -5 7_9_import.log 2>/dev/null | sed 's/^/   /'
    
    echo ""
    echo "按 Ctrl+C 退出监控"
    
    sleep 5
done
