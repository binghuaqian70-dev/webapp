#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 9.2数据汇总表导入版本 (多文件批量导入)
 * 后台运行、进度统计、分阶段导入策略，支持6位小数价格精度
 * 支持AI Drive中9.2数据汇总表-utf8_part_1.csv到part_12.csv的12个分割文件批量导入
 * 特性：逐个文件导入、断点续传、详细日志、实时进度、按文件内容行数智能分块
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev'; // 生产环境地址
const USERNAME = 'admin';
const PASSWORD = 'admin123';
// 使用本地缓存目录避免AI Drive访问延迟问题
const AI_DRIVE_PATH = '/tmp/9_2_import_cache';
const TARGET_FILE_PREFIX = '9.2数据汇总表-utf8_part_';
// 15个文件：9.2数据汇总表-utf8_part_1.csv 到 9.2数据汇总表-utf8_part_12.csv (12个文件)
const TARGET_FILES = Array.from({ length: 12 }, (_, i) => {
  const num = i + 1;
  return `9.2数据汇总表-utf8_part_${num}.csv`;
});

// 优化配置 - 针对9.2数据汇总表多文件批量导入调整（12个文件）
const MAX_RETRIES = 3;          // 最大重试次数
const DELAY_BETWEEN_CHUNKS = 600; // 分块间延迟0.6秒
const DELAY_BETWEEN_FILES = 2000;  // 文件间延迟2秒
const PROGRESS_SAVE_INTERVAL = 3; // 每3个分块保存一次进度
const PROGRESS_FILE = './9_2_import_progress.json'; // 9.2进度文件路径
const LOG_FILE = './9_2_import.log'; // 详细日志文件
const STATS_FILE = './9_2_import_stats.json'; // 统计数据文件

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
    log(`⏱️ 预计剩余时间: ${hours}小时${minutes}分钟`);
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
    console.log('🔐 正在登录生产环境...');
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

    console.log('✅ 登录成功');
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
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

