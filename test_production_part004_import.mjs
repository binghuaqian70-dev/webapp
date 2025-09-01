// 测试生产环境导入part_004.csv文件并排查失败原因

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const CSV_URL = 'https://page.gensparksite.com/get_upload_url/43c24bad48156d4ad708ecff9cd03dce31d40612d11491f48ad08e3164ded862/default/275fdecd-2389-4af9-8f00-e5f48ce57046';

// 登录获取token
async function login() {
  try {
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const loginResult = await loginResponse.json();
    
    if (loginResult.success && loginResult.data.token) {
      return loginResult.data.token;
    } else {
      console.error('生产环境登录失败:', loginResult);
      return null;
    }
  } catch (error) {
    console.error('生产环境登录错误:', error);
    return null;
  }
}

// 预处理CSV数据，识别和报告潜在问题
function analyzeCSVData(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  console.log(`📊 CSV数据分析:`);
  console.log(`- 总行数: ${lines.length}`);
  console.log(`- 数据行数: ${lines.length - 1}`);
  console.log(`- 表头: ${headers.join(', ')}`);
  
  const issues = [];
  const duplicates = new Map();
  const emptyFields = [];
  const suspiciousData = [];
  
  // 分析数据行
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const rowData = {};
    
    headers.forEach((header, index) => {
      rowData[header] = values[index]?.trim() || '';
    });
    
    // 检查必填字段
    if (!rowData.name || !rowData.company_name || rowData.price === undefined || rowData.stock === undefined) {
      emptyFields.push({
        row: i + 1,
        data: rowData,
        missing: []
      });
      if (!rowData.name) emptyFields[emptyFields.length - 1].missing.push('name');
      if (!rowData.company_name) emptyFields[emptyFields.length - 1].missing.push('company_name');
      if (rowData.price === undefined) emptyFields[emptyFields.length - 1].missing.push('price');
      if (rowData.stock === undefined) emptyFields[emptyFields.length - 1].missing.push('stock');
    }
    
    // 检查重复的名称
    if (rowData.name) {
      if (duplicates.has(rowData.name)) {
        duplicates.get(rowData.name).push(i + 1);
      } else {
        duplicates.set(rowData.name, [i + 1]);
      }
    }
    
    // 检查可疑数据
    if (rowData.name && (rowData.name.length < 3 || /^[0-9]+$/.test(rowData.name) === false)) {
      if (!rowData.name.match(/^[0-9A-Za-z\-_]+$/)) {
        suspiciousData.push({
          row: i + 1,
          field: 'name',
          value: rowData.name,
          issue: '包含特殊字符'
        });
      }
    }
    
    // 检查数值字段
    if (rowData.stock && isNaN(parseInt(rowData.stock))) {
      suspiciousData.push({
        row: i + 1,
        field: 'stock',
        value: rowData.stock,
        issue: '库存不是有效数字'
      });
    }
    
    if (rowData.price && isNaN(parseFloat(rowData.price))) {
      suspiciousData.push({
        row: i + 1,
        field: 'price',
        value: rowData.price,
        issue: '价格不是有效数字'
      });
    }
  }
  
  // 报告问题
  console.log(`\n🔍 数据质量检查:`);
  
  if (emptyFields.length > 0) {
    console.log(`❌ 发现 ${emptyFields.length} 行缺少必填字段:`);
    emptyFields.slice(0, 5).forEach(item => {
      console.log(`   第${item.row}行: 缺少 ${item.missing.join(', ')} - ${JSON.stringify(item.data)}`);
    });
    if (emptyFields.length > 5) {
      console.log(`   ... 还有 ${emptyFields.length - 5} 行类似问题`);
    }
    issues.push(`${emptyFields.length}行缺少必填字段`);
  }
  
  // 检查重复项
  const duplicateNames = Array.from(duplicates.entries()).filter(([name, rows]) => rows.length > 1);
  if (duplicateNames.length > 0) {
    console.log(`⚠️ 发现 ${duplicateNames.length} 个重复的商品名称:`);
    duplicateNames.slice(0, 5).forEach(([name, rows]) => {
      console.log(`   "${name}": 出现在第 ${rows.join(', ')} 行 (共${rows.length}次)`);
    });
    if (duplicateNames.length > 5) {
      console.log(`   ... 还有 ${duplicateNames.length - 5} 个重复名称`);
    }
    issues.push(`${duplicateNames.length}个重复商品名称`);
  }
  
  if (suspiciousData.length > 0) {
    console.log(`⚠️ 发现 ${suspiciousData.length} 个可疑数据:`);
    suspiciousData.slice(0, 5).forEach(item => {
      console.log(`   第${item.row}行 ${item.field}: "${item.value}" - ${item.issue}`);
    });
    if (suspiciousData.length > 5) {
      console.log(`   ... 还有 ${suspiciousData.length - 5} 个可疑数据`);
    }
    issues.push(`${suspiciousData.length}个可疑数据`);
  }
  
  if (issues.length === 0) {
    console.log(`✅ 数据质量良好，未发现明显问题`);
  }
  
  return {
    totalRows: lines.length - 1,
    emptyFieldsCount: emptyFields.length,
    duplicateNamesCount: duplicateNames.length,
    suspiciousDataCount: suspiciousData.length,
    issues: issues
  };
}

