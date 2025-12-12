#!/usr/bin/env node
/**
 * 单文件导入脚本 - 用于手动导入指定的CSV文件
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ 请提供文件路径');
  console.error('用法: node import_single_file.mjs <文件路径>');
  console.error('示例: node import_single_file.mjs /mnt/aidrive/12.12数据汇总表-utf8_part_01.csv');
  process.exit(1);
}

const FILE_PATH = args[0];

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    log(`❌ 登录失败: ${error.message}`);
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

function splitCsvContent(csvContent, chunkSize = 300) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
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
  
  return chunks;
}

async function importChunk(chunk, chunkIndex, totalChunks, token, filename, retryCount = 0) {
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
        if (retryCount < 3) {
          log(`⚠️ 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`);
          await delay(5000 * (retryCount + 1));
          return await importChunk(chunk, chunkIndex, totalChunks, token, filename, retryCount + 1);
        }
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`✅ 分块 ${chunkIndex + 1} 完成 (${duration.toFixed(2)}s)`);
    
    return { success: true, result, duration };

  } catch (error) {
    if (retryCount < 3) {
      log(`⚠️ 分块导入失败，${3 * (retryCount + 1)}秒后重试: ${error.message}`);
      await delay(3000 * (retryCount + 1));
      return await importChunk(chunk, chunkIndex, totalChunks, token, filename, retryCount + 1);
    }
    
    log(`❌ 分块导入最终失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🚀 单文件导入脚本启动');
  log(`📁 目标文件: ${FILE_PATH}`);
  log(`🎯 生产环境: ${PRODUCTION_URL}`);

  try {
    // 检查文件
    if (!fs.existsSync(FILE_PATH)) {
      log(`❌ 文件不存在: ${FILE_PATH}`);
      process.exit(1);
    }

    const stats = fs.statSync(FILE_PATH);
    const filename = path.basename(FILE_PATH);
    
    log(`📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

    // 登录
    const token = await login();

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    log(`🗄️ 数据库导入前记录数: ${statsBefore.total.toLocaleString()}`);

    // 读取CSV内容
    const csvContent = fs.readFileSync(FILE_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1;
    
    log(`📈 实际记录数: ${actualRecords.toLocaleString()} 条`);

    // 分块
    const chunks = splitCsvContent(csvContent);
    log(`📦 分块完成: ${chunks.length} 个数据块`);

    // 导入
    let successChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const result = await importChunk(chunks[i], i, chunks.length, token, filename);

      if (result.success) {
        successChunks++;
      } else {
        failedChunks++;
      }

      log(`📊 进度: ${i + 1}/${chunks.length} (${((i + 1) / chunks.length * 100).toFixed(1)}%) | 成功: ${successChunks} | 失败: ${failedChunks}`);

      // 分块间延迟
      if (i < chunks.length - 1) {
        await delay(600);
      }
    }

    // 获取导入后状态
    await delay(3000);
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;

    log('\n' + '='.repeat(60));
    log('🎉 导入完成！');
    log('='.repeat(60));
    log(`✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`📈 新增记录: ${totalImported.toLocaleString()} 条`);
    log(`🗄️ 数据库总记录数: ${statsAfter.total.toLocaleString()}`);
    log(`📊 成功率: ${(successChunks / chunks.length * 100).toFixed(2)}%`);

    if (failedChunks > 0) {
      process.exit(1);
    }

  } catch (error) {
    log(`❌ 导入失败: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
