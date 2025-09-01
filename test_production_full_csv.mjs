// 测试生产环境用户上传的完整CSV文件

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';

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

// 测试用户上传的完整CSV文件
async function testProductionFullCSVImport() {
  console.log('=== 测试生产环境完整CSV文件导入 ===\n');
  console.log('生产环境URL:', PRODUCTION_URL);
  
  // 1. 先登录获取token
  console.log('\n1. 尝试登录生产环境...');
  const token = await login();
  
  if (!token) {
    console.log('❌ 登录失败，无法继续测试');
    return;
  }
  
  console.log('✅ 登录成功，token获取成功');
  
  // 2. 从URL获取CSV数据
  console.log('\n2. 从用户上传的URL获取CSV数据...');
  
  try {
    const csvResponse = await fetch('https://page.gensparksite.com/get_upload_url/43c24bad48156d4ad708ecff9cd03dce31d40612d11491f48ad08e3164ded862/default/74903f6b-9490-40a8-b809-a29521d0ba38');
    const csvData = await csvResponse.text();
    
    console.log('CSV文件获取成功');
    console.log('CSV文件大小:', csvData.length, '字符');
    console.log('CSV行数:', csvData.split('\n').length);
    console.log('CSV文件前500字符:', csvData.substring(0, 500) + '...');
    
    // 3. 测试导入
    console.log('\n3. 测试生产环境完整CSV导入...');
    
    const payload = {
      csvData: csvData
    };
    
    const startTime = Date.now();
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('导入响应状态:', response.status);
    console.log('导入耗时:', duration, 'ms');
    console.log('导入响应内容:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n🎉 生产环境完整CSV导入成功!');
      console.log(`总计: ${result.data.total} 行`);
      console.log(`成功: ${result.data.successCount} 行`);
      console.log(`失败: ${result.data.errorCount} 行`);
      console.log(`成功率: ${((result.data.successCount / result.data.total) * 100).toFixed(2)}%`);
      console.log(`处理速度: ${(result.data.total / (duration / 1000)).toFixed(2)} 行/秒`);
      
      if (result.data.errors.length > 0) {
        console.log('前5个错误信息:', result.data.errors.slice(0, 5));
      }
    } else {
      console.log('\n❌ 生产环境导入失败!');
      console.log('错误信息:', result.error);
      if (result.debug) {
        console.log('调试信息:', result.debug);
      }
    }
    
  } catch (error) {
    console.error('导入请求错误:', error);
  }
  
  // 4. 检查最终商品数量
  console.log('\n4. 检查最终商品数量...');
  try {
    const queryResponse = await fetch(`${PRODUCTION_URL}/api/products?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const queryResult = await queryResponse.json();
    
    if (queryResult.success) {
      console.log('✅ 查询成功');
      console.log(`生产环境总商品数: ${queryResult.pagination.total}`);
    } else {
      console.log('❌ 查询失败:', queryResult.error);
    }
  } catch (error) {
    console.error('查询错误:', error);
  }
}

// 运行测试
testProductionFullCSVImport();