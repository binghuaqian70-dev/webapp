#!/usr/bin/env node
/**
 * Part15分批次导入脚本 - 确保全部522条记录导入
 * 策略: 将522条记录分成多个小批次，每批100条，避免Workers子请求限制
 */

import fs from 'fs';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '3.28数据汇总表-utf8_part15.csv';

// 批次配置
const BATCH_SIZE = 100; // 每批100条，避免Workers限制
const DELAY_BETWEEN_BATCHES = 3000; // 批次间延迟3秒

// 日志配置
const LOG_FILE = './part15_batch_import.log';
const STATS_FILE = './part15_batch_import_stats.json';

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

async function importBatch(csvData, batchNumber, totalBatches) {
  try {
    log(`📦 开始导入批次 ${batchNumber}/${totalBatches}...`);
    
    const importResponse = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: csvData
      })
    });
    
    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      throw new Error(`批次${batchNumber}导入失败: ${importResponse.status} - ${errorText}`);
    }
    
    const result = await importResponse.json();
    log(`✅ 批次 ${batchNumber}/${totalBatches} 导入完成`);
    log(`   - 总记录: ${result.data?.total || 0}条`);
    log(`   - 成功: ${result.data?.successCount || 0}条`);
    log(`   - 失败: ${result.data?.errorCount || 0}条`);
    
    return {
      success: true,
      total: result.data?.total || 0,
      successCount: result.data?.successCount || 0,
      errorCount: result.data?.errorCount || 0,
      errors: result.data?.errors || []
    };
    
  } catch (error) {
    log(`❌ 批次 ${batchNumber}/${totalBatches} 导入失败: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message,
      total: 0,
      successCount: 0,
      errorCount: 0
    };
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    log('🚀 Part15分批次导入脚本启动');
    log(`📍 目标文件: ${TARGET_FILE}`);
    log(`📍 生产环境: ${PRODUCTION_URL}`);
    log(`⚙️ 批次大小: ${BATCH_SIZE}条/批次`);
    log(`⏱️ 批次间延迟: ${DELAY_BETWEEN_BATCHES}ms`);
    
    const filePath = `${AI_DRIVE_PATH}/${TARGET_FILE}`;
    
    // 验证文件存在
    log('🔍 验证文件存在...');
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    log(`✅ 文件已找到: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // 读取文件内容
    log('📖 读取文件内容...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);
    const totalRecords = dataLines.length;
    
    log(`📊 文件记录数: ${totalRecords}条`);
    
    // 计算批次数
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
    log(`📦 将分成 ${totalBatches} 个批次处理`);
    
    // 登录
    log('🔐 登录生产环境...');
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }
    
    await loginResponse.json();
    log('✅ 登录成功');
    
    // 获取初始数据库记录数
    const initialCountResponse = await fetch(`${PRODUCTION_URL}/api/products/count`);
    const initialCountData = await initialCountResponse.json();
    const initialCount = initialCountData.total;
    log(`📊 数据库初始记录数: ${initialCount.toLocaleString()}`);
    
    // 分批次导入
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('📦 开始分批次导入...');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const batchResults = [];
    let totalImported = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const batchNumber = i + 1;
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, totalRecords);
      const batchLines = dataLines.slice(startIdx, endIdx);
      const batchSize = batchLines.length;
      
      log(`\n📦 批次 ${batchNumber}/${totalBatches}:`);
      log(`   行范围: 第${startIdx + 1}-${endIdx}行`);
      log(`   记录数: ${batchSize}条`);
      
      // 构建批次CSV数据（包含标题）
      const batchCsvData = [header, ...batchLines].join('\n');
      
      // 导入批次
      const result = await importBatch(batchCsvData, batchNumber, totalBatches);
      batchResults.push({
        batchNumber,
        startRow: startIdx + 1,
        endRow: endIdx,
        expectedRecords: batchSize,
        ...result
      });
      
      if (result.success) {
        totalImported += result.successCount;
        totalErrors += result.errorCount;
      }
      
      // 批次间延迟（最后一批不需要延迟）
      if (i < totalBatches - 1) {
        log(`⏳ 等待 ${DELAY_BETWEEN_BATCHES/1000} 秒后继续下一批次...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    // 等待数据库更新
    log('\n⏳ 等待数据库更新...');
    await delay(3000);
    
    // 获取最终数据库记录数
    const finalCountResponse = await fetch(`${PRODUCTION_URL}/api/products/count`);
    const finalCountData = await finalCountResponse.json();
    const finalCount = finalCountData.total;
    const actualImported = finalCount - initialCount;
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(1);
    
    // 保存统计
    const statistics = {
      file: TARGET_FILE,
      totalRecords,
      batchSize: BATCH_SIZE,
      totalBatches,
      totalImported,
      totalErrors,
      actualImported,
      initialDbCount: initialCount,
      finalDbCount: finalCount,
      totalTimeSeconds: parseFloat(totalTime),
      timestamp: new Date().toISOString(),
      batchResults
    };
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(statistics, null, 2));
    
    // 总结报告
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log('🎉 Part15分批次导入完成！');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(`✅ 文件: ${TARGET_FILE}`);
    log(`📊 总记录数: ${totalRecords}条`);
    log(`📦 总批次数: ${totalBatches}批`);
    log(`📈 报告成功数: ${totalImported}条`);
    log(`📈 实际新增数: ${actualImported}条`);
    log(`❌ 报告失败数: ${totalErrors}条`);
    log(`⏱️ 总耗时: ${totalTime}秒`);
    log(`🗄️ 数据库记录数: ${initialCount.toLocaleString()} → ${finalCount.toLocaleString()}`);
    
    const successRate = ((actualImported / totalRecords) * 100).toFixed(2);
    log(`📊 实际成功率: ${successRate}%`);
    
    log('\n📋 各批次详情:');
    batchResults.forEach(batch => {
      const status = batch.success ? '✅' : '❌';
      log(`   ${status} 批次${batch.batchNumber}: 第${batch.startRow}-${batch.endRow}行, ` +
          `成功${batch.successCount}/${batch.expectedRecords}条`);
    });
    
    log('\n📋 详细日志已保存到: ' + LOG_FILE);
    log('📊 统计数据已保存到: ' + STATS_FILE);
    
    if (actualImported === totalRecords) {
      log('\n🎊 Part15全部522条记录导入100%成功！');
    } else if (actualImported > 0) {
      log(`\n⚠️ 部分记录未导入: ${totalRecords - actualImported}条 (${(100 - parseFloat(successRate)).toFixed(2)}%)`);
    } else {
      log('\n❌ 导入失败，未新增任何记录');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ 导入错误: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
  }
}

// 启动
main();
