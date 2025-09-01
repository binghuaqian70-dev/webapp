#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests

def clear_connector_data():
    """清除数据库中所有连接器商品数据"""
    
    base_url = "https://3000-i210jj9hxq7tsgvpii0sp-6532622b.e2b.dev"
    
    print("🔐 步骤1: 登录获取Token...")
    
    # 1. 登录获取Token
    response = requests.post(
        f"{base_url}/api/auth/login",
        json={"username": "admin", "password": "admin"}
    )
    
    if response.status_code != 200:
        print(f"❌ 登录失败: {response.text}")
        return False
    
    token = response.json()["data"]["token"]
    print(f"✅ 登录成功!")
    
    print(f"\n📊 步骤2: 检查当前连接器商品数量...")
    
    # 2. 检查当前状态
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{base_url}/api/products?category=连接器&limit=1",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and "pagination" in result:
                connector_count = result["pagination"]["total"]
                print(f"✅ 当前连接器商品数量: {connector_count}")
                
                if connector_count == 0:
                    print("ℹ️  没有连接器商品需要清除")
                    return True
                    
            else:
                print(f"❌ 无法获取商品数据: {result}")
                return False
        else:
            print(f"❌ 获取商品数据失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False
    
    print(f"\n🗑️  步骤3: 删除所有连接器商品...")
    
    # 3. 获取所有连接器商品ID并删除
    try:
        # 分批获取和删除商品
        page = 1
        deleted_count = 0
        
        while True:
            response = requests.get(
                f"{base_url}/api/products?category=连接器&limit=50&page={page}",
                headers=headers
            )
            
            if response.status_code != 200:
                print(f"❌ 获取商品列表失败: {response.status_code}")
                break
            
            result = response.json()
            if not result.get("success"):
                print(f"❌ 获取商品列表失败: {result.get('error')}")
                break
            
            products = result.get("data", [])
            if not products:
                break  # 没有更多商品了
            
            print(f"📋 正在处理第 {page} 页，{len(products)} 个商品...")
            
            # 删除这一批商品
            for product in products:
                try:
                    delete_response = requests.delete(
                        f"{base_url}/api/products/{product['id']}",
                        headers=headers
                    )
                    
                    if delete_response.status_code == 200:
                        deleted_count += 1
                        if deleted_count % 10 == 0:
                            print(f"   已删除 {deleted_count} 个商品...")
                    else:
                        print(f"❌ 删除商品 {product['id']} 失败: {delete_response.status_code}")
                        
                except Exception as e:
                    print(f"❌ 删除商品 {product['id']} 异常: {e}")
            
            page += 1
            
            # 检查是否还有更多页
            if "pagination" in result and page > result["pagination"]["totalPages"]:
                break
        
        print(f"\n✅ 清除完成! 总共删除了 {deleted_count} 个连接器商品")
        
        # 4. 验证清除结果
        response = requests.get(
            f"{base_url}/api/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()["data"]
            print(f"\n📊 清除后数据库状态:")
            print(f"   商品总数: {stats['totalProducts']}")
            print(f"   总库存: {stats['totalStock']}")
            print(f"   总价值: ¥{stats['totalValue']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 清除过程异常: {e}")
        return False

if __name__ == '__main__':
    success = clear_connector_data()
    if success:
        print(f"\n🎉 连接器商品清除完成！现在可以重新导入CSV文件了")
    else:
        print(f"\n❌ 清除过程中遇到问题，请检查日志")