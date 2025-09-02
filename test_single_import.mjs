#!/usr/bin/env node
/**
 * 单文件导入测试 - 测试9.2下数据汇总表中的一个文件
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 测试文件
const TEST_FILE = '9.2下数据汇总表-utf8_part_01.csv';

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

async function importCsvFile(filePath, token) {
  try {
    console.log(`📁 导入文件: ${TEST_FILE}`);
    
    // 读取文件内容
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去头部行
    
    console.log(`📊 实际记录数: ${actualRecords} 条`);
    console.log(`📄 文件内容预览:`);
    console.log(lines.slice(0, 3).join('\n'));
    
    // 获取导入前状态
    const statsBefore = await getDbStats(token);
    console.log(`📊 导入前记录数: ${statsBefore.total}`);

    const startTime = Date.now();
    
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: csvContent,
        filename: TEST_FILE
      })
    });

    const duration = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`⏱️ 导入耗时: ${duration.toFixed(2)}s`);
    console.log(`📊 API响应:`, result);
    
    // 获取导入后状态
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
    const statsAfter = await getDbStats(token);
    const totalImported = statsAfter.total - statsBefore.total;
    
    console.log(`📊 导入后记录数: ${statsAfter.total}`);
    console.log(`📈 新增记录: ${totalImported} 条`);
    
    return {
      success: true,
      actualRecords,
      imported: totalImported,
      duration,
      result
    };

  } catch (error) {
    console.error(`❌ 导入失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 单文件导入测试 - 9.2下数据汇总表');
  console.log(`📁 测试文件: ${TEST_FILE}`);
  console.log(`📍 生产环境: ${PRODUCTION_URL}\n`);

  try {
    // 检查文件是否存在
    const filePath = path.join(AI_DRIVE_PATH, TEST_FILE);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`);
      return;
    }
    
    // 登录
    const token = await login();
    
    // 导入文件
    const result = await importCsvFile(filePath, token);
    
    console.log('\n📊 测试结果:');
    console.log('='.repeat(50));
    if (result.success) {
      console.log('✅ 导入成功');
      console.log(`📊 文件记录数: ${result.actualRecords} 条`);
      console.log(`📈 实际导入: ${result.imported} 条`);
      console.log(`⏱️ 导入耗时: ${result.duration}s`);
      console.log(`📊 成功率: ${((result.imported / result.actualRecords) * 100).toFixed(2)}%`);
    } else {
      console.log('❌ 导入失败');
      console.log(`❌ 错误信息: ${result.error}`);
    }
    
    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程发生错误:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);