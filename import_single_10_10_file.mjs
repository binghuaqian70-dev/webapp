#!/usr/bin/env node
/**
 * 10.10数据汇总表单文件导入工具
 * 用于调试和手动导入单个文件，支持分块导入和详细日志
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://63005b7f.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '10.10数据汇总表-utf8.csv';

// 导入参数
const MAX_RETRIES = 3;
const DELAY_BETWEEN_CHUNKS = 1000;
const CHUNK_SIZE = 100; // 调试时使用较小块大小

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
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
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return { total: 0 };

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    return { total: 0 };
  }
}

function splitCsvContent(csvContent, chunkSize = CHUNK_SIZE) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  console.log(`📦 分块配置: 每块${chunkSize}行，总数据行${dataLines.length}行`);
  
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
  
  console.log(`📋 分块完成: ${chunks.length}个数据块`);
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    console.log(`📦 处理分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine} (${chunk.totalLines}行)`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: chunk.content,
        filename: `${filename}_chunk_${chunkIndex + 1}_debug`
      })
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        if (retryCount < MAX_RETRIES) {
          console.log(`⚠️ 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`);
          await delay(5000 * (retryCount + 1));
          return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
        }
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`   ✅ 分块 ${chunkIndex + 1} 完成 (${duration.toFixed(2)}s)`);
    
    return { success: true, result, duration };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️ 分块导入失败，${3 * (retryCount + 1)}秒后重试: ${error.message}`);
      await delay(3000 * (retryCount + 1));
      return await importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    console.error(`❌ 分块导入最终失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  let targetFile = TARGET_FILE;
  let chunkSize = CHUNK_SIZE;
  let maxChunks = null;
  
  // 简单参数解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      targetFile = args[i + 1];
      i++;
    } else if (args[i] === '--chunk-size' && args[i + 1]) {
      chunkSize = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--max-chunks' && args[i + 1]) {
      maxChunks = parseInt(args[i + 1]);
      i++;
    }
  }
  
  console.log('🔧 10.10数据汇总表单文件导入工具 (调试模式)');
  console.log('='.repeat(60));
  console.log(`🎯 目标文件: ${targetFile}`);
  console.log(`📦 分块大小: ${chunkSize}行/块`);
  if (maxChunks) {
    console.log(`🔢 最大分块数: ${maxChunks}个`);
  }
  
  const startTime = Date.now();

  try {
    // 检查文件
    const filePath = path.join(AI_DRIVE_PATH, targetFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`);
      return;
    }
    
    const fileStats = fs.statSync(filePath);
    console.log(`\n📁 文件信息:`);
    console.log(`   大小: ${formatFileSize(fileStats.size)}`);
    console.log(`   路径: ${filePath}`);
    
    // 读取和分析文件
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1;
    
    console.log(`   记录数: ${formatNumber(actualRecords)} 条`);
    
    // 显示文件预览
    console.log(`\n📋 文件预览:`);
    console.log(`   表头: ${lines[0]}`);
    if (lines.length > 1) {
      console.log(`   首行: ${lines[1]}`);
    }
    if (lines.length > 2) {
      console.log(`   末行: ${lines[lines.length - 1]}`);
    }

    // 登录
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`\n🗄️ 数据库导入前记录数: ${formatNumber(initialStats.total)}`);

    // 分割文件
    const chunks = splitCsvContent(csvContent, chunkSize);
    
    // 限制分块数（用于调试）
    const processChunks = maxChunks ? chunks.slice(0, maxChunks) : chunks;
    
    if (maxChunks && chunks.length > maxChunks) {
      console.log(`🔢 调试模式: 仅处理前${maxChunks}个分块 (共${chunks.length}个)`);
    }

    console.log(`\n✅ 开始导入 ${processChunks.length} 个分块...\n`);

    let successCount = 0;
    let failCount = 0;

    // 处理分块
    for (let i = 0; i < processChunks.length; i++) {
      const chunk = processChunks[i];
      const result = await importCsvChunk(targetFile, chunk, i, processChunks.length, token);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`❌ 分块 ${i + 1} 失败: ${result.error}`);
      }
      
      // 显示进度
      const progress = ((i + 1) / processChunks.length * 100).toFixed(1);
      console.log(`📊 进度: ${i + 1}/${processChunks.length} (${progress}%) | 成功: ${successCount} | 失败: ${failCount}`);
      
      // 分块间延迟
      if (i < processChunks.length - 1) {
        console.log(`⏳ 等待 ${DELAY_BETWEEN_CHUNKS/1000} 秒...`);
        await delay(DELAY_BETWEEN_CHUNKS);
      }
    }

    // 获取最终状态
    await delay(3000); // 等待数据同步
    const finalStats = await getDbStats(token);
    const importedRecords = finalStats.total - initialStats.total;
    
    const totalDuration = (Date.now() - startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 单文件导入完成！');
    console.log('='.repeat(60));
    console.log(`✅ 成功分块: ${successCount}/${processChunks.length}`);
    console.log(`❌ 失败分块: ${failCount}/${processChunks.length}`);
    console.log(`📈 导入记录: ${formatNumber(importedRecords)} 条`);
    console.log(`🗄️ 数据库最终记录数: ${formatNumber(finalStats.total)} 条`);
    console.log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    if (actualRecords > 0) {
      const successRate = (successCount / processChunks.length * 100).toFixed(1);
      const speed = (actualRecords / totalDuration * 60).toFixed(0);
      console.log(`📊 成功率: ${successRate}%`);
      console.log(`🚀 处理速度: ${speed} 条/分钟`);
    }

    if (maxChunks && chunks.length > maxChunks) {
      const remainingChunks = chunks.length - maxChunks;
      const remainingRecords = remainingChunks * chunkSize;
      console.log(`\n💡 调试完成，剩余 ${remainingChunks} 个分块 (约${formatNumber(remainingRecords)}条记录) 未处理`);
      console.log(`💡 使用完整导入脚本处理全部数据: node optimized_batch_import_10_10.mjs`);
    }

  } catch (error) {
    console.error(`❌ 导入失败: ${error.message}`);
    console.error(`📍 错误堆栈: ${error.stack}`);
    process.exit(1);
  }
}

// 显示使用帮助
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔧 10.10数据汇总表单文件导入工具

用法:
  node import_single_10_10_file.mjs [选项]

选项:
  --file <文件名>        指定要导入的CSV文件 (默认: ${TARGET_FILE})
  --chunk-size <数量>    每个分块的行数 (默认: ${CHUNK_SIZE})
  --max-chunks <数量>    限制处理的分块数量 (用于调试)
  --help, -h             显示此帮助信息

示例:
  node import_single_10_10_file.mjs
  node import_single_10_10_file.mjs --chunk-size 50
  node import_single_10_10_file.mjs --max-chunks 5
  node import_single_10_10_file.mjs --file "10.10数据汇总表-utf8.csv" --chunk-size 100

注意:
  - 此工具用于调试和测试，生产环境建议使用 optimized_batch_import_10_10.mjs
  - 支持断点续传功能在生产导入脚本中，此工具每次都是完整导入
  - 较小的分块大小更适合调试，但会增加总耗时
`);
  process.exit(0);
}

main().catch(console.error);