// 分割CSV内容为小块 - 针对1.15数据优化的块大小（20个文件批量处理）
function splitCsvContent(csvContent, filename, targetChunkSize = 100) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // 针对1.15数据采用优化的块大小策略（20个文件批量处理，根据实际行数智能分块）
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 1.15数据为20个分割文件，根据实际行数动态调整块大小
  if (totalLines > 100000) {
    chunkSize = 100; // 超大文件（>10万行），使用100行块保持稳定
  } else if (totalLines > 50000) {
    chunkSize = 120; // 大文件（5-10万行），使用120行块
  } else if (totalLines > 10000) {
    chunkSize = 150; // 中等文件（1-5万行），使用150行块
  } else if (totalLines > 1000) {
    chunkSize = 200; // 小文件（1千-1万行），使用200行块
  } else {
    chunkSize = 300; // 超小文件（<1千行），使用300行块
  }
  
  log(`📦 [${filename}] 智能分块策略: 总数据行${totalLines}行 → 每块${chunkSize}行`);  
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: Math.min(chunkSize, dataLines.length - i),
      chunkIndex: Math.floor(i / chunkSize),
      filename: filename
    });
  }
  
  log(`📋 [${filename}] 分块完成: ${chunks.length}个数据块`);
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    log(`📦 [${filename}] 处理分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine} (${chunk.totalLines}行)`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: chunk.content,
        filename: `${filename}_chunk_${chunkIndex + 1}`
      })
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        // 速率限制或服务器错误，重试
        if (retryCount < MAX_RETRIES) {
          log(`      ⚠️ [${filename}] 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`, 'WARN');
          await delay(5000 * (retryCount + 1));
          return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
        }
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`   ✅ [${filename}] 分块 ${chunkIndex + 1} 完成 (${duration.toFixed(2)}s)`);
    
    return { success: true, result, duration };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      log(`⚠️ [${filename}] 分块导入失败，${3 * (retryCount + 1)}秒后重试: ${error.message}`, 'WARN');
      await delay(3000 * (retryCount + 1));
      return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    log(`❌ [${filename}] 分块导入最终失败: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

async function importCsvFile(filePath, token) {
  try {
    const filename = path.basename(filePath);
    const stats = fs.statSync(filePath);
    
    log(`📁 开始处理文件: ${filename}`);
    log(`📊 文件大小: ${formatFileSize(stats.size)}`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    log(`🗄️ 数据库导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取CSV内容
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    log(`📈 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent, filename);
    
    // 初始化统计
    const importStats = loadStats();
    importStats.totalRecords = actualRecords;
    importStats.totalChunks = chunks.length;
    importStats.startTime = new Date().toISOString();
    importStats.status = 'running';
    saveStats(importStats);

    let successChunks = 0;
    let failedChunks = 0;
    
    // 检查断点续传
    const savedProgress = loadProgress();
    let startChunkIndex = savedProgress.currentChunkIndex || 0;
    
    if (startChunkIndex > 0) {
      log(`🔄 检测到断点续传: 已完成 ${startChunkIndex} 个分块`);
      successChunks = startChunkIndex;
      log(`📍 从分块 ${startChunkIndex + 1} 开始继续导入...`);
    }

    // 逐个处理数据块
    for (let i = startChunkIndex; i < chunks.length; i++) {
      const chunkResult = await importCsvChunk(
        filename, 
        chunks[i], 
        i, 
        chunks.length, 
        token
      );

      if (chunkResult.success) {
        successChunks++;
      } else {
        failedChunks++;
        log(`❌ 分块 ${i + 1} 导入失败: ${chunkResult.error}`, 'ERROR');
      }

      // 更新统计和进度
      importStats.processedChunks = i + 1;
      saveStats(importStats);
      
      // 保存进度（每PROGRESS_SAVE_INTERVAL个分块保存一次）
      if ((i + 1) % PROGRESS_SAVE_INTERVAL === 0 || i === chunks.length - 1) {
        const progress = {
          currentChunkIndex: i + 1,
          completedChunks: successChunks,
          timestamp: new Date().toISOString()
        };
        saveProgress(progress);
        log(`💾 已保存进度: ${i + 1}/${chunks.length} 分块`);
      }

      // 显示进度
      const percentage = ((i + 1) / chunks.length * 100).toFixed(1);
      log(`📊 进度: ${i + 1}/${chunks.length} (${percentage}%) | 成功: ${successChunks} | 失败: ${failedChunks}`);

      // 分块间延迟
      if (i < chunks.length - 1) {
        log(`⏳ 分块间休息 ${DELAY_BETWEEN_CHUNKS/1000} 秒...`);
        await delay(DELAY_BETWEEN_CHUNKS);
      }
    }

    // 获取导入后状态
    await delay(3000); // 等待数据同步
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;

    // 更新最终统计
    importStats.importedRecords = totalImported;
    importStats.endTime = new Date().toISOString();
    importStats.status = failedChunks === 0 ? 'completed' : 'completed_with_errors';
    saveStats(importStats);

    log(`\n📊 导入结果总结:`);
    log(`   ✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`   ❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`   📈 新增记录: ${formatNumber(totalImported)} 条`);
    log(`   🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);
    log(`   📊 成功率: ${(successChunks / chunks.length * 100).toFixed(2)}%`);

    return {
      success: failedChunks === 0,
      filename,
      size: stats.size,
      actualRecords,
      totalChunks: chunks.length,
      successChunks,
      failedChunks,
      imported: totalImported,
      totalBefore: statsBefore.total,
      totalAfter: statsAfter.total
    };

  } catch (error) {
    log(`❌ 文件处理失败: ${error.message}`, 'ERROR');
    
    // 更新错误状态
    const importStats = loadStats();
    importStats.endTime = new Date().toISOString();
    importStats.status = 'error';
    importStats.error = error.message;
    saveStats(importStats);
    
    return {
      success: false,
      filename: path.basename(filePath),
      error: error.message
    };
  }
}

