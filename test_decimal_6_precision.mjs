#!/usr/bin/env node
/**
 * 测试小数点后6位价格支持
 */

const SERVICE_URL = 'https://3000-i0hivbqxbtr89a5ezwg6e-6532622b.e2b.dev';

// 测试价格数据 - 专门测试小数点后6位
const testPrices = [
    { value: 123.123456, description: '小数点后6位' },
    { value: 1.123456, description: '1位整数+6位小数' },
    { value: 0.123456, description: '0位整数+6位小数' },
    { value: 999.999999, description: '最大6位小数' },
    { value: 100.000001, description: '最小6位小数差' },
    { value: 50.12, description: '2位小数' },
    { value: 75.1234, description: '4位小数' },
    { value: 200.500000, description: '6位小数末尾为0' },
    { value: 0.000001, description: '最小非零6位小数' },
    { value: 123.000000, description: '整数但指定6位小数' }
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

// 前端价格格式化函数的JavaScript实现（用于测试）
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

async function main() {
    console.log('🧪 测试前端添加商品功能 - 小数点后6位价格支持');
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
    
    // 测试各种小数点后6位的价格
    console.log('💰 测试小数点后6位价格支持:');
    const results = [];
    
    for (const testPrice of testPrices) {
        const productId = await testAddProduct(token, testPrice.value, testPrice.description);
        
        if (productId) {
            // 验证存储的价格
            const storedProduct = await getProduct(token, productId);
            if (storedProduct) {
                const storedPrice = parseFloat(storedProduct.price);
                const isAccurate = Math.abs(storedPrice - testPrice.value) < 0.0000001;
                const frontendFormat = formatPrice(storedPrice);
                
                console.log(`   存储价格: ${storedPrice}`);
                console.log(`   前端显示: ¥${frontendFormat}`);
                console.log(`   精度检查: ${isAccurate ? '✅' : '❌'}`);
                
                results.push({
                    ...testPrice,
                    productId,
                    storedPrice,
                    frontendFormat,
                    isAccurate
                });
            }
        }
        
        console.log('');
        // 添加延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 测试结果汇总:');
    console.log('价格输入 -> 存储价格 -> 前端显示');
    results.forEach(result => {
        console.log(`${result.value} -> ${result.storedPrice} -> ¥${result.frontendFormat} ${result.isAccurate ? '✅' : '❌'}`);
    });
    
    const successCount = results.filter(r => r.isAccurate).length;
    const totalCount = results.length;
    
    console.log(`\n🎯 精度测试结果: ${successCount}/${totalCount} 通过 (${(successCount/totalCount*100).toFixed(1)}%)`);
    
    // 测试前端格式化函数的各种情况
    console.log('\n🎨 前端价格格式化测试:');
    const formatTests = [
        123.123456, // -> 123.123456
        1.10, // -> 1.10  
        100.000001, // -> 100.000001
        200.500000, // -> 200.50
        0.000001, // -> 0.000001
        123, // -> 123.00
        0 // -> 0.00
    ];
    
    formatTests.forEach(price => {
        console.log(`   ${price} -> ¥${formatPrice(price)}`);
    });
    
    if (successCount === totalCount) {
        console.log('\n🎉 所有小数点后6位价格测试均通过！功能正常');
    } else {
        console.log('\n⚠️ 部分测试未通过，需要检查实现');
    }
    
    console.log(`\n🌐 您可以访问 ${SERVICE_URL} 查看前端界面并手动测试添加商品功能`);
    console.log('   - 点击"添加商品"');
    console.log('   - 在"售价"字段试试输入: 123.123456 或 0.123456');
}

main().catch(console.error);