#!/usr/bin/env node

/**
 * CSV格式转换脚本
 * 将part1和part2的纯数字stock字段转换为带引号和千位分隔符的格式
 * 使其与part3-20的格式一致
 */

import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const FILES = [
  '/mnt/aidrive/1.15数据汇总表-utf8_part1.csv',
  '/mnt/aidrive/1.15数据汇总表-utf8_part2.csv'
];

const OUTPUT_DIR = '/home/user/webapp/converted/';

// 添加千位分隔符
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const convertFile = async (inputFile) => {
  try {
    console.log(`\n📄 处理文件: ${inputFile}`);
    
    // 读取CSV
    const content = await fs.readFile(inputFile, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    
    console.log(`✅ 读取 ${records.length} 条记录`);
    
    // 转换stock字段格式
    const convertedRecords = records.map(record => {
      if (record.stock && !record.stock.includes('"')) {
        // 纯数字，需要添加引号和千位分隔符
        const stockNum = parseInt(record.stock);
        if (!isNaN(stockNum)) {
          record.stock = formatNumber(stockNum);
        }
      }
      return record;
    });
    
    console.log(`✅ 转换完成`);
    
    // 生成CSV
    const output = stringify(convertedRecords, {
      header: true,
      quoted: false,  // 不给所有字段加引号
      quote: '"'
    });
    
    // 确保输出目录存在
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // 保存转换后的文件
    const outputFile = OUTPUT_DIR + inputFile.split('/').pop();
    await fs.writeFile(outputFile, output);
    
    console.log(`✅ 已保存到: ${outputFile}`);
    
    return {
      success: true,
      inputFile,
      outputFile,
      recordCount: records.length
    };
    
  } catch (error) {
    console.error(`❌ 处理失败: ${error.message}`);
    return {
      success: false,
      inputFile,
      error: error.message
    };
  }
};

const main = async () => {
  console.log('🚀 开始CSV格式转换\n');
  console.log('=' .repeat(70));
  
  const results = [];
  
  for (const file of FILES) {
    const result = await convertFile(file);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 转换完成！\n');
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 成功: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${results.length - successCount}/${results.length}`);
  
  console.log('\n转换后的文件位置:');
  for (const result of results) {
    if (result.success) {
      console.log(`  ✅ ${result.outputFile} (${result.recordCount}条)`);
    } else {
      console.log(`  ❌ ${result.inputFile}: ${result.error}`);
    }
  }
  
  console.log('\n下一步:');
  console.log('  使用转换后的文件重新导入');
  console.log(`  文件位置: ${OUTPUT_DIR}`);
};

main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
