#!/usr/bin/env node
/**
 * 9.7数据汇总表单文件导入脚本
 * 专门用于导入失败或遗漏的单个文件
 * 支持指定文件名进行精确导入
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 配置参数
const MAX_RETRIES = 3;
const LOG_FILE = './single_import.log';

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

// 分割CSV内容为小块
function splitCsvContent(csvContent, targetChunkSize = 80) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 根据文件大小动态调整块大小
  if (totalLines > 1000) {
    chunkSize = 70;
  } else if (totalLines > 500) {
    chunkSize = 90;
  } else {
    chunkSize = 120;
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

async function importSingleFile(filename, token) {
  try {
    const filePath = path.join(AI_DRIVE_PATH, filename);
    
    log(`📁 开始导入单文件: ${filename}`);
    log(`📍 文件路径: ${filePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 获取文件信息
    const stats = fs.statSync(filePath);
    const estimatedRecords = Math.floor(stats.size / 115); // 基于9.7数据特征估算
    
    log(`📊 文件大小: ${formatFileSize(stats.size)}`);
    log(`📊 预估记录数: ${formatNumber(estimatedRecords)} 条`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    log(`📊 数据库导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取并分割CSV内容
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    log(`📊 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent);
    log(`📦 分块策略: ${chunks.length} 个数据块`);

    let totalImported = 0;
    let successChunks = 0;
    let failedChunks = 0;

    // 逐个处理数据块
    for (let i = 0; i < chunks.length; i++) {
      const chunkResult = await importCsvChunk(
        filename.replace('.csv', ''),
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

    log(`📊 导入结果:`);
    log(`   ✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`   ❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`   📈 新增记录: ${formatNumber(totalImported)} 条`);
    log(`   🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    return {
      success: failedChunks === 0,
      filename,
      size: stats.size,
      estimatedRecords,
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
    return {
      success: false,
      filename,
      error: error.message
    };
  }
}

async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  let targetFile = args[0];
  
  // 如果没有指定文件，默认使用part_006
  if (!targetFile) {
    targetFile = '9.7数据汇总表-utf8_part_006.csv';
    console.log('💡 未指定文件名，默认导入: ' + targetFile);
  }
  
  // 初始化日志
  log('🚀 9.7数据汇总表单文件导入脚本启动');
  log(`📍 目标文件: ${targetFile}`);
  log(`📍 AI Drive路径: ${AI_DRIVE_PATH}`);
  log(`📍 生产环境: ${PRODUCTION_URL}`);

  const startTime = Date.now();

  try {
    // 登录
    const token = await login();
    log('✅ 登录生产环境成功');
    
    // 检查文件是否存在
    const filePath = path.join(AI_DRIVE_PATH, targetFile);
    if (!fs.existsSync(filePath)) {
      // 尝试查找相似的文件
      log('⚠️ 指定文件未找到，搜索相似文件...', 'WARN');
      const files = fs.readdirSync(AI_DRIVE_PATH);
      const similarFiles = files.filter(f => f.includes('9.7数据汇总表') && f.includes('part_006'));
      
      if (similarFiles.length > 0) {
        log(`📋 找到相似文件: ${similarFiles.join(', ')}`);
        targetFile = similarFiles[0];
        log(`✅ 使用文件: ${targetFile}`);
      } else {
        throw new Error(`未找到目标文件: ${targetFile}`);
      }
    }

    // 执行导入
    log('🔄 开始单文件导入...');
    const result = await importSingleFile(targetFile, token);
    
    // 计算总耗时
    const totalDuration = (Date.now() - startTime) / 1000;
    
    // 输出最终结果
    log('\n' + '='.repeat(60));
    if (result.success) {
      log('🎉 单文件导入完成！');
      log(`✅ 文件: ${result.filename}`);
      log(`📊 导入记录: ${formatNumber(result.imported)} 条`);
      log(`📊 成功率: ${result.successChunks}/${result.totalChunks} 分块`);
      log(`⏱️ 耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    } else {
      log('❌ 单文件导入失败！');
      log(`📁 文件: ${result.filename}`);
      log(`🔧 错误: ${result.error}`);
    }
    log('='.repeat(60));
    
    log(`📋 详细日志已保存到: ${LOG_FILE}`);

  } catch (error) {
    log(`❌ 导入过程发生严重错误: ${error.message}`, 'ERROR');
    log(`📍 错误堆栈: ${error.stack}`, 'ERROR');
    
    const totalDuration = (Date.now() - startTime) / 1000;
    log(`⏱️ 运行时间: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    log(`📋 详细日志文件: ${LOG_FILE}`);
    
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log('9.7数据汇总表单文件导入脚本');
  console.log('');
  console.log('用法:');
  console.log('  node import_single_9_7_file.mjs [文件名]');
  console.log('');
  console.log('示例:');
  console.log('  node import_single_9_7_file.mjs 9.7数据汇总表-utf8_part_006.csv');
  console.log('  node import_single_9_7_file.mjs  # 默认导入part_006文件');
  console.log('');
  console.log('说明:');
  console.log('  - 如果不指定文件名，默认导入 9.7数据汇总表-utf8_part_006.csv');
  console.log('  - 文件必须存在于 /mnt/aidrive/ 目录中');
  console.log('  - 支持智能分块和重试机制');
  console.log('  - 详细日志保存到 single_import.log');
}

// 检查是否需要显示帮助
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

main().catch(console.error);