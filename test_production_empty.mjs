// 测试生产环境商品数据是否已清空

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

// 检查商品数据是否已清空
async function checkProductionData() {
  console.log('=== 检查生产环境商品数据 ===\n');
  console.log('生产环境URL:', PRODUCTION_URL);
  
  // 1. 先登录获取token
  console.log('\n1. 尝试登录生产环境...');
  const token = await login();
  
  if (!token) {
    console.log('❌ 登录失败，无法继续检查');
    return;
  }
  
  console.log('✅ 登录成功，token获取成功');
  
  // 2. 查询商品数量
  console.log('\n2. 查询商品数量...');
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
      console.log(`查询到商品: ${queryResult.data.length} 个`);
      
      if (queryResult.pagination.total === 0) {
        console.log('🎉 生产环境商品数据已成功清空!');
      } else {
        console.log('⚠️ 生产环境还有商品数据');
        console.log('示例商品:', queryResult.data[0]);
      }
    } else {
      console.log('❌ 查询失败:', queryResult.error);
    }
  } catch (error) {
    console.error('查询错误:', error);
  }
}

// 运行检查
checkProductionData();