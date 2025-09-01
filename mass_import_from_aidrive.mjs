#!/usr/bin/env node
/**
 * AI Drive批量导入脚本 - 生产环境
 * 从AI Drive逐个导入所有CSV文件到webapp-csv-import.pages.dev
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const AI_DRIVE_PATH = '/mnt/aidrive';

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 格式化数字
function formatNumber(num) {
  return num.toLocaleString();
}

// 格式化文件大小
function formatFileSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 格式化时间
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// 确定公司名称
function getCompanyName(filename) {
  if (filename.includes('51连接器')) {
    return '信都数字科技（上海）有限公司';
  } else if (filename.includes('part_0')) {
    // 根据part范围确定公司
    const match = filename.match(/part_(\d+)/);
    if (match) {
      const partNum = parseInt(match[1]);
      if (partNum >= 90 && partNum <= 100) {
        if (partNum === 90) {
          return '深圳市熙霖特电子有限公司';
        } else {
          return '中山市荣御电子科技有限公司';
        }
      }
    }
  }
  return '未知公司';
}

// 登录获取JWT token
async function login() {
  try {
    console.log('🔐 正在登录生产环境...');
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.token || data.data?.token;
    if (!token) {
      throw new Error('登录响应中没有找到token');
    }

    console.log('✅ 登录成功');
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

// 获取当前数据库状态
async function getDbStats(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return { total: 0 };
    }

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    return { total: 0 };
  }
}

// 获取AI Drive中所有CSV文件
function getAiDriveFiles() {
  try {
    const files = fs.readdirSync(AI_DRIVE_PATH);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    // 按文件名排序：51连接器在前，然后按part编号排序
    csvFiles.sort((a, b) => {
      if (a.includes('51连接器') && !b.includes('51连接器')) return -1;
      if (!a.includes('51连接器') && b.includes('51连接器')) return 1;
      
      // 提取part编号进行排序
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
      return {
        filename,
        path: filePath,
        size: stats.size,
        company: getCompanyName(filename)
      };
    });
  } catch (error) {
    console.error('❌ 读取AI Drive文件失败:', error.message);
    return [];
  }
}

// 导入单个CSV文件
async function importCsvFile(fileInfo, token, index, total) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 导入文件 ${index}/${total}: ${fileInfo.filename}`);
    console.log(`   公司: ${fileInfo.company}`);
    console.log(`   文件大小: ${formatFileSize(fileInfo.size)}`);

    // 获取导入前的数据统计
    const statsBefore = await getDbStats(token);
    console.log(`   导入前数据库记录数: ${formatNumber(statsBefore.total)}`);

    // 读取CSV文件内容
    const csvContent = fs.readFileSync(fileInfo.path, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log(`   CSV数据行数: ${formatNumber(lines.length - 1)} 行 (含表头)`);

    console.log(`   🚀 正在上传并导入...`);
    const startTime = Date.now();

    // 发送导入请求 - 使用CSV导入API
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csvData: csvContent,
        filename: fileInfo.filename
      })
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ 导入失败: ${response.status} ${response.statusText}`);
      console.error(`   错误详情: ${errorText}`);
      return { 
        success: false, 
        reason: 'import_failed', 
        filename: fileInfo.filename,
        company: fileInfo.company,
        error: errorText,
        size: fileInfo.size,
        duration
      };
    }

    const result = await response.json();
    
    // 获取导入后的数据统计
    await delay(500); // 短暂延迟确保数据同步
    const statsAfter = await getDbStats(token);
    const imported = statsAfter.total - statsBefore.total;

    console.log(`   ✅ 导入完成 (耗时: ${duration.toFixed(2)}s)`);
    console.log(`   📊 导入结果:`);
    console.log(`      - 新增记录: ${formatNumber(imported)} 条`);
    console.log(`      - 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    if (result.duplicates && result.duplicates > 0) {
      console.log(`      - 重复跳过: ${formatNumber(result.duplicates)} 条`);
    }
    if (result.errors && result.errors > 0) {
      console.log(`      - 导入错误: ${formatNumber(result.errors)} 条`);
    }

    return { 
      success: true, 
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      result,
      duration,
      imported,
      totalBefore: statsBefore.total,
      totalAfter: statsAfter.total,
      csvLines: lines.length - 1
    };

  } catch (error) {
    console.error(`   ❌ 导入文件失败 (${fileInfo.filename}):`, error.message);
    return { 
      success: false, 
      reason: 'exception', 
      filename: fileInfo.filename,
      company: fileInfo.company,
      size: fileInfo.size,
      error: error.message 
    };
  }
}

// 生成详细报告
function generateReport(results, totalDuration, initialTotal, finalTotal) {
  const successResults = results.filter(r => r.success);
  const failureResults = results.filter(r => !r.success);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 AI Drive 批量导入完成总结报告');
  console.log('='.repeat(80));
  
  console.log(`🎯 总体统计:`);
  console.log(`   📁 总文件数: ${formatNumber(results.length)} 个`);
  console.log(`   ✅ 成功导入: ${formatNumber(successResults.length)} 个`);
  console.log(`   ❌ 失败/跳过: ${formatNumber(failureResults.length)} 个`);
  console.log(`   ⏱️ 总耗时: ${formatDuration(totalDuration)}`);
  
  console.log(`\n🗄️ 数据库变化:`);
  console.log(`   📈 导入前总记录: ${formatNumber(initialTotal)}`);
  console.log(`   📈 导入后总记录: ${formatNumber(finalTotal)}`);
  console.log(`   📈 净增加记录: ${formatNumber(finalTotal - initialTotal)}`);
  
  // 按公司统计
  const companyStats = {};
  successResults.forEach(result => {
    if (!companyStats[result.company]) {
      companyStats[result.company] = {
        files: 0,
        records: 0,
        totalSize: 0
      };
    }
    companyStats[result.company].files++;
    companyStats[result.company].records += result.imported || 0;
    companyStats[result.company].totalSize += result.size || 0;
  });
  
  console.log(`\n🏢 按公司统计:`);
  Object.entries(companyStats).forEach(([company, stats]) => {
    console.log(`   ${company}:`);
    console.log(`      📁 文件数: ${formatNumber(stats.files)} 个`);
    console.log(`      📊 记录数: ${formatNumber(stats.records)} 条`);
    console.log(`      💾 总大小: ${formatFileSize(stats.totalSize)}`);
  });
  
  // 性能统计
  const avgDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
  const totalImported = successResults.reduce((sum, r) => sum + (r.imported || 0), 0);
  const totalSize = successResults.reduce((sum, r) => sum + (r.size || 0), 0);
  
  console.log(`\n⚡ 性能统计:`);
  console.log(`   📊 总导入记录: ${formatNumber(totalImported)} 条`);
  console.log(`   💾 总处理数据: ${formatFileSize(totalSize)}`);
  console.log(`   ⏱️ 平均单文件耗时: ${avgDuration.toFixed(2)}s`);
  console.log(`   🚀 平均导入速度: ${(totalImported / totalDuration).toFixed(0)} 条/秒`);
  
  // 失败文件详情
  if (failureResults.length > 0) {
    console.log(`\n❌ 失败文件详情:`);
    failureResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.filename}`);
      console.log(`      公司: ${result.company}`);
      console.log(`      原因: ${result.reason}`);
      if (result.error) {
        console.log(`      错误: ${result.error.substring(0, 100)}...`);
      }
    });
  }
  
  // 成功文件抽样详情（显示前5个和后5个）
  if (successResults.length > 0) {
    console.log(`\n✅ 成功导入文件 (前5个和后5个):`);
    
    const showResults = successResults.length <= 10 
      ? successResults 
      : [...successResults.slice(0, 5), ...successResults.slice(-5)];
    
    showResults.forEach((result, index) => {
      if (index === 5 && successResults.length > 10) {
        console.log(`   ... (省略 ${successResults.length - 10} 个文件) ...`);
      }
      console.log(`   ✓ ${result.filename}`);
      console.log(`     ${result.company} | ${formatNumber(result.imported || 0)} 条 | ${result.duration?.toFixed(2)}s`);
    });
  }
  
  console.log('\n🎉 AI Drive 批量导入任务完成！');
  if (failureResults.length === 0) {
    console.log('🌟 所有文件都已成功导入生产环境！');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始从 AI Drive 批量导入所有 CSV 文件');
  console.log(`📍 AI Drive 路径: ${AI_DRIVE_PATH}`);
  console.log(`📍 生产环境地址: ${PRODUCTION_URL}`);
  
  const mainStartTime = Date.now();

  try {
    // 登录获取token
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`📊 初始数据库记录数: ${formatNumber(initialStats.total)}\n`);

    // 获取所有CSV文件
    console.log('📂 扫描 AI Drive 中的 CSV 文件...');
    const files = getAiDriveFiles();
    
    if (files.length === 0) {
      console.log('⚠️ 未找到CSV文件');
      return;
    }
    
    console.log(`📋 找到 ${formatNumber(files.length)} 个 CSV 文件`);
    
    // 统计文件信息
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(`💾 总文件大小: ${formatFileSize(totalSize)}`);
    
    const companyCount = {};
    files.forEach(file => {
      companyCount[file.company] = (companyCount[file.company] || 0) + 1;
    });
    
    console.log(`🏢 涉及公司:`);
    Object.entries(companyCount).forEach(([company, count]) => {
      console.log(`   - ${company}: ${formatNumber(count)} 个文件`);
    });

    const results = [];
    
    // 逐个处理文件
    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      
      const result = await importCsvFile(fileInfo, token, i + 1, files.length);
      results.push(result);

      // 文件间延迟，避免服务器压力
      if (i < files.length - 1) {
        console.log('   ⏳ 等待 1 秒后处理下一个文件...');
        await delay(1000);
      }
    }

    // 获取最终状态
    const finalStats = await getDbStats(token);
    const totalDuration = (Date.now() - mainStartTime) / 1000;
    
    // 生成详细报告
    generateReport(results, totalDuration, initialStats.total, finalStats.total);

  } catch (error) {
    console.error('\n❌ 批量导入过程中发生严重错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);