// 在浏览器控制台运行此脚本来调试6位小数问题

console.log('🔍 开始调试6位小数价格问题...\n');

// 测试1: 验证formatPrice函数
console.log('📊 测试formatPrice函数:');
const testPrices = [123.456789, 123.450000, 0.123456, 0.000001, 999.123456];
testPrices.forEach(price => {
    const formatted = formatPrice ? formatPrice(price) : 'formatPrice函数不存在';
    console.log(`  ${price} → ${formatted}`);
});

// 测试2: 检查当前页面的price输入框
console.log('\n🔍 检查价格输入框状态:');
const priceInput = document.getElementById('price');
if (priceInput) {
    console.log(`  ✅ 找到价格输入框`);
    console.log(`  type: ${priceInput.type}`);
    console.log(`  step: ${priceInput.step}`);
    console.log(`  min: ${priceInput.min}`);
    console.log(`  max: ${priceInput.max}`);
    console.log(`  当前值: "${priceInput.value}"`);
    
    // 测试设置6位小数值
    console.log('\n📝 测试设置6位小数值:');
    const testValue = '123.456789';
    priceInput.value = testValue;
    console.log(`  设置值: ${testValue}`);
    console.log(`  实际值: "${priceInput.value}"`);
    console.log(`  值是否保持: ${priceInput.value === testValue ? '✅' : '❌'}`);
    
    // 触发change事件
    priceInput.dispatchEvent(new Event('change'));
    console.log(`  触发change后值: "${priceInput.value}"`);
    
} else {
    console.log('  ❌ 未找到价格输入框 (可能不在添加商品页面)');
    console.log('  💡 请先进入"添加商品"页面再运行此脚本');
}

// 测试3: 模拟表单提交数据
console.log('\n📋 模拟表单数据处理:');
const testFormData = {
    price: '123.456789'
};

console.log(`  字符串价格: ${testFormData.price}`);
console.log(`  parseFloat结果: ${parseFloat(testFormData.price)}`);
console.log(`  Number结果: ${Number(testFormData.price)}`);
console.log(`  精度保持: ${parseFloat(testFormData.price).toString() === testFormData.price ? '✅' : '❌'}`);

// 测试4: 检查submitProductForm函数
console.log('\n🔍 检查submitProductForm函数是否存在:');
if (typeof submitProductForm === 'function') {
    console.log('  ✅ submitProductForm函数存在');
} else {
    console.log('  ❌ submitProductForm函数不存在');
}

console.log('\n🏁 调试完成，请查看上述结果');
console.log('💡 如发现问题，可能需要修改formatPrice函数或输入框配置');