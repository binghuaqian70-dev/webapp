#!/usr/bin/env node
/**
 * 测试脚本：验证9.3数据汇总表文件识别
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    // 只处理9.3数据汇总表文件，格式: 9.3数据汇总表-utf8_part_XXX.csv
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.3数据汇总表')) {
        return false;
      }
      
      // 提取 part 编号，支持001-100格式
      const partMatch = file.match(/part_(\d{3})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= 1 && partNum <= 100;
    });
    
    console.log(`找到 ${csvFiles.length} 个9.3数据汇总表文件`);
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part_(\d{3})/);
      const partB = b.match(/part_(\d{3})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.localeCompare(b);
    });
    
    return csvFiles.map(filename => {
      const filePath = path.join(AI_DRIVE_PATH, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        partNumber: filename.match(/part_(\d{3})/)?.[1] || '000'
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

function main() {
  console.log('🚀 9.3数据汇总表文件检测测试');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  
  const files = getAiDriveFiles();
  
  if (files.length === 0) {
    console.log('⚠️ 未找到9.3数据汇总表CSV文件');
    return;
  }
  
  console.log(`\n📋 找到的文件 (${files.length} 个):`);
  
  // 显示前10个和后10个文件
  const showFiles = files.length > 20 ? 
    [...files.slice(0, 10), ...files.slice(-10)] : 
    files;
    
  showFiles.forEach((file, index) => {
    const isMiddle = files.length > 20 && index === 10;
    if (isMiddle) {
      console.log('  ... (省略中间文件)');
    }
    
    console.log(`  ${file.partNumber}. ${file.filename} (${Math.round(file.size/1024)}KB)`);
  });
  
  // 检查是否有缺失的文件
  const missingFiles = [];
  for (let i = 1; i <= 100; i++) {
    const partStr = i.toString().padStart(3, '0');
    const found = files.find(f => f.partNumber === partStr);
    if (!found) {
      missingFiles.push(partStr);
    }
  }
  
  console.log(`\n📊 统计:`);
  console.log(`✅ 找到文件: ${files.length}/100`);
  console.log(`❌ 缺失文件: ${missingFiles.length}/100`);
  
  if (missingFiles.length > 0) {
    console.log(`缺失的part编号: ${missingFiles.slice(0, 10).join(', ')}${missingFiles.length > 10 ? '...' : ''}`);
  }
  
  // 计算文件总大小
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`📁 总文件大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 平均文件大小: ${(totalSize / files.length / 1024).toFixed(2)} KB`);
  
  if (files.length === 100) {
    console.log('\n🎉 所有100个9.3数据汇总表文件都找到了！可以开始导入。');
  } else {
    console.log('\n⚠️ 文件不完整，导入时请注意。');
  }
}

main();