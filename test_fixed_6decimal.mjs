#!/usr/bin/env node

// 测试修复后的6位小数功能
console.log('🔧 测试修复后的6位小数价格功能...\n');

const BASE_URL = 'http://localhost:3000';

// 测试多个6位小数价格
const testProducts = [
    {
        name: '6位小数测试商品1',
        company_name: '测试公司',
        price: 123.456789,
        stock: 50,
        description: '测试6位小数: 123.456789',
        category: '测试分类',
        sku: 'TEST_6D_001'
    },
    {
        name: '6位小数测试商品2',
        company_name: '测试公司',
        price: 0.123456,
        stock: 100,
        description: '测试6位小数: 0.123456',
        category: '测试分类',
        sku: 'TEST_6D_002'
    },
    {
        name: '6位小数测试商品3',
        company_name: '测试公司',
        price: 999.000001,
        stock: 25,
        description: '测试6位小数: 999.000001',
        category: '测试分类',
        sku: 'TEST_6D_003'
    }
];

async function testAll() {
    try {
        // 登录
        console.log('🚀 步骤1: 用户登录...');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('登录失败: ' + loginData.error);
        }
        
        const authToken = loginData.data.token;
        console.log('✅ 登录成功\n');
        
        const results = [];
        
        // 测试每个商品
        for (let i = 0; i < testProducts.length; i++) {
            const product = testProducts[i];
            console.log(`🧪 测试商品 ${i + 1}: ${product.name}`);
            console.log(`   原始价格: ${product.price} (${product.price.toString().split('.')[1]?.length || 0}位小数)`);
            
            // 添加商品
            const addResponse = await fetch(`${BASE_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(product)
            });
            
            const addData = await addResponse.json();
            
            if (addData.success) {
                const savedPrice = addData.data.price;
                const precisionMaintained = savedPrice === product.price;
                
                console.log(`   保存价格: ${savedPrice} (${savedPrice.toString().split('.')[1]?.length || 0}位小数)`);
                console.log(`   精度保持: ${precisionMaintained ? '✅ 是' : '❌ 否'}`);
                
                results.push({
                    product: product.name,
                    original: product.price,
                    saved: savedPrice,
                    maintained: precisionMaintained,
                    productId: addData.data.id
                });
                
                // 验证通过API查询是否也正确
                const getResponse = await fetch(`${BASE_URL}/api/products/${addData.data.id}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const getData = await getResponse.json();
                if (getData.success) {
                    const queriedPrice = getData.data.price;
                    console.log(`   查询价格: ${queriedPrice} (${queriedPrice === savedPrice ? '✅ 一致' : '❌ 不一致'})`);
                }
            } else {
                console.log(`   ❌ 添加失败: ${addData.error}`);
                results.push({
                    product: product.name,
                    original: product.price,
                    saved: null,
                    maintained: false,
                    error: addData.error
                });
            }
            console.log('');
        }
        
        // 汇总结果
        console.log('📊 测试结果汇总:');
        console.log('═'.repeat(80));
        
        let successCount = 0;
        results.forEach((result, index) => {
            const status = result.maintained ? '✅ 成功' : '❌ 失败';
            console.log(`${index + 1}. ${result.product}: ${status}`);
            if (result.error) {
                console.log(`   错误: ${result.error}`);
            } else {
                console.log(`   ${result.original} → ${result.saved} (精度${result.maintained ? '保持' : '丢失'})`);
            }
            if (result.maintained) successCount++;
        });
        
        console.log('═'.repeat(80));
        console.log(`🎯 成功率: ${successCount}/${results.length} (${Math.round(successCount / results.length * 100)}%)`);
        
        if (successCount === results.length) {
            console.log('🎉 所有测试通过！6位小数功能正常工作');
        } else {
            console.log('⚠️ 部分测试失败，需要进一步检查');
        }
        
    } catch (error) {
        console.error('❌ 测试过程出错:', error.message);
    }
}

testAll();