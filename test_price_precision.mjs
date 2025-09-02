#!/usr/bin/env node
/**
 * 测试价格精度支持 - 验证6位有效数字
 */

const SERVICE_URL = 'https://3000-i0hivbqxbtr89a5ezwg6e-6532622b.e2b.dev';

// 测试价格数据
const testPrices = [
    { value: 123.456, description: '常规3位小数' },
    { value: 0.000123, description: '6位有效数字小数' },
    { value: 0.123456, description: '6位小数' },
    { value: 999.999, description: '3位小数' },
    { value: 0.0001, description: '4位小数' },
    { value: 123, description: '整数' },
    { value: 0, description: '零价格' }
];

async function login() {
    try {
        const response = await fetch(`${SERVICE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            return data.token || data.data?.token;
        }
        throw new Error(data.error || '登录失败');
    } catch (error) {
        console.error('登录失败:', error.message);
        return null;
    }
}

async function testAddProduct(token, price, description) {
    try {
        const product = {
            name: `测试商品-${description}`,
            company_name: '测试公司',
            price: price,
            stock: 100,
            description: `测试商品 - ${description}，价格: ${price}`,
            category: '测试分类'
        };
        
        const response = await fetch(`${SERVICE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(product)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${description}: ${price} -> 商品ID: ${data.data.id}`);
            return data.data.id;
        } else {
            console.log(`❌ ${description}: ${price} -> 错误: ${data.error}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ ${description}: ${price} -> 异常: ${error.message}`);
        return null;
    }
}

async function getProduct(token, id) {
    try {
        const response = await fetch(`${SERVICE_URL}/api/products/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('🧪 测试前端添加商品功能 - 6位有效数字价格支持');
    console.log(`🌐 服务地址: ${SERVICE_URL}`);
    console.log('');
    
    // 登录
    console.log('🔐 登录系统...');
    const token = await login();
    if (!token) {
        console.error('❌ 登录失败，测试终止');
        process.exit(1);
    }
    console.log('✅ 登录成功\n');
    
    // 测试各种价格精度
    console.log('💰 测试价格精度支持:');
    const results = [];
    
    for (const testPrice of testPrices) {
        const productId = await testAddProduct(token, testPrice.value, testPrice.description);
        
        if (productId) {
            // 验证存储的价格
            const storedProduct = await getProduct(token, productId);
            if (storedProduct) {
                const storedPrice = parseFloat(storedProduct.price);
                const isAccurate = Math.abs(storedPrice - testPrice.value) < 0.0000001;
                
                console.log(`   存储价格: ${storedPrice}, 精度检查: ${isAccurate ? '✅' : '❌'}`);
                results.push({
                    ...testPrice,
                    productId,
                    storedPrice,
                    isAccurate
                });
            }
        }
        
        // 添加延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 测试结果汇总:');
    results.forEach(result => {
        console.log(`   ${result.description}: ${result.value} -> ${result.storedPrice} (${result.isAccurate ? '精确' : '不精确'})`);
    });
    
    const successCount = results.filter(r => r.isAccurate).length;
    const totalCount = results.length;
    
    console.log(`\n🎯 精度测试结果: ${successCount}/${totalCount} 通过 (${(successCount/totalCount*100).toFixed(1)}%)`);
    
    if (successCount === totalCount) {
        console.log('🎉 所有价格精度测试均通过！6位有效数字支持正常');
    } else {
        console.log('⚠️ 部分价格精度测试未通过，需要检查实现');
    }
    
    console.log(`\n🌐 您可以访问 ${SERVICE_URL} 查看前端界面并手动测试添加商品功能`);
}

main().catch(console.error);