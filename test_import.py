#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import time

def test_batch_import():
    """测试批量导入API"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("🔐 步骤1: 登录获取Token...")
    
    # 1. 登录获取token
    login_data = {
        "username": "admin", 
        "password": "admin"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"登录响应状态: {response.status_code}")
        print(f"登录响应内容: {response.text}")
        
        if response.status_code != 200:
            print("❌ 登录失败，尝试直接测试导入...")
            token = None
        else:
            result = response.json()
            if result.get("success"):
                token = result.get("token")
                print(f"✅ 登录成功! Token: {token[:30]}...")
            else:
                print(f"❌ 登录失败: {result.get('error')}")
                token = None
                
    except Exception as e:
        print(f"❌ 登录请求异常: {e}")
        token = None
    
    print(f"\n📄 步骤2: 读取修复后的CSV文件...")
    
    # 2. 读取修复后的CSV文件
    csv_file = "51连接器-9.1-utf8-fixed.csv"
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            csv_content = f.read()
        print(f"✅ 成功读取CSV文件，内容长度: {len(csv_content)} 字符")
        print(f"📋 前200个字符: {csv_content[:200]}...")
    except Exception as e:
        print(f"❌ 读取CSV文件失败: {e}")
        return
    
    print(f"\n📤 步骤3: 测试批量导入API...")
    
    # 3. 测试批量导入
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    import_data = {
        "csvData": csv_content
    }
    
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
                print(f"✅ 批量导入成功!")
                print(f"📊 导入结果: {json.dumps(result.get('results', {}), indent=2, ensure_ascii=False)}")
            else:
                print(f"❌ 批量导入失败: {result.get('error')}")
        else:
            print(f"❌ HTTP响应错误: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 导入请求异常: {e}")
    
    print(f"\n📊 步骤4: 查看统计信息...")
    
    # 4. 查看统计信息
    try:
        headers_stats = {}
        if token:
            headers_stats["Authorization"] = f"Bearer {token}"
            
        response = requests.get(
            f"{base_url}/api/stats",
            headers=headers_stats
        )
        
        print(f"统计响应状态: {response.status_code}")
        print(f"统计响应内容: {response.text}")
        
    except Exception as e:
        print(f"❌ 统计请求异常: {e}")

if __name__ == '__main__':
    test_batch_import()