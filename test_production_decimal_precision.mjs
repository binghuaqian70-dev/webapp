#!/usr/bin/env node
/**
 * 测试生产环境小数点后6位价格支持
 */

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';

async function login() {
    try {
        const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
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
            name: `生产测试-${description}`,
            company_name: '生产测试公司',
            price: price,
            stock: 100,
            description: `生产环境测试 - ${description}，价格: ${price}`,
            category: '生产测试'
        };
        
        const response = await fetch(`${PRODUCTION_URL}/api/products`, {
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
        const response = await fetch(`${PRODUCTION_URL}/api/products/${id}`, {
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
    console.log('🚀 生产环境小数点后6位价格功能测试');
    console.log(`🌐 生产地址: ${PRODUCTION_URL}`);
    console.log('');
    
    // 登录
    console.log('🔐 登录生产环境...');
    const token = await login();
    if (!token) {
        console.error('❌ 登录失败，测试终止');
        process.exit(1);
    }
    console.log('✅ 登录成功\n');
    
    // 测试关键的小数点后6位价格
    const keyTests = [
        { value: 123.123456, description: '完整6位小数' },
        { value: 0.123456, description: '零点6位小数' },
        { value: 999.000001, description: '微小精度差' }
    ];
    
    console.log('💰 生产环境价格精度测试:');
    
    for (const test of keyTests) {
        const productId = await testAddProduct(token, test.value, test.description);
        
        if (productId) {
            const storedProduct = await getProduct(token, productId);
            if (storedProduct) {
                const storedPrice = parseFloat(storedProduct.price);
                const isAccurate = Math.abs(storedPrice - test.value) < 0.0000001;
                
                console.log(`   存储价格: ${storedPrice}`);
                console.log(`   精度检查: ${isAccurate ? '✅' : '❌'}`);
            }
        }
        console.log('');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 生产环境测试完成！');
    console.log(`\n🌐 现在您可以访问 ${PRODUCTION_URL} 测试前端界面:`);
    console.log('   1. 使用 admin/admin123 登录');
    console.log('   2. 点击"添加商品"');
    console.log('   3. 在售价字段输入 123.123456 测试小数点后6位');
}

main().catch(console.error);