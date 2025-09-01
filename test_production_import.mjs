// 测试生产环境的CSV导入功能

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

// 测试小量CSV数据导入
async function testProductionImport() {
  console.log('=== 测试生产环境CSV导入功能 ===\n');
  console.log('生产环境URL:', PRODUCTION_URL);
  
  // 1. 先登录获取token
  console.log('\n1. 尝试登录生产环境...');
  const token = await login();
  
  if (!token) {
    console.log('❌ 登录失败，无法继续测试');
    return;
  }
  
  console.log('✅ 登录成功，token获取成功');
  
  // 2. 测试CSV导入
  console.log('\n2. 测试生产环境CSV导入...');
  
  // 使用少量测试数据
  const testCsvData = `name,company_name,price,stock
TEST001,测试公司A,99.9,100
TEST002,测试公司B,199.8,200
TEST003,测试公司C,299.7,300`;
  
  const payload = {
    csvData: testCsvData
  };
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products/import-csv`, {
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
      console.log('\n✅ 生产环境导入成功!');
      console.log(`总计: ${result.data.total}`);
      console.log(`成功: ${result.data.successCount}`);
      console.log(`失败: ${result.data.errorCount}`);
      if (result.data.errors.length > 0) {
        console.log('错误信息:', result.data.errors);
      }
    } else {
      console.log('\n❌ 生产环境导入失败!');
      console.log('错误信息:', result.error);
      if (result.debug) {
        console.log('调试信息:', result.debug);
      }
    }
    
  } catch (error) {
    console.error('生产环境导入请求错误:', error);
  }
  
  // 3. 测试商品查询
  console.log('\n3. 测试商品查询API...');
  try {
    const queryResponse = await fetch(`${PRODUCTION_URL}/api/products?limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const queryResult = await queryResponse.json();
    
    if (queryResult.success) {
      console.log('✅ 商品查询成功');
      console.log(`总商品数: ${queryResult.pagination.total}`);
      console.log(`查询到商品: ${queryResult.data.length} 个`);
      if (queryResult.data.length > 0) {
        console.log('示例商品:', queryResult.data[0]);
      }
    } else {
      console.log('❌ 商品查询失败:', queryResult.error);
    }
  } catch (error) {
    console.error('商品查询错误:', error);
  }
}

// 运行测试
testProductionImport();