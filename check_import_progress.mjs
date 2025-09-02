#!/usr/bin/env node
/**
 * 检查导入进度
 */

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function login() {
  const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  
  const data = await response.json();
  return data.data?.token;
}

async function getStats(token) {
  const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.pagination?.total || 0;
}

async function main() {
  try {
    const token = await login();
    const currentTotal = await getStats(token);
    
    console.log('📊 当前导入进度检查');
    console.log('='.repeat(40));
    console.log(`🗄️ 当前数据库总记录数: ${currentTotal.toLocaleString()}`);
    console.log(`📅 检查时间: ${new Date().toLocaleString('zh-CN')}`);
    
    // 计算预期导入数量
    const expectedFromBatch = 4315; // 10个文件总共4315条记录
    const initialCount = 120322; // 初始记录数
    const expectedFinal = initialCount + expectedFromBatch;
    
    console.log(`📊 预期最终记录数: ${expectedFinal.toLocaleString()}`);
    console.log(`📈 已导入: ${(currentTotal - initialCount).toLocaleString()} 条`);
    console.log(`📊 进度: ${Math.round((currentTotal - initialCount) / expectedFromBatch * 100)}%`);
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

main();