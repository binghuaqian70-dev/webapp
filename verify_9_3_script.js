#!/usr/bin/env node
/**
 * 验证脚本：确认9.3数据汇总表导入脚本修改完成
 */

import fs from 'fs';

console.log('🔍 验证 optimized_batch_import.mjs 修改状态...\n');

try {
  const content = fs.readFileSync('./optimized_batch_import.mjs', 'utf8');
  
  const checks = [
    {
      name: '文件标题更新',
      pattern: /9\.3数据汇总表导入版本.*part_001 到 part_100/,
      expected: true
    },
    {
      name: '导入范围配置',
      pattern: /END_PART = 100/,
      expected: true
    },
    {
      name: '文件匹配模式',
      pattern: /9\.3数据汇总表/,
      expected: true
    },
    {
      name: '文件编号格式',
      pattern: /part_\(\\d\{3\}\)/,
      expected: true
    },
    {
      name: '进度保存功能',
      pattern: /PROGRESS_SAVE_INTERVAL/,
      expected: true
    },
    {
      name: '断点续传功能',
      pattern: /loadProgress/,
      expected: true
    },
    {
      name: '保守批次配置',
      pattern: /BATCH_SIZE = 2/,
      expected: true
    },
    {
      name: '延迟配置调整',
      pattern: /DELAY_BETWEEN_BATCHES = 20000/,
      expected: true
    }
  ];
  
  let passCount = 0;
  
  checks.forEach(check => {
    const found = check.pattern.test(content);
    const status = found === check.expected ? '✅' : '❌';
    
    if (found === check.expected) passCount++;
    
    console.log(`${status} ${check.name}: ${found ? '找到' : '未找到'}`);
  });
  
  console.log(`\n📊 检查结果: ${passCount}/${checks.length} 通过`);
  
  if (passCount === checks.length) {
    console.log('🎉 所有检查通过！脚本已成功修改为支持9.3数据汇总表导入。');
  } else {
    console.log('⚠️ 部分检查未通过，请检查脚本修改。');
  }
  
  // 检查AI Drive文件
  console.log('\n🔍 检查AI Drive文件状态...');
  
  try {
    const files = fs.readdirSync('/mnt/aidrive');
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && file.includes('9.3数据汇总表')
    );
    
    console.log(`✅ 找到 ${csvFiles.length} 个9.3数据汇总表文件`);
    
    if (csvFiles.length === 100) {
      console.log('🎉 所有100个文件都已准备就绪！');
    } else {
      console.log(`⚠️ 预期100个文件，实际找到${csvFiles.length}个`);
    }
  } catch (error) {
    console.log('❌ 无法访问AI Drive:', error.message);
  }
  
} catch (error) {
  console.error('❌ 验证失败:', error.message);
}