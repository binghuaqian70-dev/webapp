#!/usr/bin/env node

/**
 * 1.15数据汇总表补充导入脚本 - Part1和Part2
 * 
 * 用途: 补充导入之前因AI Drive访问时序问题失败的2个文件
 * 文件: 1.15数据汇总表-utf8_part1.csv, 1.15数据汇总表-utf8_part2.csv
 * 
 * 使用方法:
 *   node 补充导入_1.15_part1_2.mjs
 * 
 * 特性:
 *   - 专门针对part1和part2的补充导入
 *   - AI Drive访问延迟处理
 *   - 智能分块策略
 *   - 详细日志记录
 *   - 错误重试机制
 */

import fs from 'fs/promises';

// ==================== 配置区域 ====================

const CONFIG = {
  // 生产环境配置
  PRODUCTION_URL: 'https://webapp-csv-import.pages.dev',
  USERNAME: 'admin',
  PASSWORD: 'admin123',
  
  // 文件路径配置（使用转换后的文件）
  AI_DRIVE_PATH: '/home/user/webapp/converted/',
  FILE_PREFIX: '1.15数据汇总表-utf8_part',
  
  // 目标文件列表（仅part1和part2）
  TARGET_FILES: [
    '1.15数据汇总表-utf8_part1.csv',
    '1.15数据汇总表-utf8_part2.csv'
  ],
  
  // 重试配置
  MAX_RETRIES: 3,
  DELAY_BETWEEN_CHUNKS: 600,      // 分块间延迟（毫秒）
  DELAY_BETWEEN_FILES: 2000,       // 文件间延迟（毫秒）
  AI_DRIVE_INITIAL_DELAY: 3000,    // AI Drive初始等待时间（毫秒）
  
  // 文件路径
  LOG_FILE: './补充导入_1.15_part1_2.log',
  STATS_FILE: './补充导入_1.15_part1_2_stats.json'
};

// ==================== 全局变量 ====================

let authToken = null;
let stats = {
  totalFiles: CONFIG.TARGET_FILES.length,
  processedFiles: 0,
  currentFile: '',
  totalRecords: 0,
  importedRecords: 0,
  startTime: new Date().toISOString(),
  endTime: null,
  status: 'running',
  fileResults: []
};

// ==================== 工具函数 ====================

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 日志函数
const log = async (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    await fs.appendFile(CONFIG.LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('写入日志失败:', error.message);
  }
};

// 保存统计数据
const saveStats = async () => {
  try {
    await fs.writeFile(
      CONFIG.STATS_FILE,
      JSON.stringify(stats, null, 2)
    );
  } catch (error) {
    await log(`保存统计数据失败: ${error.message}`, 'ERROR');
  }
};

// 登录生产环境
const loginProduction = async () => {
  try {
    await log(`🔐 登录生产环境: ${CONFIG.PRODUCTION_URL}`);
    
    const response = await fetch(`${CONFIG.PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: CONFIG.USERNAME,
        password: CONFIG.PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 支持两种响应格式
    const token = data.token || (data.data && data.data.token);
    
    if (!data.success || !token) {
      throw new Error('登录响应无效');
    }

    authToken = token;
    await log('✅ 登录成功');
    return true;
  } catch (error) {
    await log(`❌ 登录失败: ${error.message}`, 'ERROR');
    throw error;
  }
};

// 获取当前数据库记录数
const getDatabaseCount = async () => {
  try {
    const response = await fetch(`${CONFIG.PRODUCTION_URL}/api/products/count`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`获取记录数失败: ${response.status}`);
    }

    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    await log(`⚠️ 获取数据库记录数失败: ${error.message}`, 'WARN');
    return null;
  }
};

// 导入数据分块
const importChunk = async (csvData, filename, chunkIndex, totalChunks, retryCount = 0) => {
  try {
    const response = await fetch(`${CONFIG.PRODUCTION_URL}/api/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        csvData: csvData, // 发送原始CSV字符串，不是解析后的records
        filename: `${filename}_chunk_${chunkIndex + 1}`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '导入失败');
    }

    return result;
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      await log(`⚠️ 分块导入失败，准备重试 (${retryCount + 1}/${CONFIG.MAX_RETRIES}): ${error.message}`, 'WARN');
      await delay(1000 * (retryCount + 1));
      return await importChunk(csvData, filename, chunkIndex, totalChunks, retryCount + 1);
    }
    throw error;
  }
};

