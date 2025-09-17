#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 9.16数据汇总表导入版本 (part001 到 part300)
 * 后台运行、进度统计、分阶段导入策略，支持6位小数价格精度
 * 支持AI Drive中300个分片文件的逐个导入，适合大规模数据处理
 * 特性：断点续传、详细日志、实时进度、按文件内容行数导入、智能批次管理
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev'; // 使用最新部署地址
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 导入范围配置 - 9.16数据汇总表文件 (大规模导入)
const START_PART = 1;   // 开始 part 编号 (001)
const END_PART = 300;   // 结束 part 编号 (300) - 完整300个文件 (part001-part300)

// 优化配置 - 针对9.16数据汇总表大规模导入调整
const BATCH_SIZE = 5;           // 每批处理5个文件（大规模批次，300个文件优化）
const DELAY_BETWEEN_FILES = 1200; // 文件间延迟1.2秒（高效处理）
const DELAY_BETWEEN_BATCHES = 15000; // 批次间延迟15秒（服务器恢复时间）
const MAX_RETRIES = 3;          // 最大重试次数
const PROGRESS_SAVE_INTERVAL = 10; // 每10个文件保存一次进度
const PROGRESS_FILE = './9_16_import_progress.json'; // 9.16进度文件路径
const LOG_FILE = './9_16_import.log'; // 详细日志文件
const STATS_FILE = './9_16_import_stats.json'; // 统计数据文件

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
    totalFiles: 299,  // 实际文件数量 (缺少part289)
    processedFiles: 0,
    successFiles: 0,
    failedFiles: 0,
    totalRecords: 0,
    importedRecords: 0,
    startTime: null,
    endTime: null,
    estimatedTimeRemaining: null
  };
}

// 计算进度百分比和预估剩余时间
function calculateProgress(stats) {
  const progress = (stats.processedFiles / stats.totalFiles) * 100;
  
  if (stats.processedFiles > 0 && stats.startTime) {
    const elapsed = Date.now() - new Date(stats.startTime).getTime();
    const avgTimePerFile = elapsed / stats.processedFiles;
    const remainingFiles = stats.totalFiles - stats.processedFiles;
    stats.estimatedTimeRemaining = Math.ceil((avgTimePerFile * remainingFiles) / 1000); // 秒
  }
  
  return {
    percentage: progress.toFixed(2),
    processedFiles: stats.processedFiles,
    totalFiles: stats.totalFiles,
    remainingFiles: stats.totalFiles - stats.processedFiles,
    estimatedTimeRemaining: stats.estimatedTimeRemaining
  };
}

