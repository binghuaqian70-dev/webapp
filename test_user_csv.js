import fs from 'fs';

// 读取用户的CSV文件
const csvContent = fs.readFileSync('51连接器-9.1-utf8.csv', 'utf8');

// 取前10行测试
const lines = csvContent.split('\n');
const testLines = lines.slice(0, 11).join('\n'); // 包含标题+10行数据

console.log('Testing with first 10 lines:');
console.log(testLines);

fetch('http://localhost:3000/api/products/import-csv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ csvData: testLines })
})
.then(response => response.json())
.then(data => {
  console.log('Import result:', data);
})
.catch((error) => {
  console.error('Error:', error);
});