// 处理单个文件
const processFile = async (filename) => {
  const fileResult = {
    success: false,
    filename,
    error: null
  };

  try {
    await log(`\n📁 开始处理文件: ${filename}`);
    stats.currentFile = filename;
    await saveStats();

    const filePath = CONFIG.AI_DRIVE_PATH + filename;
    
    // 检查文件是否存在
    try {
      const fileStats = await fs.stat(filePath);
      await log(`📊 文件大小: ${(fileStats.size / 1024).toFixed(2)} KB`);
      fileResult.size = fileStats.size;
    } catch (error) {
      throw new Error(`文件不存在: ${error.message}`);
    }

    // 获取导入前的数据库记录数
    const dbCountBefore = await getDatabaseCount();
    if (dbCountBefore !== null) {
      await log(`🗄️ 数据库导入前记录数: ${dbCountBefore.toLocaleString()}`);
      fileResult.totalBefore = dbCountBefore;
    }

    // 读取原始CSV文件
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const actualRecords = lines.length - 1; // 减去表头
    
    await log(`📈 实际记录数: ${actualRecords} 条`);
    fileResult.actualRecords = actualRecords;
    stats.totalRecords = actualRecords;
    await saveStats();

    // 智能分块策略 - 按行数分割原始CSV
    const CHUNK_SIZE = 300; // 每块300行
    const header = lines[0]; // CSV表头
    const dataLines = lines.slice(1); // 数据行
    
    const chunks = [];
    for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
      const chunkLines = dataLines.slice(i, i + CHUNK_SIZE);
      // 每个分块包含表头和数据行
      const chunkContent = [header, ...chunkLines].join('\n');
      chunks.push({
        content: chunkContent,
        startLine: i + 1,
        endLine: i + chunkLines.length,
        totalLines: chunkLines.length
      });
    }
    
    await log(`📦 [${filename}] 智能分块策略: 总数据行${actualRecords}行 → 每块${CHUNK_SIZE}行`);
    await log(`📋 [${filename}] 分块完成: ${chunks.length}个数据块`);
    
    fileResult.totalChunks = chunks.length;
    fileResult.successChunks = 0;
    fileResult.failedChunks = 0;

    // 逐个处理分块
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      await log(`📦 [${filename}] 处理分块 ${i + 1}/${chunks.length}: 行 ${chunk.startLine}-${chunk.endLine} (${chunk.totalLines}行)`);
      
      const chunkStartTime = Date.now();
      
      try {
        await importChunk(chunk.content, filename, i, chunks.length);
        
        const chunkDuration = ((Date.now() - chunkStartTime) / 1000).toFixed(2);
        await log(`   ✅ [${filename}] 分块 ${i + 1} 完成 (${chunkDuration}s)`);
        
        fileResult.successChunks++;
        stats.importedRecords += chunk.totalLines;
        
        await log(`📊 进度: ${i + 1}/${chunks.length} (${((i + 1) / chunks.length * 100).toFixed(1)}%) | 成功: ${fileResult.successChunks} | 失败: ${fileResult.failedChunks}`);
        await saveStats();
        
        // 分块间延迟
        if (i < chunks.length - 1) {
          await log(`⏳ 分块间休息 ${CONFIG.DELAY_BETWEEN_CHUNKS / 1000} 秒...`);
          await delay(CONFIG.DELAY_BETWEEN_CHUNKS);
        }
      } catch (error) {
        await log(`   ❌ [${filename}] 分块 ${i + 1} 失败: ${error.message}`, 'ERROR');
        fileResult.failedChunks++;
      }
    }

    // 获取导入后的数据库记录数
    const dbCountAfter = await getDatabaseCount();
    if (dbCountAfter !== null) {
      fileResult.totalAfter = dbCountAfter;
      const imported = dbCountBefore !== null ? dbCountAfter - dbCountBefore : fileResult.successChunks * CHUNK_SIZE;
      fileResult.imported = imported;
      
      await log(`\n📊 导入结果总结:`);
      await log(`   ✅ 成功分块: ${fileResult.successChunks}/${fileResult.totalChunks}`);
      await log(`   ❌ 失败分块: ${fileResult.failedChunks}/${fileResult.totalChunks}`);
      await log(`   📈 新增记录: ${imported.toLocaleString()} 条`);
      await log(`   🗄️ 数据库总记录数: ${dbCountAfter.toLocaleString()}`);
      await log(`   📊 成功率: ${((fileResult.successChunks / fileResult.totalChunks) * 100).toFixed(2)}%`);
    }

    fileResult.success = fileResult.failedChunks === 0;
    return fileResult;
    
  } catch (error) {
    await log(`❌ 文件处理失败: ${error.message}`, 'ERROR');
    fileResult.error = error.message;
    return fileResult;
  }
};

// ==================== 主函数 ====================

