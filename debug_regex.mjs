#!/usr/bin/env node

import fs from 'fs';

const AI_DRIVE_PATH = '/mnt/aidrive';
const START_PART = 44;
const END_PART = 100;

console.log('🔍 调试正则表达式匹配');

try {
  const files = fs.readdirSync(AI_DRIVE_PATH);
  const targetFiles = files.filter(file => file.includes('9.2汇总表'));
  
  console.log(`总共找到 ${targetFiles.length} 个9.2汇总表文件`);
  
  // 测试part_044到part_050
  const testFiles = targetFiles.filter(file => {
    const match = file.match(/part_(\d+)/);
    if (match) {
      const partNum = parseInt(match[1]);
      console.log(`文件: ${file}, part编号: ${partNum}`);
      return partNum >= 44 && partNum <= 50;
    }
    return false;
  });
  
  console.log(`\n在44-50范围内找到 ${testFiles.length} 个文件:`);
  testFiles.forEach(file => console.log(`  - ${file}`));
  
} catch (error) {
  console.error('错误:', error.message);
}