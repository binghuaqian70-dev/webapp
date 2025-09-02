#!/usr/bin/env node

// 测试添加商品功能的调试脚本

const LOCAL_URL = 'https://3000-i0hivbqxbtr89a5ezwg6e-6532622b.e2b.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function testAddProduct() {
  console.log('🔐 正在登录...');
  
  try {
    // 1. 登录获取token
    const loginResponse = await fetch(`${LOCAL_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token;
    
    if (!token) {
      throw new Error('获取token失败');
    }

    console.log('✅ 登录成功');

    // 2. 测试添加商品
    console.log('📦 尝试添加商品...');
    
    const productData = {
      name: '调试测试商品',
      company_name: '调试测试公司',
      price: 99.99,
      stock: 50,
      description: '调试脚本测试商品',
      category: '调试测试'
    };

    console.log('发送的商品数据:', JSON.stringify(productData, null, 2));

    const addResponse = await fetch(`${LOCAL_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    const responseText = await addResponse.text();
    console.log('服务器响应状态:', addResponse.status);
    console.log('服务器响应内容:', responseText);

    if (addResponse.ok) {
      console.log('✅ 商品添加成功!');
      const result = JSON.parse(responseText);
      console.log('添加的商品信息:', result.data);
    } else {
      console.log('❌ 商品添加失败');
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  }
}

testAddProduct();