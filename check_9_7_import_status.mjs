#!/usr/bin/env node
/**
 * 9.7数据汇总表导入状态检查脚本
 * 实时监控100个文件的导入进度和数据库状态
 * 提供详细的统计信息和故障排查建议
 */

import fs from 'fs';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 9.7数据汇总表文件配置
const PROGRESS_FILE = './9_7_import_progress.json';
const LOG_FILE = './9_7_import.log';
const STATS_FILE = './9_7_import_stats.json';

// 期望的9.7数据统计（基于历史数据推算）
const EXPECTED_9_7_RECORDS = 50000; // 预期9.7数据总记录数（100个文件估算）
const BASELINE_TOTAL_RECORDS = 240953; // 当前数据库基线记录数（9.6导入后）

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
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

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

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    // 文件不存在或格式错误
  }
  return null;
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    // 文件不存在或格式错误
  }
  return null;
}

function checkAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    
    // 检查9.7数据汇总表文件
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && file.includes('9.7数据汇总表')
    );
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part_(\d{2,3})/);
      const partB = b.match(/part_(\d{2,3})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      return a.localeCompare(b);
    });
    
    const totalSize = csvFiles.reduce((sum, filename) => {
      const filePath = `${AI_DRIVE_PATH}/${filename}`;
      try {
        const stats = fs.statSync(filePath);
        return sum + stats.size;
      } catch (error) {
        return sum;
      }
    }, 0);
    
    return {
      count: csvFiles.length,
      files: csvFiles.slice(0, 5), // 只显示前5个文件
      totalSize,
      estimatedRecords: Math.floor(totalSize / 115) // 基于9.7数据特征估算
    };
    
  } catch (error) {
    return {
      count: 0,
      files: [],
      totalSize: 0,
      estimatedRecords: 0,
      error: error.message
    };
  }
}

function getLogTail(lines = 20) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return '日志文件不存在';
    }
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    return logLines.slice(-lines).join('\n');
  } catch (error) {
    return `读取日志失败: ${error.message}`;
  }
}

