#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import csv
from io import StringIO

def test_clean_import():
    """在清空数据库后测试导入前5条数据"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("📄 读取CSV文件前5条数据...")
    
    csv_file = "51连接器-9.1-utf8-fixed.csv"
    with open(csv_file, 'r', encoding='utf-8') as f:
        csv_content = f.read()
    
    # 解析CSV并只取前5条
    csv_reader = csv.DictReader(StringIO(csv_content))
    test_products = []
    
    for i, row in enumerate(csv_reader):
        if i >= 5:  # 只取前5条
            break
        product = {
            "name": row.get("name", "").strip(),
            "company_name": row.get("company_name", "").strip(),
            "price": float(row.get("price", 0)),
            "stock": int(row.get("stock", 0)),
            "sku": row.get("sku", "").strip(),
            "category": row.get("category", "").strip(),
            "description": row.get("description", "").strip()
        }
        test_products.append(product)
    
    print(f"✅ 准备了 {len(test_products)} 条测试数据")
    for i, product in enumerate(test_products, 1):
        print(f"   {i}. {product['name']} (SKU: {product['sku']})")
    
    print(f"\n📤 测试导入（无认证）...")
    
    # 测试导入（这个API不需要认证）
    headers = {"Content-Type": "application/json"}
    import_data = {"products": test_products}
    
    try:
        response = requests.post(
            f"{base_url}/api/products/batch",
            json=import_data,
            headers=headers,
            timeout=30
        )
        
        print(f"导入响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"导入结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            if result.get("success"):
                data = result["data"]
                print(f"\n📊 导入统计:")
                print(f"   总数: {data['total']}")
                print(f"   成功: {data['successCount']}")
                print(f"   失败: {data['errorCount']}")
                
                if data['successCount'] == 5:
                    print(f"🎉 测试成功！所有5条数据都已导入")
                    return True
                else:
                    print(f"⚠️  部分数据导入失败")
                    return False
            else:
                print(f"❌ 导入失败: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP错误: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

if __name__ == '__main__':
    success = test_clean_import()
    
    if success:
        print(f"\n✅ 前5条数据导入成功！")
        print(f"💡 现在您可以在前端使用相同的CSV文件进行批量导入")
        print(f"🔗 访问: https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev")
        print(f"🔑 登录: admin/admin")
    else:
        print(f"\n❌ 导入测试失败，请检查问题")