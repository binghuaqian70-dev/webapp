// 全局状态
let currentPage = 'dashboard';
let currentProductPage = 1;
let currentFilters = {};
let products = [];
let stats = {};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    showPage('dashboard');
});

// 显示加载状态
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// 显示消息
function showMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-error' : 'alert-warning';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass}`;
    messageDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="text-lg">&times;</button>
        </div>
    `;
    
    const content = document.getElementById('page-content');
    content.insertBefore(messageDiv, content.firstChild);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 页面切换
function showPage(page) {
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    event?.target.classList.add('active');
    currentPage = page;
    
    const content = document.getElementById('page-content');
    
    switch (page) {
        case 'dashboard':
            showDashboard();
            break;
        case 'products':
            showProducts();
            break;
        case 'add-product':
            showAddProduct();
            break;
        case 'import':
            showImport();
            break;
        default:
            showDashboard();
    }
}

// 仪表板页面
async function showDashboard() {
    showLoading();
    
    try {
        const response = await axios.get('/api/stats');
        stats = response.data.data;
        
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">数据统计</h2>
                
                <!-- 统计卡片 -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="stats-card">
                        <div class="flex items-center">
                            <div class="stats-card-icon bg-blue-500">
                                <i class="fas fa-box"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-500">商品总数</p>
                                <p class="text-2xl font-bold text-gray-800">${stats.totalProducts}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-card">
                        <div class="flex items-center">
                            <div class="stats-card-icon bg-green-500">
                                <i class="fas fa-warehouse"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-500">总库存</p>
                                <p class="text-2xl font-bold text-gray-800">${stats.totalStock}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-card">
                        <div class="flex items-center">
                            <div class="stats-card-icon bg-yellow-500">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-500">总价值</p>
                                <p class="text-2xl font-bold text-gray-800">¥${(stats.totalValue || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-card">
                        <div class="flex items-center">
                            <div class="stats-card-icon bg-purple-500">
                                <i class="fas fa-building"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm text-gray-500">公司数量</p>
                                <p class="text-2xl font-bold text-gray-800">${stats.totalCompanies}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 分类统计图表 -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">商品分类统计</h3>
                    <canvas id="categoryChart" width="400" height="200"></canvas>
                </div>
            </div>
        `;
        
        // 绘制图表
        drawCategoryChart();
        
    } catch (error) {
        showMessage('获取统计数据失败', 'error');
        console.error('Dashboard error:', error);
    } finally {
        hideLoading();
    }
}

// 绘制分类统计图表
function drawCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    const labels = stats.topCategories?.map(cat => cat.category || '未分类') || [];
    const data = stats.topCategories?.map(cat => cat.count) || [];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// 商品管理页面
