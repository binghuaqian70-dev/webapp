#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_login_simple():
    """简单测试登录功能"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("🔐 测试登录功能...")
    
    # 测试数据
    test_cases = [
        {"username": "admin", "password": "admin", "expected": "应该成功"},
        {"username": "user", "password": "user", "expected": "应该成功"},
        {"username": "admin", "password": "wrong", "expected": "应该失败"},
        {"username": "nonexist", "password": "admin", "expected": "应该失败"}
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n--- 测试 {i}: {test_case['expected']} ---")
        print(f"用户名: {test_case['username']}, 密码: {test_case['password']}")
        
        try:
            response = requests.post(
                f"{base_url}/api/auth/login",
                json={
                    "username": test_case["username"],
                    "password": test_case["password"]
                },
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"HTTP状态码: {response.status_code}")
            
            try:
                result = response.json()
                print(f"响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                if result.get("success"):
                    print("✅ 登录成功!")
                    if result.get("token"):
                        print(f"🎫 Token: {result['token'][:50]}...")
                else:
                    print(f"❌ 登录失败: {result.get('error')}")
                    
            except json.JSONDecodeError:
                print(f"响应内容（非JSON）: {response.text}")
                
        except Exception as e:
            print(f"❌ 请求异常: {e}")

if __name__ == '__main__':
    test_login_simple()