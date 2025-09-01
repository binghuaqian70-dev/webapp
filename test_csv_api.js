// 测试中文CSV导入API
const testCSV = `商品名称,公司名称,售价,库存
USB连接器,苹果公司,15.99,100
HDMI连接器,三星电子,25.50,50`;

fetch('http://localhost:3000/api/products/import-csv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ csvData: testCSV })
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
})
.catch((error) => {
  console.error('Error:', error);
});