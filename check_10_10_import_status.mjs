#!/usr/bin/env node
/**
 * 10.10数据汇总表导入状态检查工具
 * 监控单文件导入进度、数据库状态、分块处理情况
 */

import fs from 'fs';

const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '10.10数据汇总表-utf8.csv';

const LOG_FILE = './10_10_import.log';
const STATS_FILE = './10_10_import_stats.json';
const PROGRESS_FILE = './10_10_import_progress.json';

// 预期文件信息 - 基于AI Drive扫描
const EXPECTED_RECORDS = 2097; // 实际数据行数 (不含表头)

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
  if (seconds < 60) return `${Math.floor(seconds)}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${Math.floor(seconds % 60)}秒`;
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分${Math.floor(seconds % 60)}秒`;
}

async function login() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    return data.token || data.data?.token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return null;
  }
}

async function getDbStats(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return { total: 0 };

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    return { total: 0 };
  }
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ 统计数据加载失败:', error.message);
  }
  return null;
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ 进度数据加载失败:', error.message);
  }
  return null;
}

function checkAiDriveFile() {
  try {
    const filePath = `${AI_DRIVE_PATH}/${TARGET_FILE}`;
    
    if (!fs.existsSync(filePath)) {
      return { exists: false };
    }
    
    const stats = fs.statSync(filePath);
    
    // 读取文件内容获取实际行数
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去表头
    
    return {
      exists: true,
      size: stats.size,
      actualRecords,
      path: filePath,
      modified: stats.mtime
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

function getProcessStatus() {
  try {
    // 检查是否有正在运行的导入进程
    const { execSync } = require('child_process');
    const processes = execSync('ps aux | grep "optimized_batch_import_10_10.mjs" | grep -v grep', { encoding: 'utf8' });
    
    if (processes.trim()) {
      const lines = processes.trim().split('\n');
      return {
        running: true,
        count: lines.length,
        details: lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            pid: parts[1],
            cpu: parts[2],
            mem: parts[3],
            time: parts[9],
            command: parts.slice(10).join(' ')
          };
        })
      };
    }
    
    return { running: false };
  } catch (error) {
    return { running: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 10.10数据汇总表导入状态检查');
  console.log('='.repeat(60));
  
  // 1. 检查AI Drive文件状态
  console.log('\n📁 AI Drive文件状态:');
  const fileInfo = checkAiDriveFile();
  
  if (fileInfo.exists) {
    console.log(`   ✅ 文件存在: ${TARGET_FILE}`);
    console.log(`   📊 文件大小: ${formatFileSize(fileInfo.size)}`);
    console.log(`   📈 实际记录数: ${formatNumber(fileInfo.actualRecords)} 条`);
    console.log(`   🕐 修改时间: ${fileInfo.modified.toISOString()}`);
    
    if (fileInfo.actualRecords !== EXPECTED_RECORDS) {
      console.log(`   ⚠️ 记录数不匹配: 期望${formatNumber(EXPECTED_RECORDS)}条，实际${formatNumber(fileInfo.actualRecords)}条`);
    }
  } else {
    console.log(`   ❌ 文件不存在: ${AI_DRIVE_PATH}/${TARGET_FILE}`);
    if (fileInfo.error) {
      console.log(`   💥 错误: ${fileInfo.error}`);
    }
  }
  
  // 2. 检查导入进程状态
  console.log('\n🔄 导入进程状态:');
  const processStatus = getProcessStatus();
  
  if (processStatus.running) {
    console.log(`   ✅ 导入进程运行中 (${processStatus.count}个进程)`);
    processStatus.details.forEach((proc, index) => {
      console.log(`   📟 进程${index + 1}: PID=${proc.pid}, CPU=${proc.cpu}%, 内存=${proc.mem}%, 时间=${proc.time}`);
    });
  } else {
    console.log('   ⏸️ 没有运行中的导入进程');
    if (processStatus.error) {
      console.log(`   💥 检查错误: ${processStatus.error}`);
    }
  }
  
  // 3. 检查统计数据
  console.log('\n📊 导入统计数据:');
  const stats = loadStats();
  
  if (stats) {
    console.log(`   📁 文件: ${stats.filename}`);
    console.log(`   📈 总记录数: ${formatNumber(stats.totalRecords)} 条`);
    console.log(`   📦 分块情况: ${stats.processedChunks}/${stats.totalChunks} 个分块`);
    console.log(`   📥 已导入记录: ${formatNumber(stats.importedRecords)} 条`);
    console.log(`   📊 状态: ${stats.status}`);
    
    if (stats.startTime) {
      console.log(`   🕐 开始时间: ${new Date(stats.startTime).toLocaleString()}`);
    }
    
    if (stats.endTime) {
      console.log(`   🏁 结束时间: ${new Date(stats.endTime).toLocaleString()}`);
      
      if (stats.startTime) {
        const duration = (new Date(stats.endTime) - new Date(stats.startTime)) / 1000;
        console.log(`   ⏱️ 总耗时: ${formatDuration(duration)}`);
      }
    }
    
    if (stats.error) {
      console.log(`   ❌ 错误信息: ${stats.error}`);
    }
    
    // 计算进度百分比
    if (stats.totalChunks > 0) {
      const chunkProgress = (stats.processedChunks / stats.totalChunks * 100).toFixed(1);
      console.log(`   📈 分块进度: ${chunkProgress}%`);
    }
    
    if (stats.totalRecords > 0 && stats.importedRecords > 0) {
      const importRate = (stats.importedRecords / stats.totalRecords * 100).toFixed(1);
      console.log(`   📈 导入率: ${importRate}%`);
    }
  } else {
    console.log('   ⚠️ 未找到统计数据文件');
  }
  
  // 4. 检查进度数据
  console.log('\n🔄 导入进度:');
  const progress = loadProgress();
  
  if (progress) {
    console.log(`   📦 当前分块: ${progress.currentChunkIndex}`);
    console.log(`   ✅ 已完成分块: ${progress.completedChunks}`);
    
    if (progress.timestamp) {
      console.log(`   🕐 最后更新: ${new Date(progress.timestamp).toLocaleString()}`);
    }
  } else {
    console.log('   ⚠️ 未找到进度数据文件');
  }
  
  // 5. 检查数据库状态
  console.log('\n🗄️ 数据库状态:');
  const token = await login();
  
  if (token) {
    const dbStats = await getDbStats(token);
    console.log(`   📊 当前记录总数: ${formatNumber(dbStats.total)} 条`);
    
    // 如果有统计数据，显示对比
    if (stats && stats.importedRecords) {
      console.log(`   📈 本次导入贡献: ${formatNumber(stats.importedRecords)} 条`);
      
      const expectedTotal = dbStats.total - stats.importedRecords;
      console.log(`   🔢 导入前预估记录数: ${formatNumber(expectedTotal)} 条`);
    }
  } else {
    console.log('   ❌ 无法连接到数据库');
  }
  
  // 6. 检查日志文件
  console.log('\n📋 日志文件状态:');
  
  const logFiles = [
    { name: '详细日志', path: LOG_FILE },
    { name: '统计数据', path: STATS_FILE },
    { name: '进度数据', path: PROGRESS_FILE }
  ];
  
  logFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      const stats = fs.statSync(file.path);
      console.log(`   ✅ ${file.name}: ${file.path} (${formatFileSize(stats.size)})`);
    } else {
      console.log(`   ⚠️ ${file.name}: ${file.path} (不存在)`);
    }
  });
  
  // 7. 总结和建议
  console.log('\n💡 状态总结:');
  
  if (!fileInfo.exists) {
    console.log('   ❌ 目标文件不存在，无法进行导入');
  } else if (processStatus.running) {
    console.log('   🔄 导入正在进行中...');
    if (stats && stats.totalChunks > 0) {
      const remaining = stats.totalChunks - stats.processedChunks;
      console.log(`   📊 预计剩余 ${remaining} 个分块需要处理`);
    }
  } else if (stats && stats.status === 'completed') {
    console.log('   ✅ 导入已完成');
  } else if (stats && stats.status === 'error') {
    console.log('   ❌ 导入遇到错误，可尝试重新运行');
  } else if (progress && progress.currentChunkIndex > 0) {
    console.log('   ⏸️ 导入已暂停，可从断点继续');
    console.log(`   💡 运行导入脚本将从分块 ${progress.currentChunkIndex + 1} 继续`);
  } else {
    console.log('   ⏳ 尚未开始导入或无法确定状态');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 状态检查完成');
}

main().catch(console.error);