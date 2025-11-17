#!/usr/bin/env node
import fs from 'fs';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const FILE_PATH = '/mnt/aidrive/11.17数据汇总表-part03.csv';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  console.log('🔐 正在登录...');
  const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  
  const data = await response.json();
  const token = data.token || data.data?.token;
  console.log('✅ 登录成功');
  return token;
}

async function importChunk(chunk, chunkIndex, totalChunks, token) {
  const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      csvData: chunk.content,
      filename: `11.17数据汇总表-part03_chunk_${chunkIndex + 1}`
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('🚀 开始导入 11.17数据汇总表-part03.csv');
  
  // 读取文件
  const content = fs.readFileSync(FILE_PATH, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  console.log(`📊 总数据行数: ${dataLines.length}`);
  
  // 分块
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunk = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
    chunks.push({
      content: chunk,
      startLine: i + 1,
      endLine: Math.min(i + chunkSize, dataLines.length)
    });
  }
  
  console.log(`📦 分为 ${chunks.length} 个块`);
  
  // 登录
  const token = await login();
  
  // 导入
  let success = 0;
  for (let i = 0; i < chunks.length; i++) {
    console.log(`📦 处理块 ${i + 1}/${chunks.length}...`);
    try {
      await importChunk(chunks[i], i, chunks.length, token);
      success++;
      console.log(`✅ 块 ${i + 1} 成功`);
    } catch (error) {
      console.log(`❌ 块 ${i + 1} 失败: ${error.message}`);
    }
    
    if (i < chunks.length - 1) {
      await delay(600);
    }
  }
  
  console.log(`\n🎉 导入完成！成功: ${success}/${chunks.length}`);
}

main().catch(console.error);
