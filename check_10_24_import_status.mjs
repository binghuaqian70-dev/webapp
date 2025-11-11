#!/usr/bin/env node
/**
 * 10.24数据汇总表批量导入状态检查工具
 * 实时监控导入进度、文件状态、数据库状态和系统资源
 */

import fs from 'fs';
import { execSync } from 'child_process';

// 配置常量 - 10.24版本
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILES = [
  '10.24数据汇总表-part01.csv',
  '10.24数据汇总表-part02.csv',
  '10.24数据汇总表-part03.csv',
  '10.24数据汇总表-part04.csv',
  '10.24数据汇总表-part05.csv',
  '10.24数据汇总表-part06.csv',
  '10.24数据汇总表-part07.csv',
  '10.24数据汇总表-part08.csv',
  '10.24数据汇总表-part09.csv',
  '10.24数据汇总表-part10.csv',
  '10.24数据汇总表-part11.csv',
  '10.24数据汇总表-part12.csv',
  '10.24数据汇总表-part13.csv',
  '10.24数据汇总表-part14.csv',
  '10.24数据汇总表-part15.csv',
  '10.24数据汇总表-part16.csv',
  '10.24数据汇总表-part17.csv',
  '10.24数据汇总表-part18.csv',
  '10.24数据汇总表-part19.csv',
  '10.24数据汇总表-part20.csv'
];

const STATS_FILE = './10_24_import_stats.json';
const PROGRESS_FILE = './10_24_import_progress.json';
const LOG_FILE = './10_24_import.log';
const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';

// 工具函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}小时${m}分${s}秒`;
  } else if (m > 0) {
    return `${m}分${s}秒`;
  } else {
    return `${s}秒`;
  }
}

// 检查AI Drive文件状态
function checkAIDriveFiles() {
  console.log('📁 AI Drive 文件状态:');
  let totalSize = 0;
  let existingFiles = 0;
  let missingFiles = [];

  TARGET_FILES.forEach(filename => {
    const filePath = `${AI_DRIVE_PATH}/${filename}`;
    try {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      existingFiles++;
      console.log(`   ✅ ${filename}`);
    } catch (error) {
      missingFiles.push(filename);
      console.log(`   ❌ ${filename} (缺失)`);
    }
  });

  console.log(`   📊 总文件: ${TARGET_FILES.length}`);
  console.log(`   ✅ 存在: ${existingFiles}`);
  console.log(`   ❌ 缺失: ${missingFiles.length}`);
  console.log(`   💾 总大小: ${formatFileSize(totalSize)}`);
  
  if (missingFiles.length > 0) {
    console.log(`   🚨 缺失文件列表: ${missingFiles.join(', ')}`);
  }

  return { existingFiles, missingFiles, totalSize };
}

// 检查导入统计状态
function checkImportStats() {
  console.log('\n📊 导入统计状态:');
  try {
    if (fs.existsSync(STATS_FILE)) {
      const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
      console.log(`   📁 处理文件: ${stats.processedFiles}/${stats.totalFiles}`);
      console.log(`   📦 处理分块: ${stats.processedChunks}/${stats.totalChunks || '未知'}`);
      console.log(`   📈 导入记录: ${stats.totalImported?.toLocaleString() || 0} 条`);
      console.log(`   📊 当前状态: ${stats.status}`);
      console.log(`   📝 当前文件: ${stats.currentFile || '无'}`);
      
      if (stats.startTime) {
        const duration = (Date.now() - new Date(stats.startTime)) / 1000;
        console.log(`   ⏱️ 运行时长: ${formatDuration(duration)}`);
      }

      if (stats.fileResults && Object.keys(stats.fileResults).length > 0) {
        console.log('\n   📋 文件处理结果:');
        Object.entries(stats.fileResults).forEach(([file, result]) => {
          const status = result.success ? '✅' : '❌';
          const records = result.importedRecords || 0;
          console.log(`   ${status} ${file}: ${records}条记录`);
        });
      }

      return stats;
    } else {
      console.log('   📄 未找到统计数据文件');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ 读取统计数据失败: ${error.message}`);
    return null;
  }
}

// 检查导入进度状态
function checkImportProgress() {
  console.log('\n🔄 导入进度状态:');
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      console.log(`   📁 当前文件: ${progress.currentFile} (${progress.fileIndex + 1}/${TARGET_FILES.length})`);
      console.log(`   📦 文件进度: 分块 ${progress.chunkIndex + 1}/${progress.totalChunks}`);
      console.log(`   📈 已处理记录: ${progress.processedRecords?.toLocaleString()} 条`);
      console.log(`   ⏱️ 最后更新: ${new Date(progress.timestamp).toLocaleString()}`);
      
      // 计算整体进度百分比
      const fileProgress = ((progress.fileIndex * 100) + (progress.chunkIndex / progress.totalChunks * 100)) / TARGET_FILES.length;
      console.log(`   📊 整体进度: ${fileProgress.toFixed(1)}%`);
      
      return progress;
    } else {
      console.log('   📄 未找到进度数据文件');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ 读取进度数据失败: ${error.message}`);
    return null;
  }
}