const main = async () => {
  try {
    await log('='.repeat(70));
    await log('🚀 开始1.15数据汇总表补充导入 - Part1和Part2');
    await log('='.repeat(70));
    
    // AI Drive初始延迟
    await log(`⏳ 等待AI Drive稳定 (${CONFIG.AI_DRIVE_INITIAL_DELAY / 1000}秒)...`);
    await delay(CONFIG.AI_DRIVE_INITIAL_DELAY);

    // 验证文件存在性
    await log(`\n📋 验证目标文件...`);
    for (const filename of CONFIG.TARGET_FILES) {
      const filePath = CONFIG.AI_DRIVE_PATH + filename;
      try {
        const fileStats = await fs.stat(filePath);
        await log(`✅ ${filename} - ${(fileStats.size / 1024).toFixed(2)} KB`);
      } catch (error) {
        await log(`❌ ${filename} - 文件不存在或无法访问`, 'ERROR');
        throw new Error(`文件验证失败: ${filename}`);
      }
    }

    // 登录生产环境
    await loginProduction();
    
    // 获取初始数据库记录数
    const initialCount = await getDatabaseCount();
    if (initialCount !== null) {
      await log(`🗄️ 初始数据库记录数: ${initialCount.toLocaleString()}`);
    }

    // 处理每个文件
    for (let i = 0; i < CONFIG.TARGET_FILES.length; i++) {
      const filename = CONFIG.TARGET_FILES[i];
      
      await log(`\n${'='.repeat(70)}`);
      await log(`📁 开始处理文件 ${i + 1}/${CONFIG.TARGET_FILES.length}: ${filename}`);
      await log('='.repeat(70));
      
      const fileResult = await processFile(filename);
      stats.fileResults.push(fileResult);
      stats.processedFiles++;
      
      if (fileResult.success) {
        await log(`✅ 文件 ${i + 1}/${CONFIG.TARGET_FILES.length} 完成: ${filename}`);
      } else {
        await log(`❌ 文件 ${i + 1}/${CONFIG.TARGET_FILES.length} 失败: ${filename}`, 'ERROR');
      }
      
      await saveStats();
      
      // 文件间延迟
      if (i < CONFIG.TARGET_FILES.length - 1) {
        await log(`⏳ 文件间休息 ${CONFIG.DELAY_BETWEEN_FILES / 1000} 秒...`);
        await delay(CONFIG.DELAY_BETWEEN_FILES);
      }
    }

    // 获取最终数据库记录数
    const finalCount = await getDatabaseCount();
    
    // 生成最终报告
    await log(`\n${'='.repeat(70)}`);
    await log('📊 1.15补充导入完成报告');
    await log('='.repeat(70));
    
    const successFiles = stats.fileResults.filter(f => f.success).length;
    const failedFiles = stats.fileResults.length - successFiles;
    
    await log(`\n📋 文件处理结果:`);
    await log(`   ✅ 成功文件: ${successFiles}/${stats.totalFiles}`);
    await log(`   ❌ 失败文件: ${failedFiles}/${stats.totalFiles}`);
    
    if (initialCount !== null && finalCount !== null) {
      const totalImported = finalCount - initialCount;
      await log(`\n📈 数据库变化:`);
      await log(`   导入前: ${initialCount.toLocaleString()} 条`);
      await log(`   导入后: ${finalCount.toLocaleString()} 条`);
      await log(`   新增: ${totalImported.toLocaleString()} 条 (+${((totalImported / initialCount) * 100).toFixed(2)}%)`);
    }
    
    await log(`\n📝 详细结果:`);
    for (const result of stats.fileResults) {
      if (result.success) {
        await log(`   ✅ ${result.filename}: ${result.imported}条记录导入成功`);
      } else {
        await log(`   ❌ ${result.filename}: ${result.error}`, 'ERROR');
      }
    }
    
    stats.endTime = new Date().toISOString();
    stats.status = failedFiles === 0 ? 'completed' : 'completed_with_errors';
    await saveStats();
    
    const duration = new Date(stats.endTime) - new Date(stats.startTime);
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    
    await log(`\n⏱️ 总耗时: ${minutes}分${seconds}秒`);
    await log(`📊 统计数据已保存到: ${CONFIG.STATS_FILE}`);
    await log(`📝 详细日志已保存到: ${CONFIG.LOG_FILE}`);
    
    if (failedFiles === 0) {
      await log(`\n🎊 1.15补充导入任务完成！所有文件导入成功！`);
    } else {
      await log(`\n⚠️ 1.15补充导入完成，但有${failedFiles}个文件失败`, 'WARN');
    }
    
  } catch (error) {
    await log(`\n❌ 导入过程发生严重错误: ${error.message}`, 'ERROR');
    stats.endTime = new Date().toISOString();
    stats.status = 'failed';
    stats.error = error.message;
    await saveStats();
    process.exit(1);
  }
};

// 启动主程序
main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
