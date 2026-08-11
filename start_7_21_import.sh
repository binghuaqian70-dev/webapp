#!/bin/bash
# 7.21数据汇总表批量导入启动脚本
# 支持后台运行、实时进度查看、断点续传

SCRIPT_DIR="/home/user/webapp"
IMPORT_SCRIPT="import_7_21_batch.mjs"
LOG_FILE="7_21_import.log"
STATS_FILE="7_21_import_stats.json"
PROGRESS_FILE="7_21_import_progress.json"
NOHUP_LOG="7_21_import_nohup.log"

cd "$SCRIPT_DIR" || exit 1

echo "🚀 7.21数据汇总表批量导入系统"
echo "================================"
echo ""

# 检查是否已有导入进程在运行
if pgrep -f "$IMPORT_SCRIPT" > /dev/null; then
    echo "⚠️  检测到导入进程正在运行中"
    echo ""
    echo "📊 当前进度:"
    if [ -f "$STATS_FILE" ]; then
        node -e "
        const fs = require('fs');
        try {
            const stats = JSON.parse(fs.readFileSync('$STATS_FILE', 'utf8'));
            console.log('   📁 已处理文件:', stats.processedFiles + '/' + stats.totalFiles);
            console.log('   📦 已处理分块:', stats.processedChunks + '/' + stats.totalChunks);
            console.log('   📈 已导入记录:', stats.importedRecords.toLocaleString(), '条');
            console.log('   ⏱️  运行状态:', stats.status);
            console.log('   📄 当前文件:', stats.currentFile || '无');
        } catch (e) {
            console.log('   ⚠️  无法读取统计信息');
        }
        "
    fi
    echo ""
    echo "💡 查看实时日志: tail -f $LOG_FILE"
    echo "💡 查看进程: ps aux | grep $IMPORT_SCRIPT"
    echo "💡 停止导入: pkill -f $IMPORT_SCRIPT"
    exit 0
fi

# 检查是否存在进度文件（断点续传）
if [ -f "$PROGRESS_FILE" ]; then
    echo "🔄 检测到上次导入进度，支持断点续传"
    if [ -f "$STATS_FILE" ]; then
        node -e "
        const fs = require('fs');
        try {
            const stats = JSON.parse(fs.readFileSync('$STATS_FILE', 'utf8'));
            console.log('   📁 已完成文件:', stats.processedFiles + '/' + stats.totalFiles);
            console.log('   📦 已完成分块:', stats.processedChunks);
            console.log('   📈 已导入记录:', stats.importedRecords.toLocaleString(), '条');
        } catch (e) {
            console.log('   ⚠️  无法读取统计信息');
        }
        "
    fi
    echo ""
    read -p "是否从断点继续导入? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  清理旧进度文件..."
        rm -f "$PROGRESS_FILE" "$STATS_FILE" "$LOG_FILE" "$NOHUP_LOG"
        echo "✅ 已清理，将开始全新导入"
    else
        echo "✅ 将从断点继续导入"
    fi
    echo ""
fi

# 检查AI Drive中的文件
echo "🔍 正在检查AI Drive中的目标文件..."
echo ""
node -e "
const fs = require('fs');
const path = require('path');

const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILES = Array.from({ length: 12 }, (_, i) => {
  return \`7.21数据汇总表-utf8_part_\${i + 1}.csv\`;
});

let foundCount = 0;
let totalRecords = 0;
let totalSize = 0;

TARGET_FILES.forEach(file => {
  const filePath = path.join(AI_DRIVE_PATH, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const records = lines.length - 1;
    
    foundCount++;
    totalRecords += records;
    totalSize += stats.size;
    
    console.log(\`   ✅ \${file}: \${(stats.size / 1024 / 1024).toFixed(2)} MB, \${records.toLocaleString()} 条记录\`);
  } else {
    console.log(\`   ❌ \${file}: 文件不存在\`);
  }
});

console.log('');
console.log(\`📊 汇总信息:\`);
console.log(\`   📁 找到文件: \${foundCount}/\${TARGET_FILES.length}\`);
console.log(\`   📈 预计记录: \${totalRecords.toLocaleString()} 条\`);
console.log(\`   💾 总文件大小: \${(totalSize / 1024 / 1024).toFixed(2)} MB\`);

if (foundCount === 0) {
  console.log('');
  console.log('❌ 错误: 未找到任何目标文件');
  console.log('💡 请确保文件已放置在 /mnt/aidrive 目录下');
  console.log('💡 文件命名格式: 7.21数据汇总表-utf8_part_1.csv ~ 7.21数据汇总表-utf8_part_12.csv');
  process.exit(1);
}
" || exit 1

echo ""
read -p "是否开始导入? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消导入"
    exit 0
fi

echo ""
echo "🚀 正在启动后台导入进程..."
nohup node "$IMPORT_SCRIPT" > "$NOHUP_LOG" 2>&1 &
IMPORT_PID=$!

echo "✅ 导入进程已启动 (PID: $IMPORT_PID)"
echo ""
echo "📋 实用命令:"
echo "   查看实时日志: tail -f $LOG_FILE"
echo "   查看nohup日志: tail -f $NOHUP_LOG"
echo "   查看统计数据: cat $STATS_FILE | python3 -m json.tool"
echo "   查看进度文件: cat $PROGRESS_FILE | python3 -m json.tool"
echo "   查看进程状态: ps -p $IMPORT_PID"
echo "   停止导入: kill $IMPORT_PID 或 pkill -f $IMPORT_SCRIPT"
echo ""
echo "💡 导入过程支持断点续传，中断后重新运行此脚本即可继续"
echo ""

# 等待2秒后显示初始日志
sleep 2
echo "📊 初始日志输出:"
echo "-----------------------------------"
tail -20 "$LOG_FILE" 2>/dev/null || echo "⚠️  日志文件尚未生成"
echo "-----------------------------------"
echo ""
echo "✅ 导入任务已在后台运行"
echo "💡 使用 tail -f $LOG_FILE 查看实时进度"
