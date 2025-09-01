// 测试字段映射功能
function testFieldMapping() {
    // 模拟中文CSV内容
    const csvContent = `商品名称,公司名称,售价,库存
电子连接器A,信都数字科技（上海）有限公司,15.50,100
电子连接器B,信都数字科技（上海）有限公司,25.80,50`;

    // 中文标题到英文字段的映射
    const fieldMapping = {
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
    
    function parseCSV(csvContent) {
        // 处理不同的换行符格式 (\r\n, \n, \r)
        const lines = csvContent.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // 跳过空行
            const values = lines[i].split(',');
            const row = {};
            
            headers.forEach((header, index) => {
                let value = values[index]?.trim() || '';
                // 移除可能的引号
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                
                // 使用映射将中文字段转换为英文字段
                const mappedField = fieldMapping[header] || header;
                row[mappedField] = value;
            });
            
            data.push(row);
        }
        
        return data;
    }

    console.log('原始CSV内容:');
    console.log(csvContent);
    console.log('\n解析后的数据:');
    
    const parsedData = parseCSV(csvContent);
    console.log(JSON.stringify(parsedData, null, 2));
    
    console.log('\n字段验证:');
    const requiredFields = ['name', 'company_name', 'price', 'stock'];
    const firstRow = parsedData[0];
    const availableFields = Object.keys(firstRow);
    const missingFields = requiredFields.filter(field => !availableFields.includes(field));
    
    console.log('需要的字段:', requiredFields);
    console.log('可用的字段:', availableFields);
    console.log('缺失的字段:', missingFields);
    
    if (missingFields.length === 0) {
        console.log('✅ 所有必要字段都存在！');
    } else {
        console.log('❌ 缺失字段:', missingFields);
    }
    
    return parsedData;
}

// 运行测试
testFieldMapping();