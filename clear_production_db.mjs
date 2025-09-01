#!/usr/bin/env node
/**
 * 清空生产环境数据库脚本
 * 清空 webapp-csv-import.pages.dev 的商品数据
 */

const PRODUCTION_URL = 'https://webapp-csv-import.pages.dev';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

// 登录获取JWT token
async function login() {
  try {
    console.log('🔐 正在登录生产环境...');
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // 检查两种可能的响应格式
    const token = data.token || data.data?.token;
    if (!token) {
      throw new Error('登录响应中没有找到token');
    }

    console.log('✅ 登录成功');
    return token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

// 获取当前数据库状态
async function getDbStats(token) {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/products?page=1&pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.log('⚠️ 无法获取数据库状态');
      return { total: 0 };
    }

    const data = await response.json();
    return { total: data.pagination?.total || data.total || 0 };
  } catch (error) {
    console.log('⚠️ 获取数据库状态失败:', error.message);
    return { total: 0 };
  }
}

// 批量删除所有产品
async function clearAllProducts(token) {
  try {
    console.log('🗑️ 正在获取所有产品ID...');
    
    // 获取所有产品（分页获取）
    let allProductIds = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`${PRODUCTION_URL}/api/products?page=${page}&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取产品列表失败: ${response.status}`);
      }

      const data = await response.json();
      const products = data.data || [];
      
      if (products.length === 0) {
        hasMore = false;
      } else {
        const productIds = products.map(p => p.id);
        allProductIds.push(...productIds);
        console.log(`   获取第${page}页: ${products.length}个产品`);
        page++;
        
        // 检查是否还有更多页
        const pagination = data.pagination;
        if (pagination && page > pagination.totalPages) {
          hasMore = false;
        }
      }
    }

    console.log(`📊 找到总共 ${allProductIds.length} 个产品需要删除`);

    if (allProductIds.length === 0) {
      console.log('✅ 数据库已经是空的');
      return 0;
    }

    // 批量删除产品
    console.log('🚮 开始批量删除...');
    let deletedCount = 0;
    let failedCount = 0;

    // 分批删除，每次删除10个
    const batchSize = 10;
    for (let i = 0; i < allProductIds.length; i += batchSize) {
      const batch = allProductIds.slice(i, i + batchSize);
      
      console.log(`   删除批次 ${Math.floor(i/batchSize) + 1}: IDs ${batch[0]} - ${batch[batch.length-1]}`);
      
      // 并行删除这批产品
      const deletePromises = batch.map(async (productId) => {
        try {
          const response = await fetch(`${PRODUCTION_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            deletedCount++;
            return { success: true, id: productId };
          } else {
            failedCount++;
            return { success: false, id: productId, error: response.status };
          }
        } catch (error) {
          failedCount++;
          return { success: false, id: productId, error: error.message };
        }
      });

      const results = await Promise.all(deletePromises);
      
      // 显示进度
      const progress = ((i + batch.length) / allProductIds.length * 100).toFixed(1);
      console.log(`   进度: ${progress}% (删除: ${deletedCount}, 失败: ${failedCount})`);
      
      // 短暂延迟避免过载服务器
      if (i + batchSize < allProductIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return deletedCount;

  } catch (error) {
    console.error('❌ 清空数据库失败:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始清空生产环境数据库');
  console.log(`📍 生产环境地址: ${PRODUCTION_URL}`);
  
  try {
    // 登录
    const token = await login();
    
    // 获取清空前状态
    console.log('\n📊 检查当前数据库状态...');
    const beforeStats = await getDbStats(token);
    console.log(`当前数据库记录数: ${beforeStats.total}`);
    
    if (beforeStats.total === 0) {
      console.log('✅ 数据库已经是空的，无需清空');
      return;
    }
    
    // 确认清空操作
    console.log(`\n⚠️ 即将删除 ${beforeStats.total} 条记录`);
    console.log('🔄 开始清空操作...');
    
    const startTime = Date.now();
    
    // 执行清空
    const deletedCount = await clearAllProducts(token);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 验证清空结果
    console.log('\n📊 验证清空结果...');
    const afterStats = await getDbStats(token);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 清空完成总结');
    console.log('='.repeat(50));
    console.log(`✅ 成功删除: ${deletedCount} 条记录`);
    console.log(`⏱️ 耗时: ${duration.toFixed(2)} 秒`);
    console.log(`🗄️ 清空前记录数: ${beforeStats.total}`);
    console.log(`🗄️ 清空后记录数: ${afterStats.total}`);
    
    if (afterStats.total === 0) {
      console.log('🎉 数据库清空成功！');
    } else {
      console.log(`⚠️ 还有 ${afterStats.total} 条记录未删除`);
    }

  } catch (error) {
    console.error('\n❌ 清空过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);