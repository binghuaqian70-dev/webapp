#!/usr/bin/env node
/**
 * 11.5数据汇总表批量导入状态检查脚本
 * 检查AI Drive文件状态、导入进度、统计数据、进程状态
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILES = [
  '11.5数据汇总表-utf8_part_01.csv',
  '11.5数据汇总表-utf8_part_02.csv',
  '11.5数据汇总表-utf8_part_03.csv',
  '11.5数据汇总表-utf8_part_04.csv',
  '11.5数据汇总表-utf8_part_05.csv',
  '11.5数据汇总表-utf8_part_06.csv',
  '11.5数据汇总表-utf8_part_07.csv',
  '11.5数据汇总表-utf8_part_08.csv',
  '11.5数据汇总表-utf8_part_09.csv',
  '11.5数据汇总表-utf8_part_10.csv',
  '11.5数据汇总表-utf8_part_11.csv',
  '11.5数据汇总表-utf8_part_12.csv',
  '11.5数据汇总表-utf8_part_13.csv',
  '11.5数据汇总表-utf8_part_14.csv',
  '11.5数据汇总表-utf8_part_15.csv',
  '11.5数据汇总表-utf8_part_16.csv',
  '11.5数据汇总表-utf8_part_17.csv',
  '11.5数据汇总表-utf8_part_18.csv',
  '11.5数据汇总表-utf8_part_19.csv',
  '11.5数据汇总表-utf8_part_20.csv'
];

const STATS_FILE = './11_5_import_stats.json';
const PROGRESS_FILE = './11_5_import_progress.json';
const LOG_FILE = './11_5_import.log';
const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}分${secs}秒`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}小时${mins}分${secs}秒`;
}

// 检查AI Drive文件状态
function checkAiDriveFiles() {
  console.log('\n📁 AI Drive 文件状态:');
  
  let totalSize = 0;
  let existingCount = 0;
  
  TARGET_FILES.forEach(filename => {
    const filePath = path.join(AI_DRIVE_PATH, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      existingCount++;
      console.log(`   ✅ ${filename}`);
    } else {
      console.log(`   ❌ ${filename} (缺失)`);
    }
  });
  
  console.log(`   📊 总文件: ${TARGET_FILES.length}`);
  console.log(`   ✅ 存在: ${existingCount}`);
  console.log(`   ❌ 缺失: ${TARGET_FILES.length - existingCount}`);
  console.log(`   💾 总大小: ${formatFileSize(totalSize)}`);
  
  return { existingCount, totalSize };
}

// 读取统计数据
function readStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
      
      console.log('\n📊 导入统计状态:');
      console.log(`   📁 处理文件: ${stats.processedFiles}/${stats.totalFiles}`);
      console.log(`   📦 处理分块: ${stats.processedChunks}/${stats.totalChunks}`);
      console.log(`   📈 导入记录: ${stats.importedRecords.toLocaleString()} 条`);
      console.log(`   📊 当前状态: ${stats.status}`);
      console.log(`   📝 当前文件: ${stats.currentFile || '无'}`);
      
      if (stats.startTime) {
        const startTime = new Date(stats.startTime);
        const endTime = stats.endTime ? new Date(stats.endTime) : new Date();
        const duration = Math.floor((endTime - startTime) / 1000);
        console.log(`   ⏱️ 运行时长: ${formatDuration(duration)}`);
      }
      
      if (stats.fileResults && stats.fileResults.length > 0) {
        console.log('\n   📋 文件处理结果:');
        stats.fileResults.forEach((result, index) => {
          if (result.success) {
            console.log(`   ✅ ${index}: ${result.imported.toLocaleString()}条记录`);
          } else {
            console.log(`   ❌ ${index}: ${result.error}`);
          }
        });
      }
      
      return stats;
    }
  } catch (error) {
    console.log(`\n📊 导入统计状态: ❌ 读取失败 (${error.message})`);
  }
  return null;
}

// 读取进度数据
function readProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      
      console.log('\n🔄 导入进度状态:');
      console.log(`   📁 当前文件: ${progress.lastCompletedFile || 'undefined'} (${progress.completedFiles || 'NaN'}/${TARGET_FILES.length})`);
      console.log(`   📦 文件进度: 分块 ${progress.completedChunks || 'NaN'}/${progress.currentChunkIndex || 'undefined'}`);
      console.log(`   📈 已处理记录: ${progress.processedRecords || 'undefined'} 条`);
      
      if (progress.timestamp) {
        const updateTime = new Date(progress.timestamp);
        console.log(`   ⏱️ 最后更新: ${updateTime.toLocaleString()}`);
      }
      
      if (progress.completedFiles && TARGET_FILES.length > 0) {
        const percentage = (progress.completedFiles / TARGET_FILES.length * 100).toFixed(1);
        console.log(`   📊 整体进度: ${percentage}%`);
      }
      
      return progress;
    }
  } catch (error) {
    console.log(`\n🔄 导入进度状态: ❌ 读取失败 (${error.message})`);
  }
  
  console.log('\n🔄 导入进度状态:');
  console.log('   📄 未找到进度数据文件');
  return null;
}

// 检查进程运行状态
function checkProcessStatus() {
  console.log('\n💻 进程运行状态:');
  
  try {
    const result = execSync('ps aux | grep "optimized_batch_import.mjs" | grep -v grep', { encoding: 'utf8' });
    const processes = result.trim().split('\n').filter(line => line.length > 0);
    
    if (processes.length > 0) {
      console.log(`   ✅ 检测到 ${processes.length} 个相关进程正在运行:`);
      processes.forEach(proc => {
        const parts = proc.trim().split(/\s+/);
        const pid = parts[1];
        const cmd = parts.slice(10).join(' ');
        console.log(`   📍 PID ${pid}: ${cmd}`);
      });
    } else {
      console.log('   ⏸️ 没有检测到正在运行的导入进程');
    }
    
    return processes.length > 0;
  } catch (error) {
    console.log('   ⏸️ 没有检测到正在运行的导入进程');
    return false;
  }
}

// 检查数据库状态
async function checkDatabaseStatus() {
  console.log('\n🗄️ 数据库状态:');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`);
    
    if (response.ok) {
      const data = await response.json();
      const total = data.pagination?.total || data.total || 0;
      console.log(`   📊 当前记录数: ${total.toLocaleString()} 条`);
      return total;
    } else {
      console.log(`   ⚠️ 无法获取数据库状态 (HTTP ${response.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 无法连接到数据库`);
  }
  
  return null;
}

// 读取最近的日志
function readRecentLogs(lines = 10) {
  console.log(`\n📋 最近日志 (最后${lines}行):`);
  
  try {
    if (fs.existsSync(LOG_FILE)) {
      const result = execSync(`tail -${lines} ${LOG_FILE}`, { encoding: 'utf8' });
      result.trim().split('\n').forEach(line => {
        console.log(`   ${line}`);
      });
    } else {
      console.log('   📄 日志文件不存在');
    }
  } catch (error) {
    console.log(`   ❌ 读取日志失败: ${error.message}`);
  }
}

// 提供建议
function provideSuggestions(stats, isRunning) {
  console.log('\n💡 状态建议:');
  
  if (isRunning) {
    console.log('   ⏳ 检测到导入进程正在运行');
    console.log('   📊 建议定期运行此脚本监控进度');
    console.log('   📋 查看实时日志: tail -f 11_5_import.log');
  } else if (stats) {
    if (stats.status === 'completed') {
      console.log('   🎉 导入已完成！');
      console.log('   📊 查看完整统计: cat 11_5_import_stats.json');
    } else if (stats.status === 'error') {
      console.log('   ❌ 导入过程中出现错误');
      console.log('   📋 查看错误日志: tail -50 11_5_import.log');
      console.log('   🔄 可以重新运行脚本从断点继续');
    } else {
      console.log('   ⏸️ 导入进程已停止');
      console.log('   🔄 运行导入脚本继续: node optimized_batch_import.mjs');
    }
  } else {
    console.log('   📝 尚未开始导入');
    console.log('   🚀 开始导入: nohup node optimized_batch_import.mjs > 11_5_import.log 2>&1 &');
  }
}

// 主函数
async function main() {
  console.log('🔍 11.5数据汇总表批量导入状态检查');
  console.log('='.repeat(60));
  console.log(`⏰ 检查时间: ${new Date().toLocaleString()}`);
  
  // 检查AI Drive文件
  const fileStatus = checkAiDriveFiles();
  
  // 读取统计数据
  const stats = readStats();
  
  // 读取进度数据
  const progress = readProgress();
  
  // 检查进程状态
  const isRunning = checkProcessStatus();
  
  // 检查数据库状态
  await checkDatabaseStatus();
  
  // 读取最近日志
  readRecentLogs(10);
  
  // 提供建议
  provideSuggestions(stats, isRunning);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 状态检查完成');
}

main().catch(console.error);
