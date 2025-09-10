#!/usr/bin/env node
/**
 * 9.10数据汇总表单文件导入工具
 * 用于导入单个CSV文件或修复失败的文件
 * 支持详细的进度跟踪和错误处理
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const MAX_RETRIES = 3;
const SINGLE_LOG_FILE = './single_import.log';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 日志记录函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // 写入日志文件
  try {
    fs.appendFileSync(SINGLE_LOG_FILE, logMessage + '\n');
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

// 分割CSV内容为小块 - 针对9.10数据优化
function splitCsvContent(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // 9.10数据文件根据实际行数动态调整块大小
  const totalLines = dataLines.length;
  let chunkSize = 75;
  
  if (totalLines > 2000) {
    chunkSize = 75; // 大文件使用适中块提高效率
  } else if (totalLines > 1000) {
    chunkSize = 90; // 中等文件
  } else if (totalLines > 500) {
    chunkSize = 120; // 较小文件可以更大块
  } else {
    chunkSize = 180; // 小文件使用大块提高效率
  }
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: Math.min(chunkSize, dataLines.length - i)
    });
  }
  
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    log(`      📦 分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine}`);
    
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
          log(`      ⚠️ 请求失败 (${response.status})，${3 * (retryCount + 1)}秒后重试...`, 'WARN');
          await delay(3000 * (retryCount + 1));
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
      console.log(`      ⚠️ 分块导入失败，${2 * (retryCount + 1)}秒后重试: ${error.message}`);
      await delay(2000 * (retryCount + 1));
      return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    console.error(`      ❌ 分块导入最终失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function importSingleFile(filename, token) {
  try {
    log(`📁 开始导入单文件: ${filename}`);
    
    // 构建文件路径
    let filePath;
    if (filename.startsWith('/')) {
      filePath = filename; // 已经是完整路径
    } else if (filename.includes('/')) {
      filePath = filename; // 相对路径
    } else {
      // 只是文件名，尝试在AI Drive中查找
      filePath = path.join(AI_DRIVE_PATH, filename);
      
      // 如果文件不存在，尝试添加9.10数据汇总表前缀
      if (!fs.existsSync(filePath) && !filename.includes('9.10数据汇总表')) {
        // 尝试匹配part编号格式
        const partMatch = filename.match(/(part_\d{2})/);
        if (partMatch) {
          const possibleName = `9.10数据汇总表-utf8_${partMatch[1]}.csv`;
          const possiblePath = path.join(AI_DRIVE_PATH, possibleName);
          if (fs.existsSync(possiblePath)) {
            filePath = possiblePath;
            filename = possibleName;
          }
        }
      }
    }
    
    log(`📍 文件路径: ${filePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 获取文件信息
    const stats = fs.statSync(filePath);
    log(`📊 文件大小: ${formatFileSize(stats.size)}`);
    
    // 估算记录数
    const estimatedRecords = Math.floor(stats.size / 118);
    log(`📊 预估记录数: ${formatNumber(estimatedRecords)} 条`);

    // 获取导入前数据库状态
    const statsBefore = await getDbStats(token);
    log(`📊 数据库导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取并分割CSV内容
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    log(`📊 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent);
    log(`📦 分块策略: ${chunks.length} 个数据块`);

    let successChunks = 0;
    let failedChunks = 0;
    
    const startTime = Date.now();

    // 逐个处理数据块
    for (let i = 0; i < chunks.length; i++) {
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
      }

      // 分块间延迟
      if (i < chunks.length - 1) {
        await delay(1000);
      }
    }

    // 获取导入后状态
    await delay(3000); // 等待数据同步
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;
    const duration = Math.floor((Date.now() - startTime) / 1000);

    log(`📊 导入结果:`);
    log(`   ✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`   ❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`   📈 新增记录: ${formatNumber(totalImported)} 条`);
    log(`   🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    log('\n' + '='.repeat(60));
    log('🎉 单文件导入完成！');
    log(`✅ 文件: ${filename}`);
    log(`📊 导入记录: ${formatNumber(totalImported)} 条`);
    log(`📊 成功率: ${successChunks}/${chunks.length} 分块`);
    log(`⏱️ 耗时: ${Math.floor(duration/60)}分${duration%60}秒`);
    log('='.repeat(60));

    return {
      success: failedChunks === 0,
      filename,
      actualRecords,
      totalChunks: chunks.length,
      successChunks,
      failedChunks,
      imported: totalImported,
      duration
    };

  } catch (error) {
    log(`❌ 文件导入失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function main() {
  log('🚀 9.10数据汇总表单文件导入脚本启动');
  
  // 获取命令行参数
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('❌ 使用方法: node import_single_9_10_file.mjs <文件名>');
    console.error('');
    console.error('示例:');
    console.error('  node import_single_9_10_file.mjs part_01');
    console.error('  node import_single_9_10_file.mjs 9.10数据汇总表-utf8_part_01.csv');
    console.error('  node import_single_9_10_file.mjs /mnt/aidrive/9.10数据汇总表-utf8_part_01.csv');
    process.exit(1);
  }
  
  log(`📍 目标文件: ${filename}`);
  log(`📍 AI Drive路径: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);

  try {
    // 登录
    const token = await login();
    log('✅ 登录生产环境成功');
    
    // 开始单文件导入
    log('🔄 开始单文件导入...');
    const result = await importSingleFile(filename, token);
    
    log(`📋 详细日志已保存到: ${SINGLE_LOG_FILE}`);
    
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    log(`❌ 导入过程发生错误: ${error.message}`, 'ERROR');
    log(`📋 详细日志已保存到: ${SINGLE_LOG_FILE}`);
    process.exit(1);
  }
}

main().catch(console.error);