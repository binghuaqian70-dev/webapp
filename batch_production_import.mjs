#!/usr/bin/env node
/**
 * 批量CSV导入脚本 - 生产环境
 * 逐个处理多个CSV文件导入到webapp-csv-import.pages.dev
 */

import fs from 'fs';
import path from 'path';

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

// 待处理的CSV文件列表
const CSV_FILES = [
  {
    filename: '51连接器-9.1-utf8.csv',
    company: '信都数字科技（上海）有限公司',
    description: '连接器产品数据'
  },
  {
    filename: '9.1汇总表-utf8_part_100.csv', 
    company: '中山市荣御电子科技有限公司',
    description: '汇总表Part100'
  },
  {
    filename: '9.1汇总表-utf8_part_098.csv',
    company: '中山市荣御电子科技有限公司', 
    description: '汇总表Part098'
  },
  {
    filename: '9.1汇总表-utf8_part_099.csv',
    company: '中山市荣御电子科技有限公司',
    description: '汇总表Part099'
  },
  {
    filename: '9.1汇总表-utf8_part_090.csv',
    company: '深圳市熙霖特电子有限公司',
    description: '汇总表Part090'
  }
];

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
    // 检查两种可能的响应格式
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
    // 使用查询所有产品的API来获取总数
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.log('⚠️ 无法获取数据库状态，可能是新部署');
      return { total: 0 };
    }

    const data = await response.json();
    return { total: data.total || 0 };
  } catch (error) {
    console.log('⚠️ 获取数据库状态失败:', error.message);
    return { total: 0 };
  }
}

// 导入单个CSV文件
async function importCsvFile(filename, fileInfo, token) {
  try {
    console.log(`\n📁 开始导入文件: ${filename}`);
    console.log(`   公司: ${fileInfo.company}`);
    console.log(`   描述: ${fileInfo.description}`);

    const filePath = path.join(process.cwd(), filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ 文件不存在: ${filename}，跳过导入`);
      return { success: false, reason: 'file_not_found', filename };
    }

    const fileStats = fs.statSync(filePath);
    console.log(`   文件大小: ${formatFileSize(fileStats.size)}`);

    // 读取CSV文件内容
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log(`   数据行数: ${formatNumber(lines.length - 1)} 行 (含表头)`);

    // 获取导入前的数据统计
    const statsBefore = await getDbStats(token);
    console.log(`   导入前数据库记录数: ${formatNumber(statsBefore.total)}`);

    // 创建FormData
    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('csvFile', blob, filename);

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
        filename: filename
      })
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ 导入失败: ${response.status} ${response.statusText}`);
      console.error(`   错误详情: ${errorText}`);
      return { success: false, reason: 'import_failed', filename, error: errorText };
    }

    const result = await response.json();
    
    // 获取导入后的数据统计
    const statsAfter = await getDbStats(token);
    const imported = statsAfter.total - statsBefore.total;

    console.log(`   ✅ 导入完成 (耗时: ${duration.toFixed(2)}s)`);
    console.log(`   📊 导入结果:`);
    console.log(`      - 成功导入: ${formatNumber(result.success || imported)} 条记录`);
    console.log(`      - 跳过记录: ${formatNumber(result.skipped || 0)} 条`);
    console.log(`      - 失败记录: ${formatNumber(result.errors || 0)} 条`);
    console.log(`      - 数据库总记录数: ${formatNumber(statsAfter.total)}`);

    if (result.duplicates && result.duplicates > 0) {
      console.log(`      - 重复记录: ${formatNumber(result.duplicates)} 条`);
    }

    return { 
      success: true, 
      filename,
      company: fileInfo.company,
      result,
      duration,
      imported,
      totalAfter: statsAfter.total
    };

  } catch (error) {
    console.error(`   ❌ 导入文件失败 (${filename}):`, error.message);
    return { success: false, reason: 'exception', filename, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('🚀 开始批量导入CSV文件到生产环境');
  console.log(`📍 生产环境地址: ${PRODUCTION_URL}`);
  console.log(`📋 待导入文件数量: ${CSV_FILES.length} 个\n`);

  try {
    // 登录获取token
    const token = await login();
    
    // 获取初始状态
    const initialStats = await getDbStats(token);
    console.log(`📊 初始数据库记录数: ${formatNumber(initialStats.total)}\n`);

    const results = [];
    let totalImported = 0;
    let successCount = 0;
    let failureCount = 0;

    // 逐个处理文件
    for (let i = 0; i < CSV_FILES.length; i++) {
      const fileInfo = CSV_FILES[i];
      console.log(`\n=== 处理文件 ${i + 1}/${CSV_FILES.length} ===`);
      
      const result = await importCsvFile(fileInfo.filename, fileInfo, token);
      results.push(result);

      if (result.success) {
        successCount++;
        totalImported += result.imported || 0;
      } else {
        failureCount++;
        console.log(`   ⚠️ 跳过原因: ${result.reason}`);
      }

      // 文件间延迟，避免服务器压力
      if (i < CSV_FILES.length - 1) {
        console.log('   ⏳ 等待 2 秒后处理下一个文件...');
        await delay(2000);
      }
    }

    // 获取最终状态
    console.log('\n' + '='.repeat(60));
    console.log('📊 批量导入完成总结');
    console.log('='.repeat(60));
    
    const finalStats = await getDbStats(token);
    
    console.log(`✅ 成功导入文件: ${successCount}/${CSV_FILES.length}`);
    console.log(`❌ 失败/跳过文件: ${failureCount}/${CSV_FILES.length}`);
    console.log(`📈 总共导入记录: ${formatNumber(totalImported)} 条`);
    console.log(`🗄️ 数据库最终记录数: ${formatNumber(finalStats.total)} 条`);

    // 详细结果
    console.log('\n📋 详细结果:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const company = result.company || CSV_FILES[index].company;
      console.log(`   ${status} ${result.filename} (${company})`);
      if (result.success) {
        console.log(`      导入: ${formatNumber(result.imported || 0)} 条, 耗时: ${result.duration?.toFixed(2) || 'N/A'}s`);
      }
    });

    console.log('\n🎉 批量导入任务完成！');

  } catch (error) {
    console.error('\n❌ 批量导入过程中发生严重错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);