#!/usr/bin/env python3
"""
数据迁移脚本：将开发环境的5000+商品数据迁移到生产环境
"""

import subprocess
import json
import time

def run_command(cmd):
    """执行命令并返回结果"""
    print(f"执行: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd='/home/user/webapp')
        if result.returncode != 0:
            print(f"错误: {result.stderr}")
            return None
        return result.stdout
    except Exception as e:
        print(f"执行错误: {e}")
        return None

def export_batch(offset, limit):
    """导出一批数据"""
    cmd = f'npx wrangler d1 execute webapp-production --local --command="SELECT name, company_name, price, stock, description, category, sku, status FROM products WHERE status = \'active\' ORDER BY id LIMIT {limit} OFFSET {offset};"'
    return run_command(cmd)

def create_insert_sql(data_list):
    """创建插入SQL语句"""
    if not data_list:
        return ""
    
    sql_values = []
    for item in data_list:
        # 处理可能包含单引号的字段
        name = item['name'].replace("'", "''") if item['name'] else ""
        company_name = item['company_name'].replace("'", "''") if item['company_name'] else ""
        description = item['description'].replace("'", "''") if item['description'] else ""
        category = item['category'].replace("'", "''") if item['category'] else ""
        sku = item['sku'].replace("'", "''") if item['sku'] else ""
        status = item['status'] if item['status'] else "active"
        
        sql_value = f"('{name}', '{company_name}', {item['price']}, {item['stock']}, '{description}', '{category}', '{sku}', '{status}')"
        sql_values.append(sql_value)
    
    sql = f"INSERT INTO products (name, company_name, price, stock, description, category, sku, status) VALUES {', '.join(sql_values)};"
    return sql

def import_batch_to_remote(sql):
    """将SQL导入到远程数据库"""
    # 创建临时SQL文件
    with open('/home/user/webapp/temp_batch.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
    
    cmd = 'npx wrangler d1 execute webapp-production --remote --file=./temp_batch.sql'
    return run_command(cmd)

def main():
    """主函数"""
    print("开始数据迁移...")
    
    batch_size = 100  # 每批处理100条数据
    total_migrated = 0
    offset = 0
    
    while True:
        print(f"\n正在导出第 {offset + 1} - {offset + batch_size} 条数据...")
        
        # 导出一批数据
        result = export_batch(offset, batch_size)
        if not result:
            print("导出失败，停止迁移")
            break
        
        try:
            # 解析JSON结果
            data = json.loads(result.split('[\n  {\n    "results":')[1].split('    "success": true,')[0])
            data = data.strip().rstrip(',')
            if data == '[]':
                print("没有更多数据，迁移完成")
                break
                
            # 解析数据
            data_list = json.loads(data)
            if not data_list:
                print("没有更多数据，迁移完成")
                break
            
            # 创建插入SQL
            sql = create_insert_sql(data_list)
            if not sql:
                print("SQL创建失败")
                break
            
            print(f"导入 {len(data_list)} 条数据到生产环境...")
            
            # 导入到远程数据库
            import_result = import_batch_to_remote(sql)
            if import_result and "success" in import_result:
                total_migrated += len(data_list)
                print(f"成功导入 {len(data_list)} 条，累计 {total_migrated} 条")
            else:
                print("导入失败，停止迁移")
                break
            
            offset += batch_size
            
            # 等待一下避免请求过于频繁
            time.sleep(1)
            
            # 如果数据少于batch_size，说明已经到最后一批
            if len(data_list) < batch_size:
                print("已到达最后一批，迁移完成")
                break
                
        except Exception as e:
            print(f"处理数据时出错: {e}")
            print(f"原始结果: {result[:500]}...")
            break
    
    print(f"\n数据迁移完成！总计迁移了 {total_migrated} 条数据")

if __name__ == "__main__":
    main()