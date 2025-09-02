#!/usr/bin/env node

// 测试生产环境的6位小数功能
console.log('🌐 测试生产环境6位小数价格功能...\n');

const PRODUCTION_URL = 'https://fc9bc1cb.webapp-csv-import.pages.dev';

// 测试6位小数价格商品
const testProduct = {
    name: '生产环境6位小数测试',
    company_name: '生产测试公司',
    price: 456.789123,
    stock: 50,
    description: '生产环境测试6位小数价格: 456.789123',
    category: '生产测试',
    sku: 'PROD_6D_' + Date.now()
};

async function testProduction() {
    try {
        console.log('🚀 步骤1: 连接生产环境...');
        console.log(`🔗 URL: ${PRODUCTION_URL}\n`);
        
        // 测试连通性
        const healthCheck = await fetch(`${PRODUCTION_URL}/`);
        if (!healthCheck.ok) {
            throw new Error(`生产环境连接失败: ${healthCheck.status}`);
        }
        console.log('✅ 生产环境连接正常\n');
        
        console.log('🚀 步骤2: 管理员登录...');
        const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('生产环境登录失败: ' + loginData.error);
        }
        
        const authToken = loginData.data.token;
        console.log('✅ 生产环境登录成功\n');
        
        console.log('🚀 步骤3: 测试6位小数商品添加...');
        console.log(`📦 测试商品: ${testProduct.name}`);
        console.log(`💰 测试价格: ${testProduct.price} (${testProduct.price.toString().split('.')[1]?.length}位小数)\n`);
        
        const addResponse = await fetch(`${PRODUCTION_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testProduct)
        });
        
        const addData = await addResponse.json();
        
        if (!addData.success) {
            throw new Error('生产环境添加商品失败: ' + addData.error);
        }
        
        const savedProduct = addData.data;
        const precisionMaintained = savedProduct.price === testProduct.price;
        
        console.log('📊 生产环境测试结果:');
        console.log('═'.repeat(50));
        console.log(`✅ 商品ID: ${savedProduct.id}`);
        console.log(`💰 原始价格: ${testProduct.price}`);
        console.log(`💾 保存价格: ${savedProduct.price}`);
        console.log(`🎯 精度保持: ${precisionMaintained ? '✅ 是' : '❌ 否'}`);
        console.log(`🔢 保存精度: ${savedProduct.price.toString().split('.')[1]?.length || 0}位小数`);
        console.log('═'.repeat(50));
        
        if (precisionMaintained) {
            console.log('🎉 生产环境6位小数功能测试成功！');
            console.log('🌟 用户可以正常使用6位小数价格功能');
        } else {
            console.log('⚠️ 生产环境精度测试失败');
            console.log(`📊 精度差异: ${testProduct.price} → ${savedProduct.price}`);
        }
        
        console.log('\n🚀 步骤4: 验证查询功能...');
        const getResponse = await fetch(`${PRODUCTION_URL}/api/products/${savedProduct.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const getData = await getResponse.json();
        if (getData.success) {
            const queriedProduct = getData.data;
            const queryPrecision = queriedProduct.price === testProduct.price;
            console.log(`🔍 查询价格: ${queriedProduct.price}`);
            console.log(`🎯 查询精度: ${queryPrecision ? '✅ 正确' : '❌ 错误'}`);
        }
        
        console.log('\n🎯 生产环境测试总结:');
        console.log(`📊 API功能: ${precisionMaintained ? '✅ 正常' : '❌ 异常'}`);
        console.log(`🌐 生产地址: ${PRODUCTION_URL}`);
        console.log(`📱 用户登录: admin/admin123`);
        console.log(`💡 建议操作: 登录后进入"添加商品"页面测试6位小数输入`);
        
    } catch (error) {
        console.error('❌ 生产环境测试失败:', error.message);
        console.log('\n🔧 故障排除建议:');
        console.log('1. 检查生产环境是否正常运行');
        console.log('2. 验证Cloudflare Pages部署状态');
        console.log('3. 确认API端点是否正常响应');
    }
}

testProduction();