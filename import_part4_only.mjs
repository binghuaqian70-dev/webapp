#!/usr/bin/env node
/**
 * 7.9数据汇总表 Part4 单独补充导入脚本
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '7.9数据汇总表-utf8_part4.csv';

const MAX_RETRIES = 3;
const DELAY_BETWEEN_CHUNKS = 600;
const LOG_FILE = './part4_import.log';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

async function login() {
  log('🔐 开始登录...');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.token || (data.data && data.data.token);
    
    if (!token) {
      throw new Error('登录成功但未获取到token');
    }

    log('✅ 登录成功');
    return token;
  } catch (error) {
    log(`❌ 登录失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

async function importCsvChunk(token, csvContent, chunkIndex) {
  const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      csvData: csvContent,
      filename: `7.9数据汇总表-utf8_part4_chunk_${chunkIndex}`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`批量导入失败: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getRecordCount(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    return data.pagination?.total || data.total || 0;
  } catch (error) {
    return 0;
  }
}

function splitCsvContent(csvContent, chunkSize = 300) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunkLines = dataLines.slice(i, i + chunkSize);
    const chunkContent = header + '\n' + chunkLines.join('\n');
    chunks.push({
      content: chunkContent,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length),
      totalLines: chunkLines.length
    });
  }
  
  return { chunks, totalLines: dataLines.length };
}

async function main() {
  const startTime = Date.now();
  log('🚀 开始Part4文件单独导入');
  log(`📁 目标文件: ${TARGET_FILE}`);

  try {
    // 登录
    const token = await login();

    // 检查文件
    const filePath = path.join(AI_DRIVE_PATH, TARGET_FILE);
    log(`📂 检查文件: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    log(`📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

    // 获取导入前记录数
    const beforeCount = await getRecordCount(token);
    log(`🗄️ 数据库导入前记录数: ${beforeCount.toLocaleString()}`);

    // 读取并分块CSV
    log('📖 开始读取CSV文件...');
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const { chunks, totalLines } = splitCsvContent(csvContent, 300);
    
    log(`📈 实际记录数: ${totalLines} 条`);
    log(`📦 智能分块策略: 总数据行${totalLines}行 → 每块300行`);
    log(`📋 分块完成: ${chunks.length}个数据块`);

    if (totalLines === 0) {
      throw new Error('没有可导入的记录');
    }

    // 导入每个分块
    let successChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNum = i + 1;

      log(`📦 处理分块 ${chunkNum}/${chunks.length}: 行 ${chunk.startLine}-${chunk.endLine} (${chunk.totalLines}行)`);

      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES && !success) {
        try {
          const startTime = Date.now();
          await importCsvChunk(token, chunk.content, chunkNum);
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          
          log(`   ✅ 分块 ${chunkNum} 完成 (${duration}s)`);
          successChunks++;
          success = true;

          if (i < chunks.length - 1) {
            await delay(DELAY_BETWEEN_CHUNKS);
          }
        } catch (error) {
          retries++;
          log(`   ⚠️ 分块 ${chunkNum} 失败 (尝试 ${retries}/${MAX_RETRIES}): ${error.message}`, 'WARN');
          
          if (retries < MAX_RETRIES) {
            await delay(2000 * retries);
          } else {
            log(`   ❌ 分块 ${chunkNum} 最终失败`, 'ERROR');
            failedChunks++;
          }
        }
      }
    }

    // 获取导入后记录数
    await delay(1000);
    const afterCount = await getRecordCount(token);
    const imported = afterCount - beforeCount;

    log('\n📊 导入结果总结:');
    log(`   ✅ 成功分块: ${successChunks}/${chunks.length}`);
    log(`   ❌ 失败分块: ${failedChunks}/${chunks.length}`);
    log(`   📈 新增记录: ${imported} 条`);
    log(`   🗄️ 数据库总记录数: ${afterCount.toLocaleString()}`);
    log(`   📊 成功率: ${((successChunks / chunks.length) * 100).toFixed(2)}%`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n🎉 Part4文件导入完成！耗时: ${duration}秒`);

    // 返回结果
    return {
      success: failedChunks === 0,
      imported,
      beforeCount,
      afterCount,
      successChunks,
      failedChunks,
      totalChunks: chunks.length
    };

  } catch (error) {
    log(`\n❌ 导入失败: ${error.message}`, 'ERROR');
    throw error;
  }
}

// 运行主函数
main()
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
