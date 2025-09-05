#!/bin/bash

# 9.5数据汇总表后台批量导入启动脚本
echo "🚀 9.5数据汇总表大规模导入任务启动脚本"
echo "=" | head -c 60 | tr '\n' '='; echo

echo "📋 任务信息:"
echo "   数据源: AI Drive (/mnt/aidrive)"
echo "   文件数量: 60个 (part_01 到 part_60)" 
echo "   预估记录数: ~29,571条"
echo "   预估时间: 约7分钟"
echo

# 检查必要文件
if [ ! -f "optimized_batch_import.mjs" ]; then
    echo "❌ 错误: 找不到 optimized_batch_import.mjs 文件"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

echo "✅ 环境检查通过"
echo

# 创建日志目录
mkdir -p logs

# 生成时间戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/9_5_import_${TIMESTAMP}.log"

echo "📁 日志文件: $LOG_FILE"
echo "📊 进度文件: 9_5_import_progress.json"
echo "📈 统计文件: 9_5_import_stats.json"
echo

# 询问用户确认
read -p "🔄 确认开始导入？[y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 用户取消导入"
    exit 0
fi

echo "🚀 启动后台导入任务..."

# 后台运行导入脚本
nohup node optimized_batch_import.mjs > "$LOG_FILE" 2>&1 &
IMPORT_PID=$!

echo "✅ 后台任务已启动"
echo "📋 进程ID: $IMPORT_PID"
echo "📁 日志文件: $LOG_FILE"
echo

echo "💡 监控命令:"
echo "   查看日志: tail -f $LOG_FILE"
echo "   查看进度: cat 9_5_import_stats.json"
echo "   查看进程: ps aux | grep $IMPORT_PID"
echo "   停止任务: kill $IMPORT_PID"
echo

echo "📊 实时监控进度 (按Ctrl+C退出监控，不会停止导入):"
echo "=" | head -c 60 | tr '\n' '='; echo

# 实时监控进度
while kill -0 $IMPORT_PID 2>/dev/null; do
    if [ -f "9_5_import_stats.json" ]; then
        # 解析JSON文件显示进度
        if command -v jq &> /dev/null; then
            PROCESSED=$(jq -r '.processedFiles // 0' 9_5_import_stats.json)
            SUCCESS=$(jq -r '.successFiles // 0' 9_5_import_stats.json) 
            FAILED=$(jq -r '.failedFiles // 0' 9_5_import_stats.json)
            RECORDS=$(jq -r '.importedRecords // 0' 9_5_import_stats.json)
            REMAINING=$(jq -r '.estimatedTimeRemaining // "N/A"' 9_5_import_stats.json)
            
            echo -e "\r📊 进度: $PROCESSED/60 | ✅$SUCCESS ❌$FAILED | 📈${RECORDS}条 | ⏱️${REMAINING}秒 \c"
        else
            echo -e "\r📊 任务运行中... (安装jq获得详细进度显示) \c"
        fi
    else
        echo -e "\r🔄 初始化中... \c"
    fi
    sleep 5
done

echo
echo "🏁 导入任务完成！"

# 显示最终结果
if [ -f "9_5_import_stats.json" ]; then
    echo
    echo "📊 最终统计:"
    if command -v jq &> /dev/null; then
        echo "   处理文件: $(jq -r '.processedFiles' 9_5_import_stats.json)/60"
        echo "   成功文件: $(jq -r '.successFiles' 9_5_import_stats.json)"
        echo "   失败文件: $(jq -r '.failedFiles' 9_5_import_stats.json)" 
        echo "   导入记录: $(jq -r '.importedRecords' 9_5_import_stats.json) 条"
        echo "   数据库总记录: $(jq -r '.totalRecords' 9_5_import_stats.json) 条"
    else
        echo "   详细信息请查看: 9_5_import_stats.json"
    fi
fi

echo
echo "📋 详细日志: $LOG_FILE"
echo "🎉 任务执行完毕！"