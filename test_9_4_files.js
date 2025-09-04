#!/usr/bin/env node
/**
 * 测试脚本：验证9.4数据汇总表文件识别
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    // 只处理9.4数据汇总表文件，格式: 9.4数据汇总表-utf8_part_XX.csv
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.4数据汇总表')) {
        return false;
      }
      
      // 提取 part 编号，支持01-08格式
      const partMatch = file.match(/part_(\d{2})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= 1 && partNum <= 8;
    });
    
    console.log(`找到 ${csvFiles.length} 个9.4数据汇总表文件`);
    
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
      
      // 估算记录数
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const actualRecords = lines.length - 1; // 减去头部行
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        partNumber: filename.match(/part_(\d{2})/)?.[1] || '00',
        actualRecords
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

function main() {
  console.log('🚀 9.4数据汇总表文件检测测试');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  
  const files = getAiDriveFiles();
  
  if (files.length === 0) {
    console.log('⚠️ 未找到9.4数据汇总表CSV文件');
    return;
  }
  
  console.log(`\n📋 找到的文件 (${files.length} 个):`);
  
  files.forEach((file, index) => {
    console.log(`  ${file.partNumber}. ${file.filename}`);
    console.log(`     📊 记录数: ${file.actualRecords} 条`);
    console.log(`     📁 文件大小: ${Math.round(file.size/1024)}KB`);
  });
  
  // 检查是否有缺失的文件
  const missingFiles = [];
  for (let i = 1; i <= 8; i++) {
    const partStr = i.toString().padStart(2, '0');
    const found = files.find(f => f.partNumber === partStr);
    if (!found) {
      missingFiles.push(partStr);
    }
  }
  
  console.log(`\n📊 统计:`);
  console.log(`✅ 找到文件: ${files.length}/8`);
  console.log(`❌ 缺失文件: ${missingFiles.length}/8`);
  
  if (missingFiles.length > 0) {
    console.log(`缺失的part编号: ${missingFiles.join(', ')}`);
  }
  
  // 计算文件总大小和总记录数
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalRecords = files.reduce((sum, f) => sum + f.actualRecords, 0);
  console.log(`📁 总文件大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 总记录数: ${totalRecords.toLocaleString()} 条`);
  console.log(`📊 平均文件大小: ${(totalSize / files.length / 1024).toFixed(2)} KB`);
  console.log(`📊 平均记录数/文件: ${Math.round(totalRecords / files.length)} 条`);
  
  if (files.length === 8) {
    console.log('\n🎉 所有8个9.4数据汇总表文件都找到了！可以开始导入。');
  } else {
    console.log('\n⚠️ 文件不完整，导入时请注意。');
  }
  
  // 显示第一个文件的数据样例
  if (files.length > 0) {
    console.log('\n📋 数据样例 (第1个文件前5行):');
    try {
      const sampleContent = fs.readFileSync(files[0].path, 'utf8');
      const sampleLines = sampleContent.split('\n').slice(0, 5);
      sampleLines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`  ${index + 1}. ${line.replace(/\r/g, '')}`);
        }
      });
    } catch (error) {
      console.log('  无法读取样例数据');
    }
  }
}

main();