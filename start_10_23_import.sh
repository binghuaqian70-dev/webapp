#!/bin/bash

# 10.23数据汇总表批量导入启动脚本
# 提供用户友好的启动界面和确认提示

echo "🚀 10.23数据汇总表批量导入系统"
echo "=================================="
echo ""

# 检查必要文件
echo "📋 系统预检查..."

# 检查导入脚本
if [ ! -f "optimized_batch_import.mjs" ]; then
    echo "❌ 错误: 未找到导入脚本 optimized_batch_import.mjs"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    exit 1
fi

# 检查AI Drive目录
if [ ! -d "/mnt/aidrive" ]; then
    echo "❌ 错误: AI Drive 目录不存在 (/mnt/aidrive)"
    exit 1
fi

# 检查部分目标文件
echo "📁 检查目标文件..."
target_files=(
    "10.23数据汇总表-part01.csv"
    "10.23数据汇总表-part02.csv"
    "10.23数据汇总表-part03.csv"
    "10.23数据汇总表-part04.csv"
    "10.23数据汇总表-part05.csv"
    "10.23数据汇总表-part06.csv"
    "10.23数据汇总表-part07.csv"
    "10.23数据汇总表-part08.csv"
    "10.23数据汇总表-part09.csv"
    "10.23数据汇总表-part10.csv"
    "10.23数据汇总表-part11.csv"
    "10.23数据汇总表-part12.csv"
    "10.23数据汇总表-part13.csv"
    "10.23数据汇总表-part14.csv"
    "10.23数据汇总表-part15.csv"
    "10.23数据汇总表-part16.csv"
    "10.23数据汇总表-part17.csv"
    "10.23数据汇总表-part18.csv"
    "10.23数据汇总表-part19.csv"
    "10.23数据汇总表-part20.csv"
)

existing_files=0
total_size=0

for file in "${target_files[@]}"; do
    file_path="/mnt/aidrive/$file"
    if [ -f "$file_path" ]; then
        size=$(stat -c%s "$file_path" 2>/dev/null || echo "0")
        total_size=$((total_size + size))
        existing_files=$((existing_files + 1))
        echo "   ✅ $file"
    else
        echo "   ❌ $file (未找到)"
    fi
done

echo ""
echo "📊 文件统计:"
echo "   📁 总文件数: ${#target_files[@]}"
echo "   ✅ 存在文件: $existing_files"
echo "   ❌ 缺失文件: $((${#target_files[@]} - existing_files))"

# 格式化文件大小
if [ $total_size -gt 1073741824 ]; then
    size_display=$(echo "scale=2; $total_size/1073741824" | bc -l)"GB"
elif [ $total_size -gt 1048576 ]; then
    size_display=$(echo "scale=2; $total_size/1048576" | bc -l)"MB"
elif [ $total_size -gt 1024 ]; then
    size_display=$(echo "scale=2; $total_size/1024" | bc -l)"KB"
else
    size_display="${total_size}B"
fi
echo "   💾 总文件大小: $size_display"

if [ $existing_files -eq 0 ]; then
    echo ""
    echo "❌ 错误: 未找到任何目标文件"
    echo "请确保10.23数据汇总表的分割文件已上传到AI Drive"
    exit 1
fi

echo ""
echo "✅ 预检查完成"

# 显示导入配置
echo ""
echo "⚙️ 导入配置:"
echo "   🎯 导入方式: 逐个文件导入"
echo "   📦 分块策略: 智能分块 (60-100行/块，20文件优化)"
echo "   🔄 重试机制: 最多3次重试"
echo "   💾 断点续传: 支持"
echo "   📊 进度追踪: 实时统计"
echo "   🏷️ 价格精度: 6位小数"
echo "   ⏱️ 分块间延迟: 1秒"
echo "   📁 文件间延迟: 2.5秒"

# 检查是否有正在运行的导入进程
echo ""
echo "🔍 检查进程状态..."
if pgrep -f "optimized_batch_import" > /dev/null; then
    echo "⚠️ 检测到导入进程正在运行!"
    echo "   请先停止正在运行的进程，或等待其完成"
    echo "   可以使用 'node check_10_23_import_status.mjs' 检查状态"
    exit 1
fi

# 检查是否有断点续传数据
if [ -f "10_23_import_progress.json" ] || [ -f "10_23_import_stats.json" ]; then
    echo "🔄 检测到断点续传数据:"
    if [ -f "10_23_import_progress.json" ]; then
        echo "   📄 进度文件: 10_23_import_progress.json"
    fi
    if [ -f "10_23_import_stats.json" ]; then
        echo "   📊 统计文件: 10_23_import_stats.json"
    fi
    echo "   💡 导入将从上次中断点继续"
fi

echo ""
echo "🚨 重要提醒:"
echo "   • 本次导入将处理 $existing_files 个分割文件"
echo "   • 导入过程可能需要较长时间 (预计20-40分钟)"
echo "   • 导入过程中请勿关闭终端或中断程序"
echo "   • 支持断点续传，意外中断后可重新运行"
echo "   • 建议在稳定的网络环境下运行"
echo "   • 20个文件比之前10个文件需要更长时间"

# 用户确认
echo ""
echo "❓ 确认开始导入吗？"
echo "   输入 'yes' 确认开始"
echo "   输入其他内容取消"
echo ""
read -p "👉 请输入: " confirmation

case $confirmation in
    [Yy][Ee][Ss]|[Yy])
        echo ""
        echo "✅ 确认开始导入"
        ;;
    *)
        echo ""
        echo "❌ 已取消导入"
        exit 0
        ;;
esac

# 开始导入
echo ""
echo "🚀 启动10.23数据汇总表批量导入..."
echo "=================================="
echo ""

# 以后台模式运行导入脚本
echo "📝 导入日志将保存到: 10_23_import.log"
echo "📊 可以使用以下命令监控进度:"
echo "   node check_10_23_import_status.mjs"
echo ""

# 使用nohup在后台运行，并将输出重定向到日志文件
nohup node optimized_batch_import.mjs >> 10_23_import.log 2>&1 &
import_pid=$!

echo "✅ 导入进程已启动 (PID: $import_pid)"
echo ""
echo "📋 监控命令:"
echo "   检查状态: node check_10_23_import_status.mjs"
echo "   查看日志: tail -f 10_23_import.log"
echo "   停止进程: kill $import_pid"
echo ""
echo "⏳ 导入过程已在后台开始，可以关闭此终端"
echo "🎯 请使用状态检查命令监控导入进度"