async function main() {
  console.log('🔍 9.7数据汇总表导入状态检查');
  console.log('='.repeat(60));
  
  // 1. 检查AI Drive文件状态
  console.log('\n📁 AI Drive文件检查:');
  const fileStatus = checkAiDriveFiles();
  
  if (fileStatus.error) {
    console.log(`❌ 文件检查失败: ${fileStatus.error}`);
  } else {
    console.log(`✅ 找到 ${fileStatus.count}/100 个9.7数据汇总表文件`);
    console.log(`📊 总文件大小: ${formatFileSize(fileStatus.totalSize)}`);
    console.log(`📈 预估总记录数: ${formatNumber(fileStatus.estimatedRecords)} 条`);
    
    if (fileStatus.files.length > 0) {
      console.log(`📋 部分文件列表: ${fileStatus.files.slice(0, 3).join(', ')}...`);
    }
    
    if (fileStatus.count < 100) {
      console.log(`⚠️ 警告: 缺少 ${100 - fileStatus.count} 个文件`);
    }
  }
  
  // 2. 检查导入进度文件
  console.log('\n📊 导入进度检查:');
  const progress = loadProgress();
  const stats = loadStats();
  
  if (!progress && !stats) {
    console.log('📝 导入尚未开始，没有找到进度文件');
  } else {
    if (stats) {
      console.log(`📈 统计信息 (${STATS_FILE}):`);
      console.log(`   总文件数: ${stats.totalFiles || 'N/A'}`);
      console.log(`   已处理: ${stats.processedFiles || 0}/${stats.totalFiles || 100}`);
      console.log(`   成功: ${stats.successFiles || 0}, 失败: ${stats.failedFiles || 0}`);
      console.log(`   导入记录数: ${formatNumber(stats.importedRecords || 0)} 条`);
      
      if (stats.startTime) {
        console.log(`   开始时间: ${new Date(stats.startTime).toLocaleString()}`);
      }
      
      if (stats.endTime) {
        console.log(`   结束时间: ${new Date(stats.endTime).toLocaleString()}`);
        
        const duration = (new Date(stats.endTime) - new Date(stats.startTime)) / 1000;
        console.log(`   总耗时: ${formatDuration(duration)}`);
      } else if (stats.estimatedTimeRemaining) {
        console.log(`   预计剩余时间: ${formatDuration(stats.estimatedTimeRemaining)}`);
      }
    }
    
    if (progress) {
      console.log(`🔄 进度信息 (${PROGRESS_FILE}):`);
      console.log(`   当前索引: ${progress.currentIndex || 0}`);
      console.log(`   结果数量: ${progress.results ? progress.results.length : 0}`);
      console.log(`   最后更新: ${new Date(progress.timestamp).toLocaleString()}`);
      
      if (progress.error) {
        console.log(`   ❌ 错误状态: ${progress.error}`);
      }
    }
  }
  
  // 3. 检查数据库状态
  console.log('\n🗄️ 数据库状态检查:');
  const token = await login();
  
  if (!token) {
    console.log('❌ 无法连接到生产环境，跳过数据库检查');
  } else {
    console.log('✅ 成功连接到生产环境');
    
    const dbStats = await getDbStats(token);
    console.log(`📊 当前数据库记录数: ${formatNumber(dbStats.total)}`);
    console.log(`📊 基线记录数 (导入前): ${formatNumber(BASELINE_TOTAL_RECORDS)}`);
    
    const importedRecords = dbStats.total - BASELINE_TOTAL_RECORDS;
    console.log(`📈 新增记录数: ${formatNumber(Math.max(0, importedRecords))}`);
    
    // 进度分析
    if (importedRecords > 0) {
      const progressPercent = (importedRecords / EXPECTED_9_7_RECORDS * 100);
      console.log(`🎯 9.7数据导入进度: ${progressPercent.toFixed(1)}% (预期${formatNumber(EXPECTED_9_7_RECORDS)}条)`);
    }
  }
  
  // 4. 检查日志文件
  console.log('\n📋 最新日志 (最后10行):');
  const recentLogs = getLogTail(10);
  console.log(recentLogs);
  
  // 5. 状态总结和建议
  console.log('\n💡 状态总结:');
  
  if (!stats && !progress) {
    console.log('🟡 导入进程尚未启动');
    console.log('📝 建议: 运行 ./start_9_7_import.sh start 开始导入');
  } else if (stats && stats.endTime) {
    console.log('✅ 导入已完成');
    console.log(`📊 最终结果: ${stats.successFiles}/${stats.totalFiles} 文件成功`);
  } else if (stats && !stats.endTime) {
    console.log('🔄 导入进行中...');
    if (stats.processedFiles > 0) {
      const progressPercent = (stats.processedFiles / stats.totalFiles * 100).toFixed(1);
      console.log(`📈 当前进度: ${progressPercent}% (${stats.processedFiles}/${stats.totalFiles})`);
    }
    
    if (stats.estimatedTimeRemaining) {
      console.log(`⏱️ 预计剩余时间: ${formatDuration(stats.estimatedTimeRemaining)}`);
    }
    
    console.log('📝 建议: 使用 ./start_9_7_import.sh status 查看详细状态');
  } else if (progress && progress.error) {
    console.log('❌ 导入进程遇到错误');
    console.log(`🔧 错误信息: ${progress.error}`);
    console.log('📝 建议: 检查日志文件并使用 ./start_9_7_import.sh restart 重启导入');
  }
  
  console.log('\n📁 相关文件:');
  console.log(`   📊 统计数据: ${STATS_FILE}`);
  console.log(`   🔄 进度文件: ${PROGRESS_FILE}`);
  console.log(`   📋 日志文件: ${LOG_FILE}`);
  
  console.log('\n🔍 状态检查完成');
}

main().catch(console.error);