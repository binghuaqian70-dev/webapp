#!/usr/bin/env node
/**
 * 单独导入Part_10文件脚本
 * 用于补充导入11.5数据汇总表-utf8_part_10.csv
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '11.5数据汇总表-utf8_part_10.csv';

const MAX_RETRIES = 3;
const DELAY_BETWEEN_CHUNKS = 500;
const LOG_FILE = './part_10_import.log';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.warn('⚠️ 日志写入失败:', error.message);
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

function splitCsvContent(csvContent, filename) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const totalLines = dataLines.length;
  const chunkSize = 150; // 使用150行/块
  
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

async function main() {
  log('🚀 Part_10单独导入任务启动');
  log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);
  log(`🎯 目标文件: ${TARGET_FILE}`);
  
  const startTime = Date.now();

  try {
    // 检查文件
    const filePath = path.join(AI_DRIVE_PATH, TARGET_FILE);
    
    if (!fs.existsSync(filePath)) {
      log(`❌ 文件不存在: ${filePath}`, 'ERROR');
      return;
    }
    
    const stats = fs.statSync(filePath);
    log(`✅ 文件存在: ${formatFileSize(stats.size)}`);

    // 登录
    const token = await login();
    log('✅ 登录生产环境成功');
    
    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    log(`📊 数据库导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取CSV内容
    log(`📁 开始处理文件: ${TARGET_FILE}`);
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1;
    
    log(`📈 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent, TARGET_FILE);
    
    let successChunks = 0;
    let failedChunks = 0;

    // 逐个处理数据块
    for (let i = 0; i < chunks.length; i++) {
      const chunkResult = await importCsvChunk(
        TARGET_FILE, 
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

      const percentage = ((i + 1) / chunks.length * 100).toFixed(1);
      log(`📊 进度: ${i + 1}/${chunks.length} (${percentage}%) | 成功: ${successChunks} | 失败: ${failedChunks}`);

      // 分块间延迟
      if (i < chunks.length - 1) {
        log(`⏳ 分块间休息 ${DELAY_BETWEEN_CHUNKS/1000} 秒...`);
        await delay(DELAY_BETWEEN_CHUNKS);
      }
    }

    // 获取导入后状态
    await delay(3000);
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;

    const totalDuration = (Date.now() - startTime) / 1000;

    log('\n' + '='.repeat(80));
    log('🎉 Part_10单独导入完成！');
    log('='.repeat(80));
    
    log(`✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`📈 新增记录: ${formatNumber(totalImported)} 条`);
    log(`🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);
    log(`📊 成功率: ${(successChunks / chunks.length * 100).toFixed(2)}%`);
    log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    log('\n🎊 Part_10导入任务完成！');
    log(`📋 详细日志已保存到: ${LOG_FILE}`);

  } catch (error) {
    log(`❌ 导入过程发生严重错误: ${error.message}`, 'ERROR');
    log(`📍 错误堆栈: ${error.stack}`, 'ERROR');
    process.exit(1);
  }
}

main().catch(console.error);