// 测试CSV导入并排查失败原因
async function testImportWithDiagnosis() {
  console.log('=== 生产环境CSV导入诊断测试 ===\n');
  console.log('生产环境URL:', PRODUCTION_URL);
  console.log('CSV文件URL:', CSV_URL);
  
  // 1. 先登录获取token
  console.log('\n1. 尝试登录生产环境...');
  const token = await login();
  
  if (!token) {
    console.log('❌ 登录失败，无法继续测试');
    return;
  }
  
  console.log('✅ 登录成功，token获取成功');
  
  // 2. 获取CSV数据
  console.log('\n2. 获取CSV数据...');
  
  let csvData;
  try {
    const csvResponse = await fetch(CSV_URL);
    csvData = await csvResponse.text();
    
    console.log('✅ CSV文件获取成功');
    console.log(`📁 文件大小: ${csvData.length} 字符`);
    console.log(`📄 前200字符: ${csvData.substring(0, 200)}...`);
    
  } catch (error) {
    console.error('❌ 获取CSV数据失败:', error);
    return;
  }
  
  // 3. 分析CSV数据
  console.log('\n3. 分析CSV数据质量...');
  const analysis = analyzeCSVData(csvData);
  
  // 4. 检查当前生产数据库状态
  console.log('\n4. 检查生产数据库当前状态...');
  try {
    const queryResponse = await fetch(`${PRODUCTION_URL}/api/products?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const queryResult = await queryResponse.json();
    
    if (queryResult.success) {
      console.log(`📊 当前生产环境商品总数: ${queryResult.pagination.total}`);
    }
  } catch (error) {
    console.error('查询当前数据失败:', error);
  }
  
  // 5. 执行导入
  console.log('\n5. 执行CSV导入...');
  
  const payload = {
    csvData: csvData
  };
  
  const startTime = Date.now();
  let importResult;
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    importResult = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ 导入耗时: ${duration}ms`);
    console.log(`📡 响应状态: ${response.status}`);
    console.log(`📋 导入结果:`, JSON.stringify(importResult, null, 2));
    
  } catch (error) {
    console.error('❌ 导入请求失败:', error);
    return;
  }
  
  // 6. 分析导入结果
  console.log('\n6. 分析导入结果...');
  
  if (importResult.success) {
    const { total, successCount, errorCount, errors } = importResult.data;
    const successRate = ((successCount / total) * 100).toFixed(2);
    
    console.log(`📈 导入统计:`);
    console.log(`   总计: ${total} 行`);
    console.log(`   成功: ${successCount} 行`);
    console.log(`   失败: ${errorCount} 行`);
    console.log(`   成功率: ${successRate}%`);
    
    if (errorCount > 0) {
      console.log(`\n❌ 失败原因分析 (前10个错误):`);
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      
      if (errors.length > 10) {
        console.log(`   ... 还有 ${errors.length - 10} 个错误`);
      }
      
      // 分析错误模式
      const errorTypes = {};
      errors.forEach(error => {
        const match = error.match(/第\d+行: (.+)/);
        if (match) {
          const errorType = match[1].split('-')[0].trim();
          errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        }
      });
      
      console.log(`\n📊 错误类型统计:`);
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} 次`);
      });
    }
    
    if (successCount > 0) {
      console.log(`\n🎉 成功导入 ${successCount} 个商品!`);
    }
    
  } else {
    console.log(`❌ 导入完全失败: ${importResult.error}`);
    if (importResult.debug) {
      console.log(`🔧 调试信息:`, importResult.debug);
    }
  }
  
  // 7. 检查最终数据库状态
  console.log('\n7. 检查导入后数据库状态...');
  try {
    const finalQueryResponse = await fetch(`${PRODUCTION_URL}/api/products?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const finalQueryResult = await finalQueryResponse.json();
    
    if (finalQueryResult.success) {
      console.log(`📊 导入后生产环境商品总数: ${finalQueryResult.pagination.total}`);
    }
  } catch (error) {
    console.error('查询最终数据失败:', error);
  }
  
  // 8. 总结建议
  console.log('\n8. 问题排查总结和建议:');
  
  if (analysis.emptyFieldsCount > 0) {
    console.log(`🔧 建议: 检查并补全 ${analysis.emptyFieldsCount} 行的缺失字段`);
  }
  
  if (analysis.duplicateNamesCount > 0) {
    console.log(`🔧 建议: 处理 ${analysis.duplicateNamesCount} 个重复商品名称，或确保它们确实是不同的商品`);
  }
  
  if (analysis.suspiciousDataCount > 0) {
    console.log(`🔧 建议: 检查 ${analysis.suspiciousDataCount} 个可疑数据的格式`);
  }
  
  if (importResult && importResult.success && importResult.data.errorCount === 0) {
    console.log(`✅ 所有数据导入成功，无需额外处理！`);
  }
}

// 运行测试
testImportWithDiagnosis().catch(console.error);