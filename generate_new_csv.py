#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import uuid
from datetime import datetime

def generate_new_csv():
    """为原始CSV生成全新的SKU，避免重复问题"""
    
    input_file = '51连接器-9.1-utf8.csv'
    output_file = f'51连接器-9.1-utf8-new-{datetime.now().strftime("%Y%m%d-%H%M%S")}.csv'
    
    print(f"🔧 处理文件: {input_file}")
    print(f"📝 输出文件: {output_file}")
    
    processed_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        
        # 定义输出字段
        fieldnames = ['name', 'company_name', 'price', 'stock', 'sku', 'category', 'description']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        
        # 写入表头
        writer.writeheader()
        
        for row in reader:
            processed_count += 1
            
            # 生成全新的唯一SKU（使用时间戳确保唯一性）
            timestamp = datetime.now().strftime("%m%d%H%M")
            short_uuid = str(uuid.uuid4())[:8].upper()
            unique_sku = f"NEW-CONN-{timestamp}-{short_uuid}"
            
            # 构建输出行
            output_row = {
                'name': row['name'],
                'company_name': row['company_name'], 
                'price': float(row['price']),
                'stock': int(row['stock']),
                'sku': unique_sku,
                'category': '连接器',
                'description': f"新导入连接器产品 - {row['name']}"
            }
            
            writer.writerow(output_row)
            
            if processed_count % 50 == 0:
                print(f"✅ 已处理 {processed_count} 条记录...")
    
    print(f"\n🎉 处理完成!")
    print(f"📊 总共处理: {processed_count} 条记录")
    print(f"📄 输出文件: {output_file}")
    print(f"\n💡 这个文件使用全新的SKU，可以安全导入而不会产生重复冲突")
    
    return output_file

if __name__ == '__main__':
    new_file = generate_new_csv()