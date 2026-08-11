#!/usr/bin/env node
/**
 * 单文件导入脚本 - 3.28数据汇总表-utf8_part15.csv
 * 专门用于补充导入part15文件
 */

import fs from 'fs';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '3.28数据汇总表-utf8_part15.csv';

// 日志配置
const LOG_FILE = './part15_import.log';
const STATS_FILE = './part15_import_stats.json';

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

async function main() {
  try {
    log('🚀 Part15单文件导入脚本启动');
    log(`📍 目标文件: ${TARGET_FILE}`);
    log(`📍 生产环境: ${PRODUCTION_URL}`);
    
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
    const actualRecords = lines.length - 1; // 减去标题行
    log(`📊 文件记录数: ${actualRecords}条`);
    
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
    
    const loginData = await loginResponse.json();
    log('✅ 登录成功');
    
    // 获取初始数据库记录数
    const countResponse = await fetch(`${PRODUCTION_URL}/api/products/count`);
    const countData = await countResponse.json();
    const initialCount = countData.total;
    log(`📊 数据库初始记录数: ${initialCount.toLocaleString()}`);
    
    // 准备CSV数据
    log('📦 准备CSV数据...');
    
    // 上传导入
    log('📤 开始上传导入...');
    const importResponse = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: content
      })
    });
    
    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      throw new Error(`导入失败: ${importResponse.status} - ${errorText}`);
    }
    
    const importResult = await importResponse.json();
    log('📊 导入响应:', 'INFO');
    log(JSON.stringify(importResult, null, 2), 'INFO');
    
    // 等待一下再查询
    await delay(2000);
    
    // 获取最终数据库记录数
    const finalCountResponse = await fetch(`${PRODUCTION_URL}/api/products/count`);
    const finalCountData = await finalCountResponse.json();
    const finalCount = finalCountData.total;
    const imported = finalCount - initialCount;
    
    log(`📊 数据库最终记录数: ${finalCount.toLocaleString()}`);
    log(`📈 新增记录数: ${imported}条`);
    
    // 保存统计
    const statistics = {
      file: TARGET_FILE,
      expectedRecords: actualRecords,
      importedRecords: imported,
      initialDbCount: initialCount,
      finalDbCount: finalCount,
      success: imported > 0,
      timestamp: new Date().toISOString(),
      importResult
    };
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(statistics, null, 2));
    
    // 总结
    log('\n================================================================================');
    log('🎉 Part15导入完成！');
    log('================================================================================');
    log(`✅ 文件: ${TARGET_FILE}`);
    log(`📊 预期记录: ${actualRecords}条`);
    log(`📈 实际导入: ${imported}条`);
    log(`📊 成功率: ${((imported / actualRecords) * 100).toFixed(2)}%`);
    log(`🗄️ 数据库记录数: ${initialCount.toLocaleString()} → ${finalCount.toLocaleString()}`);
    log('📋 详细日志已保存到: ' + LOG_FILE);
    log('📊 统计数据已保存到: ' + STATS_FILE);
    
    if (imported === actualRecords) {
      log('🎊 Part15导入100%成功！');
    } else if (imported > 0) {
      log(`⚠️ 部分记录未导入: ${actualRecords - imported}条`);
    } else {
      log('❌ 导入失败，未新增任何记录');
    }
    
  } catch (error) {
    log(`❌ 导入错误: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
  }
}

// 启动
main();
