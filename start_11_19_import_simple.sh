#!/bin/bash
echo "🚀 启动11.19数据导入..."
echo ""
echo "📋 目标文件:"
echo "  - 11.19数据汇总表-utf8_part_1.csv (507条)"
echo "  - 11.19数据汇总表-utf8_part_2.csv (506条)"
echo "  - 11.19数据汇总表-utf8_part_3.csv (506条)"
echo "  总计: 1,519条"
echo ""
echo "启动导入进程..."
nohup node optimized_batch_import.mjs > 11_19_import.log.console 2>&1 &
PID=$!
echo "✅ 进程已启动 (PID: $PID)"
echo ""
echo "💡 监控命令:"
echo "  查看日志: tail -f 11_19_import.log"
echo "  查看进程: ps aux | grep $PID"
echo ""
