#!/usr/bin/env node
/**
 * 9.13数据汇总表导入状态监控脚本
 * 实时监控导入进度、数据库状态、系统性能
 * 适用于小规模10文件导入系统
 */

import fs from 'fs';
import { execSync } from 'child_process';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 9.13版本配置
const STATS_FILE = './9_13_import_stats.json';
const LOG_FILE = './9_13_import.log';
const PROGRESS_FILE = './9_13_import_progress.json';
const PID_FILE = './9_13_import.pid';
const EXPECTED_FILES = 10; // 9.13版本总共10个文件

function formatNumber(num) {
  return num.toLocaleString('zh-CN');
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

// 获取数据库状态
async function getDbStats() {
  try {
    // 登录
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.data?.token;
    
    // 获取数据统计
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return { total: 0, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return { 
      total: data.pagination?.total || data.total || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { 
      total: 0, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 检查进程状态
function checkProcessStatus() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
      try {
        // 检查进程是否仍在运行
        execSync(`ps -p ${pid}`, { stdio: 'ignore' });
        return {
          status: 'running',
          pid: pid,
          message: '运行中'
        };
      } catch (error) {
        // 进程不存在，清理PID文件
        fs.unlinkSync(PID_FILE);
        return {
          status: 'stopped',
          pid: null,
          message: '已停止'
        };
      }
    } else {
      return {
        status: 'stopped',
        pid: null,
        message: '未运行'
      };
    }
  } catch (error) {
    return {
      status: 'unknown',
      pid: null,
      message: `状态检查失败: ${error.message}`
    };
  }
}

// 获取AI Drive文件状态
function getAiDriveFileStatus() {
  try {
    if (!fs.existsSync(AI_DRIVE_PATH)) {
      return {
        accessible: false,
        files: [],
        totalSize: 0,
        error: 'AI Drive路径不存在'
      };
    }
    
    const files = fs.readdirSync(AI_DRIVE_PATH);
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && file.includes('9.13数据汇总表')
    );
    
    let totalSize = 0;
    const fileDetails = csvFiles.map(filename => {
      try {
        const filePath = `${AI_DRIVE_PATH}/${filename}`;
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        return {
          filename,
          size: stats.size,
          readable: true
        };
      } catch (error) {
        return {
          filename,
          size: 0,
          readable: false,
          error: error.message
        };
      }
    }).sort((a, b) => {
      // 按part编号排序
      const partA = a.filename.match(/part(\d{1,2})/);
      const partB = b.filename.match(/part(\d{1,2})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.filename.localeCompare(b.filename);
    });
    
    return {
      accessible: true,
      files: fileDetails,
      totalSize: totalSize,
      expectedFiles: EXPECTED_FILES,
      foundFiles: fileDetails.length
    };
  } catch (error) {
    return {
      accessible: false,
      files: [],
      totalSize: 0,
      error: error.message
    };
  }
}

// 加载统计数据
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn(`⚠️ 统计数据加载失败: ${error.message}`);
  }
  
  return null;
}

// 加载进度数据
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn(`⚠️ 进度数据加载失败: ${error.message}`);
  }
  
  return null;
}

// 获取日志末尾内容
function getRecentLogs(lines = 10) {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const logContent = fs.readFileSync(LOG_FILE, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      return logLines.slice(-lines);
    }
  } catch (error) {
    return [`⚠️ 日志读取失败: ${error.message}`];
  }
  
  return ['📝 暂无日志记录'];
}