// 批量导入多个文件
async function importMultipleFiles(existingFiles, token) {
  const results = [];
  
  // 加载断点续传信息
  const savedProgress = loadProgress();
  let startFileIndex = savedProgress.currentFileIndex || 0;
  
  if (startFileIndex > 0) {
    log(`🔄 检测到断点续传: 已完成 ${startFileIndex} 个文件`);
    log(`📍 从第 ${startFileIndex + 1} 个文件开始继续导入...`);
  }
  
  for (let fileIndex = startFileIndex; fileIndex < existingFiles.length; fileIndex++) {
    const fileInfo = existingFiles[fileIndex];
    
    try {
      log(`\n📁 开始处理文件 ${fileIndex + 1}/${existingFiles.length}: ${fileInfo.filename}`);
      
      // 更新统计状态
      const importStats = loadStats();
      importStats.currentFile = fileInfo.filename;
      importStats.processedFiles = fileIndex;
      saveStats(importStats);
      
      // 导入单个文件
      const result = await importCsvFile(fileInfo.path, token);
      results.push(result);
      
      // 保存文件级别的进度
      const progress = {
        currentFileIndex: fileIndex + 1,
        completedFiles: fileIndex + 1,
        timestamp: new Date().toISOString(),
        lastCompletedFile: fileInfo.filename
      };
      saveProgress(progress);
      
      log(`✅ 文件 ${fileIndex + 1}/${existingFiles.length} 完成: ${fileInfo.filename}`);
      
      // 文件间延迟（除了最后一个文件）
      if (fileIndex < existingFiles.length - 1) {
        log(`⏳ 文件间休息 ${DELAY_BETWEEN_FILES/1000} 秒...`);
        await delay(DELAY_BETWEEN_FILES);
      }
      
    } catch (error) {
      log(`❌ 文件 ${fileInfo.filename} 处理失败: ${error.message}`, 'ERROR');
      results.push({
        success: false,
        filename: fileInfo.filename,
        error: error.message
      });
    }
  }
  
  return results;
}

function checkTargetFiles() {
  const results = [];
  let totalRecords = 0;
  let totalSize = 0;
  
  log('🔍 开始检查文件（AI Drive访问较慢，请耐心等待...）');
  
  for (let i = 0; i < TARGET_FILES.length; i++) {
    const targetFile = TARGET_FILES[i];
    
    // 每10个文件显示一次进度
    if (i > 0 && i % 10 === 0) {
      log(`   📊 已检查 ${i}/${TARGET_FILES.length} 个文件...`);
    }
    
    try {
      const filePath = path.join(AI_DRIVE_PATH, targetFile);
      
      // 本地文件检查 - 使用statSync直接检查
      let stats;
      try {
        stats = fs.statSync(filePath);
      } catch (statError) {
        results.push({
          filename: targetFile,
          exists: false,
          error: 'File not found'
        });
        continue;
      }
      
      // 读取文件内容获取实际行数（仅读取前几行来估算，提高速度）
      let actualRecords = 0;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        actualRecords = lines.length - 1; // 减去表头
      } catch (readError) {
        // 如果读取失败，使用文件大小估算（平均每行约60字节）
        actualRecords = Math.floor(stats.size / 60) - 1;
      }
      
      totalRecords += actualRecords;
      totalSize += stats.size;
      
      results.push({
        filename: targetFile,
        exists: true,
        path: filePath,
        size: stats.size,
        actualRecords,
        modified: stats.mtime
      });
    } catch (error) {
      results.push({
        filename: targetFile,
        exists: false,
        error: error.message
      });
    }
  }
  
  log(`✅ 文件检查完成: ${TARGET_FILES.length}个文件`);
  
  const existingFiles = results.filter(r => r.exists);
  
  return {
    files: results,
    summary: {
      totalFiles: TARGET_FILES.length,
      existingFiles: existingFiles.length,
      missingFiles: TARGET_FILES.length - existingFiles.length,
      totalRecords,
      totalSize
    }
  };
}

