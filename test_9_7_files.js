#!/usr/bin/env node
/**
 * 9.7数据汇总表文件验证脚本
 * 验证AI Drive中100个文件的完整性和可用性
 * 提供详细的文件统计和完整性报告
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';
const START_PART = 1;
const END_PART = 100;

function formatNumber(num) {
  return num.toLocaleString();
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 估算记录数（基于9.7数据特征）
function estimateRecords(fileSize) {
  // 基于9.7数据文件的平均行大小约115字节估算
  return Math.floor(fileSize / 115);
}

function validateFiles() {
  console.log('🔍 9.7数据汇总表文件验证');
  console.log('=' .repeat(50));
  console.log(`📍 目标路径: ${AI_DRIVE_PATH}`);
  console.log(`🎯 期望文件: part_01 到 part_${END_PART} (共${END_PART}个文件)`);
  console.log();

  try {
    // 检查AI Drive目录是否存在
    if (!fs.existsSync(AI_DRIVE_PATH)) {
      console.log('❌ AI Drive目录不存在:', AI_DRIVE_PATH);
      return false;
    }

    // 读取目录内容
    const files = fs.readdirSync(AI_DRIVE_PATH);
    console.log(`📂 AI Drive总文件数: ${files.length}`);

    // 筛选9.7数据汇总表文件
    const csvFiles = files.filter(file => {
      if (!file.endsWith('.csv') || !file.includes('9.7数据汇总表')) {
        return false;
      }
      
      // 提取part编号，支持01-09的两位数和10-100的数字格式
      const partMatch = file.match(/part_(\d{2,3})/);
      if (!partMatch) {
        return false;
      }
      
      const partNum = parseInt(partMatch[1]);
      return partNum >= START_PART && partNum <= END_PART;
    });

    console.log(`📋 找到9.7数据汇总表文件: ${csvFiles.length}/${END_PART}`);
    console.log();

    if (csvFiles.length === 0) {
      console.log('❌ 未找到任何9.7数据汇总表文件');
      console.log('💡 期望的文件名格式: 9.7数据汇总表-utf8_part_XX.csv');
      return false;
    }

    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part_(\d{2,3})/);
      const partB = b.match(/part_(\d{2,3})/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      return a.localeCompare(b);
    });

    // 详细文件分析
    const fileDetails = [];
    let totalSize = 0;
    let totalEstimatedRecords = 0;

    console.log('📊 文件详细信息:');
    console.log('-'.repeat(80));
    console.log('Part  | 文件名                                     | 大小      | 估算记录数');
    console.log('-'.repeat(80));

    // 检查每个期望的文件
    const foundParts = new Set();
    
    for (const filename of csvFiles) {
      const partMatch = filename.match(/part_(\d{2,3})/);
      if (!partMatch) continue;
      
      const partNum = parseInt(partMatch[1]);
      foundParts.add(partNum);
      
      const filePath = path.join(AI_DRIVE_PATH, filename);
      
      try {
        const stats = fs.statSync(filePath);
        const estimatedRecords = estimateRecords(stats.size);
        
        fileDetails.push({
          partNum,
          filename,
          size: stats.size,
          estimatedRecords,
          exists: true
        });
        
        totalSize += stats.size;
        totalEstimatedRecords += estimatedRecords;
        
        // 显示文件信息（只显示前10个和后5个，中间的省略）
        if (fileDetails.length <= 10 || fileDetails.length > csvFiles.length - 5) {
          const shortName = filename.length > 35 ? 
            filename.substring(0, 32) + '...' : 
            filename;
          
          console.log(
            `${partNum.toString().padStart(3)} | ${shortName.padEnd(42)} | ` +
            `${formatFileSize(stats.size).padStart(8)} | ${formatNumber(estimatedRecords).padStart(8)}`
          );
        } else if (fileDetails.length === 11) {
          console.log('... | (省略中间文件)                              |          |         ');
        }
        
      } catch (error) {
        console.log(`${partNum.toString().padStart(3)} | ${filename.padEnd(42)} | ❌ 错误   | N/A`);
        fileDetails.push({
          partNum,
          filename,
          size: 0,
          estimatedRecords: 0,
          exists: false,
          error: error.message
        });
      }
    }

    console.log('-'.repeat(80));
    console.log();

    // 检查缺失的文件
    const missingParts = [];
    for (let i = START_PART; i <= END_PART; i++) {
      if (!foundParts.has(i)) {
        missingParts.push(i);
      }
    }

    // 统计报告
    console.log('📈 统计报告:');
    console.log(`✅ 找到文件: ${csvFiles.length}/${END_PART} (${(csvFiles.length/END_PART*100).toFixed(1)}%)`);
    console.log(`📁 总文件大小: ${formatFileSize(totalSize)}`);
    console.log(`📊 预估总记录数: ${formatNumber(totalEstimatedRecords)} 条`);
    
    if (totalEstimatedRecords > 0) {
      console.log(`📊 平均每文件: ${formatFileSize(totalSize/csvFiles.length)}, ${Math.round(totalEstimatedRecords/csvFiles.length)} 条记录`);
    }

    console.log();

    // 完整性检查
    if (missingParts.length === 0) {
      console.log('🎉 完整性检查: ✅ 所有文件齐全!');
      console.log('✅ 文件验证通过，可以开始导入');
    } else {
      console.log(`⚠️ 完整性检查: 缺少 ${missingParts.length} 个文件`);
      
      if (missingParts.length <= 20) {
        console.log(`❌ 缺失的part编号: ${missingParts.join(', ')}`);
      } else {
        console.log(`❌ 缺失的part编号: ${missingParts.slice(0, 15).join(', ')}... (+${missingParts.length-15}个)`);
      }
      
      console.log();
      console.log('💡 解决建议:');
      console.log('1. 检查文件上传是否完整');
      console.log('2. 确认文件命名格式: 9.7数据汇总表-utf8_part_XX.csv');
      console.log('3. 检查AI Drive连接状态');
    }

    console.log();

    // 文件格式示例
    if (csvFiles.length > 0) {
      console.log('📋 文件名格式示例:');
      csvFiles.slice(0, 3).forEach(filename => {
        console.log(`  ✅ ${filename}`);
      });
      
      if (csvFiles.length > 3) {
        console.log(`  ... 还有 ${csvFiles.length - 3} 个文件`);
      }
    }

    console.log();
    console.log('🔧 相关命令:');
    console.log('  启动导入: ./start_9_7_import.sh start');
    console.log('  查看状态: ./start_9_7_import.sh status');
    console.log('  查看日志: ./start_9_7_import.sh logs');

    return csvFiles.length === END_PART;

  } catch (error) {
    console.log('❌ 文件验证过程中发生错误:', error.message);
    return false;
  }
}

// 运行验证
const success = validateFiles();
process.exit(success ? 0 : 1);