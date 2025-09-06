#!/usr/bin/env node
/**
 * 检查9.6数据导入状态脚本
 */

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function login() {
  try {
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
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    return data.token || data.data?.token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

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

async function main() {
  console.log('🔍 检查9.6数据汇总表导入状态');
  console.log('='.repeat(60));
  
  try {
    const token = await login();
    console.log('✅ 登录生产环境成功');
    
    const currentStats = await getDbStats(token);
    console.log(`📊 当前数据库记录数: ${currentStats.total.toLocaleString()}`);
    
    // 读取统计文件
    const fs = await import('fs');
    
    if (fs.existsSync('9_6_import_stats.json')) {
      const stats = JSON.parse(fs.readFileSync('9_6_import_stats.json', 'utf8'));
      
      console.log('\n📋 导入统计:');
      console.log(`   已处理文件: ${stats.processedFiles}/60 (${(stats.processedFiles/60*100).toFixed(1)}%)`);
      console.log(`   成功文件: ${stats.successFiles}`);
      console.log(`   失败文件: ${stats.failedFiles}`);
      console.log(`   已导入记录: ${stats.importedRecords.toLocaleString()} 条`);
      console.log(`   开始时间: ${new Date(stats.startTime).toLocaleString()}`);
      
      if (stats.estimatedTimeRemaining) {
        const hours = Math.floor(stats.estimatedTimeRemaining / 3600);
        const minutes = Math.floor((stats.estimatedTimeRemaining % 3600) / 60);
        console.log(`   预计剩余: ${hours}小时${minutes}分钟`);
      }
      
      // 计算实际进度 (假设9.6数据有约30,000条记录)
      const expectedImportRecords = 30000; // 预期9.6导入记录数
      const baselineRecords = stats.totalRecords || 208652; // 9.5导入后的基线
      const actualImported = currentStats.total - baselineRecords;
      console.log('\n📊 实际状态:');
      console.log(`   数据库记录增长: +${actualImported.toLocaleString()} 条`);
      console.log(`   预期新增记录数: ${expectedImportRecords.toLocaleString()}`);
      console.log(`   完成进度: ${(actualImported / expectedImportRecords * 100).toFixed(2)}%`);
      
    } else {
      console.log('⚠️ 未找到9.6导入统计文件');
    }
    
    // 检查进度文件
    if (fs.existsSync('9_6_import_progress.json')) {
      const progress = JSON.parse(fs.readFileSync('9_6_import_progress.json', 'utf8'));
      
      console.log('\n🔄 断点续传信息:');
      console.log(`   当前索引: ${progress.currentIndex}`);
      console.log(`   下次开始: part_${(progress.currentIndex + 1).toString().padStart(2, '0')}`);
      console.log(`   剩余文件: ${60 - progress.currentIndex} 个`);
      
      if (progress.error) {
        console.log(`   ❌ 发现错误: ${progress.error}`);
      }
    }
    
    // 建议下一步操作
    console.log('\n💡 下一步操作建议:');
    if (fs.existsSync('9_6_import_progress.json')) {
      console.log('   1. 重新运行导入脚本以从断点续传');
      console.log('      命令: node optimized_batch_import.mjs');
      console.log('   2. 或者使用后台运行脚本');
      console.log('      命令: ./start_9_6_import.sh');
    } else {
      console.log('   导入可能已完成或未开始');
      console.log('   启动新导入: node optimized_batch_import.mjs');
    }
    
  } catch (error) {
    console.error('❌ 检查过程失败:', error.message);
  }
}

main().catch(console.error);