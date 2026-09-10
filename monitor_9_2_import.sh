#!/bin/bash
echo "========================================"
echo "  9.2数据汇总表导入进度监控"
echo "========================================"
echo ""
echo "📊 实时进度："
cd /home/user/webapp
tail -5 9_2_import.log | grep -E "(开始处理文件|完成)" | tail -3
echo ""
echo "📈 已完成文件数："
grep "文件.*完成:" 9_2_import.log | wc -l | xargs echo -n
echo " / 15"
echo ""
echo "🔍 进程状态："
if ps aux | grep "optimized_batch_import.mjs" | grep -v grep > /dev/null; then
    echo "   ✅ 导入进程运行中"
else
    echo "   ⚠️ 导入进程未运行"
fi
echo ""
echo "📋 查看完整日志："
echo "   tail -f 9_2_import.log"
echo ""
