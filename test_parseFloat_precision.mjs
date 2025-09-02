#!/usr/bin/env node

// 测试parseFloat精度问题
console.log('🔍 测试JavaScript parseFloat精度问题...\n');

const testValues = [
    '123.456789',
    '123.450000', 
    '0.123456',
    '0.000001',
    '999.123456',
    '0.999999'
];

console.log('📊 parseFloat精度测试:');
testValues.forEach(value => {
    const parsed = parseFloat(value);
    const backToString = parsed.toString();
    const decimalPlaces = backToString.split('.')[1]?.length || 0;
    
    console.log(`  输入: ${value}`);
    console.log(`  parseFloat: ${parsed}`);
    console.log(`  toString: ${backToString}`);
    console.log(`  小数位数: ${decimalPlaces}`);
    console.log(`  精度保持: ${value === backToString ? '✅' : '❌'}`);
    console.log('');
});

console.log('🔬 JavaScript浮点数精度测试:');
console.log(`  123.456789 === 123.456789: ${123.456789 === 123.456789}`);
console.log(`  0.1 + 0.2 === 0.3: ${0.1 + 0.2 === 0.3}`);
console.log(`  0.1 + 0.2: ${0.1 + 0.2}`);

console.log('\n💡 解决方案测试 - 使用Number()而不是parseFloat():');
testValues.forEach(value => {
    const parseFloatResult = parseFloat(value);
    const numberResult = Number(value);
    
    console.log(`  输入: ${value}`);
    console.log(`  parseFloat: ${parseFloatResult}`);
    console.log(`  Number: ${numberResult}`);
    console.log(`  相同结果: ${parseFloatResult === numberResult ? '✅' : '❌'}`);
    console.log('');
});

console.log('🎯 建议的前端修复方案:');
console.log('将 parseFloat(document.getElementById("price").value) 改为:');
console.log('Number(document.getElementById("price").value) 或');
console.log('直接使用字符串值让后端处理精度');