async function showProducts() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-8">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-3xl font-bold text-gray-800">商品管理</h2>
                <button onclick="showAddProduct()" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>添加商品
                </button>
            </div>
            
            <!-- 搜索和过滤 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label class="form-label">搜索</label>
                        <input type="text" id="searchInput" class="form-input" placeholder="商品名称、公司名称或描述">
                    </div>
                    <div>
                        <label class="form-label">公司名称</label>
                        <input type="text" id="companyFilter" class="form-input" placeholder="筛选公司">
                    </div>
                    <div>
                        <label class="form-label">商品分类</label>
                        <input type="text" id="categoryFilter" class="form-input" placeholder="筛选分类">
                    </div>
                    <div>
                        <label class="form-label">价格范围</label>
                        <div class="flex space-x-2">
                            <input type="number" id="minPrice" class="form-input" placeholder="最低价">
                            <input type="number" id="maxPrice" class="form-input" placeholder="最高价">
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="searchProducts()" class="btn-primary">
                        <i class="fas fa-search mr-2"></i>搜索
                    </button>
                    <button onclick="clearFilters()" class="btn-secondary">
                        <i class="fas fa-times mr-2"></i>清空
                    </button>
                    <div class="flex items-center space-x-2">
                        <label class="text-sm text-gray-600">排序:</label>
                        <select id="sortBy" class="form-input w-auto">
                            <option value="id">创建时间</option>
                            <option value="name">商品名称</option>
                            <option value="company_name">公司名称</option>
                            <option value="price">价格</option>
                            <option value="stock">库存</option>
                        </select>
                        <select id="sortOrder" class="form-input w-auto">
                            <option value="DESC">降序</option>
                            <option value="ASC">升序</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- 商品列表 -->
            <div id="productList" class="table-container">
                <!-- 产品表格将在这里渲染 -->
            </div>
            
            <!-- 分页 -->
            <div id="pagination" class="flex justify-center mt-6">
                <!-- 分页控件将在这里渲染 -->
            </div>
        </div>
    `;
    
    // 绑定搜索事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    loadProducts();
}

// 加载商品数据
async function loadProducts(page = 1) {
    showLoading();
    currentProductPage = page;
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            sortBy: document.getElementById('sortBy')?.value || 'id',
            sortOrder: document.getElementById('sortOrder')?.value || 'DESC',
            ...currentFilters
        });
        
        const response = await axios.get(\`/api/products?\${params}\`);
        const data = response.data;
        
        products = data.data;
        renderProductTable(products);
        renderPagination(data.pagination);
        
    } catch (error) {
        showMessage('加载商品数据失败', 'error');
        console.error('Load products error:', error);
    } finally {
        hideLoading();
    }
}

// 渲染商品表格
function renderProductTable(products) {
    const container = document.getElementById('productList');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-500">暂无商品数据</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="w-full">
                <thead>
                    <tr class="table-header">
                        <th class="text-left">商品名称</th>
                        <th class="text-left">公司名称</th>
                        <th class="text-left">价格</th>
                        <th class="text-left">库存</th>
                        <th class="text-left">分类</th>
                        <th class="text-left">SKU</th>
                        <th class="text-left">状态</th>
                        <th class="text-left">操作</th>
                    </tr>
                </thead>
                <tbody>
                    \${products.map(product => \`
                        <tr class="table-row">
                            <td class="table-cell">
                                <div>
                                    <div class="font-medium text-gray-900">\${product.name}</div>
                                    \${product.description ? \`<div class="text-sm text-gray-500">\${product.description}</div>\` : ''}
                                </div>
                            </td>
                            <td class="table-cell">\${product.company_name}</td>
                            <td class="table-cell">¥\${parseFloat(product.price).toFixed(2)}</td>
                            <td class="table-cell">
                                <span class="\${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}">
                                    \${product.stock}
                                </span>
                            </td>
                            <td class="table-cell">\${product.category || '-'}</td>
                            <td class="table-cell">\${product.sku || '-'}</td>
                            <td class="table-cell">
                                <span class="status-badge \${product.status === 'active' ? 'status-active' : 'status-inactive'}">
                                    \${product.status === 'active' ? '正常' : '停用'}
                                </span>
                            </td>
                            <td class="table-cell">
                                <div class="flex space-x-2">
                                    <button onclick="editProduct(\${product.id})" class="btn-success">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteProduct(\${product.id})" class="btn-danger">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    \`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 渲染分页控件
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const { page, totalPages } = pagination;
    let paginationHTML = '';
    
    // 上一页
    paginationHTML += \`
        <button onclick="loadProducts(\${page - 1})" 
                class="pagination-button" 
                \${page <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    \`;
    
    // 页码
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    if (startPage > 1) {
        paginationHTML += \`
            <button onclick="loadProducts(1)" class="pagination-button">1</button>
            \${startPage > 2 ? '<span class="px-2">...</span>' : ''}
        \`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += \`
            <button onclick="loadProducts(\${i})" 
                    class="pagination-button \${i === page ? 'active' : ''}">
                \${i}
            </button>
        \`;
    }
    
    if (endPage < totalPages) {
        paginationHTML += \`
            \${endPage < totalPages - 1 ? '<span class="px-2">...</span>' : ''}
            <button onclick="loadProducts(\${totalPages})" class="pagination-button">\${totalPages}</button>
        \`;
    }
    
    // 下一页
    paginationHTML += \`
        <button onclick="loadProducts(\${page + 1})" 
                class="pagination-button" 
                \${page >= totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    \`;
    
    container.innerHTML = paginationHTML;
}

// 搜索商品
function searchProducts() {
    currentFilters = {
        search: document.getElementById('searchInput').value,
        company: document.getElementById('companyFilter').value,
        category: document.getElementById('categoryFilter').value,
        minPrice: document.getElementById('minPrice').value,
        maxPrice: document.getElementById('maxPrice').value
    };
    
    // 移除空值
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) {
            delete currentFilters[key];
        }
    });
    
    loadProducts(1);
}

// 清空筛选条件
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('companyFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortBy').value = 'id';
    document.getElementById('sortOrder').value = 'DESC';
    
    currentFilters = {};
    loadProducts(1);
}

// 添加商品页面
function showAddProduct(editId = null) {
    const isEdit = editId !== null;
    const title = isEdit ? '编辑商品' : '添加商品';
    
    const content = document.getElementById('page-content');
    content.innerHTML = \`
        <div class="max-w-2xl mx-auto">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800">\${title}</h2>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <form id="productForm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="form-group">
                            <label class="form-label">商品名称 *</label>
                            <input type="text" id="productName" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">公司名称 *</label>
                            <input type="text" id="companyName" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">售价 *</label>
                            <input type="number" id="price" class="form-input" step="0.01" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">库存 *</label>
                            <input type="number" id="stock" class="form-input" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">商品分类</label>
                            <input type="text" id="category" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">商品编号 (SKU)</label>
                            <input type="text" id="sku" class="form-input">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">商品描述</label>
                        <textarea id="description" class="form-input" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" onclick="showProducts()" class="btn-secondary">
                            取消
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save mr-2"></i>\${isEdit ? '更新' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    \`;
    
    // 如果是编辑模式，加载商品数据
    if (isEdit) {
        loadProductForEdit(editId);
    }
    
    // 绑定表单提交事件
    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveProduct(editId);
    });
}

// 加载待编辑的商品数据
async function loadProductForEdit(id) {
    try {
        const response = await axios.get(\`/api/products/\${id}\`);
        const product = response.data.data;
        
        document.getElementById('productName').value = product.name;
        document.getElementById('companyName').value = product.company_name;
        document.getElementById('price').value = product.price;
        document.getElementById('stock').value = product.stock;
        document.getElementById('category').value = product.category || '';
        document.getElementById('sku').value = product.sku || '';
        document.getElementById('description').value = product.description || '';
        
    } catch (error) {
        showMessage('加载商品数据失败', 'error');
        console.error('Load product error:', error);
    }
}

// 保存商品
async function saveProduct(editId = null) {
    const formData = {
        name: document.getElementById('productName').value,
        company_name: document.getElementById('companyName').value,
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value),
        category: document.getElementById('category').value,
        sku: document.getElementById('sku').value,
        description: document.getElementById('description').value
    };
    
    try {
        showLoading();
        
        let response;
        if (editId) {
            response = await axios.put(\`/api/products/\${editId}\`, formData);
        } else {
            response = await axios.post('/api/products', formData);
        }
        
        if (response.data.success) {
            showMessage(\`商品\${editId ? '更新' : '添加'}成功\`);
            showProducts();
        } else {
            showMessage(response.data.error || '操作失败', 'error');
        }
        
    } catch (error) {
        showMessage(error.response?.data?.error || '操作失败', 'error');
        console.error('Save product error:', error);
    } finally {
        hideLoading();
    }
}

// 编辑商品
function editProduct(id) {
    showAddProduct(id);
}

// 删除商品
async function deleteProduct(id) {
    if (!confirm('确定要删除这个商品吗？')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await axios.delete(\`/api/products/\${id}\`);
        
        if (response.data.success) {
            showMessage('商品删除成功');
            loadProducts(currentProductPage);
        } else {
            showMessage(response.data.error || '删除失败', 'error');
        }
        
    } catch (error) {
        showMessage(error.response?.data?.error || '删除失败', 'error');
        console.error('Delete product error:', error);
    } finally {
        hideLoading();
    }
}

// 批量导入页面
function showImport() {
    const content = document.getElementById('page-content');
    content.innerHTML = \`
        <div class="max-w-4xl mx-auto">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-800">批量导入商品</h2>
                <p class="text-gray-600 mt-2">支持CSV格式文件导入，请确保文件包含必要的字段</p>
            </div>
            
            <!-- CSV 格式说明 -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold text-blue-800 mb-3">
                    <i class="fas fa-info-circle mr-2"></i>CSV 文件格式要求
                </h3>
                <div class="text-sm text-blue-700">
                    <p class="mb-2">请按以下格式准备CSV文件，第一行为表头：</p>
                    <code class="bg-white px-2 py-1 rounded border">
                        name,company_name,price,stock,description,category,sku
                    </code>
                    <ul class="mt-3 space-y-1">
                        <li>• <strong>name</strong>: 商品名称（必填）</li>
                        <li>• <strong>company_name</strong>: 公司名称（必填）</li>
                        <li>• <strong>price</strong>: 售价（必填，数字格式）</li>
                        <li>• <strong>stock</strong>: 库存（必填，整数）</li>
                        <li>• <strong>description</strong>: 商品描述（可选）</li>
                        <li>• <strong>category</strong>: 商品分类（可选）</li>
                        <li>• <strong>sku</strong>: 商品编号（可选，需唯一）</li>
                    </ul>
                </div>
            </div>
            
            <!-- 文件上传区域 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div id="dropZone" class="drop-zone">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                    <p class="text-lg text-gray-600 mb-2">拖拽CSV文件到这里，或者</p>
                    <button onclick="document.getElementById('fileInput').click()" class="btn-primary">
                        <i class="fas fa-folder-open mr-2"></i>选择文件
                    </button>
                    <input type="file" id="fileInput" accept=".csv" class="hidden">
                    <p class="text-sm text-gray-500 mt-2">支持 .csv 格式，最大 10MB</p>
                </div>
                
                <!-- 文件信息 -->
                <div id="fileInfo" class="hidden mt-4 p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-medium text-gray-800" id="fileName"></p>
                            <p class="text-sm text-gray-600" id="fileSize"></p>
                        </div>
                        <button onclick="clearFile()" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 预览区域 -->
                <div id="previewSection" class="hidden mt-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-3">数据预览</h4>
                    <div id="previewTable" class="overflow-x-auto border border-gray-200 rounded-lg">
                        <!-- 预览表格 -->
                    </div>
                    <div class="flex justify-end space-x-4 mt-6">
                        <button onclick="clearFile()" class="btn-secondary">
                            取消
                        </button>
                        <button onclick="importProducts()" class="btn-primary">
                            <i class="fas fa-upload mr-2"></i>开始导入
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 导入结果 -->
            <div id="importResult" class="hidden bg-white rounded-lg shadow-md p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-3">导入结果</h4>
                <div id="resultContent">
                    <!-- 结果内容 -->
                </div>
            </div>
        </div>
    \`;
    
    setupFileUpload();
}

// 设置文件上传功能
function setupFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽事件
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理文件
function handleFile(file) {
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showMessage('请选择CSV格式文件', 'error');
        return;
    }
    
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('文件大小不能超过10MB', 'error');
        return;
    }
    
    // 显示文件信息
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = \`\${(file.size / 1024).toFixed(2)} KB\`;
    document.getElementById('fileInfo').classList.remove('hidden');
    
    // 读取并预览文件
    const reader = new FileReader();
    reader.onload = function(e) {
        parseCSVContent(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
}

// 解析CSV内容
function parseCSVContent(csvContent) {
    const lines = csvContent.trim().split('\\n');
    
    if (lines.length < 2) {
        showMessage('CSV文件至少需要包含表头和一行数据', 'error');
        return;
    }
    
    // 解析表头
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // 验证必要的字段
    const requiredFields = ['name', 'company_name', 'price', 'stock'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
        showMessage(\`缺少必要字段: \${missingFields.join(', ')}\`, 'error');
        return;
    }
    
    // 解析数据行
    const products = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) { // 最多预览5行
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const product = {};
        
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });
        
        products.push(product);
    }
    
    // 存储完整数据用于导入
    window.importData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const product = {};
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });
        return product;
    });
    
    // 显示预览
    showPreview(headers, products, lines.length - 1);
}

// 显示预览
function showPreview(headers, products, totalCount) {
    const previewTable = document.getElementById('previewTable');
    
    previewTable.innerHTML = \`
        <table class="w-full text-sm">
            <thead>
                <tr class="bg-gray-50">
                    \${headers.map(header => \`<th class="px-4 py-2 text-left font-medium text-gray-700">\${header}</th>\`).join('')}
                </tr>
            </thead>
            <tbody>
                \${products.map(product => \`
                    <tr class="border-t border-gray-200">
                        \${headers.map(header => \`<td class="px-4 py-2 text-gray-900">\${product[header] || '-'}</td>\`).join('')}
                    </tr>
                \`).join('')}
            </tbody>
        </table>
    \`;
    
    document.getElementById('previewSection').classList.remove('hidden');
    
    if (totalCount > 5) {
        const notice = document.createElement('p');
        notice.className = 'text-sm text-gray-600 mt-2';
        notice.textContent = \`共 \${totalCount} 条数据，以上仅显示前 5 条预览\`;
        previewTable.appendChild(notice);
    }
}

// 清空文件
function clearFile() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('importResult').classList.add('hidden');
    window.importData = null;
}

// 导入商品
async function importProducts() {
    if (!window.importData) {
        showMessage('请先选择文件', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await axios.post('/api/products/batch', {
            products: window.importData
        });
        
        const result = response.data.data;
        
        // 显示导入结果
        document.getElementById('resultContent').innerHTML = \`
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">\${result.total}</div>
                        <div class="text-sm text-blue-600">总数据数</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">\${result.successCount}</div>
                        <div class="text-sm text-green-600">成功导入</div>
                    </div>
                    <div class="text-center p-4 bg-red-50 rounded-lg">
                        <div class="text-2xl font-bold text-red-600">\${result.errorCount}</div>
                        <div class="text-sm text-red-600">导入失败</div>
                    </div>
                </div>
                
                \${result.errors.length > 0 ? \`
                    <div class="mt-4">
                        <h5 class="font-medium text-red-800 mb-2">错误详情:</h5>
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                            \${result.errors.map(error => \`<div class="text-sm text-red-700">\${error}</div>\`).join('')}
                        </div>
                    </div>
                \` : ''}
                
                <div class="flex justify-end space-x-4 mt-6">
                    <button onclick="clearFile()" class="btn-secondary">
                        继续导入
                    </button>
                    <button onclick="showProducts()" class="btn-primary">
                        查看商品
                    </button>
                </div>
            </div>
        \`;
        
        document.getElementById('importResult').classList.remove('hidden');
        
        if (result.successCount > 0) {
            showMessage(\`成功导入 \${result.successCount} 个商品\`);
        }
        
    } catch (error) {
        showMessage(error.response?.data?.error || '导入失败', 'error');
        console.error('Import error:', error);
    } finally {
        hideLoading();
    }
}