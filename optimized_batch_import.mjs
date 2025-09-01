#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 适配资源限制
 * 小批次、分阶段导入策略
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 优化配置
const BATCH_SIZE = 5;           // 每批处理5个文件
const DELAY_BETWEEN_FILES = 2000; // 文件间延迟2秒
const DELAY_BETWEEN_BATCHES = 10000; // 批次间延迟10秒
const MAX_RETRIES = 3;          // 最大重试次数

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
function splitCsvContent(csvContent, maxLines = 50) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += maxLines) {
    const chunk = [header, ...dataLines.slice(i, i + maxLines)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + maxLines, dataLines.length),
      totalLines: maxLines
    });
  }
  
  return chunks;
}

async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    console.log(`      📦 分块 ${chunkIndex + 1}/${totalChunks}: 行 ${chunk.startLine}-${chunk.endLine}`);
    
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
          console.log(`      ⚠️ 请求失败 (${response.status})，${5 * (retryCount + 1)}秒后重试...`);
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
    console.log(`\n📁 [${fileIndex}/${totalFiles}] ${fileInfo.filename}`);
    console.log(`   公司: ${fileInfo.company}`);
    console.log(`   文件大小: ${formatFileSize(fileInfo.size)}`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    console.log(`   导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取并分割CSV内容
    const csvContent = fs.readFileSync(fileInfo.path, 'utf8');
    const chunks = splitCsvContent(csvContent, 50); // 每块50行数据
    
    console.log(`   📦 分为 ${chunks.length} 个数据块`);

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
        await delay(1000);
      }
    }

    // 获取导入后状态
    await delay(2000); // 等待数据同步
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
      error: error.message
    };
  }
}

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    // 按文件名排序
    csvFiles.sort((a, b) => {
      if (a.includes('51连接器') && !b.includes('51连接器')) return -1;
      if (!a.includes('51连接器') && b.includes('51连接器')) return 1;
      
      const partA = a.match(/part_(\d+)/);
      const partB = b.match(/part_(\d+)/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.localeCompare(b);
    });
    
    return csvFiles.map(filename => {
      const filePath = path.join(AI_DRIVE_PATH, filename);
      const stats = fs.statSync(filePath);
      
      let company = '未知公司';
      if (filename.includes('51连接器')) {
        company = '信都数字科技（上海）有限公司';
      } else if (filename.includes('part_0')) {
        const match = filename.match(/part_(\d+)/);
        if (match) {
          const partNum = parseInt(match[1]);
          if (partNum >= 1 && partNum <= 89) {
            company = '中山市荣御电子科技有限公司';
          } else if (partNum === 90) {
            company = '深圳市熙霖特电子有限公司';
          } else if (partNum >= 91 && partNum <= 100) {
            company = '中山市荣御电子科技有限公司';
          }
        }
      }
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        company
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 优化批量导入 - 资源限制适配版本');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  console.log(`📍 生产环境: ${PRODUCTION_URL}`);
  console.log(`⚙️ 配置: 每批${BATCH_SIZE}个文件, 每文件最大50行/块`);

  const startTime = Date.now();

  try {
    // 登录
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`📊 初始记录数: ${formatNumber(initialStats.total)}\n`);

    // 获取文件列表
    console.log('📂 扫描CSV文件...');
    const files = getAiDriveFiles();
    console.log(`📋 找到 ${files.length} 个文件\n`);

    if (files.length === 0) {
      console.log('⚠️ 未找到CSV文件');
      return;
    }

    const results = [];
    
    // 分批处理文件
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 批次 ${batchNum}/${totalBatches} (${batch.length} 个文件)`);
      console.log(`${'='.repeat(60)}`);

      // 处理当前批次的文件
      for (let i = 0; i < batch.length; i++) {
        const fileInfo = batch[i];
        const globalIndex = batchStart + i + 1;
        
        const result = await importCsvFile(fileInfo, token, globalIndex, files.length);
        results.push(result);

        // 文件间延迟
        if (i < batch.length - 1) {
          console.log(`   ⏳ 等待 ${DELAY_BETWEEN_FILES/1000} 秒...`);
          await delay(DELAY_BETWEEN_FILES);
        }
      }

      // 批次间延迟（除了最后一批）
      if (batchStart + BATCH_SIZE < files.length) {
        console.log(`\n🛑 批次间休息 ${DELAY_BETWEEN_BATCHES/1000} 秒，让服务器恢复...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // 最终统计
    const totalDuration = (Date.now() - startTime) / 1000;
    const finalStats = await getDbStats(token);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalImported = finalStats.total - initialStats.total;

    console.log('\n' + '='.repeat(80));
    console.log('📊 优化批量导入完成总结');
    console.log('='.repeat(80));
    console.log(`✅ 成功导入: ${successCount}/${files.length} 个文件`);
    console.log(`❌ 失败文件: ${failureCount}/${files.length} 个文件`);
    console.log(`📈 总导入记录: ${formatNumber(totalImported)} 条`);
    console.log(`🗄️ 最终记录数: ${formatNumber(finalStats.total)} 条`);
    console.log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    console.log('\n🎉 优化导入完成！');

  } catch (error) {
    console.error('\n❌ 导入过程发生错误:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);