#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_complete_auth_flow():
    """测试完整的认证和API访问流程"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("🔐 步骤1: 管理员登录...")
    
    # 1. 管理员登录
    response = requests.post(
        f"{base_url}/api/auth/login",
        json={"username": "admin", "password": "admin"},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200 or not response.json().get("success"):
        print(f"❌ 登录失败: {response.text}")
        return
    
    admin_token = response.json()["data"]["token"]
    print(f"✅ 管理员登录成功! Token: {admin_token[:50]}...")
    
    print(f"\n📊 步骤2: 访问统计信息API...")
    
    # 2. 使用Token访问受保护的API
    response = requests.get(
        f"{base_url}/api/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        stats = response.json()
        if stats.get("success"):
            print("✅ 统计信息获取成功:")
            data = stats["data"]
            print(f"   商品总数: {data.get('totalProducts')}")
            print(f"   总库存: {data.get('totalStock')}")
            print(f"   总价值: ¥{data.get('totalValue')}")
            print(f"   公司数量: {data.get('totalCompanies')}")
        else:
            print(f"❌ 统计信息获取失败: {stats.get('error')}")
    else:
        print(f"❌ 统计信息API访问失败: {response.status_code} - {response.text}")
    
    print(f"\n📋 步骤3: 访问商品列表...")
    
    # 3. 获取商品列表
    response = requests.get(
        f"{base_url}/api/products?limit=5",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        products = response.json()
        if products.get("success"):
            print("✅ 商品列表获取成功:")
            product_list = products["data"]
            print(f"   返回 {len(product_list)} 条商品")
            for product in product_list[:3]:  # 显示前3条
                print(f"   - {product['name']} (SKU: {product['sku']}, 价格: ¥{product['price']})")
        else:
            print(f"❌ 商品列表获取失败: {products.get('error')}")
    else:
        print(f"❌ 商品列表API访问失败: {response.status_code} - {response.text}")
    
    print(f"\n🔍 步骤4: 搜索连接器商品...")
    
    # 4. 搜索连接器商品
    response = requests.get(
        f"{base_url}/api/products?category=连接器&limit=3",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        connectors = response.json()
        if connectors.get("success"):
            print("✅ 连接器商品搜索成功:")
            connector_list = connectors["data"]
            print(f"   找到 {len(connector_list)} 条连接器商品")
            for connector in connector_list:
                print(f"   - {connector['name']} (库存: {connector['stock']}, 公司: {connector['company_name']})")
        else:
            print(f"❌ 连接器搜索失败: {connectors.get('error')}")
    else:
        print(f"❌ 连接器搜索API访问失败: {response.status_code} - {response.text}")
    
    print(f"\n🚫 步骤5: 测试无Token访问(应该失败)...")
    
    # 5. 测试无Token访问
    response = requests.get(f"{base_url}/api/stats")
    
    if response.status_code == 401:
        print("✅ 无Token访问正确被拒绝")
    else:
        print(f"❌ 无Token访问应该被拒绝，但返回: {response.status_code}")
    
    print(f"\n🎉 完整认证流程测试完成!")

if __name__ == '__main__':
    test_complete_auth_flow()