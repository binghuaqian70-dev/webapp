#!/usr/bin/env node
/**
 * 生产环境导入脚本 - 9.2汇总表批量导入
 * 导入所有9.2汇总表开头的CSV文件到生产环境
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 优化配置 - 针对生产环境
const BATCH_SIZE = 3;           // 每批处理3个文件，减少服务器负载
const DELAY_BETWEEN_FILES = 3000; // 文件间延迟3秒
const DELAY_BETWEEN_BATCHES = 15000; // 批次间延迟15秒
const MAX_RETRIES = 5;          // 增加重试次数
const CHECK_BATCH_SIZE = 20;    // 重复检查批次大小

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
    const token = data.data?.token;
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

// 检查商品是否已存在（基于商品名称+公司名称）
async function checkExistingProducts(productList, token) {
  const existingProducts = new Set();
  
  try {
    // 分批检查，避免URL过长
    for (let i = 0; i < productList.length; i += CHECK_BATCH_SIZE) {
      const batch = productList.slice(i, i + CHECK_BATCH_SIZE);
      
      for (const product of batch) {
        const searchQuery = encodeURIComponent(product.name.trim());
        const response = await fetch(
          `${PRODUCTION_URL}/api/products/search?q=${searchQuery}&company=${encodeURIComponent(product.company)}`, 
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (response.ok) {
          const searchResult = await response.json();
          const products = searchResult.products || searchResult.data || [];
          
          // 检查是否存在完全匹配的商品名称和公司
          const exists = products.some(existing => 
            existing.name?.trim() === product.name.trim() && 
            existing.company_name?.trim() === product.company.trim()
          );
          
          if (exists) {
            const key = `${product.name.trim()}|${product.company.trim()}`;
            existingProducts.add(key);
          }
        }
        
        // 小延迟避免请求过于频繁
        await delay(150);
      }
    }
  } catch (error) {
    console.warn(`      ⚠️ 重复检查出错: ${error.message}`);
  }

  return existingProducts;
}

// 解析CSV行数据
function parseCsvLine(line, headers) {
  const values = line.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
  const product = {};
  
  headers.forEach((header, index) => {
    if (values[index] !== undefined) {
      product[header] = values[index];
    }
  });
  
  return product;
}

// 从CSV内容提取商品信息用于重复检查
function extractProductsFromCsv(csvContent, company) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const dataLines = lines.slice(1);
  
  // 寻找商品名称字段（支持中英文）
  const nameField = headers.find(h => 
    h.includes('名称') || h.includes('品名') || h.includes('产品') || 
    h.toLowerCase().includes('name') || h.toLowerCase().includes('product')
  ) || headers[0];
  
  const products = [];
  for (const line of dataLines) {
    try {
      const product = parseCsvLine(line, headers);
      const productName = product[nameField];
      if (productName && productName.trim()) {
        products.push({
          name: productName.trim(),
          company: company.trim()
        });
      }
    } catch (error) {
      // 忽略解析错误的行
    }
  }
  
  return products;
}

// 过滤CSV内容，移除重复商品
function filterCsvContent(csvContent, existingProducts, company) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { content: csvContent, filtered: 0, total: 0 };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const dataLines = lines.slice(1);
  
  const nameField = headers.find(h => 
    h.includes('名称') || h.includes('品名') || h.includes('产品') || 
    h.toLowerCase().includes('name') || h.toLowerCase().includes('product')
  ) || headers[0];
  
  const filteredLines = [lines[0]]; // 保留表头
  let filteredCount = 0;
  
  for (const line of dataLines) {
    try {
      const product = parseCsvLine(line, headers);
      const productName = product[nameField];
      
      if (productName && productName.trim()) {
        const key = `${productName.trim()}|${company.trim()}`;
        if (!existingProducts.has(key)) {
          filteredLines.push(line);
        } else {
          filteredCount++;
        }
      } else {
        filteredLines.push(line); // 保留无名称的行
      }
    } catch (error) {
      filteredLines.push(line); // 保留解析错误的行
    }
  }
  
  return {
    content: filteredLines.join('\n'),
    filtered: filteredCount,
    total: dataLines.length
  };
}

async function importCsvFile(fileInfo, token, fileIndex, totalFiles, retryCount = 0) {
  try {
    console.log(`\n📁 [${fileIndex}/${totalFiles}] ${fileInfo.filename}`);
    console.log(`   公司: ${fileInfo.company}`);
    console.log(`   文件大小: ${formatFileSize(fileInfo.size)}`);

    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    console.log(`   导入前记录数: ${formatNumber(statsBefore.total)}`);

    // 读取CSV内容
    const csvContent = fs.readFileSync(fileInfo.path, 'utf8');
    
    // 提取商品信息用于重复检查
    console.log(`   🔍 检查重复商品...`);
    const products = extractProductsFromCsv(csvContent, fileInfo.company);
    
    if (products.length === 0) {
      console.log(`   ⚠️ 未找到有效商品数据，跳过文件`);
      return {
        success: true,
        filename: fileInfo.filename,
        company: fileInfo.company,
        size: fileInfo.size,
        skipped: true,
        reason: '无有效商品数据'
      };
    }
    
    const existingProducts = await checkExistingProducts(products, token);
    console.log(`   📊 发现重复商品: ${existingProducts.size}/${products.length}`);
    
    // 过滤CSV内容，移除重复商品
    const filterResult = filterCsvContent(csvContent, existingProducts, fileInfo.company);
    
    if (filterResult.filtered > 0) {
      console.log(`   🚫 已过滤重复商品: ${filterResult.filtered}/${filterResult.total}`);
    }
    
    // 如果所有商品都是重复的，跳过文件
    const filteredLines = filterResult.content.split('\n').filter(line => line.trim());
    if (filteredLines.length <= 1) {
      console.log(`   ⏭️ 所有商品都已存在，跳过文件`);
      return {
        success: true,
        filename: fileInfo.filename,
        company: fileInfo.company,
        size: fileInfo.size,
        skipped: true,
        reason: '所有商品都已存在',
        duplicateCount: filterResult.filtered,
        totalCount: filterResult.total
      };
    }

    // 通过API导入CSV数据
    console.log(`   📤 开始导入 ${filteredLines.length - 1} 条有效记录...`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: filterResult.content,
        filename: fileInfo.filename
      })
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && retryCount < MAX_RETRIES) {
        console.log(`   ⚠️ 导入失败 (${response.status})，${10 * (retryCount + 1)}秒后重试...`);
        await delay(10000 * (retryCount + 1));
        return await importCsvFile(fileInfo, token, fileIndex, totalFiles, retryCount + 1);
      }
      
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`   ✅ 导入完成 (${duration.toFixed(2)}s)`);

    // 获取导入后状态
    await delay(3000); // 等待数据同步
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;

    console.log(`   📊 导入结果:`);
    console.log(`      🚫 过滤重复: ${filterResult.filtered} 条`);
    console.log(`      📈 新增记录: ${formatNumber(totalImported)} 条`);
    console.log(`      🗄️ 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    return {
      success: true,
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      imported: totalImported,
      duplicateCount: filterResult.filtered,
      totalCount: filterResult.total,
      totalBefore: statsBefore.total,
      totalAfter: statsAfter.total,
      duration
    };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`   ⚠️ 文件导入失败，${5 * (retryCount + 1)}秒后重试: ${error.message}`);
      await delay(5000 * (retryCount + 1));
      return await importCsvFile(fileInfo, token, fileIndex, totalFiles, retryCount + 1);
    }
    
    console.error(`   ❌ 文件处理最终失败: ${error.message}`);
    return {
      success: false,
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      error: error.message
    };
  }
}

function get92Files() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    const csvFiles = files.filter(file => file.startsWith('9.2汇总表') && file.endsWith('.csv'));
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
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
      
      // 根据part编号确定公司
      let company = '未知公司';
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
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        company,
        partNumber: match ? parseInt(match[1]) : 0
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 生产环境批量导入 - 9.2汇总表系列');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  console.log(`📍 生产环境: ${PRODUCTION_URL}`);
  console.log(`⚙️ 配置: 每批${BATCH_SIZE}个文件, 自动跳过重复商品, 增强重试机制`);

  const startTime = Date.now();

  try {
    // 登录
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`📊 初始记录数: ${formatNumber(initialStats.total)}\n`);

    // 获取9.2汇总表文件列表
    console.log('📂 扫描9.2汇总表CSV文件...');
    const files = get92Files();
    console.log(`📋 找到 ${files.length} 个文件\n`);

    if (files.length === 0) {
      console.log('⚠️ 未找到9.2汇总表CSV文件');
      return;
    }

    // 显示文件列表
    console.log('📝 将要导入的文件列表:');
    files.slice(0, 10).forEach((file, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${file.filename} (${file.company}) - part_${file.partNumber.toString().padStart(3, '0')}`);
    });
    if (files.length > 10) {
      console.log(`   ... 还有 ${files.length - 10} 个文件`);
    }
    console.log('');

    const results = [];
    let totalSkipped = 0;
    let totalDuplicates = 0;
    
    // 分批处理文件
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📦 批次 ${batchNum}/${totalBatches} (${batch.length} 个文件)`);
      console.log(`${'='.repeat(70)}`);

      // 处理当前批次的文件
      for (let i = 0; i < batch.length; i++) {
        const fileInfo = batch[i];
        const globalIndex = batchStart + i + 1;
        
        const result = await importCsvFile(fileInfo, token, globalIndex, files.length);
        results.push(result);
        
        if (result.skipped) {
          totalSkipped++;
        }
        if (result.duplicateCount) {
          totalDuplicates += result.duplicateCount;
        }

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
    
    const successCount = results.filter(r => r.success && !r.skipped).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalImported = finalStats.total - initialStats.total;

    console.log('\n' + '='.repeat(80));
    console.log('📊 9.2汇总表批量导入完成总结');
    console.log('='.repeat(80));
    console.log(`📊 目标文件: 9.2汇总表系列 (part_001 - part_100)`);
    console.log(`📁 找到文件: ${files.length} 个`);
    console.log(`✅ 成功导入: ${successCount}/${files.length} 个文件`);
    console.log(`⏭️ 跳过文件: ${totalSkipped}/${files.length} 个文件（重复/无效）`);
    console.log(`❌ 失败文件: ${failureCount}/${files.length} 个文件`);
    console.log(`🚫 跳过重复商品: ${formatNumber(totalDuplicates)} 条`);
    console.log(`📈 实际导入记录: ${formatNumber(totalImported)} 条`);
    console.log(`🗄️ 最终记录数: ${formatNumber(finalStats.total)} 条`);
    console.log(`⏱️ 总耗时: ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`);
    console.log('\n🎉 9.2汇总表批量导入完成！');

  } catch (error) {
    console.error('\n❌ 导入过程发生错误:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);