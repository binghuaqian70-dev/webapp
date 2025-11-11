#!/usr/bin/env node
/**
 * 11.10数据导入状态检查工具
 * 用于监控批量导入进度和查看统计信息
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILES = [
  '11.10数据汇总表_part_1.csv',
  '11.10数据汇总表_part_2.csv',
  '11.10数据汇总表_part_3.csv',
  '11.10数据汇总表_part_4.csv',
  '11.10数据汇总表_part_5.csv',
  '11.10数据汇总表_part_6.csv',
  '11.10数据汇总表_part_7.csv',
  '11.10数据汇总表_part_8.csv'
];

const STATS_FILE = path.join(__dirname, '11_10_import_stats.json');
const PROGRESS_FILE = path.join(__dirname, '11_10_import_progress.json');
const LOG_FILE = path.join(__dirname, '11_10_import.log');

function formatNumber(num) {
  return num.toLocaleString();
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function checkAIDriveFiles() {
  console.log('\n' + '='.repeat(80));
  console.log('📂 AI Drive 文件状态检查');
  console.log('='.repeat(80));
  console.log(`📁 AI Drive 路径: ${AI_DRIVE_PATH}`);
  
  let totalSize = 0;
  let existingFiles = 0;
  
  TARGET_FILES.forEach((filename, index) => {
    const filePath = path.join(AI_DRIVE_PATH, filename);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      totalSize += size;
      existingFiles++;
      console.log(`  ✅ [${index + 1}] ${filename} (${formatFileSize(size)})`);
    } else {
      console.log(`  ❌ [${index + 1}] ${filename} (不存在)`);
    }
  });
  
  console.log(`\n📊 文件统计:`);
  console.log(`  - 总文件数: ${TARGET_FILES.length}`);
  console.log(`  - 存在文件: ${existingFiles}`);
  console.log(`  - 缺失文件: ${TARGET_FILES.length - existingFiles}`);
  console.log(`  - 总大小: ${formatFileSize(totalSize)}`);
  
  return existingFiles === TARGET_FILES.length;
}

function checkImportProgress() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 导入进度检查');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(PROGRESS_FILE)) {
    console.log('ℹ️ 未找到进度文件，导入可能尚未开始或已完成');
    return null;
  }
  
  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`📁 已完成文件: ${progress.completedFiles || 0}`);
    console.log(`📂 当前文件索引: ${progress.currentFileIndex || 0}`);
    console.log(`📦 已完成块数: ${progress.completedChunks || 0}`);
    console.log(`🔄 当前块索引: ${progress.currentChunkIndex || 0}`);
    return progress;
  } catch (error) {
    console.log(`❌ 进度文件读取失败: ${error.message}`);
    return null;
  }
}

function checkImportStats() {
  console.log('\n' + '='.repeat(80));
  console.log('📈 导入统计信息');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(STATS_FILE)) {
    console.log('ℹ️ 未找到统计文件，导入可能尚未开始');
    return null;
  }
  
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    
    console.log(`\n📊 总体进度:`);
    console.log(`  - 状态: ${stats.status || 'unknown'}`);
    console.log(`  - 总文件数: ${stats.totalFiles || 0}`);
    console.log(`  - 已处理文件: ${stats.processedFiles || 0}`);
    console.log(`  - 当前文件: ${stats.currentFile || 'N/A'}`);
    
    console.log(`\n📦 块处理进度:`);
    console.log(`  - 总块数: ${formatNumber(stats.totalChunks || 0)}`);
    console.log(`  - 已处理块: ${formatNumber(stats.processedChunks || 0)}`);
    
    const chunkProgress = stats.totalChunks > 0 
      ? ((stats.processedChunks / stats.totalChunks) * 100).toFixed(2)
      : '0.00';
    console.log(`  - 块进度: ${chunkProgress}%`);
    
    console.log(`\n📊 记录统计:`);
    console.log(`  - 总记录数: ${formatNumber(stats.totalRecords || 0)}`);
    console.log(`  - 已导入记录: ${formatNumber(stats.importedRecords || 0)}`);
    
    if (stats.initialDbCount !== undefined) {
      console.log(`  - 初始数据库数量: ${formatNumber(stats.initialDbCount)}`);
    }
    if (stats.finalDbCount !== undefined) {
      console.log(`  - 最终数据库数量: ${formatNumber(stats.finalDbCount)}`);
    }
    if (stats.actualImported !== undefined) {
      console.log(`  - 实际新增数量: ${formatNumber(stats.actualImported)}`);
    }
    
    if (stats.startTime) {
      console.log(`\n⏱️ 时间信息:`);
      console.log(`  - 开始时间: ${new Date(stats.startTime).toLocaleString()}`);
      
      if (stats.endTime) {
        console.log(`  - 结束时间: ${new Date(stats.endTime).toLocaleString()}`);
        if (stats.totalElapsedSeconds) {
          console.log(`  - 总用时: ${formatDuration(stats.totalElapsedSeconds)}`);
        }
      } else if (stats.estimatedTimeRemaining) {
        console.log(`  - 预计剩余时间: ${formatDuration(stats.estimatedTimeRemaining)}`);
      }
    }
    
    if (stats.fileResults && stats.fileResults.length > 0) {
      console.log(`\n📄 文件处理结果:`);
      stats.fileResults.forEach((result, index) => {
        console.log(`\n  [${index + 1}] ${result.filename}:`);
        console.log(`      状态: ${result.status || 'unknown'}`);
        console.log(`      总记录: ${formatNumber(result.totalRecords || 0)}`);
        console.log(`      已导入: ${formatNumber(result.importedRecords || 0)}`);
        
        if (result.errorRecords) {
          console.log(`      失败: ${formatNumber(result.errorRecords)}`);
        }
        if (result.chunks) {
          console.log(`      块数: ${result.chunks}`);
        }
        if (result.elapsedSeconds) {
          console.log(`      用时: ${formatDuration(result.elapsedSeconds)}`);
        }
        if (result.error) {
          console.log(`      错误: ${result.error}`);
        }
      });
    }
    
    if (stats.error) {
      console.log(`\n❌ 错误信息: ${stats.error}`);
    }
    
    return stats;
  } catch (error) {
    console.log(`❌ 统计文件读取失败: ${error.message}`);
    return null;
  }
}

function checkLogFile() {
  console.log('\n' + '='.repeat(80));
  console.log('📝 日志文件检查');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(LOG_FILE)) {
    console.log('ℹ️ 未找到日志文件');
    return;
  }
  
  try {
    const logStats = fs.statSync(LOG_FILE);
    console.log(`📄 日志文件: ${LOG_FILE}`);
    console.log(`📊 文件大小: ${formatFileSize(logStats.size)}`);
    console.log(`📅 最后修改: ${logStats.mtime.toLocaleString()}`);
    
    // 读取最后20行日志
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    const lastLines = lines.slice(-20);
    
    console.log(`\n📋 最近20行日志:`);
    console.log('-'.repeat(80));
    lastLines.forEach(line => console.log(line));
    console.log('-'.repeat(80));
    
  } catch (error) {
    console.log(`❌ 日志文件读取失败: ${error.message}`);
  }
}

function checkProcessStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 进程状态检查');
  console.log('='.repeat(80));
  
  try {
    const { execSync } = require('child_process');
    
    // 检查是否有相关的node进程在运行
    try {
      const output = execSync('ps aux | grep "optimized_batch_import_11_10.mjs" | grep -v grep', { encoding: 'utf8' });
      if (output.trim()) {
        console.log('✅ 发现正在运行的导入进程:');
        console.log(output);
      } else {
        console.log('ℹ️ 未发现正在运行的导入进程');
      }
    } catch (error) {
      console.log('ℹ️ 未发现正在运行的导入进程');
    }
  } catch (error) {
    console.log('⚠️ 无法检查进程状态');
  }
}

function showSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 11.10数据导入系统状态总结');
  console.log('='.repeat(80));
  
  const filesReady = checkAIDriveFiles();
  const progress = checkImportProgress();
  const stats = checkImportStats();
  checkProcessStatus();
  checkLogFile();
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ 状态检查完成');
  console.log('='.repeat(80));
  
  if (filesReady && !stats) {
    console.log('\n💡 提示: 文件已就绪，可以开始导入');
    console.log('   运行命令: nohup node optimized_batch_import_11_10.mjs > 11_10_import.log.console 2>&1 &');
  } else if (stats && stats.status === 'running') {
    console.log('\n⏳ 导入正在进行中...');
  } else if (stats && stats.status === 'completed') {
    console.log('\n✅ 导入已完成！');
  } else if (stats && stats.status === 'error') {
    console.log('\n❌ 导入过程中出现错误，请查看日志');
  }
  
  console.log('\n');
}

// 运行检查
showSummary();
