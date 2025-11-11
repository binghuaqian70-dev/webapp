#!/usr/bin/env node
/**
 * 10.23数据汇总表批量导入状态检查脚本
 * 实时监控20个分割文件的导入进度和数据库状态
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

const TARGET_FILES = [
  '10.23数据汇总表-part01.csv',
  '10.23数据汇总表-part02.csv',
  '10.23数据汇总表-part03.csv',
  '10.23数据汇总表-part04.csv',
  '10.23数据汇总表-part05.csv',
  '10.23数据汇总表-part06.csv',
  '10.23数据汇总表-part07.csv',
  '10.23数据汇总表-part08.csv',
  '10.23数据汇总表-part09.csv',
  '10.23数据汇总表-part10.csv',
  '10.23数据汇总表-part11.csv',
  '10.23数据汇总表-part12.csv',
  '10.23数据汇总表-part13.csv',
  '10.23数据汇总表-part14.csv',
  '10.23数据汇总表-part15.csv',
  '10.23数据汇总表-part16.csv',
  '10.23数据汇总表-part17.csv',
  '10.23数据汇总表-part18.csv',
  '10.23数据汇总表-part19.csv',
  '10.23数据汇总表-part20.csv'
];

const STATS_FILE = './10_23_import_stats.json';
const PROGRESS_FILE = './10_23_import_progress.json';
const LOG_FILE = './10_23_import.log';

function formatNumber(num) {
  return num.toLocaleString();
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
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
      return { total: 0, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    return { total: 0, error: error.message };
  }
}

// 加载统计数据
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

// 加载进度数据
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

// 检查文件状态
function checkFileStatus() {
  const results = [];
  let totalRecords = 0;
  let totalSize = 0;
  
  for (const targetFile of TARGET_FILES) {
    try {
      const filePath = path.join(AI_DRIVE_PATH, targetFile);
      
      if (!fs.existsSync(filePath)) {
        results.push({
          filename: targetFile,
          exists: false,
          error: 'File not found'
        });
        continue;
      }
      
      const stats = fs.statSync(filePath);
      
      results.push({
        filename: targetFile,
        exists: true,
        size: stats.size,
        modified: stats.mtime
      });
      
      totalSize += stats.size;
    } catch (error) {
      results.push({
        filename: targetFile,
        exists: false,
        error: error.message
      });
    }
  }
  
  const existingFiles = results.filter(r => r.exists);
  
  return {
    files: results,
    summary: {
      totalFiles: TARGET_FILES.length,
      existingFiles: existingFiles.length,
      missingFiles: TARGET_FILES.length - existingFiles.length,
      totalSize
    }
  };
}

// 检查导入进程状态
async function checkProcessStatus() {
  try {
    const { execSync } = await import('child_process');
    
    try {
      // 检查是否有相关导入进程在运行
      const psOutput = execSync('ps aux | grep -E "(optimized_batch_import|10.23)" | grep -v grep', { encoding: 'utf8', timeout: 5000 });
      const processes = psOutput.trim().split('\n').filter(line => line.trim());
      
      return {
        running: processes.length > 0,
        processes: processes.map(p => {
          const parts = p.trim().split(/\s+/);
          return {
            pid: parts[1],
            command: parts.slice(10).join(' ')
          };
        })
      };
    } catch (error) {
      // 如果没有找到进程，grep会返回非0退出码
      return { running: false, processes: [] };
    }
  } catch (error) {
    return { running: false, error: error.message };
  }
}

// 获取最近的日志行数
function getRecentLogLines(lines = 10) {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const logLines = content.trim().split('\n');
      return logLines.slice(-lines);
    }
  } catch (error) {
    return [`日志读取失败: ${error.message}`];
  }
  return ['日志文件不存在'];
}

async function main() {
  console.log('🔍 10.23数据汇总表批量导入状态检查');
  console.log('='.repeat(60));
  
  const currentTime = new Date().toLocaleString();
  console.log(`⏰ 检查时间: ${currentTime}`);
  
  // 1. 检查文件状态
  console.log('\n📁 AI Drive 文件状态:');
  const fileStatus = checkFileStatus();
  console.log(`   📊 总文件: ${fileStatus.summary.totalFiles}`);
  console.log(`   ✅ 存在: ${fileStatus.summary.existingFiles}`);
  console.log(`   ❌ 缺失: ${fileStatus.summary.missingFiles}`);
  console.log(`   💾 总大小: ${formatFileSize(fileStatus.summary.totalSize)}`);
  
  if (fileStatus.summary.missingFiles > 0) {
    console.log('\n   缺失文件:');
    fileStatus.files.filter(f => !f.exists).forEach(f => {
      console.log(`   ❌ ${f.filename}: ${f.error}`);
    });
  }
  
  // 2. 检查统计数据
  console.log('\n📊 导入统计状态:');
  const stats = loadStats();
  if (stats) {
    console.log(`   📁 处理文件: ${stats.processedFiles || 0}/${stats.totalFiles || TARGET_FILES.length}`);
    console.log(`   📦 处理分块: ${stats.processedChunks || 0}/${stats.totalChunks || '未知'}`);
    console.log(`   📈 导入记录: ${formatNumber(stats.importedRecords || 0)} 条`);
    console.log(`   📊 当前状态: ${stats.status || '未知'}`);
    console.log(`   📝 当前文件: ${stats.currentFile || '无'}`);
    
    if (stats.startTime) {
      const startTime = new Date(stats.startTime);
      const duration = stats.endTime ? 
        (new Date(stats.endTime) - startTime) / 1000 :
        (new Date() - startTime) / 1000;
      
      console.log(`   ⏱️ 运行时长: ${Math.floor(duration / 60)}分${Math.floor(duration % 60)}秒`);
    }
    
    // 显示文件结果（如果有）
    if (stats.fileResults && stats.fileResults.length > 0) {
      console.log('\n   📋 文件处理结果:');
      stats.fileResults.forEach(result => {
        if (result.success) {
          console.log(`   ✅ ${result.filename}: ${formatNumber(result.imported || 0)}条记录`);
        } else {
          console.log(`   ❌ ${result.filename}: ${result.error || '未知错误'}`);
        }
      });
    }
  } else {
    console.log('   📄 未找到统计数据文件');
  }
  
  // 3. 检查进度数据
  console.log('\n🔄 导入进度状态:');
  const progress = loadProgress();
  if (progress) {
    console.log(`   📁 已完成文件: ${progress.completedFiles || 0}`);
    console.log(`   📦 已完成分块: ${progress.completedChunks || 0}`);
    console.log(`   📍 当前文件索引: ${progress.currentFileIndex || 0}`);
    console.log(`   📍 当前分块索引: ${progress.currentChunkIndex || 0}`);
    console.log(`   ⏰ 最后更新: ${progress.timestamp ? new Date(progress.timestamp).toLocaleString() : '未知'}`);
    if (progress.lastCompletedFile) {
      console.log(`   📝 最后完成文件: ${progress.lastCompletedFile}`);
    }
  } else {
    console.log('   📄 未找到进度数据文件');
  }
  
  // 4. 检查进程状态
  console.log('\n💻 进程运行状态:');
  const processStatus = await checkProcessStatus();
  if (processStatus.error) {
    console.log(`   ❌ 进程检查失败: ${processStatus.error}`);
  } else if (processStatus.running) {
    console.log(`   ✅ 检测到 ${processStatus.processes.length} 个相关进程正在运行:`);
    processStatus.processes.forEach(proc => {
      console.log(`   📍 PID ${proc.pid}: ${proc.command}`);
    });
  } else {
    console.log('   💤 未检测到导入进程在运行');
  }
  
  // 5. 检查数据库状态
  console.log('\n🗄️ 数据库状态:');
  const token = await login();
  if (token) {
    const dbStats = await getDbStats(token);
    if (dbStats.error) {
      console.log(`   ❌ 数据库查询失败: ${dbStats.error}`);
    } else {
      console.log(`   📊 当前记录数: ${formatNumber(dbStats.total)} 条`);
      
      // 如果有开始时的统计，计算增长
      if (stats && stats.startTime) {
        console.log('   📈 导入期间增长: 需要开始时的数据库记录数才能计算');
      }
    }
  } else {
    console.log('   ❌ 无法连接到数据库（登录失败）');
  }
  
  // 6. 显示最近日志
  console.log('\n📋 最近日志 (最后10行):');
  const recentLogs = getRecentLogLines(10);
  recentLogs.forEach((line, index) => {
    console.log(`   ${line}`);
  });
  
  // 7. 给出建议
  console.log('\n💡 状态建议:');
  if (stats) {
    if (stats.status === 'completed') {
      console.log('   🎉 导入已完成！');
    } else if (stats.status === 'completed_with_errors') {
      console.log('   ⚠️ 导入已完成，但有部分错误，请检查文件结果');
    } else if (stats.status === 'running') {
      if (processStatus.running) {
        console.log('   ⏳ 导入正在进行中，请等待完成');
        if (stats.processedFiles && stats.totalFiles) {
          const fileProgress = (stats.processedFiles / stats.totalFiles * 100).toFixed(1);
          console.log(`   📈 整体进度: ${fileProgress}% (${stats.processedFiles}/${stats.totalFiles}个文件)`);
        }
      } else {
        console.log('   ⚠️ 状态显示运行中，但未检测到进程，可能已异常退出');
        console.log('   💡 建议：重新运行导入脚本，支持断点续传');
      }
    } else if (stats.status === 'error') {
      console.log('   ❌ 导入过程中发生错误');
      console.log('   💡 建议：检查错误日志，修复问题后重新运行');
    }
  } else if (processStatus.running) {
    console.log('   ⏳ 检测到导入进程正在运行');
  } else {
    console.log('   📝 尚未开始导入或导入已完成');
    console.log('   💡 如需开始导入，请运行: node optimized_batch_import.mjs');
  }
  
  console.log('\n='.repeat(60));
  console.log('✅ 状态检查完成');
}

main().catch(console.error);