// 检查相关进程状态
function checkProcessStatus() {
  console.log('\n💻 进程运行状态:');
  try {
    // 检查导入进程
    const result = execSync('ps aux | grep -E "(optimized_batch_import|check_10_24_import_status)" | grep -v grep', { encoding: 'utf-8' }).trim();
    
    if (result) {
      const processes = result.split('\n');
      console.log(`   ✅ 检测到 ${processes.length} 个相关进程正在运行:`);
      processes.forEach(process => {
        const parts = process.trim().split(/\\s+/);
        const pid = parts[1];
        const command = parts.slice(10).join(' ');
        console.log(`   📍 PID ${pid}: ${command.split('/').pop()}`);
      });
    } else {
      console.log('   ⚠️ 未检测到相关进程运行');
    }
  } catch (error) {
    console.log('   ⚠️ 未检测到相关进程运行');
  }
}

// 检查数据库状态
async function checkDatabaseStatus() {
  console.log('\n🗄️ 数据库状态:');
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/admin/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('admin:admin123')
      },
      body: JSON.stringify({ action: 'count' })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   📊 当前记录数: ${data.count?.toLocaleString() || '未知'} 条`);
      
      // 如果有统计数据，计算增长
      if (fs.existsSync(STATS_FILE)) {
        const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
        if (stats.initialRecordCount !== undefined) {
          const growth = data.count - stats.initialRecordCount;
          console.log(`   📈 导入期间增长: ${growth.toLocaleString()} 条`);
        } else {
          console.log('   📈 导入期间增长: 需要开始时的数据库记录数才能计算');
        }
      }
    } else {
      console.log('   ❌ 无法连接到数据库');
    }
  } catch (error) {
    console.log(`   ❌ 数据库连接失败: ${error.message}`);
  }
}

// 显示最近日志
function showRecentLogs() {
  console.log('\n📋 最近日志 (最后10行):');
  try {
    if (fs.existsSync(LOG_FILE)) {
      const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n');
      const recentLines = lines.slice(-10);
      
      recentLines.forEach(line => {
        console.log(`   ${line}`);
      });
    } else {
      console.log('   📄 日志文件不存在');
    }
  } catch (error) {
    console.log(`   ❌ 读取日志失败: ${error.message}`);
  }
}

// 提供状态建议
function provideStatusAdvice(stats, progress, fileStatus) {
  console.log('\n💡 状态建议:');
  
  if (fileStatus.missingFiles.length > 0) {
    console.log('   🚨 存在缺失文件，请检查AI Drive中的文件完整性');
    return;
  }

  if (!stats && !progress) {
    console.log('   ⚠️ 导入进程可能未启动或已完成');
    console.log('   💡 运行以下命令启动导入: ./start_10_24_import.sh');
    return;
  }

  if (stats?.status === 'completed') {
    console.log('   🎉 导入已完成！');
    console.log('   📊 查看完整统计: cat 10_24_import_stats.json');
    return;
  }

  if (stats?.status === 'running' || progress) {
    console.log('   ⏳ 检测到导入进程正在运行');
    console.log('   📊 建议定期运行此脚本监控进度');
    console.log('   📋 查看实时日志: tail -f 10_24_import.log');
    return;
  }

  if (stats?.status === 'error') {
    console.log('   ❌ 检测到导入错误，请查看日志了解详情');
    console.log('   🔧 可以重新运行导入脚本，支持断点续传');
    return;
  }

  console.log('   🤔 状态不明确，建议查看日志文件了解详情');
}

// 主函数
async function main() {
  console.log('🔍 10.24数据汇总表批量导入状态检查');
  console.log('============================================================');
  console.log(`⏰ 检查时间: ${new Date().toLocaleString()}`);
  console.log('');

  // 检查各个状态
  const fileStatus = checkAIDriveFiles();
  const stats = checkImportStats();
  const progress = checkImportProgress();
  checkProcessStatus();
  await checkDatabaseStatus();
  showRecentLogs();
  provideStatusAdvice(stats, progress, fileStatus);

  // 分隔线
  console.log('\n' + '='.repeat(60));
  console.log('✅ 状态检查完成');
}

// 运行主函数
main().catch(error => {
  console.error('❌ 状态检查失败:', error.message);
  process.exit(1);
});