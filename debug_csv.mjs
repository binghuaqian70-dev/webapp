import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取CSV文件
const csvData = fs.readFileSync(path.join(__dirname, '9.1汇总表-utf8_part_01.csv'), 'utf8');

console.log('CSV文件内容:');
console.log(csvData);

// 解析CSV数据
const lines = csvData.trim().split('\n');
console.log('\nCSV解析出行数:', lines.length);

const headers = lines[0].split(',').map(h => h.trim());
console.log('CSV表头:', headers);

// 定义中文标题到英文字段的映射
const fieldMapping = {
  // 中文标题映射
  '商品名称': 'name',
  '公司名称': 'company_name', 
  '售价': 'price',
  '库存': 'stock',
  '分类': 'category',
  '描述': 'description',
  'SKU': 'sku',
  // 英文标题（保持兼容性）
  'name': 'name',
  'company_name': 'company_name',
  'price': 'price', 
  'stock': 'stock',
  'category': 'category',
  'description': 'description',
  'sku': 'sku'
};

// 将原始标题映射到标准字段
const mappedHeaders = headers.map(header => fieldMapping[header] || header);
console.log('原始标题:', headers);
console.log('映射后标题:', mappedHeaders);

// 验证必须的列是否存在
const requiredFields = ['name', 'company_name', 'price', 'stock'];
const missingFields = requiredFields.filter(field => !mappedHeaders.includes(field));

console.log('必需字段:', requiredFields);
console.log('缺失字段:', missingFields);

// 解析前几行数据测试
for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
  const values = lines[i].split(',');
  console.log(`\n第${i}行数据:`);
  console.log('原始值:', values);
  
  const product = {};
  
  // 映射数据到对应字段
  headers.forEach((originalHeader, index) => {
    const cleanHeader = originalHeader.trim();
    const standardField = fieldMapping[cleanHeader] || cleanHeader;
    let value = values[index]?.trim() || '';
    
    console.log(`  ${cleanHeader} -> ${standardField} = "${value}"`);
    
    // 根据标准字段名进行数据类型转换
    if (standardField === 'price') {
      product[standardField] = parseFloat(value) || 0;
    } else if (standardField === 'stock') {
      product[standardField] = parseInt(value) || 0;
    } else if (standardField) {
      product[standardField] = value;
    }
  });
  
  console.log('  最终产品对象:', product);
  
  // 验证必填字段
  const validation = {
    name: !!product.name,
    company_name: !!product.company_name,
    price: product.price !== undefined,
    stock: product.stock !== undefined
  };
  
  console.log('  字段验证:', validation);
  const isValid = validation.name && validation.company_name && validation.price && validation.stock;
  console.log('  验证结果:', isValid ? '✅ 通过' : '❌ 失败');
}