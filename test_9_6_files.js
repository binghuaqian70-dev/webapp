#!/usr/bin/env node
/**
 * 检测AI Drive中9.6数据汇总表文件的存在和状态
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';
const START_PART = 1;
const END_PART = 60;

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function estimateRecords(fileSize) {
  // 基于9.6数据文件的平均行大小约120字节估算
  return Math.floor(fileSize / 120);
}

async function main() {
  console.log('🔍 检测AI Drive中的9.6数据汇总表文件');
  console.log('='.repeat(80));
  
  try {
    // 检查AI Drive是否存在
    if (!fs.existsSync(AI_DRIVE_PATH)) {
      console.error(`❌ AI Drive路径不存在: ${AI_DRIVE_PATH}`);
      return;
    }
    
    console.log(`📁 AI Drive路径: ${AI_DRIVE_PATH}`);
    
    // 读取AI Drive目录
    const files = fs.readdirSync(AI_DRIVE_PATH);
    console.log(`📋 AI Drive中共有 ${files.length} 个文件`);
    
    // 过滤9.6数据汇总表文件
    const targetFiles = [];
    const foundParts = new Set();
    
    for (const file of files) {
      if (file.includes('9.6数据汇总表') && file.endsWith('.csv')) {
        // 提取part编号
        const partMatch = file.match(/part_(\d{2})/);
        if (partMatch) {
          const partNum = parseInt(partMatch[1]);
          if (partNum >= START_PART && partNum <= END_PART) {
            const filePath = path.join(AI_DRIVE_PATH, file);
            const stats = fs.statSync(filePath);
            
            targetFiles.push({
              filename: file,
              path: filePath,
              size: stats.size,
              partNum: partNum,
              estimatedRecords: estimateRecords(stats.size)
            });
            
            foundParts.add(partNum);
          }
        }
      }
    }
    
    // 按part编号排序
    targetFiles.sort((a, b) => a.partNum - b.partNum);
    
    console.log(`\n📊 9.6数据汇总表文件统计:`);
    console.log(`   期望文件数: ${END_PART} 个 (part_01 到 part_60)`);
    console.log(`   找到文件数: ${targetFiles.length} 个`);
    console.log(`   文件完整性: ${(targetFiles.length / END_PART * 100).toFixed(1)}%`);
    
    if (targetFiles.length > 0) {
      // 计算总体统计
      const totalSize = targetFiles.reduce((sum, f) => sum + f.size, 0);
      const totalEstimatedRecords = targetFiles.reduce((sum, f) => sum + f.estimatedRecords, 0);
      const avgFileSize = totalSize / targetFiles.length;
      
      console.log(`\n📈 文件统计信息:`);
      console.log(`   总文件大小: ${formatFileSize(totalSize)}`);
      console.log(`   平均文件大小: ${formatFileSize(avgFileSize)}`);
      console.log(`   预估总记录数: ${totalEstimatedRecords.toLocaleString()} 条`);
      console.log(`   平均记录数/文件: ${Math.round(totalEstimatedRecords / targetFiles.length)} 条`);
      
      // 显示前10个和后10个文件的详细信息
      console.log(`\n📋 文件详细信息:`);
      
      const displayFiles = [];
      if (targetFiles.length <= 20) {
        displayFiles.push(...targetFiles);
      } else {
        displayFiles.push(...targetFiles.slice(0, 10));
        displayFiles.push({ separator: true });
        displayFiles.push(...targetFiles.slice(-10));
      }
      
      displayFiles.forEach((file, index) => {
        if (file.separator) {
          console.log('   ...');
          return;
        }
        
        const actualIndex = file.partNum;
        console.log(`   ${actualIndex.toString().padStart(2, '0')}. ${file.filename}`);
        console.log(`       大小: ${formatFileSize(file.size)} | 预估记录: ${file.estimatedRecords.toLocaleString()} 条`);
      });
      
      // 检查缺失的文件
      const missingParts = [];
      for (let i = START_PART; i <= END_PART; i++) {
        if (!foundParts.has(i)) {
          missingParts.push(i);
        }
      }
      
      if (missingParts.length > 0) {
        console.log(`\n⚠️ 缺失的文件 (${missingParts.length} 个):`);
        const displayMissing = missingParts.slice(0, 20);
        console.log(`   part 编号: ${displayMissing.join(', ')}${missingParts.length > 20 ? '...' : ''}`);
        
        if (missingParts.length > 20) {
          console.log(`   (还有 ${missingParts.length - 20} 个缺失文件未显示)`);
        }
      } else {
        console.log(`\n✅ 所有文件齐全！共60个9.6数据汇总表文件已准备就绪`);
      }
      
    } else {
      console.log('\n❌ 未找到任何9.6数据汇总表文件');
      console.log('\n💡 请确认:');
      console.log('   1. AI Drive中是否存在9.6数据汇总表文件');
      console.log('   2. 文件命名格式是否为: 9.6数据汇总表-utf8_part_XX.csv');
      console.log('   3. part编号是否在01-60范围内');
    }
    
    // 建议下一步操作
    console.log(`\n💡 下一步操作:`);
    if (targetFiles.length === END_PART) {
      console.log('   ✅ 所有文件完备，可以开始批量导入');
      console.log('   🚀 启动命令: node optimized_batch_import.mjs');
      console.log('   🔧 后台运行: ./start_9_6_import.sh');
    } else if (targetFiles.length > 0) {
      console.log('   ⚠️ 文件不完整，建议检查缺失文件后再导入');
      console.log('   🔧 强制导入现有文件: node optimized_batch_import.mjs');
    } else {
      console.log('   ❌ 未找到文件，请检查AI Drive中的9.6数据文件');
    }
    
  } catch (error) {
    console.error('❌ 文件检测失败:', error.message);
    if (error.code === 'EACCES') {
      console.error('💡 权限错误，请检查AI Drive访问权限');
    } else if (error.code === 'ENOENT') {
      console.error('💡 路径不存在，请检查AI Drive是否正确挂载');
    }
  }
}

main().catch(console.error);