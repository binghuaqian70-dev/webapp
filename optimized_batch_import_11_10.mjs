#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 11.10数据汇总表导入版本 (8文件批量导入)
 * 后台运行、进度统计、分阶段导入策略，支持6位小数价格精度
 * 支持AI Drive中11.10数据汇总表-utf8_part_1.csv到part_8.csv的8个分割文件批量导入
 * 特性：逐个文件导入、断点续传、详细日志、实时进度、按文件内容行数智能分块
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev'; // 生产环境地址
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE_PREFIX = '11.10数据汇总表_part_';
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

// 优化配置 - 针对11.10数据汇总表8文件批量导入调整
const MAX_RETRIES = 3;          // 最大重试次数
const DELAY_BETWEEN_CHUNKS = 600; // 分块间延迟0.6秒（8个文件）
const DELAY_BETWEEN_FILES = 2000;  // 文件间延迟2秒
const PROGRESS_SAVE_INTERVAL = 3; // 每3个分块保存一次进度
const PROGRESS_FILE = './11_10_import_progress.json'; // 11.10进度文件路径
const LOG_FILE = './11_10_import.log'; // 详细日志文件
const STATS_FILE = './11_10_import_stats.json'; // 统计数据文件

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 日志记录函数 - 支持控制台和文件双重输出
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // 写入日志文件
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.warn('⚠️ 日志写入失败:', error.message);
  }
}

// 保存统计数据
function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    log(`⚠️ 统计数据保存失败: ${error.message}`, 'WARN');
  }
}

// 加载统计数据
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    log(`⚠️ 统计数据加载失败: ${error.message}`, 'WARN');
  }
  return {
    totalFiles: TARGET_FILES.length,
    processedFiles: 0,
    currentFile: '',
    totalRecords: 0,
    processedChunks: 0,
    totalChunks: 0,
    importedRecords: 0,
    startTime: null,
    endTime: null,
    status: 'pending',
    fileResults: []
  };
}

// 计算进度百分比和预估剩余时间（多文件版本）
function calculateProgress(stats) {
  // 文件级别进度
  const fileProgress = stats.totalFiles > 0 ? (stats.processedFiles / stats.totalFiles) * 100 : 0;
  
  // 总体块级别进度
  const chunkProgress = stats.totalChunks > 0 ? (stats.processedChunks / stats.totalChunks) * 100 : 0;
  
  if (stats.processedChunks > 0 && stats.startTime) {
    const elapsed = Date.now() - new Date(stats.startTime).getTime();
    const avgTimePerChunk = elapsed / stats.processedChunks;
    const remainingChunks = stats.totalChunks - stats.processedChunks;
    stats.estimatedTimeRemaining = Math.ceil((avgTimePerChunk * remainingChunks) / 1000); // 秒
  }
  
  return {
    filePercentage: fileProgress.toFixed(2),
    chunkPercentage: chunkProgress.toFixed(2),
    processedFiles: stats.processedFiles,
    totalFiles: stats.totalFiles,
    processedChunks: stats.processedChunks,
    totalChunks: stats.totalChunks,
    currentFile: stats.currentFile,
    remainingFiles: stats.totalFiles - stats.processedFiles,
    remainingChunks: stats.totalChunks - stats.processedChunks,
    estimatedTimeRemaining: stats.estimatedTimeRemaining
  };
}

// 显示进度信息（多文件版本）
function displayProgress(stats) {
  const progress = calculateProgress(stats);
  
  log(`📁 文件进度: ${progress.processedFiles}/${progress.totalFiles} (${progress.filePercentage}%)`);
  log(`📦 分块进度: ${progress.processedChunks}/${progress.totalChunks} (${progress.chunkPercentage}%)`);
  log(`📈 已导入记录: ${stats.importedRecords.toLocaleString()} 条`);
  log(`📊 当前处理: ${progress.currentFile}`);
  log(`📊 状态: ${stats.status}`);
  
  if (progress.estimatedTimeRemaining) {
    const hours = Math.floor(progress.estimatedTimeRemaining / 3600);
    const minutes = Math.floor((progress.estimatedTimeRemaining % 3600) / 60);
    const seconds = progress.estimatedTimeRemaining % 60;
    log(`⏱️ 预计剩余时间: ${hours}小时${minutes}分${seconds}秒`);
  }
}

// 保存导入进度
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.warn('⚠️ 进度保存失败:', error.message);
  }
}

// 加载导入进度
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ 进度加载失败:', error.message);
  }
  return { 
    completedFiles: 0, 
    currentFileIndex: 0, 
    completedChunks: 0, 
    currentChunkIndex: 0 
  };
}

// 清理进度文件
function clearProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    console.warn('⚠️ 进度文件清理失败:', error.message);
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

