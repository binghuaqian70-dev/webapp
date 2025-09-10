#!/usr/bin/env node
/**
 * 9.9数据汇总表导入状态检查脚本
 * 实时监控导入进度、数据库状态和文件处理情况
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

const PROGRESS_FILE = './9_9_import_progress.json';
const LOG_FILE = './9_9_import.log';
const STATS_FILE = './9_9_import_stats.json';

// 9.9数据配置
const START_PART = 1;
const END_PART = 10;
const EXPECTED_FILES = 10;
const EXPECTED_RECORDS = 50000; // 预期记录数基线

async function login() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
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
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return { total: 0 };
    }

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    return { total: 0 };
  }
}

function formatNumber(num) {
  return num.toLocaleString();
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function checkAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    
    // 查找9.9数据汇总表文件
    const csvFiles = files.filter(file => {
      return file.endsWith('.csv') && file.includes('9.9数据汇总表');
    }).sort();

    let totalSize = 0;
    let estimatedRecords = 0;
    
    csvFiles.forEach(file => {
      const filePath = path.join(AI_DRIVE_PATH, file);
      try {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        estimatedRecords += Math.floor(stats.size / 120);
      } catch (error) {
        // 忽略单个文件的错误
      }
    });

    return {
      found: csvFiles.length,
      expected: EXPECTED_FILES,
      totalSize,
      estimatedRecords,
      files: csvFiles
    };
  } catch (error) {
    return {
      found: 0,
      expected: EXPECTED_FILES,
      totalSize: 0,
      estimatedRecords: 0,
      files: [],
      error: error.message
    };
  }
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

function getLastLogLines(count = 10) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(-count);
  } catch (error) {
    return [`读取日志失败: ${error.message}`];
  }
}

function formatTime(timeStr) {
  try {
    return new Date(timeStr).toLocaleString('zh-CN');
  } catch (error) {
    return timeStr;
  }
}

function calculateTimeRemaining(stats) {
  if (!stats || !stats.startTime || stats.processedFiles === 0) {
    return null;
  }
  
  const elapsed = Date.now() - new Date(stats.startTime).getTime();
  const avgTimePerFile = elapsed / stats.processedFiles;
  const remainingFiles = stats.totalFiles - stats.processedFiles;
  const remainingMs = avgTimePerFile * remainingFiles;
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  
  return `${minutes}分${seconds}秒`;
}

async function main() {
  console.log('🔍 9.9数据汇总表导入状态检查');
  console.log('='.repeat(60));
  
  // 1. AI Drive文件检查
  console.log('\n📁 AI Drive文件检查:');
  const fileStatus = checkAiDriveFiles();
  
  if (fileStatus.error) {
    console.log(`❌ AI Drive访问失败: ${fileStatus.error}`);
  } else {
    console.log(`✅ 找到 ${fileStatus.found}/${fileStatus.expected} 个9.9数据汇总表文件`);
    console.log(`📊 总文件大小: ${formatFileSize(fileStatus.totalSize)}`);
    console.log(`📈 预估总记录数: ${formatNumber(fileStatus.estimatedRecords)} 条`);
    
    if (fileStatus.files.length > 0) {
      const displayFiles = fileStatus.files.slice(0, 3);
      console.log(`📋 部分文件列表: ${displayFiles.join(', ')}${fileStatus.files.length > 3 ? '...' : ''}`);
    }
  }
  
  // 2. 导入进度检查
  console.log('\n📊 导入进度检查:');
  const stats = loadStats();
  const progress = loadProgress();
  
  if (stats) {
    console.log(`📈 统计信息 (${STATS_FILE}):`);
    console.log(`   总文件数: ${stats.totalFiles}`);
    console.log(`   已处理: ${stats.processedFiles}/${stats.totalFiles}`);
    console.log(`   成功: ${stats.successFiles}, 失败: ${stats.failedFiles}`);
    console.log(`   导入记录数: ${formatNumber(stats.importedRecords)} 条`);
    console.log(`   开始时间: ${formatTime(stats.startTime)}`);
    
    if (stats.endTime) {
      console.log(`   结束时间: ${formatTime(stats.endTime)}`);
      const startTime = new Date(stats.startTime).getTime();
      const endTime = new Date(stats.endTime).getTime();
      const totalMinutes = Math.floor((endTime - startTime) / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      console.log(`   总耗时: ${hours}小时${minutes}分钟`);
    } else {
      const remaining = calculateTimeRemaining(stats);
      if (remaining) {
        console.log(`   预计剩余时间: ${remaining}`);
      }
    }
  } else {
    console.log(`❌ 未找到统计信息文件 (${STATS_FILE})`);
  }
  
  if (progress) {
    console.log(`🔄 进度信息 (${PROGRESS_FILE}):`);
    console.log(`   当前索引: ${progress.currentIndex}`);
    console.log(`   结果数量: ${progress.results ? progress.results.length : 0}`);
    console.log(`   最后更新: ${formatTime(progress.timestamp)}`);
  } else {
    console.log(`❌ 未找到进度信息文件 (${PROGRESS_FILE})`);
  }
  
  // 3. 数据库状态检查
  console.log('\n🗄️ 数据库状态检查:');
  const token = await login();
  
  if (token) {
    console.log('✅ 成功连接到生产环境');
    const dbStats = await getDbStats(token);
    console.log(`📊 当前数据库记录数: ${formatNumber(dbStats.total)}`);
    
    // 计算导入增长（假设基线）
    const baselineRecords = stats?.totalRecords || 240953; // 使用统计数据中的基线或默认值
    const newRecords = dbStats.total - baselineRecords;
    console.log(`📊 基线记录数 (导入前): ${formatNumber(baselineRecords)}`);
    console.log(`📈 新增记录数: ${formatNumber(newRecords)}`);
    
    const progressPercentage = (newRecords / EXPECTED_RECORDS) * 100;
    console.log(`🎯 9.9数据导入进度: ${progressPercentage.toFixed(1)}% (预期${formatNumber(EXPECTED_RECORDS)}条)`);
  } else {
    console.log('❌ 无法连接到生产环境');
  }
  
  // 4. 最新日志
  console.log('\n📋 最新日志 (最后10行):');
  const logLines = getLastLogLines(10);
  
  if (logLines.length === 0) {
    console.log('   暂无日志信息');
  } else {
    logLines.forEach(line => {
      console.log(`   ${line}`);
    });
  }
  
  // 5. 状态总结
  console.log('\n💡 状态总结:');
  
  if (stats && !stats.endTime) {
    console.log('🔄 导入进行中...');
    if (stats.processedFiles && stats.totalFiles) {
      const percentage = (stats.processedFiles / stats.totalFiles * 100).toFixed(1);
      console.log(`📈 当前进度: ${percentage}% (${stats.processedFiles}/${stats.totalFiles})`);
      
      const remaining = calculateTimeRemaining(stats);
      if (remaining) {
        console.log(`⏱️ 预计剩余时间: ${remaining}`);
      }
    }
  } else if (stats && stats.endTime) {
    console.log('✅ 导入已完成');
    console.log(`📊 最终结果: ${stats.successFiles}/${stats.totalFiles} 文件成功`);
  } else {
    console.log('⏸️ 导入尚未开始或状态未知');
  }
  
  console.log(`📝 建议: 使用 ./start_9_9_import.sh status 查看详细状态`);
  
  // 6. 相关文件
  console.log('\n📁 相关文件:');
  console.log(`   📊 统计数据: ${STATS_FILE}`);
  console.log(`   🔄 进度文件: ${PROGRESS_FILE}`);
  console.log(`   📋 日志文件: ${LOG_FILE}`);
  
  console.log('\n🔍 状态检查完成');
}

main().catch(console.error);