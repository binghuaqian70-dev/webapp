#!/usr/bin/env node
/**
 * 8.11 Part1 补充导入脚本
 * 单独导入第1个文件（因AI Drive延迟导致首次失败）
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';
const TARGET_FILE = '8.11数据汇总表-utf8_part_1.csv';
const LOG_FILE = './part1_8_11_import.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {}
}

async function login() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    const token = data.token || (data.data && data.data.token);
    
    if (!token) {
      throw new Error('登录成功但未获取到token');
    }

    log('✅ 登录成功');
    return token;
  } catch (error) {
    log(`❌ 登录失败: ${error.message}`);
    throw error;
  }
}

async function importFile(token) {
  try {
    const filePath = path.join(AI_DRIVE_PATH, TARGET_FILE);
    
    log(`📁 正在读取文件: ${TARGET_FILE}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const csvData = fs.readFileSync(filePath, 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    log(`📊 文件包含 ${lines.length - 1} 条记录`);

    log(`🚀 开始导入...`);
    
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: csvData,
        filename: TARGET_FILE
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`导入失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    log(`✅ 导入成功！`);
    log(`📈 导入结果: ${JSON.stringify(result)}`);
    
    return result;
  } catch (error) {
    log(`❌ 导入失败: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('🚀 开始 8.11 Part1 补充导入');
  log(`📂 目标文件: ${TARGET_FILE}`);
  log(`🌐 生产环境: ${PRODUCTION_URL}`);
  
  try {
    const token = await login();
    const result = await importFile(token);
    
    log('');
    log('🎉 Part1 补充导入完成！');
    log(`✅ 成功导入 ${TARGET_FILE}`);
    log(`📋 详细日志: ${LOG_FILE}`);
  } catch (error) {
    log('');
    log('❌ Part1 补充导入失败');
    log(`💡 请检查: ${LOG_FILE}`);
    process.exit(1);
  }
}

main().catch(console.error);