async function login() {
  try {
    log('🔐 正在登录生产环境...');
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
    const token = data.token || data.data?.token;
    if (!token) {
      throw new Error('登录响应中没有找到token');
    }

    log('✅ 登录成功');
    return token;
  } catch (error) {
    log(`❌ 登录失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function getDbStats(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&limit=1`, {
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

// 分割CSV内容为小块 - 根据文件行数智能调整块大小
function splitCsvContent(csvContent, filename) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  const totalLines = dataLines.length;
  
  log(`📊 文件 ${filename} 包含 ${totalLines} 行数据`);
  
  // 根据文件行数智能调整块大小
  let chunkSize;
  if (totalLines > 800) {
    chunkSize = 100; // 大文件：100行/块
  } else if (totalLines > 400) {
    chunkSize = 120; // 中等文件：120行/块
  } else if (totalLines > 200) {
    chunkSize = 150; // 小文件：150行/块
  } else {
    chunkSize = 200; // 很小的文件：200行/块
  }
  
  log(`📦 使用块大小: ${chunkSize} 行/块`);
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunkLines = dataLines.slice(i, i + chunkSize);
    const chunkCsv = [header, ...chunkLines].join('\n');
    chunks.push({
      content: chunkCsv,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: chunkLines.length
    });
  }
  
  return chunks;
}

// 导入单个批次数据（带重试机制）
async function importChunk(token, chunkCsv, chunkInfo, fileInfo, retryCount = 0) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ csvData: chunkCsv })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '导入失败');
    }

    const successCount = result.data?.successCount || 0;
    const errorCount = result.data?.errorCount || 0;
    
    log(`✅ 块 ${chunkInfo.index}/${chunkInfo.total} 导入成功: ${successCount} 条成功, ${errorCount} 条失败`);
    
    return {
      success: true,
      successCount,
      errorCount,
      errors: result.data?.errors || []
    };
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      log(`⚠️ 块 ${chunkInfo.index}/${chunkInfo.total} 导入失败，重试 ${retryCount + 1}/${MAX_RETRIES}: ${error.message}`, 'WARN');
      await delay(2000 * (retryCount + 1)); // 递增延迟
      return importChunk(token, chunkCsv, chunkInfo, fileInfo, retryCount + 1);
    }
    
    log(`❌ 块 ${chunkInfo.index}/${chunkInfo.total} 导入失败（已重试${MAX_RETRIES}次）: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message,
      successCount: 0,
      errorCount: chunkInfo.totalLines
    };
  }
}

// 导入单个文件
async function importSingleFile(token, filename, fileIndex, totalFiles, stats) {
  const filePath = path.join(AI_DRIVE_PATH, filename);
  
  log(`\n${'='.repeat(80)}`);
  log(`📂 开始处理文件 [${fileIndex + 1}/${totalFiles}]: ${filename}`);
  log(`${'='.repeat(80)}`);
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    log(`❌ 文件不存在: ${filePath}`, 'ERROR');
    stats.fileResults.push({
      filename,
      status: 'error',
      error: '文件不存在',
      totalRecords: 0,
      importedRecords: 0,
      chunks: 0
    });
    return { success: false, error: '文件不存在' };
  }
  
  try {
    // 读取文件
    const fileStats = fs.statSync(filePath);
    log(`📄 文件大小: ${formatFileSize(fileStats.size)}`);
    
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const chunks = splitCsvContent(csvContent, filename);
    const totalChunks = chunks.length;
    
    log(`📦 文件已分割为 ${totalChunks} 个数据块`);
    
    // 更新总块数
    stats.totalChunks += totalChunks;
    stats.currentFile = filename;
    saveStats(stats);
    
    let fileImportedRecords = 0;
    let fileErrorRecords = 0;
    const fileStartTime = Date.now();
    
    // 逐块导入
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkInfo = {
        index: i + 1,
        total: totalChunks,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        totalLines: chunk.totalLines
      };
      
      log(`\n🔄 导入块 ${chunkInfo.index}/${chunkInfo.total} (行 ${chunk.startLine}-${chunk.endLine})...`);
      
      const result = await importChunk(token, chunk.content, chunkInfo, { filename }, 0);
      
      if (result.success) {
        fileImportedRecords += result.successCount;
        fileErrorRecords += result.errorCount;
        stats.importedRecords += result.successCount;
      } else {
        fileErrorRecords += chunk.totalLines;
      }
      
      stats.processedChunks++;
      
      // 定期保存进度和显示统计
      if (i % PROGRESS_SAVE_INTERVAL === 0 || i === chunks.length - 1) {
        saveStats(stats);
        displayProgress(stats);
      }
      
      // 延迟以避免服务器过载
      if (i < chunks.length - 1) {
        await delay(DELAY_BETWEEN_CHUNKS);
      }
    }
    
    const fileElapsed = Date.now() - fileStartTime;
    const fileElapsedSeconds = Math.round(fileElapsed / 1000);
    
    log(`\n✅ 文件 ${filename} 导入完成！`);
    log(`⏱️ 用时: ${fileElapsedSeconds} 秒`);
    log(`📊 成功导入: ${fileImportedRecords} 条`);
    log(`❌ 失败: ${fileErrorRecords} 条`);
    
    stats.fileResults.push({
      filename,
      status: 'completed',
      totalRecords: fileImportedRecords + fileErrorRecords,
      importedRecords: fileImportedRecords,
      errorRecords: fileErrorRecords,
      chunks: totalChunks,
      elapsedSeconds: fileElapsedSeconds
    });
    
    stats.processedFiles++;
    saveStats(stats);
    
    return { 
      success: true, 
      importedRecords: fileImportedRecords,
      errorRecords: fileErrorRecords
    };
    
  } catch (error) {
    log(`❌ 文件处理失败: ${error.message}`, 'ERROR');
    stats.fileResults.push({
      filename,
      status: 'error',
      error: error.message,
      totalRecords: 0,
      importedRecords: 0,
      chunks: 0
    });
    return { success: false, error: error.message };
  }
}

// 主导入流程
async function main() {
  const overallStartTime = Date.now();
  
  log('\n' + '='.repeat(80));
  log('🚀 11.10数据汇总表批量导入系统启动');
  log('='.repeat(80));
  log(`📅 开始时间: ${new Date().toLocaleString()}`);
  log(`📁 目标文件数: ${TARGET_FILES.length}`);
  log(`🌐 生产环境: ${PRODUCTION_URL}`);
  log(`📂 AI Drive路径: ${AI_DRIVE_PATH}`);
  log('='.repeat(80) + '\n');
  
  let stats = loadStats();
  stats.startTime = new Date().toISOString();
  stats.status = 'running';
  stats.totalFiles = TARGET_FILES.length;
  saveStats(stats);
  
  try {
    // 1. 登录获取token
    const token = await login();
    
    // 2. 获取数据库初始统计
    log('\n📊 获取数据库初始统计...');
    const initialDbStats = await getDbStats(token);
    log(`📈 当前数据库商品总数: ${formatNumber(initialDbStats.total)}`);
    stats.initialDbCount = initialDbStats.total;
    saveStats(stats);
    
    // 3. 逐个处理文件
    for (let i = 0; i < TARGET_FILES.length; i++) {
      const filename = TARGET_FILES[i];
      
      await importSingleFile(token, filename, i, TARGET_FILES.length, stats);
      
      // 文件间延迟
      if (i < TARGET_FILES.length - 1) {
        log(`\n⏳ 等待 ${DELAY_BETWEEN_FILES / 1000} 秒后处理下一个文件...`);
        await delay(DELAY_BETWEEN_FILES);
      }
    }
    
    // 4. 获取最终数据库统计
    log('\n📊 获取数据库最终统计...');
    const finalDbStats = await getDbStats(token);
    log(`📈 最终数据库商品总数: ${formatNumber(finalDbStats.total)}`);
    const actualImported = finalDbStats.total - initialDbStats.total;
    log(`✅ 实际新增商品数: ${formatNumber(actualImported)}`);
    
    stats.finalDbCount = finalDbStats.total;
    stats.actualImported = actualImported;
    
    // 5. 生成最终报告
    const overallElapsed = Date.now() - overallStartTime;
    const overallElapsedSeconds = Math.round(overallElapsed / 1000);
    const overallMinutes = Math.floor(overallElapsedSeconds / 60);
    const overallSeconds = overallElapsedSeconds % 60;
    
    stats.endTime = new Date().toISOString();
    stats.status = 'completed';
    stats.totalElapsedSeconds = overallElapsedSeconds;
    saveStats(stats);
    
    log('\n' + '='.repeat(80));
    log('🎉 批量导入完成！');
    log('='.repeat(80));
    log(`⏱️ 总用时: ${overallMinutes} 分 ${overallSeconds} 秒`);
    log(`📁 处理文件: ${stats.processedFiles}/${stats.totalFiles}`);
    log(`📦 处理块数: ${stats.processedChunks}/${stats.totalChunks}`);
    log(`📊 导入记录: ${formatNumber(stats.importedRecords)} 条`);
    log(`📈 数据库增长: ${formatNumber(actualImported)} 条`);
    log(`📄 成功率: ${((stats.importedRecords / stats.totalRecords) * 100).toFixed(2)}%`);
    log('='.repeat(80));
    
    // 文件级别汇总
    log('\n📊 各文件导入统计:');
    stats.fileResults.forEach((fileResult, index) => {
      log(`  [${index + 1}] ${fileResult.filename}:`);
      log(`      状态: ${fileResult.status}`);
      log(`      导入: ${fileResult.importedRecords || 0} / ${fileResult.totalRecords || 0}`);
      log(`      块数: ${fileResult.chunks || 0}`);
      if (fileResult.elapsedSeconds) {
        log(`      用时: ${fileResult.elapsedSeconds} 秒`);
      }
      if (fileResult.error) {
        log(`      错误: ${fileResult.error}`);
      }
    });
    
    log(`\n📊 详细统计已保存至: ${STATS_FILE}`);
    log(`📝 详细日志已保存至: ${LOG_FILE}`);
    
    // 清理进度文件
    clearProgress();
    
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ 导入过程发生错误: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    
    stats.status = 'error';
    stats.error = error.message;
    stats.endTime = new Date().toISOString();
    saveStats(stats);
    
    process.exit(1);
  }
}

// 运行主程序
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
