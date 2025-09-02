#!/usr/bin/env node

// 测试6位小数商品添加的具体问题
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';

console.log('🔍 测试6位小数商品添加问题...\n');

// 测试用的商品数据
const testProduct = {
    name: '测试商品_6位小数',
    company_name: '测试公司',
    price: 123.456789,  // 6位小数
    stock: 100,
    description: '测试6位小数价格的商品',
    category: '电子产品',
    sku: 'TEST_6DECIMAL_001'
};

console.log('📦 要添加的商品数据:');
console.log(JSON.stringify(testProduct, null, 2));
console.log(`🔢 价格精度: ${testProduct.price} (${testProduct.price.toString().split('.')[1]?.length || 0}位小数)\n`);

async function testAddProduct() {
    try {
        console.log('🚀 步骤1: 尝试用户登录...');
        
        // 先登录获取token
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('✅ 登录结果:', loginData.success ? '成功' : '失败');
        
        if (!loginData.success) {
            console.log('❌ 登录失败:', loginData.error);
            return;
        }
        
        const authToken = loginData.data.token;
        console.log('🔑 已获取认证token\n');
        
        console.log('🚀 步骤2: 尝试添加商品...');
        
        // 添加商品
        const addProductResponse = await fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testProduct)
        });
        
        const responseText = await addProductResponse.text();
        console.log('📡 响应状态码:', addProductResponse.status);
        console.log('📡 响应内容长度:', responseText.length);
        
        let addProductData;
        try {
            addProductData = JSON.parse(responseText);
            console.log('✅ JSON解析成功');
        } catch (parseError) {
            console.log('❌ JSON解析失败:', parseError.message);
            console.log('📄 原始响应内容:', responseText.substring(0, 500));
            return;
        }
        
        console.log('📄 添加商品结果:', JSON.stringify(addProductData, null, 2));
        
        if (!addProductData.success) {
            console.log('❌ 添加商品失败:', addProductData.error);
            return;
        }
        
        const productId = addProductData.data.id;
        console.log(`✅ 商品添加成功! ID: ${productId}\n`);
        
        console.log('🚀 步骤3: 验证商品数据...');
        
        // 查询刚添加的商品
        const getProductResponse = await fetch(`${BASE_URL}/api/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const getProductData = await getProductResponse.json();
        console.log('📄 查询商品结果:', JSON.stringify(getProductData, null, 2));
        
        if (getProductData.success) {
            const savedProduct = getProductData.data;
            console.log(`💰 保存的价格: ${savedProduct.price}`);
            console.log(`🔢 价格精度: ${savedProduct.price.toString().split('.')[1]?.length || 0}位小数`);
            console.log(`🔍 精度保持: ${savedProduct.price === testProduct.price ? '✅ 是' : '❌ 否'}`);
            
            if (savedProduct.price !== testProduct.price) {
                console.log(`⚠️ 价格精度丢失: ${testProduct.price} → ${savedProduct.price}`);
            }
        }
        
        console.log('\n🚀 步骤4: 测试前端显示...');
        
        // 测试前端价格格式化函数
        console.log('💻 前端formatPrice函数测试:');
        
        const formatPriceTests = [
            123.456789,
            123.450000,
            123.45,
            123,
            0.123456,
            0.120000,
            0
        ];
        
        // 这里我们需要模拟前端的formatPrice函数
        function formatPrice(price) {
            const num = parseFloat(price);
            if (isNaN(num)) {
                return '0.00';
            }
            
            // 对于零值，显示标准格式
            if (num === 0) {
                return '0.00';
            }
            
            // 使用toFixed(6)确保最多显示小数点后6位，然后去掉末尾的零
            let formatted = num.toFixed(6);
            
            // 去掉末尾的零，但保留至少2位小数（除非小数部分全是零且只有整数）
            formatted = formatted.replace(/(\.\d*?)0+$/, '$1');
            
            // 如果去掉零后小数点后没有数字，保留2位小数
            if (formatted.endsWith('.')) {
                formatted = formatted + '00';
            } else if (formatted.includes('.')) {
                // 确保至少有2位小数（对于常规价格显示）
                const decimalPart = formatted.split('.')[1];
                if (decimalPart.length === 1) {
                    formatted = formatted + '0';
                }
            } else {
                // 纯整数，添加.00
                formatted = formatted + '.00';
            }
            
            return formatted;
        }
        
        formatPriceTests.forEach(price => {
            const formatted = formatPrice(price);
            console.log(`  ${price} → ${formatted}`);
        });
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        console.error(error.stack);
    }
}

// 运行测试
testAddProduct().then(() => {
    console.log('\n🏁 测试完成');
}).catch(error => {
    console.error('❌ 测试失败:', error);
});