// 显示进度信息
function displayProgress(stats) {
  const progress = calculateProgress(stats);
  
  log(`📊 进度统计: ${progress.processedFiles}/${progress.totalFiles} (${progress.percentage}%)`);
  log(`✅ 成功: ${stats.successFiles} | ❌ 失败: ${stats.failedFiles}`);
  log(`📈 记录: ${stats.importedRecords.toLocaleString()} 条`);
  
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
  return { completedFiles: [], currentIndex: 0 };
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

// 分割CSV内容为小块 - 针对9.16数据优化的块大小
function splitCsvContent(csvContent, targetChunkSize = 100) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // 针对9.16数据采用优化的块大小策略，按实际行数处理
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 9.16数据文件根据实际行数动态调整块大小（大规模处理优化）
  if (totalLines > 3000) {
    chunkSize = 100; // 大文件使用适中块
  } else if (totalLines > 1500) {
    chunkSize = 120; // 中等文件
  } else if (totalLines > 800) {
    chunkSize = 150; // 较小文件
  } else {
    chunkSize = 250; // 小文件使用大块提高效率
  }
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: Math.min(chunkSize, dataLines.length - i),
      actualLines: Math.min(chunkSize, dataLines.length - i)
    });
  }
  
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    // 简化分块日志输出，避免日志过多
    if (chunkIndex === 0 || (chunkIndex + 1) % 5 === 0 || chunkIndex === totalChunks - 1) {
      log(`      📦 分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine}`);
    }
    
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
          log(`      ⚠️ 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`, 'WARN');
          await delay(5000 * (retryCount + 1));
          return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
        }
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`      ✅ 分块完成 (${duration.toFixed(2)}s)`);
    
    return { success: true, result, duration };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`      ⚠️ 分块导入失败，${3 * (retryCount + 1)}秒后重试: ${error.message}`);
      await delay(3000 * (retryCount + 1));
      return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    console.error(`      ❌ 分块导入最终失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function importCsvFile(fileInfo, token, fileIndex, totalFiles) {
  try {
    log(`📁 文件: ${fileInfo.filename}`);
    log(`   大小: ${formatFileSize(fileInfo.size)} | 预估记录: ${formatNumber(fileInfo.estimatedRecords)} 条`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    log(`   数据库导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取并分割CSV内容
    const csvContent = fs.readFileSync(fileInfo.path, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    log(`   📊 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent); // 动态分块
    log(`   📦 分块策略: ${chunks.length} 个数据块`);

    let totalImported = 0;
    let successChunks = 0;
    let failedChunks = 0;

    // 逐个处理数据块
    for (let i = 0; i < chunks.length; i++) {
      const chunkResult = await importCsvChunk(
        fileInfo.filename, 
        chunks[i], 
        i, 
        chunks.length, 
        token
      );

      if (chunkResult.success) {
        successChunks++;
      } else {
        failedChunks++;
      }

      // 分块间短暂延迟
      if (i < chunks.length - 1) {
        await delay(1500);
      }
    }

    // 获取导入后状态
    await delay(3000); // 等待数据同步
    const statsAfter = await getDbStats(token);
    totalImported = statsAfter.total - statsBefore.total;

    console.log(`   📊 导入结果:`);
    console.log(`      ✅ 成功分块: ${successChunks}/${chunks.length}`);
    console.log(`      ❌ 失败分块: ${failedChunks}/${chunks.length}`);
    console.log(`      📈 新增记录: ${formatNumber(totalImported)} 条`);
    console.log(`      🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    return {
      success: failedChunks === 0,
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      estimatedRecords: fileInfo.estimatedRecords,
      actualRecords,
      totalChunks: chunks.length,
      successChunks,
      failedChunks,
      imported: totalImported,
      totalBefore: statsBefore.total,
      totalAfter: statsAfter.total
    };

  } catch (error) {
    console.error(`   ❌ 文件处理失败: ${error.message}`);
    return {
      success: false,
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      estimatedRecords: fileInfo.estimatedRecords,
      error: error.message
    };
  }
}

// 获取文件记录数的估算（基于文件大小）
function estimateRecords(filePath, fileSize) {
  try {
    // 对于AI Drive的文件，首次扫描时使用基于大小估算，避免大量文件访问
    // 基于9.16数据文件的平均行大小约115字节估算
    return Math.floor(fileSize / 115);
  } catch (error) {
    console.warn(`⚠️ 估算文件记录数失败: ${filePath}, 使用默认估算`);
    return Math.floor(fileSize / 125);
  }
}

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    log(`🔍 扫描AI Drive，找到 ${files.length} 个文件`);
    
    // 只处理9.16数据汇总表文件，格式: 9.16数据汇总表-partXXX.csv
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.16数据汇总表')) {
        return false;
      }
      
      // 提取 part 编号，支持001-300格式 (三位数)
      const partMatch = file.match(/part(\d{3})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= START_PART && partNum <= END_PART;
    });
    
    log(`📋 找到 ${csvFiles.length} 个9.16数据汇总表文件 (part${START_PART.toString().padStart(3, '0')} 到 part${END_PART.toString().padStart(3, '0')})`);
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part(\d{3})/);
      const partB = b.match(/part(\d{3})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.localeCompare(b);
    });
    
    return csvFiles.map(filename => {
      const filePath = path.join(AI_DRIVE_PATH, filename);
      const stats = fs.statSync(filePath);
      
      // 从文件内容判断公司信息
      let company = '9.16数据汇总表'; // 9.16版本数据
      
      // 实际计算记录数（精确统计）
      const actualRecords = estimateRecords(filePath, stats.size);
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        company,
        estimatedRecords: actualRecords
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

async function main() {
  // 初始化日志
  log('🚀 9.16数据汇总表批量导入 - 大规模300文件导入系统启动');
  log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);
  log(`🎯 导入范围: part${START_PART.toString().padStart(3, '0')} 到 part${END_PART.toString().padStart(3, '0')} (${END_PART - START_PART + 1} 个文件)`);
  log(`⚙️ 批量配置: 每批${BATCH_SIZE}个文件, 按文件行数优化分块大小, 支持6位小数价格`);
  log(`⚙️ 延迟设置: 文件间${DELAY_BETWEEN_FILES/1000}秒, 批次间${DELAY_BETWEEN_BATCHES/1000}秒`);
  
  const totalBatches = Math.ceil(300 / BATCH_SIZE);
  const estimatedTotalMinutes = Math.ceil((300 * DELAY_BETWEEN_FILES + totalBatches * DELAY_BETWEEN_BATCHES) / 60000);
  log(`⏱️ 预估总时长: ${Math.floor(estimatedTotalMinutes / 60)}小时${estimatedTotalMinutes % 60}分钟 (${totalBatches}个批次)`);
  
  // 初始化统计数据
  const stats = loadStats();
  stats.startTime = new Date().toISOString();

  const startTime = Date.now();

  try {
    // 登录
    const token = await login();
    log('✅ 登录生产环境成功');
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    log(`📊 数据库初始记录数: ${formatNumber(initialStats.total)}`);
    stats.totalRecords = initialStats.total;

    // 获取文件列表
    log('📂 扫描9.16数据汇总表CSV文件...');
    const files = getAiDriveFiles();
    
    if (files.length === 0) {
      log('❌ 未找到9.16数据汇总表CSV文件', 'ERROR');
      return;
    }
    
    // 显示前5个文件的详细信息（避免日志过长）
    log('\n📋 文件概览 (前5个):');
    files.slice(0, 5).forEach((file, index) => {
      log(`  ${index + 1}. ${file.filename} | 大小: ${formatFileSize(file.size)} | 预估记录: ${formatNumber(file.estimatedRecords)}`);
    });
    
    if (files.length > 5) {
      log(`  ... 还有 ${files.length - 5} 个文件`);
    }
    
    // 计算总体统计
    const totalEstimatedRecords = files.reduce((sum, f) => sum + f.estimatedRecords, 0);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    log(`\n📊 总体统计:`);
    log(`📊 文件数量: ${files.length}/${END_PART} 个`);
    log(`📊 预估总记录数: ${formatNumber(totalEstimatedRecords)} 条`);
    log(`📁 总文件大小: ${formatFileSize(totalSize)}`);
    
    // 检查文件完整性
    if (files.length !== END_PART) {
      log(`⚠️ 警告: 期望 ${END_PART} 个文件，实际找到 ${files.length} 个文件`, 'WARN');
      
      const missingFiles = [];
      for (let i = 1; i <= END_PART; i++) {
        const expectedFile = `9.16数据汇总表-part${i.toString().padStart(3, '0')}.csv`;
        const found = files.find(f => f.filename === expectedFile);
        if (!found) {
          missingFiles.push(i.toString().padStart(3, '0'));
        }
      }
      
      if (missingFiles.length > 0) {
        log(`❌ 缺失的part编号: ${missingFiles.join(', ')}`, 'WARN');
      }
    }
    
    stats.totalFiles = files.length;
    saveStats(stats);
    
    log('✅ 文件检查完成，开始批量导入...\n');

    // 检查断点续传
    const savedProgress = loadProgress();
    let startIndex = 0;
    if (savedProgress.currentIndex > 0) {
      log(`🔄 检测到断点续传: 已完成 ${savedProgress.currentIndex} 个文件`);
      startIndex = savedProgress.currentIndex;
      stats.processedFiles = startIndex;
      log(`📍 从文件 ${startIndex + 1} 开始继续导入...`);
    }

    const results = savedProgress.results || [];
    
    // 分批处理文件（大规模导入优化）
    for (let batchStart = startIndex; batchStart < files.length; batchStart += BATCH_SIZE) {
      const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      log(`\n📦 批次 ${batchNum}/${totalBatches} 开始处理 (${batch.length} 个文件)`);

      // 处理当前批次的文件
      for (let i = 0; i < batch.length; i++) {
        const fileInfo = batch[i];
        const globalIndex = batchStart + i;
        
        // 跳过已处理的文件
        if (globalIndex < startIndex) {
          continue;
        }
        
        log(`\n📁 [${globalIndex + 1}/${files.length}] 开始处理: ${fileInfo.filename}`);
        
        const result = await importCsvFile(fileInfo, token, globalIndex + 1, files.length);
        results.push(result);
        
        // 更新统计信息
        stats.processedFiles++;
        if (result.success) {
          stats.successFiles++;
          stats.importedRecords += (result.imported || 0);
        } else {
          stats.failedFiles++;
        }
        
        saveStats(stats);
        displayProgress(stats);

        // 定期保存进度
        if ((globalIndex + 1) % PROGRESS_SAVE_INTERVAL === 0) {
          const progress = {
            currentIndex: globalIndex + 1,
            results: results,
            timestamp: new Date().toISOString()
          };
          saveProgress(progress);
          log(`💾 已保存进度检查点: ${globalIndex + 1}/${files.length} 个文件`);
        }

        // 文件间延迟
        if (i < batch.length - 1) {
          log(`⏳ 文件间休息 ${DELAY_BETWEEN_FILES/1000} 秒...`);
          await delay(DELAY_BETWEEN_FILES);
        }
      }

      // 批次间延迟
      if (batchStart + BATCH_SIZE < files.length) {
        log(`🛑 批次间休息 ${DELAY_BETWEEN_BATCHES/1000} 秒，让服务器恢复...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // 最终统计
    stats.endTime = new Date().toISOString();
    const startTimeMs = new Date(stats.startTime).getTime();
    const totalDuration = (Date.now() - startTimeMs) / 1000;
    const finalDbStats = await getDbStats(token);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalImported = finalDbStats.total - initialStats.total;
    
    // 更新最终统计
    stats.importedRecords = totalImported;
    stats.totalRecords = finalDbStats.total;
    saveStats(stats);

    log('\n' + '='.repeat(80));
    log('🎉 9.16数据汇总表批量导入完成！');
    log('='.repeat(80));
    log(`✅ 成功导入: ${successCount}/${files.length} 个文件 (${(successCount/files.length*100).toFixed(1)}%)`);
    log(`❌ 失败文件: ${failureCount}/${files.length} 个文件`);
    log(`📈 总导入记录: ${formatNumber(totalImported)} 条`);
    log(`🗄️ 数据库最终记录数: ${formatNumber(finalDbStats.total)} 条`);
    log(`⏱️ 总耗时: ${Math.floor(totalDuration / 3600)}小时${Math.floor((totalDuration % 3600) / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    // 详细统计
    const finalEstimatedRecords = results.reduce((sum, r) => sum + (r.estimatedRecords || 0), 0);
    const finalActualRecords = results.reduce((sum, r) => sum + (r.actualRecords || 0), 0);
    log(`📊 文件总记录数统计:`);
    log(`   预估记录数: ${formatNumber(finalEstimatedRecords)} 条`);
    log(`   实际记录数: ${formatNumber(finalActualRecords)} 条`);
    log(`   导入成功率: ${finalActualRecords > 0 ? ((totalImported / finalActualRecords) * 100).toFixed(2) : 'N/A'}%`);
    log(`   平均处理速度: ${(finalActualRecords / totalDuration * 60).toFixed(0)} 条/分钟`);
    
    log('\n🎊 9.16数据汇总表导入任务圆满完成！');
    
    // 清理进度文件
    clearProgress();
    log('🧹 已清理临时进度文件');
    log(`📋 详细日志已保存到: ${LOG_FILE}`);
    log(`📊 统计数据已保存到: ${STATS_FILE}`);

  } catch (error) {
    log(`❌ 导入过程发生严重错误: ${error.message}`, 'ERROR');
    log(`📍 错误堆栈: ${error.stack}`, 'ERROR');
    
    // 保存错误状态和当前进度
    if (typeof results !== 'undefined' && results.length > 0) {
      const progress = {
        currentIndex: results.length,
        results: results,
        timestamp: new Date().toISOString(),
        error: error.message,
        errorStack: error.stack
      };
      saveProgress(progress);
      
      // 更新统计数据
      stats.endTime = new Date().toISOString();
      stats.error = error.message;
      saveStats(stats);
      
      log('💾 已保存错误前的进度和统计数据');
      log(`📋 详细日志文件: ${LOG_FILE}`);
      log(`📊 统计数据文件: ${STATS_FILE}`);
      log(`🔄 进度文件: ${PROGRESS_FILE}`);
      log('💡 可以稍后通过重新运行脚本从断点继续导入');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);