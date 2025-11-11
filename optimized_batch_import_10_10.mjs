#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 10.10数据汇总表导入版本 (单文件导入)
 * 后台运行、进度统计、分阶段导入策略，支持6位小数价格精度
 * 支持AI Drive中10.10数据汇总表-utf8.csv单文件导入
 * 特性：详细日志、实时进度、按文件内容行数智能分块、分阶段导入
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev'; // 使用最新部署地址
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '10.10数据汇总表-utf8.csv';

// 优化配置 - 针对10.10数据汇总表单文件导入调整
const MAX_RETRIES = 3;          // 最大重试次数
const DELAY_BETWEEN_CHUNKS = 1500; // 分块间延迟1.5秒
const PROGRESS_FILE = './10_10_import_progress.json'; // 10.10进度文件路径
const LOG_FILE = './10_10_import.log'; // 详细日志文件
const STATS_FILE = './10_10_import_stats.json'; // 统计数据文件

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
    filename: TARGET_FILE,
    totalRecords: 0,
    processedChunks: 0,
    totalChunks: 0,
    importedRecords: 0,
    startTime: null,
    endTime: null,
    status: 'pending'
  };
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
  return { completedChunks: 0, currentChunkIndex: 0 };
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

// 分割CSV内容为小块 - 针对10.10数据优化的块大小
function splitCsvContent(csvContent, targetChunkSize = 150) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // 针对10.10数据采用优化的块大小策略 (2097条记录)
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 10.10数据文件约2097行，使用中等块大小平衡效率和稳定性
  if (totalLines > 2000) {
    chunkSize = 120; // 适中块大小，大约17-18个块
  } else if (totalLines > 1000) {
    chunkSize = 150; // 中等文件，大约14个块
  } else {
    chunkSize = 200; // 小文件使用大块
  }
  
  log(`📦 智能分块策略: 总数据行${totalLines}行 → 每块${chunkSize}行`);
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: Math.min(chunkSize, dataLines.length - i),
      chunkIndex: Math.floor(i / chunkSize)
    });
  }
  
  log(`📋 分块完成: ${chunks.length}个数据块`);
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    log(`📦 处理分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine} (${chunk.totalLines}行)`);
    
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
          log(`⚠️ 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`, 'WARN');
          await delay(5000 * (retryCount + 1));
          return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
        }
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`   ✅ 分块 ${chunkIndex + 1} 完成 (${duration.toFixed(2)}s)`);
    
    return { success: true, result, duration };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      log(`⚠️ 分块导入失败，${3 * (retryCount + 1)}秒后重试: ${error.message}`, 'WARN');
      await delay(3000 * (retryCount + 1));
      return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    log(`❌ 分块导入最终失败: ${error.message}`, 'ERROR');
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
    
    const chunks = splitCsvContent(csvContent);
    
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

      // 更新进度
      importStats.processedChunks = i + 1;
      saveStats(importStats);
      
      // 保存进度（每5个分块保存一次）
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
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

async function main() {
  // 初始化日志
  log('🚀 10.10数据汇总表导入系统启动');
  log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);
  log(`🎯 目标文件: ${TARGET_FILE}`);
  log(`⚙️ 导入配置: 智能分块大小, 支持6位小数价格, 断点续传`);
  
  const startTime = Date.now();

  try {
    // 检查目标文件
    const targetFilePath = path.join(AI_DRIVE_PATH, TARGET_FILE);
    
    if (!fs.existsSync(targetFilePath)) {
      log(`❌ 文件不存在: ${targetFilePath}`, 'ERROR');
      return;
    }
    
    const fileStats = fs.statSync(targetFilePath);
    log(`📁 找到目标文件: ${TARGET_FILE}`);
    log(`📊 文件大小: ${formatFileSize(fileStats.size)}`);
    
    // 预览文件内容
    const csvContent = fs.readFileSync(targetFilePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1;
    log(`📈 预计记录数: ${formatNumber(actualRecords)} 条`);
    
    // 显示前几行作为预览
    log(`\n📋 文件内容预览:`);
    lines.slice(0, 3).forEach((line, index) => {
      if (index === 0) {
        log(`   表头: ${line}`);
      } else {
        log(`   数据${index}: ${line}`);
      }
    });

    // 登录
    const token = await login();
    log('✅ 登录生产环境成功');
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    log(`📊 数据库初始记录数: ${formatNumber(initialStats.total)}`);

    log('\n✅ 准备工作完成，开始导入...\n');

    // 开始导入
    const result = await importCsvFile(targetFilePath, token);
    
    // 计算总耗时
    const totalDuration = (Date.now() - startTime) / 1000;
    
    log('\n' + '='.repeat(80));
    log('🎉 10.10数据汇总表导入完成！');
    log('='.repeat(80));
    
    if (result.success) {
      log(`✅ 导入成功！`);
      log(`📈 成功导入: ${formatNumber(result.imported)} 条记录`);
      log(`🗄️ 数据库最终记录数: ${formatNumber(result.totalAfter)} 条`);
      log(`📦 分块统计: ${result.successChunks}/${result.totalChunks} 个分块成功`);
    } else {
      log(`❌ 导入失败: ${result.error || '未知错误'}`, 'ERROR');
      if (result.successChunks && result.totalChunks) {
        log(`📦 部分成功: ${result.successChunks}/${result.totalChunks} 个分块完成`);
      }
    }
    
    log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    if (result.actualRecords && result.imported) {
      const importRate = (result.imported / result.actualRecords * 100).toFixed(2);
      const processingSpeed = (result.actualRecords / totalDuration * 60).toFixed(0);
      log(`📊 导入成功率: ${importRate}%`);
      log(`🚀 处理速度: ${processingSpeed} 条/分钟`);
    }
    
    log('\n🎊 10.10数据汇总表导入任务完成！');
    
    // 清理进度文件（仅成功时清理）
    if (result.success) {
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