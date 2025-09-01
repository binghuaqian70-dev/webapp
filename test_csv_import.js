const fs = require('fs');

// 读取CSV文件
const csvData = fs.readFileSync('/home/user/webapp/9.1汇总表-utf8_part_01.csv', 'utf8');

console.log('CSV文件内容:');
console.log(csvData.substring(0, 500) + '...');
console.log('\nCSV行数:', csvData.split('\n').length);

// 测试导入API
async function testImport() {
  const payload = {
    csvData: csvData
  };

  console.log('\n发送导入请求...');
  console.log('请求体大小:', JSON.stringify(payload).length);
  
  try {
    const response = await fetch('http://localhost:3000/api/products/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // 需要先获取有效token
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log('\n响应状态:', response.status);
    console.log('响应内容:', result);
    
  } catch (error) {
    console.error('请求错误:', error);
  }
}

// 先测试登录获取token
async function login() {
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
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
    console.log('登录结果:', loginResult);
    
    if (loginResult.success && loginResult.data.token) {
      return loginResult.data.token;
    } else {
      console.error('登录失败');
      return null;
    }
  } catch (error) {
    console.error('登录错误:', error);
    return null;
  }
}

// 测试完整流程
async function testCompleteFlow() {
  console.log('=== 开始测试CSV导入 ===\n');
  
  // 1. 先登录获取token
  console.log('1. 尝试登录...');
  const token = await login();
  
  if (!token) {
    console.log('登录失败，无法继续测试');
    return;
  }
  
  console.log('登录成功，token获取成功');
  
  // 2. 测试导入
  console.log('\n2. 测试CSV导入...');
  
  const payload = {
    csvData: csvData
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/products/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log('导入响应状态:', response.status);
    console.log('导入响应内容:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ 导入成功!');
      console.log(`总计: ${result.data.total}`);
      console.log(`成功: ${result.data.successCount}`);
      console.log(`失败: ${result.data.errorCount}`);
      if (result.data.errors.length > 0) {
        console.log('错误信息:', result.data.errors);
      }
    } else {
      console.log('\n❌ 导入失败!');
      console.log('错误信息:', result.error);
      if (result.debug) {
        console.log('调试信息:', result.debug);
      }
    }
    
  } catch (error) {
    console.error('导入请求错误:', error);
  }
}

// 运行测试
testCompleteFlow();