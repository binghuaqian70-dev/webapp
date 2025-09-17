#!/usr/bin/env node
/**
 * 9.16数据汇总表单文件导入工具
 * 用于导入单个CSV文件，支持调试和错误排查
 * 适用于part001到part300的任意单个文件
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 参数解析
const args = process.argv.slice(2);
const targetFile = args[0];

if (!targetFile) {
  console.log('🔧 9.16数据汇总表单文件导入工具');
  console.log('=====================================');
  console.log('');
  console.log('用法: node import_single_9_16_file.mjs <文件名或part编号>');
  console.log('');
  console.log('示例:');
  console.log('  node import_single_9_16_file.mjs part001');
  console.log('  node import_single_9_16_file.mjs part050');
  console.log('  node import_single_9_16_file.mjs part300');
  console.log('  node import_single_9_16_file.mjs 9.16数据汇总表-part123.csv');
  console.log('');
  console.log('支持的文件范围: part001 到 part300');
  process.exit(1);
}

function formatNumber(num) {
  return num.toLocaleString('zh-CN');
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 登录函数
async function login() {
  try {
    console.log('🔐 登录生产环境...');
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

// 获取数据库状态
async function getDbStats(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
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

// 分割CSV内容 - 9.16版本优化
function splitCsvContent(csvContent, targetChunkSize = 120) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  const totalLines = dataLines.length;
  let chunkSize = targetChunkSize;
  
  // 根据文件大小调整块大小 - 针对9.16数据优化
  if (totalLines > 3000) {
    chunkSize = 100;
  } else if (totalLines > 1500) {
    chunkSize = 120;
  } else if (totalLines > 800) {
    chunkSize = 150;
  } else {
    chunkSize = 250;
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

// 导入CSV块
async function importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount = 0) {
  try {
    console.log(`   📦 处理块 ${chunkIndex + 1}/${totalChunks} (行${chunk.startLine}-${chunk.endLine}, ${chunk.actualLines}条记录)`);

    const response = await fetch(`${PRODUCTION_URL}/api/products/batch-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'Authorization': `Bearer ${token}`
      },
      body: chunk.content
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`   ✅ 块导入成功: ${result.imported || chunk.actualLines} 条记录`);
    
    return {
      success: true,
      chunkIndex,
      imported: result.imported || chunk.actualLines
    };

  } catch (error) {
    console.error(`   ❌ 块导入失败: ${error.message}`);
    
    if (retryCount < 2) {
      console.log(`   🔄 重试 ${retryCount + 1}/2...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return importCsvChunk(filename, chunk, chunkIndex, totalChunks, token, retryCount + 1);
    }
    
    return {
      success: false,
      chunkIndex,
      error: error.message
    };
  }
}

// 导入单个文件
async function importSingleFile(filePath, token) {
  try {
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    
    console.log(`📁 文件信息:`);
    console.log(`   文件名: ${filename}`);
    console.log(`   大小: ${formatFileSize(stats.size)}`);
    console.log(`   路径: ${filePath}`);
    
    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    console.log(`   数据库导入前记录数: ${formatNumber(statsBefore.total)}`);
    
    // 读取CSV内容
    console.log('\n📖 读取文件内容...');
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    console.log(`   实际记录数: ${formatNumber(actualRecords)} 条`);
    
    // 分割内容
    const chunks = splitCsvContent(csvContent);
    console.log(`   分块策略: ${chunks.length} 个数据块`);
    
    let totalImported = 0;
    let successChunks = 0;
    let failedChunks = 0;
    
    console.log('\n🔄 开始导入数据...');
    
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
        totalImported += chunkResult.imported || 0;
      } else {
        failedChunks++;
      }
      
      // 分块间延迟
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 获取导入后状态
    console.log('\n⏳ 等待数据同步...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const statsAfter = await getDbStats(token);
    const actualImported = statsAfter.total - statsBefore.total;
    
    // 显示结果
    console.log('\n' + '='.repeat(50));
    console.log('📊 导入结果汇总:');
    console.log('='.repeat(50));
    console.log(`✅ 成功分块: ${successChunks}/${chunks.length}`);
    console.log(`❌ 失败分块: ${failedChunks}/${chunks.length}`);
    console.log(`📈 数据库增长: ${formatNumber(actualImported)} 条记录`);
    console.log(`🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);
    console.log(`📋 文件记录数: ${formatNumber(actualRecords)} 条`);
    
    if (actualImported > 0) {
      const successRate = (actualImported / actualRecords * 100).toFixed(2);
      console.log(`📈 导入成功率: ${successRate}%`);
    }
    
    const status = failedChunks === 0 ? '✅ 完全成功' : `⚠️ 部分成功 (${failedChunks}个块失败)`;
    console.log(`🎯 总体状态: ${status}`);
    
    return {
      success: failedChunks === 0,
      filename,
      actualRecords,
      totalChunks: chunks.length,
      successChunks,
      failedChunks,
      databaseIncrease: actualImported,
      totalBefore: statsBefore.total,
      totalAfter: statsAfter.total
    };
    
  } catch (error) {
    console.error(`❌ 文件导入失败: ${error.message}`);
    return {
      success: false,
      filename: path.basename(filePath),
      error: error.message
    };
  }
}

// 查找目标文件
function findTargetFile(target) {
  try {
    // 检查AI Drive是否存在
    if (!fs.existsSync(AI_DRIVE_PATH)) {
      throw new Error(`AI Drive路径不存在: ${AI_DRIVE_PATH}`);
    }
    
    const files = fs.readdirSync(AI_DRIVE_PATH);
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && file.includes('9.16数据汇总表')
    );
    
    console.log(`🔍 AI Drive中找到 ${csvFiles.length} 个9.16数据汇总表文件`);
    
    // 如果目标是完整文件名
    if (target.endsWith('.csv')) {
      const found = csvFiles.find(file => file === target);
      if (found) {
        return path.join(AI_DRIVE_PATH, found);
      }
    } else {
      // 如果目标是part编号 (如 part001, part050, part300)
      const partMatch = target.match(/part(\d{1,3})/i);
      if (partMatch) {
        const partNum = parseInt(partMatch[1]);
        const partStr = partNum.toString().padStart(3, '0');
        const expectedFile = `9.16数据汇总表-part${partStr}.csv`;
        const found = csvFiles.find(file => file === expectedFile);
        if (found) {
          return path.join(AI_DRIVE_PATH, found);
        }
      }
    }
    
    // 显示可用文件范围 (大规模文件不全部显示)
    console.log('\n📋 9.16数据汇总表文件信息:');
    console.log(`   总文件数: ${csvFiles.length}`);
    
    if (csvFiles.length > 0) {
      // 显示前5个和后5个文件作为示例
      const sortedFiles = csvFiles.sort((a, b) => {
        const partA = a.match(/part(\d{3})/);
        const partB = b.match(/part(\d{3})/);
        if (partA && partB) {
          return parseInt(partA[1]) - parseInt(partB[1]);
        }
        return a.localeCompare(b);
      });
      
      console.log('   文件范围示例:');
      console.log('   前5个文件:');
      sortedFiles.slice(0, 5).forEach((file, index) => {
        const partMatch = file.match(/part(\d{3})/);
        const partNum = partMatch ? partMatch[1] : '???';
        console.log(`     ${index + 1}. part${partNum}: ${file}`);
      });
      
      if (sortedFiles.length > 10) {
        console.log('   ...');
        console.log('   后5个文件:');
        sortedFiles.slice(-5).forEach((file, index) => {
          const partMatch = file.match(/part(\d{3})/);
          const partNum = partMatch ? partMatch[1] : '???';
          console.log(`     ${sortedFiles.length - 4 + index}. part${partNum}: ${file}`);
        });
      }
    }
    
    throw new Error(`未找到目标文件: ${target}`);
    
  } catch (error) {
    throw new Error(`文件查找失败: ${error.message}`);
  }
}

// 主函数
async function main() {
  console.log('🔧 9.16数据汇总表单文件导入工具 (大规模版本)');
  console.log('=================================================');
  console.log(`🎯 目标文件: ${targetFile}`);
  console.log(`🕐 开始时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log();
  
  try {
    // 查找目标文件
    console.log('📂 查找目标文件...');
    const filePath = findTargetFile(targetFile);
    console.log(`✅ 找到目标文件: ${path.basename(filePath)}`);
    console.log();
    
    // 登录
    const token = await login();
    console.log();
    
    // 导入文件
    const result = await importSingleFile(filePath, token);
    
    console.log();
    if (result.success) {
      console.log('🎉 单文件导入成功完成！');
    } else {
      console.log('⚠️ 单文件导入完成，但存在问题');
      if (result.error) {
        console.log(`❌ 错误: ${result.error}`);
      }
    }
    
    console.log(`🕐 完成时间: ${new Date().toLocaleString('zh-CN')}`);
    
  } catch (error) {
    console.error();
    console.error('❌ 导入过程失败:', error.message);
    console.error(`🕐 失败时间: ${new Date().toLocaleString('zh-CN')}`);
    process.exit(1);
  }
}

main().catch(console.error);