// 检查单个文件
function checkSingleFile(filename) {
  try {
    const filePath = path.join(AI_DRIVE_PATH, filename);
    
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
      path: filePath,
      size: stats.size,
      actualRecords,
      modified: stats.mtime
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function main() {
  // 初始化日志
  log('🚀 9.1数据汇总表批量导入系统启动');
  log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);
  log(`🎯 目标文件: ${TARGET_FILES.length}个分割文件 (part_1 - part_15)`);
  log(`⚙️ 导入配置: 逐个文件导入, 智能分块大小, 支持6位小数价格, 断点续传`);
  
  const startTime = Date.now();

  try {
    // 检查目标文件
    const filesInfo = checkTargetFiles();
    
    log(`\n📋 文件检查结果:`);
    log(`   📁 总文件数: ${filesInfo.summary.totalFiles}`);
    log(`   ✅ 存在文件数: ${filesInfo.summary.existingFiles}`);
    log(`   ❌ 缺失文件数: ${filesInfo.summary.missingFiles}`);
    log(`   📊 预计总记录数: ${formatNumber(filesInfo.summary.totalRecords)} 条`);
    log(`   💾 总文件大小: ${formatFileSize(filesInfo.summary.totalSize)}`);
    
    if (filesInfo.summary.missingFiles > 0) {
      log('\n⚠️ 缺失的文件:');
      filesInfo.files.filter(f => !f.exists).forEach(f => {
        log(`   ❌ ${f.filename}: ${f.error}`);
      });
    }
    
    if (filesInfo.summary.existingFiles === 0) {
      log(`❌ 没有找到任何目标文件`, 'ERROR');
      return;
    }
    
    // 显示现存文件详情
    log('\n📁 找到的文件详情:');
    const existingFiles = filesInfo.files.filter(f => f.exists);
    existingFiles.forEach(file => {
      log(`   ✅ ${file.filename}: ${formatFileSize(file.size)}, ${formatNumber(file.actualRecords)}条记录`);
    });

    // 登录
    const token = await login();
    log('\n✅ 登录生产环境成功');
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    log(`📊 数据库初始记录数: ${formatNumber(initialStats.total)}`);

    // 初始化统计
    const importStats = loadStats();
    importStats.totalFiles = existingFiles.length;
    importStats.totalRecords = filesInfo.summary.totalRecords;
    importStats.startTime = new Date().toISOString();
    importStats.status = 'running';
    saveStats(importStats);

    // 开始批量导入
    const results = await importMultipleFiles(existingFiles, token);
    
    // 计算总耗时
    const totalDuration = (Date.now() - startTime) / 1000;
    const finalDbStats = await getDbStats(token);
    
    log('\n' + '='.repeat(80));
    log('🎉 9.1数据汇总表批量导入完成！');
    log('='.repeat(80));
    
    // 汇总结果
    const totalImported = results.reduce((sum, r) => sum + (r.imported || 0), 0);
    const totalActualRecords = results.reduce((sum, r) => sum + (r.actualRecords || 0), 0);
    const successfulFiles = results.filter(r => r.success).length;
    
    log(`✅ 成功处理文件: ${successfulFiles}/${existingFiles.length}`);
    log(`📈 成功导入记录: ${formatNumber(totalImported)} 条`);
    log(`📊 预期记录数: ${formatNumber(totalActualRecords)} 条`);
    log(`🗄️ 数据库最终记录数: ${formatNumber(finalDbStats.total)} 条`);
    log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    if (totalActualRecords > 0 && totalImported > 0) {
      const importRate = (totalImported / totalActualRecords * 100).toFixed(2);
      const processingSpeed = (totalActualRecords / totalDuration * 60).toFixed(0);
      log(`📊 总体导入成功率: ${importRate}%`);
      log(`🚀 平均处理速度: ${processingSpeed} 条/分钟`);
    }
    
    // 显示每个文件的结果
    log('\n📋 各文件导入结果:');
    results.forEach((result, index) => {
      if (result.success) {
        log(`   ✅ ${result.filename}: ${formatNumber(result.imported)}条记录导入成功`);
      } else {
        log(`   ❌ ${result.filename}: ${result.error}`);
      }
    });
    
    // 更新最终统计
    importStats.processedFiles = existingFiles.length;
    importStats.importedRecords = totalImported;
    importStats.endTime = new Date().toISOString();
    importStats.status = successfulFiles === existingFiles.length ? 'completed' : 'completed_with_errors';
    importStats.fileResults = results;
    saveStats(importStats);
    
    log('\n🎊 9.1数据汇总表批量导入任务完成！');
    
    // 清理进度文件（仅全部成功时清理）
    if (successfulFiles === existingFiles.length) {
      clearProgress();
      log('🧹 已清理临时进度文件');
    }
    
    log(`📋 详细日志已保存到: ${LOG_FILE}`);
    log(`📊 统计数据已保存到: ${STATS_FILE}`);

  } catch (error) {
    log(`❌ 导入过程发生严重错误: ${error.message}`, 'ERROR');
    log(`📍 错误堆栈: ${error.stack}`, 'ERROR');
    
    // 保存错误状态
    const importStats = loadStats();
    importStats.endTime = new Date().toISOString();
    importStats.status = 'error';
    importStats.error = error.message;
    saveStats(importStats);
    
    log('💾 已保存错误状态到统计数据');
    log(`📋 详细日志文件: ${LOG_FILE}`);
    log(`📊 统计数据文件: ${STATS_FILE}`);
    log(`🔄 进度文件: ${PROGRESS_FILE}`);
    log('💡 可以稍后通过重新运行脚本从断点继续导入');
    
    process.exit(1);
  }
}

main().catch(console.error);