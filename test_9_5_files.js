#!/usr/bin/env node
/**
 * 测试脚本：验证9.5数据汇总表文件识别
 * 支持60个文件的大规模检测
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    console.log(`🔍 扫描AI Drive，总共找到 ${files.length} 个文件`);
    
    // 只处理9.5数据汇总表文件，格式: 9.5数据汇总表-utf8_part_XX.csv
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.5数据汇总表')) {
        return false;
      }
      
      // 提取 part 编号，支持01-60格式
      const partMatch = file.match(/part_(\d{2})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= 1 && partNum <= 60;
    });
    
    console.log(`📋 找到 ${csvFiles.length} 个9.5数据汇总表文件`);
    
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
  console.log('🚀 9.5数据汇总表文件检测测试 - 大规模60文件检测');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}`);
  console.log(`🎯 目标: 检测part_01到part_60 (共60个文件)`);
  
  const files = getAiDriveFiles();
  
  if (files.length === 0) {
    console.log('⚠️ 未找到9.5数据汇总表CSV文件');
    console.log('💡 请确认AI Drive中包含 9.5数据汇总表-utf8_part_XX.csv 格式的文件');
    return;
  }
  
  console.log(`\n📋 检测到的文件概览:`);
  
  // 显示前10个和后10个文件，中间的用...表示
  if (files.length <= 20) {
    // 文件数少，全部显示
    files.forEach((file, index) => {
      console.log(`  ${file.partNumber}. ${file.filename}`);
      console.log(`     📊 记录数: ${file.actualRecords.toLocaleString()} 条`);
      console.log(`     📁 文件大小: ${(file.size/1024).toFixed(1)}KB`);
    });
  } else {
    // 文件数多，显示前10个和后10个
    console.log('前10个文件:');
    files.slice(0, 10).forEach((file) => {
      console.log(`  ${file.partNumber}. ${file.filename} | ${file.actualRecords.toLocaleString()}条 | ${(file.size/1024).toFixed(1)}KB`);
    });
    
    console.log(`  ... 省略中间 ${files.length - 20} 个文件 ...`);
    
    console.log('后10个文件:');
    files.slice(-10).forEach((file) => {
      console.log(`  ${file.partNumber}. ${file.filename} | ${file.actualRecords.toLocaleString()}条 | ${(file.size/1024).toFixed(1)}KB`);
    });
  }
  
  // 检查完整性 - 查找缺失的文件
  const missingFiles = [];
  for (let i = 1; i <= 60; i++) {
    const partStr = i.toString().padStart(2, '0');
    const found = files.find(f => f.partNumber === partStr);
    if (!found) {
      missingFiles.push(partStr);
    }
  }
  
  console.log(`\n📊 完整性统计:`);
  console.log(`✅ 找到文件: ${files.length}/60 个`);
  console.log(`❌ 缺失文件: ${missingFiles.length}/60 个`);
  
  if (missingFiles.length > 0) {
    console.log(`缺失的part编号 (前20个): ${missingFiles.slice(0, 20).join(', ')}${missingFiles.length > 20 ? '...' : ''}`);
  }
  
  // 计算文件统计信息
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalRecords = files.reduce((sum, f) => sum + f.actualRecords, 0);
  const avgSize = files.length > 0 ? totalSize / files.length : 0;
  const avgRecords = files.length > 0 ? totalRecords / files.length : 0;
  
  console.log(`\n📊 数据统计:`);
  console.log(`📁 总文件大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📊 总记录数: ${totalRecords.toLocaleString()} 条`);
  console.log(`📊 平均文件大小: ${(avgSize / 1024).toFixed(2)} KB`);
  console.log(`📊 平均记录数/文件: ${Math.round(avgRecords).toLocaleString()} 条`);
  
  // 预估导入时间 (基于经验数据)
  const estimatedMinutes = Math.ceil((files.length * 2 + Math.ceil(files.length / 3) * 15) / 60);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;
  console.log(`⏱️ 预估导入时间: ${estimatedHours}小时${remainingMinutes}分钟`);
  
  // 最终状态判断
  if (files.length === 60) {
    console.log('\n🎉 所有60个9.5数据汇总表文件都找到了！可以开始大规模导入。');
    console.log('💡 建议使用后台运行模式执行导入任务');
    console.log('📋 运行命令: nohup node optimized_batch_import.mjs > import_output.log 2>&1 &');
  } else if (files.length >= 50) {
    console.log(`\n✅ 找到了 ${files.length} 个文件，基本完整，可以开始导入。`);
    console.log('⚠️ 注意：部分文件缺失，导入时会跳过缺失的文件');
  } else {
    console.log(`\n⚠️ 只找到 ${files.length} 个文件，文件不完整。`);
    console.log('💡 建议检查AI Drive中的文件状态');
  }
  
  // 显示第一个文件的数据样例
  if (files.length > 0) {
    console.log('\n📋 数据样例 (第1个文件前5行):');
    try {
      const sampleContent = fs.readFileSync(files[0].path, 'utf8');
      const sampleLines = sampleContent.split('\n').slice(0, 5);
      sampleLines.forEach((line, index) => {
        if (line.trim()) {
          const displayLine = line.length > 100 ? line.substring(0, 100) + '...' : line;
          console.log(`  ${index + 1}. ${displayLine.replace(/\r/g, '')}`);
        }
      });
    } catch (error) {
      console.log('  无法读取样例数据');
    }
  }
}

main();