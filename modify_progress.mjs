#!/usr/bin/env node
/**
 * 修改9.5导入进度，从第58个文件开始重新导入
 */

import fs from 'fs';

const PROGRESS_FILE = './9_5_import_progress.json';
const STATS_FILE = './9_5_import_stats.json';

try {
  // 读取当前进度
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  console.log(`📋 当前进度: ${progress.currentIndex} (下次开始: part_${(progress.currentIndex + 1).toString().padStart(2, '0')})`);
  
  // 只保留前57个文件的结果（part_01到part_57）
  const newResults = progress.results.slice(0, 57);
  console.log(`📊 保留前57个文件的导入结果，删除其余结果`);
  
  // 修改进度
  const newProgress = {
    currentIndex: 57,  // 从第58个文件开始
    results: newResults,
    timestamp: new Date().toISOString(),
    note: "从第58个文件重新开始导入"
  };
  
  // 保存修改后的进度
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(newProgress, null, 2));
  console.log(`✅ 进度已修改: 下次将从 part_58 开始导入`);
  
  // 更新统计文件
  if (fs.existsSync(STATS_FILE)) {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    
    // 计算前57个文件的实际导入数据
    const importedRecords = newResults.reduce((sum, r) => sum + (r.imported || 0), 0);
    
    stats.processedFiles = 57;
    stats.successFiles = newResults.filter(r => r.success).length;
    stats.failedFiles = newResults.filter(r => !r.success).length;
    stats.importedRecords = importedRecords;
    stats.estimatedTimeRemaining = null; // 重新计算
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    console.log(`✅ 统计数据已更新: 已完成57个文件，导入${importedRecords.toLocaleString()}条记录`);
  }
  
  console.log('\n🎯 设置完成！');
  console.log(`   将从 part_58 重新开始导入`);
  console.log(`   剩余文件: ${60 - 57} 个`);
  console.log(`   已完成文件: 57 个 (part_01 到 part_57)`);
  
  console.log('\n📋 启动命令:');
  console.log('   node optimized_batch_import.mjs');
  console.log('   或');
  console.log('   ./start_9_5_import.sh');

} catch (error) {
  console.error('❌ 修改进度失败:', error.message);
  process.exit(1);
}