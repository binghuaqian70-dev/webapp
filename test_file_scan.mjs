#!/usr/bin/env node
/**
 * 测试9.2汇总表文件扫描功能
 */

import fs from 'fs';
import path from 'path';

const AI_DRIVE_PATH = '/mnt/aidrive';

function formatNumber(num) {
  return num.toLocaleString();
}

function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 获取文件记录数的估算（基于文件大小）
function estimateRecords(filePath, fileSize) {
  try {
    // 读取文件前几行来估算平均行大小
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length <= 1) return 0;
    
    // 实际计算记录数
    const actualRecords = lines.filter(line => line.trim()).length - 1; // 减去头部行
    return actualRecords;
  } catch (error) {
    // 如果读取失败，基于文件大小估算（平均每行约150字节）
    return Math.floor(fileSize / 150);
  }
}

function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    // 只处理9.2汇总表文件
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && file.includes('9.2汇总表')
    );
    
    console.log(`找到 ${csvFiles.length} 个9.2汇总表文件`);
    
    // 按part编号排序
    csvFiles.sort((a, b) => {
      const partA = a.match(/part_(\d+)/);
      const partB = b.match(/part_(\d+)/);
      
      if (partA && partB) {
        return parseInt(partA[1]) - parseInt(partB[1]);
      }
      
      return a.localeCompare(b);
    });
    
    return csvFiles.map(filename => {
      const filePath = path.join(AI_DRIVE_PATH, filename);
      const stats = fs.statSync(filePath);
      
      // 9.2汇总表文件的公司映射
      let company = '中山市荣御电子科技有限公司'; // 默认公司
      const match = filename.match(/part_(\d+)/);
      if (match) {
        const partNum = parseInt(match[1]);
        if (partNum === 90) {
          company = '深圳市熙霖特电子有限公司';
        } else {
          company = '中山市荣御电子科技有限公司';
        }
      }
      
      // 估算记录数
      const estimatedRecords = estimateRecords(filePath, stats.size);
      
      return {
        filename,
        path: filePath,
        size: stats.size,
        company,
        estimatedRecords
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 测试9.2汇总表文件扫描功能');
  console.log(`📍 AI Drive: ${AI_DRIVE_PATH}\n`);
  
  try {
    const files = getAiDriveFiles();
    
    if (files.length === 0) {
      console.log('⚠️ 未找到9.2汇总表文件');
      return;
    }
    
    // 显示文件概览
    const totalEstimatedRecords = files.reduce((sum, f) => sum + f.estimatedRecords, 0);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    console.log('📊 文件概览:');
    console.log(`   总文件数: ${files.length} 个`);
    console.log(`   预估总记录数: ${formatNumber(totalEstimatedRecords)} 条`);
    console.log(`   总文件大小: ${formatFileSize(totalSize)}\n`);
    
    // 显示前10个和后10个文件的详细信息
    console.log('📁 前10个文件详情:');
    files.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.filename}`);
      console.log(`      公司: ${file.company}`);
      console.log(`      大小: ${formatFileSize(file.size)}`);
      console.log(`      记录数: ${formatNumber(file.estimatedRecords)} 条`);
    });
    
    if (files.length > 10) {
      console.log('   ...');
      console.log('📁 后10个文件详情:');
      files.slice(-10).forEach((file, index) => {
        console.log(`   ${files.length - 9 + index}. ${file.filename}`);
        console.log(`      公司: ${file.company}`);
        console.log(`      大小: ${formatFileSize(file.size)}`);
        console.log(`      记录数: ${formatNumber(file.estimatedRecords)} 条`);
      });
    }
    
    // 统计各公司文件数量
    const companyStats = files.reduce((acc, file) => {
      acc[file.company] = (acc[file.company] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🏢 公司分布:');
    Object.entries(companyStats).forEach(([company, count]) => {
      console.log(`   ${company}: ${count} 个文件`);
    });
    
    console.log('\n✅ 文件扫描测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试过程发生错误:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);