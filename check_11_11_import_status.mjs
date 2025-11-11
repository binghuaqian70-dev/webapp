#!/usr/bin/env node
/**
 * 11.11数据导入状态检查脚本
 * 实时监控导入进度、统计数据、日志信息
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILES = [
  '11.11数据汇总表-utf8_part01.csv',
  '11.11数据汇总表-utf8_part02.csv',
  '11.11数据汇总表-utf8_part03.csv',
  '11.11数据汇总表-utf8_part04.csv',
  '11.11数据汇总表-utf8_part05.csv',
  '11.11数据汇总表-utf8_part06.csv',
  '11.11数据汇总表-utf8_part07.csv',
  '11.11数据汇总表-utf8_part08.csv',
  '11.11数据汇总表-utf8_part09.csv',
  '11.11数据汇总表-utf8_part10.csv'
];

const PROGRESS_FILE = './11_11_import_progress.json';
const LOG_FILE = './11_11_import.log';
const STATS_FILE = './11_11_import_stats.json';

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function formatNumber(num) {
  return num.toLocaleString('zh-CN');
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  } catch (e) {
    return dateString;
  }
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

// 检查AI Drive文件状态
function checkAIDriveFiles() {
  console.log('\n' + '='.repeat(80));
  console.log('📂 AI Drive 文件状态检查');
  console.log('='.repeat(80));
  
  console.log(`📁 AI Drive 路径: ${AI_DRIVE_PATH}`);
  
  let existingCount = 0;
  let totalSize = 0;
  
  TARGET_FILES.forEach((filename, index) => {
    const filePath = path.join(AI_DRIVE_PATH, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`  ✅ [${index + 1}] ${filename} (${formatFileSize(stats.size)})`);
        existingCount++;
        totalSize += stats.size;
      } else {
        console.log(`  ❌ [${index + 1}] ${filename} (文件不存在)`);
      }
    } catch (error) {
      console.log(`  ⚠️ [${index + 1}] ${filename} (错误: ${error.message})`);
    }
  });
  
  console.log('\n📊 文件统计:');
  console.log(`  - 总文件数: ${TARGET_FILES.length}`);
  console.log(`  - 存在文件: ${existingCount}`);
  console.log(`  - 缺失文件: ${TARGET_FILES.length - existingCount}`);
  console.log(`  - 总大小: ${formatFileSize(totalSize)}`);
}

// 检查导入进度
function checkProgress() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 导入进度检查');
  console.log('='.repeat(80));
  
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      
      console.log('📍 当前进度:');
      console.log(`  - 已完成文件: ${progress.completedFiles || 0}`);
      console.log(`  - 当前文件索引: ${progress.currentFileIndex || 0}`);
      console.log(`  - 已完成分块: ${progress.completedChunks || 0}`);
      console.log(`  - 当前分块索引: ${progress.currentChunkIndex || 0}`);
      console.log(`  - 最后完成文件: ${progress.lastCompletedFile || '-'}`);
      console.log(`  - 更新时间: ${formatDateTime(progress.timestamp)}`);
    } else {
      console.log('ℹ️ 未找到进度文件，导入可能尚未开始或已完成');
    }
  } catch (error) {
    console.log(`⚠️ 进度文件读取失败: ${error.message}`);
  }
}

// 检查统计信息
function checkStats() {
  console.log('\n' + '='.repeat(80));
  console.log('📈 导入统计信息');
  console.log('='.repeat(80));
  
  try {
    if (fs.existsSync(STATS_FILE)) {
      const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      
      console.log('\n📊 总体进度:');
      console.log(`  - 状态: ${stats.status}`);
      console.log(`  - 总文件数: ${stats.totalFiles}`);
      console.log(`  - 已处理文件: ${stats.processedFiles}`);
      console.log(`  - 当前文件: ${stats.currentFile}`);
      
      console.log('\n📦 块处理进度:');
      console.log(`  - 总块数: ${stats.totalChunks}`);
      console.log(`  - 已处理块: ${stats.processedChunks}`);
      if (stats.totalChunks > 0) {
        const chunkProgress = (stats.processedChunks / stats.totalChunks * 100).toFixed(2);
        console.log(`  - 块进度: ${chunkProgress}%`);
      }
      
      console.log('\n📊 记录统计:');
      console.log(`  - 总记录数: ${formatNumber(stats.totalRecords)}`);
      console.log(`  - 已导入记录: ${formatNumber(stats.importedRecords)} 条`);
      console.log(`  - 初始数据库数量: ${formatNumber(stats.initialDbCount || 0)}`);
      if (stats.finalDbCount) {
        console.log(`  - 最终数据库数量: ${formatNumber(stats.finalDbCount)}`);
        console.log(`  - 实际新增数量: ${formatNumber(stats.actualImported || 0)}`);
      }
      
      console.log('\n⏱️ 时间信息:');
      console.log(`  - 开始时间: ${formatDateTime(stats.startTime)}`);
      if (stats.endTime) {
        console.log(`  - 结束时间: ${formatDateTime(stats.endTime)}`);
        
        const start = new Date(stats.startTime);
        const end = new Date(stats.endTime);
        const duration = (end - start) / 1000;
        console.log(`  - 总用时: ${formatDuration(duration)}`);
      }
      
      if (stats.estimatedTimeRemaining && stats.status === 'running') {
        console.log(`  - 预计剩余时间: ${formatDuration(stats.estimatedTimeRemaining)}`);
      }
      
      // 显示文件处理结果
      if (stats.fileResults && stats.fileResults.length > 0) {
        console.log('\n📄 文件处理结果:');
        stats.fileResults.forEach((file, index) => {
          console.log(`\n  [${index + 1}] ${file.filename}:`);
          console.log(`      状态: ${file.status || 'unknown'}`);
          console.log(`      总记录: ${formatNumber(file.totalRecords || 0)}`);
          console.log(`      已导入: ${formatNumber(file.importedRecords || 0)}`);
          console.log(`      块数: ${file.chunks || 0}`);
          if (file.elapsedSeconds) {
            console.log(`      用时: ${formatDuration(file.elapsedSeconds)}`);
          }
        });
      }
      
    } else {
      console.log('ℹ️ 未找到统计文件，导入可能尚未开始');
    }
  } catch (error) {
    console.log(`⚠️ 统计文件读取失败: ${error.message}`);
  }
}

// 检查进程状态
function checkProcess() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 进程状态检查');
  console.log('='.repeat(80));
  
  try {
    const { execSync } = await import('child_process');
    const result = execSync('ps aux | grep optimized_batch_import.mjs | grep -v grep', { encoding: 'utf8' });
    
    if (result.trim()) {
      console.log('✅ 导入进程正在运行');
      console.log(result);
    } else {
      console.log('ℹ️ 未找到正在运行的导入进程');
    }
  } catch (error) {
    console.log('⚠️ 无法检查进程状态');
  }
}

// 检查日志文件
function checkLogFile() {
  console.log('\n' + '='.repeat(80));
  console.log('📝 日志文件检查');
  console.log('='.repeat(80));
  
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      console.log(`📄 日志文件: ${LOG_FILE}`);
      console.log(`📊 文件大小: ${formatFileSize(stats.size)}`);
      console.log(`📅 最后修改: ${formatDateTime(stats.mtime)}`);
      
      // 显示最后20行日志
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-20);
      
      console.log('\n📋 最近20行日志:');
      console.log('-'.repeat(80));
      recentLines.forEach(line => console.log(line));
      console.log('-'.repeat(80));
    } else {
      console.log('ℹ️ 未找到日志文件');
    }
  } catch (error) {
    console.log(`⚠️ 日志文件读取失败: ${error.message}`);
  }
}

// 主函数
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 11.11数据导入系统状态总结');
  console.log('='.repeat(80));
  
  // 检查所有状态
  checkAIDriveFiles();
  checkProgress();
  checkStats();
  await checkProcess();
  checkLogFile();
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ 状态检查完成');
  console.log('='.repeat(80));
  
  // 根据状态给出建议
  try {
    if (fs.existsSync(STATS_FILE)) {
      const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      
      if (stats.status === 'running') {
        console.log('\n⏳ 导入正在进行中...');
      } else if (stats.status === 'completed') {
        console.log('\n✅ 导入已完成！');
      } else if (stats.status === 'error') {
        console.log('\n❌ 导入过程中出现错误');
        console.log('💡 提示: 可以重新运行导入脚本从断点继续');
      }
    }
  } catch (error) {
    // Ignore error
  }
  
  console.log('');
}

main().catch(console.error);
