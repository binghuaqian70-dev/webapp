#!/usr/bin/env python3
"""
简化的数据导出脚本：将开发环境数据导出为SQL文件
"""

import subprocess
import json

def run_wrangler_query(query):
    """执行wrangler查询并返回结果"""
    cmd = ['npx', 'wrangler', 'd1', 'execute', 'webapp-production', '--local', '--command', query]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd='/home/user/webapp')
    
    if result.returncode != 0:
        print(f"查询错误: {result.stderr}")
        return None
    
    try:
        # 提取JSON部分
        output = result.stdout
        json_start = output.find('[\n  {\n    "results":')
        if json_start == -1:
            return None
            
        json_part = output[json_start:]
        json_end = json_part.find('\n]\n')
        if json_end == -1:
            return None
            
        json_str = json_part[:json_end + 2]
        data = json.loads(json_str)
        return data[0]["results"] if data and "results" in data[0] else []
    except Exception as e:
        print(f"JSON解析错误: {e}")
        return None

def escape_sql_string(s):
    """转义SQL字符串"""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def main():
    print("开始导出数据...")
    
    # 获取总数
    total_query = "SELECT COUNT(*) as total FROM products WHERE status = 'active'"
    total_result = run_wrangler_query(total_query)
    
    if not total_result:
        print("无法获取数据总数")
        return
    
    total_count = total_result[0]["total"]
    print(f"找到 {total_count} 条数据")
    
    # 分批导出数据
    batch_size = 500
    sql_lines = []
    
    for offset in range(0, total_count, batch_size):
        print(f"导出 {offset + 1} - {min(offset + batch_size, total_count)} 条数据...")
        
        query = f"SELECT name, company_name, price, stock, description, category, sku, status FROM products WHERE status = 'active' ORDER BY id LIMIT {batch_size} OFFSET {offset}"
        
        batch_data = run_wrangler_query(query)
        if not batch_data:
            print(f"导出第 {offset} 批数据失败")
            continue
        
        # 转换为SQL INSERT语句
        for item in batch_data:
            name = escape_sql_string(item.get('name'))
            company_name = escape_sql_string(item.get('company_name'))
            price = item.get('price', 0)
            stock = item.get('stock', 0)
            description = escape_sql_string(item.get('description'))
            category = escape_sql_string(item.get('category'))
            sku = escape_sql_string(item.get('sku'))
            status = escape_sql_string(item.get('status', 'active'))
            
            sql_line = f"INSERT INTO products (name, company_name, price, stock, description, category, sku, status) VALUES ({name}, {company_name}, {price}, {stock}, {description}, {category}, {sku}, {status});"
            sql_lines.append(sql_line)
    
    # 写入SQL文件
    print(f"写入SQL文件，共 {len(sql_lines)} 条INSERT语句...")
    with open('/home/user/webapp/migration_data.sql', 'w', encoding='utf-8') as f:
        for line in sql_lines:
            f.write(line + '\n')
    
    print(f"数据导出完成！文件保存为: migration_data.sql")
    print(f"共导出 {len(sql_lines)} 条数据")

if __name__ == "__main__":
    main()