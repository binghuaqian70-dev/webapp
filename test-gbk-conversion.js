// 测试GBK转换功能
const testData = {
  csvData: `商品名称,公司名称,售价,库存
连接器X1,�Ŷ����ֿƼ����Ϻ������޹�˾,25.50,150
连接器Y2,信都数字科技（上海）有限公司,35.80,75`
};

// 模拟API调用
async function testGBKConversion() {
  try {
    const response = await fetch('http://localhost:3000/api/products/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU2NzE1ODQyLCJleHAiOjE3NTY4MDIyNDJ9.lbA9UWYWKS6EzLpq0DOs1R9ia6_LrL2o4tsLNEdKyDI'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGBKConversion();