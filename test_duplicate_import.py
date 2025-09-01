#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import csv
from io import StringIO

def test_duplicate_import():
    """测试重复导入相同CSV数据"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("🔐 步骤1: 登录获取Token...")
    
    # 1. 登录获取Token
    response = requests.post(
        f"{base_url}/api/auth/login",
        json={"username": "admin", "password": "admin"}
    )
    
    if response.status_code != 200:
        print(f"❌ 登录失败: {response.text}")
        return
    
    token = response.json()["data"]["token"]
    print(f"✅ 登录成功!")
    
    print(f"\n📄 步骤2: 准备测试数据（前5条）...")
    
    # 2. 读取CSV文件前5条用于测试
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
    print(f"第一条: {test_products[0]['name']} (SKU: {test_products[0]['sku']})")
    
    print(f"\n📤 步骤3: 测试重复导入...")
    
    # 3. 测试导入（这些SKU应该已经存在）
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
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
                
                if data['errors']:
                    print(f"   错误信息:")
                    for error in data['errors'][:5]:  # 显示前5个错误
                        print(f"     - {error}")
            else:
                print(f"❌ 导入失败: {result.get('error')}")
        else:
            print(f"❌ HTTP错误: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    print(f"\n📋 步骤4: 验证数据库状态...")
    
    # 4. 检查数据库中连接器商品总数
    try:
        response = requests.get(
            f"{base_url}/api/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()["data"]
            print(f"✅ 当前数据库状态:")
            print(f"   商品总数: {stats['totalProducts']}")
            print(f"   总库存: {stats['totalStock']}")
            print(f"   总价值: ¥{stats['totalValue']}")
        else:
            print(f"❌ 获取统计失败: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 统计请求异常: {e}")

if __name__ == '__main__':
    test_duplicate_import()