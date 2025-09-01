#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import csv
from io import StringIO

def csv_to_products(csv_content):
    """将CSV内容转换为products数组"""
    products = []
    
    csv_reader = csv.DictReader(StringIO(csv_content))
    
    for row in csv_reader:
        product = {
            "name": row.get("name", "").strip(),
            "company_name": row.get("company_name", "").strip(),
            "price": float(row.get("price", 0)),
            "stock": int(row.get("stock", 0)),
            "sku": row.get("sku", "").strip(),
            "category": row.get("category", "").strip(),
            "description": row.get("description", "").strip()
        }
        products.append(product)
    
    return products

def test_batch_import_fixed():
    """测试批量导入API（修复版本）"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("📄 步骤1: 读取修复后的CSV文件...")
    
    # 1. 读取修复后的CSV文件并转换为products数组
    csv_file = "51连接器-9.1-utf8-fixed.csv"
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            csv_content = f.read()
        
        products = csv_to_products(csv_content)
        print(f"✅ 成功读取CSV文件，共{len(products)}条商品数据")
        print(f"📋 第一条商品示例: {json.dumps(products[0], indent=2, ensure_ascii=False)}")
        
    except Exception as e:
        print(f"❌ 读取CSV文件失败: {e}")
        return
    
    print(f"\n📤 步骤2: 测试批量导入API（无认证模式）...")
    
    # 2. 先尝试少量数据测试（前5条）
    test_products = products[:5]
    
    import_data = {
        "products": test_products
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(
            f"{base_url}/api/products/batch",
            json=import_data,
            headers=headers,
            timeout=30
        )
        
        print(f"导入响应状态: {response.status_code}")
        print(f"导入响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"✅ 小批量导入测试成功!")
                print(f"📊 导入结果: {json.dumps(result.get('results', {}), indent=2, ensure_ascii=False)}")
                
                # 如果小批量测试成功，继续导入所有数据
                print(f"\n📤 步骤3: 导入所有{len(products)}条数据...")
                
                full_import_data = {"products": products}
                
                response = requests.post(
                    f"{base_url}/api/products/batch",
                    json=full_import_data,
                    headers=headers,
                    timeout=60
                )
                
                print(f"完整导入响应状态: {response.status_code}")
                result = response.json()
                print(f"完整导入响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
            else:
                print(f"❌ 小批量导入失败: {result.get('error')}")
        else:
            print(f"❌ HTTP响应错误: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 导入请求异常: {e}")

if __name__ == '__main__':
    test_batch_import_fixed()