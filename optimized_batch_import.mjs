#!/usr/bin/env node
/**
 * 优化的批量导入脚本 - 9.2下数据汇总表导入版本 (part_01 到 part_10)
 * 小批次、分阶段导入策略，支持6位小数价格精度
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev'; // 使用最新部署地址
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 导入范围配置 - 9.2下数据汇总表文件
const START_PART = 1;   // 开始 part 编号 (01)
const END_PART = 10;    // 结束 part 编号 (10)

// 优化配置 - 针对9.2下数据汇总表文件调整（数据量较小）
const BATCH_SIZE = 5;           // 每批处理5个文件（数据量小可以更积极）
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

// 分割CSV内容为小块 - 动态计算最佳块大小
function splitCsvContent(csvContent, targetChunkSize = 50) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // 动态计算块大小，基于文件大小
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 如果文件很大（>1000行），使用更小的块
  if (totalLines > 1000) {
    chunkSize = 30;
  } else if (totalLines > 500) {
    chunkSize = 40;
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
    console.log(`   预估记录数: ${formatNumber(fileInfo.estimatedRecords)} 条`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    console.log(`   导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取并分割CSV内容
    const csvContent = fs.readFileSync(fileInfo.path, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    console.log(`   📊 实际记录数: ${formatNumber(actualRecords)} 条`);
    
    const chunks = splitCsvContent(csvContent); // 动态分块
    
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
    // 读取文件前几行来估算平均行大小
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length <= 1) return 0;
    
    // 实际计算记录数
    const actualRecords = lines.filter(line => line.trim()).length - 1; // 减去头部行
    return actualRecords;
  } catch (error) {
    // 如果读取失败，基于文件大小估算（平均每行约150字节）
    return Math.floor(fileSize / 150);
  }
}

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    // 只处理9.2下数据汇总表文件，格式: 9.2下数据汇总表-utf8_part_XX.csv
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.2下数据汇总表')) {
        return false;
      }
      
      // 提取 part 编号，支持01-10格式
      const partMatch = file.match(/part_(\d{2})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= START_PART && partNum <= END_PART;
    });
    
    console.log(`找到 ${csvFiles.length} 个9.2下数据汇总表文件 (part_${START_PART.toString().padStart(2, '0')} 到 part_${END_PART.toString().padStart(2, '0')})`);
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part_(\d{2})/);
      const partB = b.match(/part_(\d{2})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.localeCompare(b);
    });
    
    return csvFiles.map(filename => {
      const filePath = path.join(AI_DRIVE_PATH, filename);
      const stats = fs.statSync(filePath);
      
      // 从文件内容判断公司信息（根据实际数据结构）
      let company = '富特世贸易（深圳）有限公司'; // 默认公司，根据文件内容确定
      
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
  console.log('🚀 9.2下数据汇总表批量导入 - 10文件完整导入');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  console.log(`📍 生产环境: ${PRODUCTION_URL}`);
  console.log(`🎯 导入范围: part_${START_PART.toString().padStart(2, '0')} 到 part_${END_PART.toString().padStart(2, '0')} (${END_PART - START_PART + 1} 个文件)`);
  console.log(`⚙️ 配置: 每批${BATCH_SIZE}个文件, 动态分块大小, 支持6位小数价格`);

  const startTime = Date.now();

  try {
    // 登录
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`📊 初始记录数: ${formatNumber(initialStats.total)}\n`);

    // 获取文件列表
    console.log('📂 扫描9.2下数据汇总表CSV文件...');
    const files = getAiDriveFiles();
    console.log(`📋 找到 ${files.length} 个9.2下数据汇总表文件`);
    
    // 显示文件详细信息
    console.log('\n📋 文件详细信息:');
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.filename}`);
      console.log(`     📊 数据行数: ${formatNumber(file.estimatedRecords)} 条`);
      console.log(`     📁 文件大小: ${formatFileSize(file.size)}`);
      console.log(`     🏢 公司: ${file.company}`);
    });
    
    // 显示文件概览
    const totalEstimatedRecords = files.reduce((sum, f) => sum + f.estimatedRecords, 0);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n📊 汇总统计:`);
    console.log(`📊 总记录数: ${formatNumber(totalEstimatedRecords)} 条`);
    console.log(`📁 总文件大小: ${formatFileSize(totalSize)}`);
    console.log(`🏢 涉及公司: ${[...new Set(files.map(f => f.company))].join(', ')}\n`);

    if (files.length === 0) {
      console.log('⚠️ 未找到9.2下数据汇总表CSV文件');
      return;
    }
    
    // 验证是否找到了完整的10个文件
    if (files.length !== 10) {
      console.log(`⚠️ 警告: 期望找到10个文件，实际找到${files.length}个文件`);
      console.log('缺失的文件:');
      for (let i = 1; i <= 10; i++) {
        const expectedFile = `9.2下数据汇总表-utf8_part_${i.toString().padStart(2, '0')}.csv`;
        const found = files.find(f => f.filename === expectedFile);
        if (!found) {
          console.log(`  ❌ ${expectedFile}`);
        }
      }
    }
    
    console.log('✅ 文件检查完成，开始导入...\n');

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
    console.log('📊 9.2下数据汇总表批量导入完成总结');
    console.log('='.repeat(80));
    console.log(`✅ 成功导入: ${successCount}/${files.length} 个文件`);
    console.log(`❌ 失败文件: ${failureCount}/${files.length} 个文件`);
    console.log(`📈 总导入记录: ${formatNumber(totalImported)} 条`);
    console.log(`🗄️ 最终记录数: ${formatNumber(finalStats.total)} 条`);
    console.log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    
    // 显示详细成功率统计
    const finalEstimatedRecords = results.reduce((sum, r) => sum + (r.estimatedRecords || 0), 0);
    const finalActualRecords = results.reduce((sum, r) => sum + (r.actualRecords || 0), 0);
    console.log(`📊 预估记录数: ${formatNumber(finalEstimatedRecords)} 条`);
    console.log(`📊 实际记录数: ${formatNumber(finalActualRecords)} 条`);
    if (finalActualRecords > 0) {
      console.log(`📊 导入成功率: ${((totalImported / finalActualRecords) * 100).toFixed(2)}%`);
    }
    console.log('\n🎉 9.2下数据汇总表导入完成！');

  } catch (error) {
    console.error('\n❌ 导入过程发生错误:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);