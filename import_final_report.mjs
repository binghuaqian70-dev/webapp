#!/usr/bin/env node
/**
 * 生成9.2下数据汇总表导入的最终报告
 */

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function login() {
  const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  
  const data = await response.json();
  return data.data?.token;
}

async function getStats(token) {
  const response = await fetch(`${PRODUCTION_URL}/api/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.data;
}

async function getProductCount(token) {
  const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.pagination?.total || 0;
}

async function getRecentProducts(token) {
  const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=20&sortBy=id&sortOrder=DESC`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.data || [];
}

function formatNumber(num) {
  return num.toLocaleString();
}

async function main() {
  console.log('📊 9.2下数据汇总表导入最终报告');
  console.log('='.repeat(60));
  
  try {
    const token = await login();
    const stats = await getStats(token);
    const totalProducts = await getProductCount(token);
    const recentProducts = await getRecentProducts(token);
    
    // 预期数据
    const fileData = [
      { file: 'part_01', records: 432 },
      { file: 'part_02', records: 432 },
      { file: 'part_03', records: 432 },
      { file: 'part_04', records: 434 },
      { file: 'part_05', records: 432 },
      { file: 'part_06', records: 432 },
      { file: 'part_07', records: 432 },
      { file: 'part_08', records: 432 },
      { file: 'part_09', records: 432 },
      { file: 'part_10', records: 425 }
    ];
    
    const totalExpectedRecords = fileData.reduce((sum, f) => sum + f.records, 0);
    const initialCount = 120322; // 导入前的基准数量
    const currentImported = totalProducts - initialCount;
    
    console.log('🎯 导入目标:');
    console.log(`   📁 文件数量: 10 个`);
    console.log(`   📊 预期记录数: ${formatNumber(totalExpectedRecords)} 条`);
    console.log(`   🏢 涉及公司: 富特世贸易（深圳）有限公司`);
    console.log(`   📂 文件模式: 9.2下数据汇总表-utf8_part_XX.csv`);
    
    console.log('\n📊 导入结果:');
    console.log(`   🗄️ 当前总记录数: ${formatNumber(totalProducts)}`);
    console.log(`   📈 本次导入记录: ${formatNumber(currentImported)}`);
    console.log(`   📊 导入完成率: ${Math.round(currentImported / totalExpectedRecords * 100)}%`);
    console.log(`   ⏱️ 生成时间: ${new Date().toLocaleString('zh-CN')}`);
    
    console.log('\n📋 数据库统计:');
    console.log(`   📦 商品总数: ${formatNumber(stats.totalProducts || totalProducts)}`);
    console.log(`   📊 总库存: ${formatNumber(stats.totalStock || 0)}`);
    console.log(`   💰 总价值: ¥${formatNumber(stats.totalValue || 0)}`);
    console.log(`   🏢 公司数量: ${formatNumber(stats.totalCompanies || 0)}`);
    
    console.log('\n📄 分文件详情:');
    fileData.forEach((file, index) => {
      const status = index < Math.floor(currentImported / (totalExpectedRecords / 10)) ? '✅' : '⏳';
      console.log(`   ${status} ${file.file}: ${formatNumber(file.records)} 条记录`);
    });
    
    if (recentProducts.length > 0) {
      console.log('\n🔍 最新导入的商品示例:');
      recentProducts.slice(0, 5).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - ${product.company_name} - ¥${product.price} - 库存:${product.stock}`);
      });
    }
    
    console.log('\n📊 导入质量评估:');
    if (currentImported >= totalExpectedRecords * 0.95) {
      console.log('   🎉 导入质量: 优秀 (≥95%)');
    } else if (currentImported >= totalExpectedRecords * 0.90) {
      console.log('   ✅ 导入质量: 良好 (≥90%)');
    } else if (currentImported >= totalExpectedRecords * 0.80) {
      console.log('   ⚠️ 导入质量: 一般 (≥80%)');
    } else {
      console.log('   ❌ 导入质量: 需要检查 (<80%)');
    }
    
    console.log('\n🌐 生产环境信息:');
    console.log(`   🔗 主域名: https://webapp-csv-import.pages.dev`);
    console.log(`   🔗 当前域名: ${PRODUCTION_URL}`);
    console.log(`   🔑 管理员账号: admin/admin123`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎊 9.2下数据汇总表批量导入报告生成完成');
    
  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
  }
}

main();