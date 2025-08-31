#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大规模商品测试数据生成器
生成接近2万条商品数据用于测试系统性能
"""

import random
import json
import csv
from datetime import datetime

# 商品名称模板
product_templates = {
    '数码电子': [
        'iPhone {model} {color} {storage}',
        '小米{model} {color} {storage}',
        '华为Mate{model} {color} {storage}',
        'OPPO Find X{model} {color}',
        'vivo X{model} {color}',
        'MacBook {model} {color} {config}',
        '联想小新Pro{model} {config}',
        '戴尔XPS{model} {config}',
        '华硕天选{model} {config}',
        'iPad {model} {color} {storage}',
        'Apple Watch Series {model}',
        'AirPods {model}',
        '索尼WH-1000XM{model}',
        'Bose QC{model}',
        '佳能EOS R{model}',
        '尼康Z{model}',
        '索尼A7{model}',
    ],
    '家用电器': [
        '美的空调{model}匹 KFR-{power}GW',
        '格力空调{model}匹 {series}',
        '海尔洗衣机{capacity}KG {model}',
        '小天鹅洗衣机{capacity}KG {model}',
        'TCL电视{size}寸 {model}',
        '海信电视{size}寸 {model}',
        '创维电视{size}寸 {model}',
        '西门子冰箱{capacity}L {model}',
        '美的冰箱{capacity}L {model}',
        '九阳豆浆机 {model}',
        '美的电饭煲{capacity}L {model}',
        '苏泊尔电磁炉 {model}',
        '戴森吸尘器 V{model}',
        '科沃斯扫地机器人 {model}',
    ],
    '服装鞋帽': [
        'Nike Air Jordan {model} {color} US{size}',
        'Adidas Ultraboost {model} {color} US{size}',
        'New Balance {model} {color} US{size}',
        'Converse All Star {color} US{size}',
        '优衣库{type} {color}',
        'ZARA{type} {color}',
        'H&M{type} {color}',
        '李宁运动鞋 {model} {color}',
        '安踏跑步鞋 {model}',
        '特步休闲鞋 {model}',
    ],
    '食品饮料': [
        '蒙牛{product} {spec}装',
        '伊利{product} {spec}装',
        '农夫山泉 {spec}装',
        '可口可乐 {spec}装',
        '百事可乐 {spec}装',
        '雀巢咖啡 {product} {spec}g',
        '立顿{product}茶 {spec}包装',
        '康师傅{product}面 {spec}装',
        '统一{product} {spec}装',
        '娃哈哈{product} {spec}装',
    ],
    '生活用品': [
        '舒肤佳{product} {spec}装',
        '海飞丝{product} {spec}ml',
        '飘柔{product} {spec}ml',
        '佳洁士牙膏 {spec}g',
        '高露洁牙刷 {type}',
        '维达纸巾 {spec}包装',
        '清风卷纸 {spec}卷装',
        '威露士消毒液 {spec}L',
    ],
    '母婴用品': [
        '帮宝适纸尿裤 {size}码{count}片装',
        '好奇纸尿裤 {size}码{count}片装',
        '美赞臣奶粉{stage}段 {spec}g',
        '雅培奶粉{stage}段 {spec}g',
        '贝亲奶瓶 {spec}ml',
        '强生婴儿{product} {spec}ml',
    ]
}

# 各种属性值
colors = ['黑色', '白色', '蓝色', '红色', '绿色', '粉色', '紫色', '灰色', '银色', '金色', '玫瑰金', '深空灰', '午夜色', '星光色']
storages = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
sizes = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']
models = [str(i) for i in range(1, 21)]
configs = ['i5-8GB-256GB', 'i7-16GB-512GB', 'i9-32GB-1TB', 'R5-16GB-512GB', 'R7-32GB-1TB']
capacities = ['50', '100', '150', '200', '300', '500', '610', '8', '10', '12', '1.5', '2', '3']
powers = ['26', '35', '50', '72']
series = ['云锦', '悦风', '品悦', '睡梦宝']
tv_sizes = ['32', '43', '50', '55', '65', '75', '85', '98']
specs = ['250ml*12', '500ml*24', '1L*6', '200g', '500g', '1kg', '2kg']

# 公司名称
companies = [
    '苹果公司', '小米科技', '华为技术', 'OPPO', 'vivo', '一加科技', '魅族科技',
    '联想集团', '戴尔公司', '华硕电脑', '惠普公司', '微软公司', '雷神科技',
    '美的集团', '格力电器', '海尔集团', '小天鹅', 'TCL集团', '海信集团', '创维集团',
    '耐克公司', '阿迪达斯', '新百伦', '匡威', '优衣库', 'ZARA', 'H&M', '李宁公司', '安踏体育', '特步集团',
    '蒙牛乳业', '伊利集团', '农夫山泉', '可口可乐', '百事公司', '雀巢公司', '联合利华', '康师傅',
    '宝洁公司', '联合利华', '威莱集团', '维达集团', '清风纸业',
    '美赞臣', '雅培公司', '贝亲公司', '强生公司',
    '索尼公司', 'Bose', '森海塞尔', '佳能公司', '尼康公司', '富士胶片',
    '博世公司', '西门子', '松下电器', '飞利浦公司', '戴森公司', '科沃斯',
]

def generate_product_name(category):
    """根据类别生成商品名称"""
    if category not in product_templates:
        return f"{category}商品 {random.randint(1, 1000)}"
    
    template = random.choice(product_templates[category])
    
    # 替换占位符
    replacements = {
        '{model}': random.choice(models),
        '{color}': random.choice(colors),
        '{storage}': random.choice(storages),
        '{size}': random.choice(sizes),
        '{config}': random.choice(configs),
        '{capacity}': random.choice(capacities),
        '{power}': random.choice(powers),
        '{series}': random.choice(series),
        '{spec}': random.choice(specs),
        '{type}': random.choice(['衬衫', 'T恤', '外套', '裤子', '裙子']),
        '{product}': random.choice(['纯牛奶', '酸奶', '奶茶', '果汁', '矿泉水']),
        '{stage}': random.choice(['1', '2', '3']),
        '{count}': str(random.choice([24, 36, 48, 64, 72]))
    }
    
    name = template
    for placeholder, value in replacements.items():
        name = name.replace(placeholder, value)
    
    return name

def generate_price(category):
    """根据类别生成合理的价格"""
    price_ranges = {
        '数码电子': (99, 19999),
        '家用电器': (199, 15999),
        '服装鞋帽': (49, 2999),
        '食品饮料': (15, 299),
        '生活用品': (8, 199),
        '母婴用品': (29, 599),
        '运动户外': (99, 1999),
        '汽车用品': (25, 1999),
        '图书文具': (5, 299),
        '宠物用品': (19, 799),
        '家居装饰': (99, 9999),
        '办公用品': (29, 2999),
        '厨房用品': (39, 999),
        '清洁用品': (12, 89),
        '个人护理': (25, 1299),
        '营养保健': (39, 999),
        '工具五金': (25, 1999)
    }
    
    min_price, max_price = price_ranges.get(category, (10, 999))
    return round(random.uniform(min_price, max_price), 2)

def generate_stock():
    """生成库存数量"""
    # 80%的商品有正常库存，20%库存较低或为0
    if random.random() < 0.8:
        return random.randint(10, 500)
    else:
        return random.randint(0, 9)

def generate_sku(category, index):
    """生成SKU编号"""
    category_codes = {
        '数码电子': 'DE',
        '家用电器': 'JD',
        '服装鞋帽': 'FZ',
        '食品饮料': 'SP',
        '生活用品': 'SH',
        '母婴用品': 'MY',
        '运动户外': 'YD',
        '汽车用品': 'QC',
        '图书文具': 'TS',
        '宠物用品': 'CW',
        '家居装饰': 'JJ',
        '办公用品': 'BG',
        '厨房用品': 'CF',
        '清洁用品': 'QJ',
        '个人护理': 'HL',
        '营养保健': 'YY',
        '工具五金': 'GJ'
    }
    
    code = category_codes.get(category, 'XX')
    return f"{code}-{index:06d}-{random.randint(100, 999)}"

def generate_description(name, category):
    """生成商品描述"""
    descriptions = [
        f"优质{name}，{category}类目热销产品",
        f"精选{name}，品质保证，用户好评如潮",
        f"全新{name}，采用先进技术，性能卓越",
        f"热销{name}，高性价比选择，值得拥有",
        f"经典{name}，久经市场考验，质量可靠",
        f"时尚{name}，紧跟潮流趋势，彰显品味",
        f"专业{name}，满足专业需求，效果显著",
        f"实用{name}，日常必备，便民利民"
    ]
    return random.choice(descriptions)

def generate_massive_data(count=5000):
    """生成大量测试数据"""
    categories = list(product_templates.keys()) + ['运动户外', '汽车用品', '图书文具', '宠物用品', 
                                                  '家居装饰', '办公用品', '厨房用品', '清洁用品', 
                                                  '个人护理', '营养保健', '工具五金']
    
    products = []
    
    for i in range(count):
        category = random.choice(categories)
        company = random.choice(companies)
        name = generate_product_name(category)
        price = generate_price(category)
        stock = generate_stock()
        sku = generate_sku(category, i + 1)
        description = generate_description(name, category)
        
        product = {
            'name': name,
            'company_name': company,
            'price': price,
            'stock': stock,
            'description': description,
            'category': category,
            'sku': sku
        }
        
        products.append(product)
        
        if (i + 1) % 1000 == 0:
            print(f"已生成 {i + 1} 条数据...")
    
    return products

def save_as_sql(products, filename):
    """保存为SQL插入语句"""
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- 自动生成的大规模测试数据\n")
        f.write(f"-- 生成时间: {datetime.now()}\n")
        f.write(f"-- 数据条数: {len(products)}\n\n")
        
        # 分批插入，每500条一批
        batch_size = 500
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            f.write("INSERT OR IGNORE INTO products (name, company_name, price, stock, description, category, sku) VALUES\n")
            
            values = []
            for product in batch:
                name = product['name'].replace("'", "''")
                desc = product['description'].replace("'", "''")
                value = f"('{name}', '{product['company_name']}', {product['price']}, {product['stock']}, '{desc}', '{product['category']}', '{product['sku']}')"
                values.append(value)
            
            f.write(",\n".join(values) + ";\n\n")

def save_as_csv(products, filename):
    """保存为CSV文件"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'company_name', 'price', 'stock', 'description', 'category', 'sku'])
        writer.writeheader()
        writer.writerows(products)

if __name__ == "__main__":
    print("开始生成大规模测试数据...")
    
    # 生成5000条数据
    products = generate_massive_data(5000)
    
    print(f"成功生成 {len(products)} 条商品数据")
    
    # 保存为SQL文件
    save_as_sql(products, 'massive_test_data.sql')
    print("已保存为 massive_test_data.sql")
    
    # 保存为CSV文件
    save_as_csv(products, 'massive_test_data.csv')
    print("已保存为 massive_test_data.csv")
    
    # 显示统计信息
    categories = {}
    companies = {}
    for product in products:
        categories[product['category']] = categories.get(product['category'], 0) + 1
        companies[product['company_name']] = companies.get(product['company_name'], 0) + 1
    
    print(f"\n统计信息:")
    print(f"总商品数: {len(products)}")
    print(f"分类数量: {len(categories)}")
    print(f"公司数量: {len(companies)}")
    print(f"平均每个分类商品数: {len(products) / len(categories):.1f}")
    print(f"平均每个公司商品数: {len(products) / len(companies):.1f}")
    
    print(f"\n前5个分类:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {category}: {count}条")