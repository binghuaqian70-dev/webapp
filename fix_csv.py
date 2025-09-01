#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import uuid
from datetime import datetime

def fix_csv_add_sku():
    """为CSV文件添加唯一的SKU列"""
    
    input_file = '51连接器-9.1-utf8.csv'
    output_file = '51连接器-9.1-utf8-fixed.csv'
    
    print(f"🔧 处理文件: {input_file}")
    print(f"📝 输出文件: {output_file}")
    
    processed_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        
        # 定义输出字段（添加SKU和其他必需字段）
        fieldnames = ['name', 'company_name', 'price', 'stock', 'sku', 'category', 'description']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        
        # 写入表头
        writer.writeheader()
        
        for row in reader:
            processed_count += 1
            
            # 生成唯一的SKU（使用name的前8个字符 + 短UUID）
            name_prefix = row['name'][:8].replace('-', '').replace(' ', '').upper()
            short_uuid = str(uuid.uuid4())[:8].upper()
            unique_sku = f"CONN-{name_prefix}-{short_uuid}"
            
            # 构建输出行
            output_row = {
                'name': row['name'],
                'company_name': row['company_name'], 
                'price': float(row['price']),
                'stock': int(row['stock']),
                'sku': unique_sku,
                'category': '连接器',  # 默认分类
                'description': f"连接器产品 - {row['name']}"  # 默认描述
            }
            
            writer.writerow(output_row)
            
            if processed_count % 50 == 0:
                print(f"✅ 已处理 {processed_count} 条记录...")
    
    print(f"\n🎉 处理完成!")
    print(f"📊 总共处理: {processed_count} 条记录")
    print(f"📄 输出文件: {output_file}")
    
    # 显示前几行作为示例
    print(f"\n📋 预览前5行:")
    with open(output_file, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i < 6:  # 包含表头
                print(f"   {line.strip()}")
            else:
                break

if __name__ == '__main__':
    fix_csv_add_sku()