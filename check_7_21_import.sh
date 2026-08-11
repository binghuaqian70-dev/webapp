#!/bin/bash
# 7.21数据汇总表批量导入进度查看脚本
# 实时显示导入进度、统计信息和预估完成时间

SCRIPT_DIR="/home/user/webapp"
STATS_FILE="7_21_import_stats.json"
PROGRESS_FILE="7_21_import_progress.json"
LOG_FILE="7_21_import.log"

cd "$SCRIPT_DIR" || exit 1

echo "📊 7.21数据汇总表批量导入进度监控"
echo "========================================"
echo ""

# 检查导入进程是否运行
if pgrep -f "import_7_21_batch.mjs" > /dev/null; then
    echo "✅ 导入进程运行中"
else
    echo "⚠️  导入进程未运行"
fi
echo ""

# 显示统计信息
if [ -f "$STATS_FILE" ]; then
    echo "📈 统计信息:"
    echo "----------------------------------------"
    node -e "
    const fs = require('fs');
    try {
        const stats = JSON.parse(fs.readFileSync('$STATS_FILE', 'utf8'));
        
        console.log('🎯 总体进度:');
        console.log('   总文件数:', stats.totalFiles);
        console.log('   已处理文件:', stats.processedFiles);
        console.log('   文件进度:', ((stats.processedFiles / stats.totalFiles * 100) || 0).toFixed(2) + '%');
        console.log('');
        
        console.log('📦 分块处理:');
        console.log('   总分块数:', stats.totalChunks);
        console.log('   已处理分块:', stats.processedChunks);
        console.log('   分块进度:', stats.totalChunks > 0 ? ((stats.processedChunks / stats.totalChunks * 100).toFixed(2) + '%') : '0%');
        console.log('');
        
        console.log('📊 数据记录:');
        console.log('   预计总记录:', (stats.totalRecords || 0).toLocaleString(), '条');
        console.log('   已导入记录:', (stats.importedRecords || 0).toLocaleString(), '条');
        if (stats.totalRecords > 0) {
            console.log('   导入进度:', ((stats.importedRecords / stats.totalRecords * 100) || 0).toFixed(2) + '%');
        }
        console.log('');
        
        console.log('⏱️  时间信息:');
        if (stats.startTime) {
            const startTime = new Date(stats.startTime);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / 1000);
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;
            console.log('   开始时间:', startTime.toLocaleString('zh-CN'));
            console.log('   已运行时间:', hours + '时' + minutes + '分' + seconds + '秒');
            
            // 预估剩余时间
            if (stats.processedChunks > 0 && stats.totalChunks > stats.processedChunks) {
                const avgTimePerChunk = elapsed / stats.processedChunks;
                const remainingChunks = stats.totalChunks - stats.processedChunks;
                const estimatedRemaining = Math.ceil(avgTimePerChunk * remainingChunks);
                const estHours = Math.floor(estimatedRemaining / 3600);
                const estMinutes = Math.floor((estimatedRemaining % 3600) / 60);
                const estSeconds = estimatedRemaining % 60;
                console.log('   预估剩余时间:', estHours + '时' + estMinutes + '分' + estSeconds + '秒');
            }
        }
        if (stats.endTime) {
            const endTime = new Date(stats.endTime);
            console.log('   完成时间:', endTime.toLocaleString('zh-CN'));
        }
        console.log('');
        
        console.log('📄 当前状态:');
        console.log('   运行状态:', stats.status);
        console.log('   当前文件:', stats.currentFile || '无');
        
        if (stats.error) {
            console.log('   ❌ 错误:', stats.error);
        }
        
        // 显示已完成的文件
        if (stats.fileResults && stats.fileResults.length > 0) {
            console.log('');
            console.log('📋 已完成文件列表:');
            stats.fileResults.forEach((file, index) => {
                if (file.success) {
                    console.log(\`   ✅ \${index + 1}. \${file.filename}: \${(file.imported || 0).toLocaleString()} 条记录\`);
                } else {
                    console.log(\`   ❌ \${index + 1}. \${file.filename}: \${file.error}\`);
                }
            });
        }
    } catch (e) {
        console.log('❌ 无法解析统计数据:', e.message);
    }
    "
    echo "----------------------------------------"
else
    echo "⚠️  统计文件不存在，导入可能尚未开始"
fi

echo ""

# 显示进度文件信息
if [ -f "$PROGRESS_FILE" ]; then
    echo "🔄 断点续传信息:"
    echo "----------------------------------------"
    node -e "
    const fs = require('fs');
    try {
        const progress = JSON.parse(fs.readFileSync('$PROGRESS_FILE', 'utf8'));
        console.log('   当前文件索引:', progress.currentFileIndex);
        console.log('   当前分块索引:', progress.currentChunkIndex);
        console.log('   已完成文件数:', progress.completedFiles);
        console.log('   已完成分块数:', progress.completedChunks);
        console.log('   最后完成文件:', progress.lastCompletedFile || '无');
        if (progress.timestamp) {
            console.log('   更新时间:', new Date(progress.timestamp).toLocaleString('zh-CN'));
        }
    } catch (e) {
        console.log('❌ 无法解析进度数据:', e.message);
    }
    "
    echo "----------------------------------------"
fi

echo ""

# 显示最新日志
if [ -f "$LOG_FILE" ]; then
    echo "📋 最新日志 (最后15行):"
    echo "----------------------------------------"
    tail -15 "$LOG_FILE"
    echo "----------------------------------------"
    echo ""
    echo "💡 查看完整日志: tail -f $LOG_FILE"
else
    echo "⚠️  日志文件不存在"
fi

echo ""
echo "💡 实用命令:"
echo "   实时监控日志: tail -f $LOG_FILE"
echo "   查看完整统计: cat $STATS_FILE | python3 -m json.tool"
echo "   查看进度详情: cat $PROGRESS_FILE | python3 -m json.tool"
echo "   查看进程: ps aux | grep import_7_21_batch"
echo "   停止导入: pkill -f import_7_21_batch.mjs"
echo ""