// 主状态检查函数
async function main() {
  console.log('🔍 9.13数据汇总表导入系统状态检查');
  console.log('='.repeat(60));
  console.log(`⏰ 检查时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  // 1. 检查导入进程状态
  console.log('📊 系统进程状态:');
  const processStatus = checkProcessStatus();
  console.log(`   状态: ${processStatus.message}`);
  if (processStatus.pid) {
    console.log(`   进程ID: ${processStatus.pid}`);
  }
  console.log();
  
  // 2. 检查统计数据
  console.log('📈 导入统计:');
  const stats = loadStats();
  if (stats) {
    const progress = (stats.processedFiles / stats.totalFiles * 100).toFixed(1);
    console.log(`   进度: ${stats.processedFiles}/${stats.totalFiles} (${progress}%)`);
    console.log(`   成功文件: ${stats.successFiles}`);
    console.log(`   失败文件: ${stats.failedFiles}`);
    console.log(`   导入记录: ${formatNumber(stats.importedRecords)}条`);
    
    if (stats.startTime) {
      const startTime = new Date(stats.startTime);
      const now = stats.endTime ? new Date(stats.endTime) : new Date();
      const duration = (now - startTime) / 1000;
      console.log(`   运行时间: ${formatDuration(duration)}`);
      
      if (stats.estimatedTimeRemaining && !stats.endTime) {
        console.log(`   预计剩余: ${formatDuration(stats.estimatedTimeRemaining)}`);
      }
    }
    
    if (stats.endTime) {
      console.log(`   ✅ 导入已完成于: ${new Date(stats.endTime).toLocaleString('zh-CN')}`);
    }
  } else {
    console.log('   📝 暂无统计数据');
  }
  console.log();
  
  // 3. 检查数据库状态
  console.log('🗄️ 数据库状态:');
  console.log('   正在查询数据库...');
  const dbStats = await getDbStats();
  if (dbStats.error) {
    console.log(`   ❌ 查询失败: ${dbStats.error}`);
  } else {
    console.log(`   📊 总记录数: ${formatNumber(dbStats.total)}条`);
    console.log(`   🕐 查询时间: ${new Date(dbStats.timestamp).toLocaleString('zh-CN')}`);
  }
  console.log();
  
  // 4. 检查AI Drive文件状态
  console.log('📂 AI Drive文件状态:');
  const fileStatus = getAiDriveFileStatus();
  if (!fileStatus.accessible) {
    console.log(`   ❌ AI Drive不可访问: ${fileStatus.error}`);
  } else {
    console.log(`   📁 文件发现: ${fileStatus.foundFiles}/${fileStatus.expectedFiles}个`);
    console.log(`   💾 总文件大小: ${formatFileSize(fileStatus.totalSize)}`);
    
    if (fileStatus.files.length > 0) {
      console.log('\n   📋 文件详情:');
      fileStatus.files.forEach((file, index) => {
        const status = file.readable ? '✅' : '❌';
        console.log(`      ${index + 1}. ${status} ${file.filename} (${formatFileSize(file.size)})`);
        if (file.error) {
          console.log(`         ⚠️ ${file.error}`);
        }
      });
    }
  }
  console.log();
  
  // 5. 显示最近日志
  console.log('📝 最近日志 (最后5条):');
  const recentLogs = getRecentLogs(5);
  recentLogs.forEach(log => {
    console.log(`   ${log}`);
  });
  console.log();
  
  // 6. 状态总结
  console.log('💡 状态总结:');
  if (processStatus.status === 'running') {
    console.log('   🟢 导入进程运行中');
  } else if (processStatus.status === 'stopped' && stats && stats.endTime) {
    console.log('   🔵 导入任务已完成');
  } else if (processStatus.status === 'stopped') {
    console.log('   🟡 导入进程已停止');
  } else {
    console.log('   🔴 导入进程状态未知');
  }
  
  if (fileStatus.foundFiles === fileStatus.expectedFiles) {
    console.log('   ✅ 所有源文件都已找到');
  } else {
    console.log(`   ⚠️ 缺少 ${fileStatus.expectedFiles - fileStatus.foundFiles} 个源文件`);
  }
  
  if (!dbStats.error) {
    console.log('   ✅ 数据库连接正常');
  } else {
    console.log('   ❌ 数据库连接异常');
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log(`💡 提示: 使用 './start_9_13_import.sh status' 获取实时状态`);
  console.log(`📊 详细日志: ${LOG_FILE}`);
  console.log(`📈 统计数据: ${STATS_FILE}`);
}

main().catch(console.error);