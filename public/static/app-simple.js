console.log('简化版JavaScript开始加载...');

// 全局状态
window.appState = {
    currentPage: 'dashboard',
    currentProductPage: 1,
    currentFilters: {},
    products: [],
    stats: {}
};

// 显示加载状态
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

// 显示消息
function showMessage(message, type) {
    console.log('显示消息:', message, type);
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-error' : 'alert-warning';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert ' + alertClass;
    messageDiv.innerHTML = '<div class="flex items-center justify-between">' +
        '<span>' + message + '</span>' +
        '<button onclick="this.parentElement.parentElement.remove()" class="text-lg">&times;</button>' +
        '</div>';
    
    const content = document.getElementById('page-content');
    if (content) {
        content.insertBefore(messageDiv, content.firstChild);
        
        // 3秒后自动消失
        setTimeout(function() {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// 页面切换函数
function showPage(page) {
    console.log('切换页面到:', page);
    
    // 更新导航状态
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
        link.classList.remove('active');
    });
    
    // 激活当前页面的导航
    const currentLink = document.querySelector('a[onclick*="' + page + '"]');
    if (currentLink) {
        currentLink.classList.add('active');
    }
    
    window.appState.currentPage = page;
    
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
function showDashboard() {
    console.log('显示仪表板');
    showLoading();
    
    // 使用原生fetch而不是axios
    fetch('/api/stats')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log('获取到统计数据:', data);
            window.appState.stats = data.data;
            renderDashboard();
        })
        .catch(function(error) {
            console.error('获取统计数据失败:', error);
            showMessage('获取统计数据失败', 'error');
        })
        .finally(function() {
            hideLoading();
        });
}

function renderDashboard() {
    const stats = window.appState.stats;
    const content = document.getElementById('page-content');
    
    content.innerHTML = '<div class="mb-8">' +
        '<h2 class="text-3xl font-bold text-gray-800 mb-6">数据统计</h2>' +
        
        '<!-- 统计卡片 -->' +
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">' +
            '<div class="stats-card">' +
                '<div class="flex items-center">' +
                    '<div class="stats-card-icon bg-blue-500">' +
                        '<i class="fas fa-box"></i>' +
                    '</div>' +
                    '<div class="ml-4">' +
                        '<p class="text-sm text-gray-500">商品总数</p>' +
                        '<p class="text-2xl font-bold text-gray-800">' + (stats.totalProducts || 0) + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="stats-card">' +
                '<div class="flex items-center">' +
                    '<div class="stats-card-icon bg-green-500">' +
                        '<i class="fas fa-warehouse"></i>' +
                    '</div>' +
                    '<div class="ml-4">' +
                        '<p class="text-sm text-gray-500">总库存</p>' +
                        '<p class="text-2xl font-bold text-gray-800">' + (stats.totalStock || 0) + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="stats-card">' +
                '<div class="flex items-center">' +
                    '<div class="stats-card-icon bg-yellow-500">' +
                        '<i class="fas fa-dollar-sign"></i>' +
                    '</div>' +
                    '<div class="ml-4">' +
                        '<p class="text-sm text-gray-500">总价值</p>' +
                        '<p class="text-2xl font-bold text-gray-800">¥' + (stats.totalValue ? stats.totalValue.toFixed(2) : '0.00') + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="stats-card">' +
                '<div class="flex items-center">' +
                    '<div class="stats-card-icon bg-purple-500">' +
                        '<i class="fas fa-building"></i>' +
                    '</div>' +
                    '<div class="ml-4">' +
                        '<p class="text-sm text-gray-500">公司数量</p>' +
                        '<p class="text-2xl font-bold text-gray-800">' + (stats.totalCompanies || 0) + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        
        '<!-- 简化的分类信息 -->' +
        '<div class="bg-white rounded-lg shadow-md p-6">' +
            '<h3 class="text-xl font-bold text-gray-800 mb-4">商品分类统计</h3>' +
            '<div id="categoryInfo" class="grid grid-cols-2 md:grid-cols-3 gap-4">' +
                // 分类信息将在这里显示
            '</div>' +
        '</div>' +
    '</div>';
    
    // 显示分类信息
    renderCategoryInfo();
}

function renderCategoryInfo() {
    const stats = window.appState.stats;
    const container = document.getElementById('categoryInfo');
    
    if (stats.topCategories && container) {
        let html = '';
        stats.topCategories.forEach(function(cat) {
            html += '<div class="text-center p-4 bg-gray-50 rounded-lg">' +
                '<div class="text-lg font-bold text-gray-800">' + cat.count + '</div>' +
                '<div class="text-sm text-gray-600">' + (cat.category || '未分类') + '</div>' +
            '</div>';
        });
        container.innerHTML = html;
    }
}

// 商品管理页面
function showProducts() {
    console.log('显示商品管理');
    const content = document.getElementById('page-content');
    
    content.innerHTML = '<div class="mb-8">' +
        '<div class="flex items-center justify-between mb-6">' +
            '<h2 class="text-3xl font-bold text-gray-800">商品管理</h2>' +
            '<button onclick="showAddProduct()" class="btn-primary">' +
                '<i class="fas fa-plus mr-2"></i>添加商品' +
            '</button>' +
        '</div>' +
        
        '<!-- 搜索区域 -->' +
        '<div class="bg-white rounded-lg shadow-md p-6 mb-6">' +
            '<div class="flex items-center space-x-4 mb-4">' +
                '<input type="text" id="searchInput" class="flex-1 form-input" placeholder="输入搜索关键词">' +
                '<button onclick="searchProducts()" class="btn-primary">' +
                    '<i class="fas fa-search mr-2"></i>搜索' +
                '</button>' +
                '<button onclick="clearSearch()" class="btn-secondary">' +
                    '<i class="fas fa-times mr-2"></i>清空' +
                '</button>' +
            '</div>' +
        '</div>' +
        
        '<!-- 商品列表 -->' +
        '<div id="productList" class="table-container">' +
            '<div class="text-center py-8">' +
                '<i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>' +
                '<p class="text-gray-500">正在加载商品数据...</p>' +
            '</div>' +
        '</div>' +
        
        '<!-- 分页 -->' +
        '<div id="pagination" class="flex justify-center mt-6"></div>' +
    '</div>';
    
    // 绑定回车键搜索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
    
    loadProducts();
}

// 加载商品数据
function loadProducts(page) {
    page = page || 1;
    console.log('加载商品数据, 页码:', page);
    
    showLoading();
    window.appState.currentProductPage = page;
    
    // 构建查询参数
    const params = new URLSearchParams({
        page: page,
        limit: 20,
        sortBy: 'id',
        sortOrder: 'DESC'
    });
    
    // 添加搜索条件
    Object.keys(window.appState.currentFilters).forEach(function(key) {
        if (window.appState.currentFilters[key]) {
            params.append(key, window.appState.currentFilters[key]);
        }
    });
    
    fetch('/api/products?' + params.toString())
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log('加载商品数据成功:', data);
            if (data.success) {
                window.appState.products = data.data;
                renderProductTable(data.data);
                renderPagination(data.pagination);
            } else {
                showMessage('加载商品数据失败: ' + data.error, 'error');
            }
        })
        .catch(function(error) {
            console.error('加载商品数据失败:', error);
            showMessage('加载商品数据失败', 'error');
        })
        .finally(function() {
            hideLoading();
        });
}

// 渲染商品表格
function renderProductTable(products) {
    const container = document.getElementById('productList');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="text-center py-12">' +
            '<i class="fas fa-inbox text-4xl text-gray-400 mb-4"></i>' +
            '<p class="text-gray-500">暂无商品数据</p>' +
        '</div>';
        return;
    }
    
    let html = '<div class="table-responsive">' +
        '<table class="w-full">' +
            '<thead>' +
                '<tr class="table-header">' +
                    '<th class="text-left">商品名称</th>' +
                    '<th class="text-left">公司名称</th>' +
                    '<th class="text-left">价格</th>' +
                    '<th class="text-left">库存</th>' +
                    '<th class="text-left">分类</th>' +
                    '<th class="text-left">操作</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>';
    
    products.forEach(function(product) {
        const stockColor = product.stock > 10 ? 'text-green-600' : 
                          product.stock > 0 ? 'text-yellow-600' : 'text-red-600';
        
        html += '<tr class="table-row">' +
            '<td class="table-cell">' +
                '<div class="font-medium text-gray-900">' + (product.name || '') + '</div>' +
                (product.description ? '<div class="text-sm text-gray-500">' + product.description + '</div>' : '') +
            '</td>' +
            '<td class="table-cell">' + (product.company_name || '') + '</td>' +
            '<td class="table-cell">¥' + parseFloat(product.price || 0).toFixed(2) + '</td>' +
            '<td class="table-cell">' +
                '<span class="' + stockColor + '">' + (product.stock || 0) + '</span>' +
            '</td>' +
            '<td class="table-cell">' + (product.category || '-') + '</td>' +
            '<td class="table-cell">' +
                '<div class="flex space-x-2">' +
                    '<button onclick="editProduct(' + product.id + ')" class="btn-success" title="编辑">' +
                        '<i class="fas fa-edit"></i>' +
                    '</button>' +
                    '<button onclick="deleteProduct(' + product.id + ')" class="btn-danger" title="删除">' +
                        '<i class="fas fa-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 渲染分页
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const page = pagination.page;
    const totalPages = pagination.totalPages;
    
    let html = '';
    
    // 上一页
    html += '<button onclick="loadProducts(' + (page - 1) + ')" class="pagination-button" ' + 
            (page <= 1 ? 'disabled' : '') + '>' +
            '<i class="fas fa-chevron-left"></i>' +
            '</button>';
    
    // 当前页信息
    html += '<span class="px-4 py-2 text-sm text-gray-600">' +
            '第 ' + page + ' 页，共 ' + totalPages + ' 页' +
            '</span>';
    
    // 下一页
    html += '<button onclick="loadProducts(' + (page + 1) + ')" class="pagination-button" ' + 
            (page >= totalPages ? 'disabled' : '') + '>' +
            '<i class="fas fa-chevron-right"></i>' +
            '</button>';
    
    container.innerHTML = html;
}

// 搜索商品
function searchProducts() {
    console.log('搜索商品');
    const searchInput = document.getElementById('searchInput');
    const searchValue = searchInput ? searchInput.value.trim() : '';
    
    window.appState.currentFilters = {};
    if (searchValue) {
        window.appState.currentFilters.search = searchValue;
    }
    
    loadProducts(1);
}

// 清空搜索
function clearSearch() {
    console.log('清空搜索');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    window.appState.currentFilters = {};
    loadProducts(1);
}

// 添加商品页面
function showAddProduct(editId) {
    console.log('显示添加商品页面, editId:', editId);
    const isEdit = editId !== null && editId !== undefined;
    const title = isEdit ? '编辑商品' : '添加商品';
    
    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="max-w-2xl mx-auto">' +
        '<div class="mb-6">' +
            '<h2 class="text-3xl font-bold text-gray-800">' + title + '</h2>' +
        '</div>' +
        
        '<div class="bg-white rounded-lg shadow-md p-6">' +
            '<form id="productForm" onsubmit="return submitProductForm(event, ' + (editId || 'null') + ')">' +
                '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
                    '<div class="form-group">' +
                        '<label class="form-label">商品名称 *</label>' +
                        '<input type="text" id="productName" class="form-input" required>' +
                    '</div>' +
                    
                    '<div class="form-group">' +
                        '<label class="form-label">公司名称 *</label>' +
                        '<input type="text" id="companyName" class="form-input" required>' +
                    '</div>' +
                    
                    '<div class="form-group">' +
                        '<label class="form-label">售价 *</label>' +
                        '<input type="number" id="price" class="form-input" step="0.01" min="0" required>' +
                    '</div>' +
                    
                    '<div class="form-group">' +
                        '<label class="form-label">库存 *</label>' +
                        '<input type="number" id="stock" class="form-input" min="0" required>' +
                    '</div>' +
                    
                    '<div class="form-group">' +
                        '<label class="form-label">商品分类</label>' +
                        '<input type="text" id="category" class="form-input">' +
                    '</div>' +
                    
                    '<div class="form-group">' +
                        '<label class="form-label">商品编号 (SKU)</label>' +
                        '<input type="text" id="sku" class="form-input">' +
                    '</div>' +
                '</div>' +
                
                '<div class="form-group">' +
                    '<label class="form-label">商品描述</label>' +
                    '<textarea id="description" class="form-input" rows="3"></textarea>' +
                '</div>' +
                
                '<div class="flex justify-end space-x-4 mt-6">' +
                    '<button type="button" onclick="showProducts()" class="btn-secondary">取消</button>' +
                    '<button type="submit" class="btn-primary">' +
                        '<i class="fas fa-save mr-2"></i>' + (isEdit ? '更新' : '保存') +
                    '</button>' +
                '</div>' +
            '</form>' +
        '</div>' +
    '</div>';
    
    // 如果是编辑模式，加载商品数据
    if (isEdit) {
        loadProductForEdit(editId);
    }
}

// 提交商品表单
function submitProductForm(event, editId) {
    event.preventDefault();
    console.log('提交商品表单, editId:', editId);
    
    const formData = {
        name: document.getElementById('productName').value,
        company_name: document.getElementById('companyName').value,
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value),
        category: document.getElementById('category').value,
        sku: document.getElementById('sku').value,
        description: document.getElementById('description').value
    };
    
    console.log('表单数据:', formData);
    showLoading();
    
    const url = editId ? '/api/products/' + editId : '/api/products';
    const method = editId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        console.log('提交结果:', data);
        if (data.success) {
            showMessage('商品' + (editId ? '更新' : '添加') + '成功');
            showProducts();
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    })
    .catch(function(error) {
        console.error('提交失败:', error);
        showMessage('提交失败', 'error');
    })
    .finally(function() {
        hideLoading();
    });
    
    return false;
}

// 加载待编辑的商品数据
function loadProductForEdit(id) {
    console.log('加载编辑商品数据:', id);
    
    fetch('/api/products/' + id)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                const product = data.data;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('companyName').value = product.company_name || '';
                document.getElementById('price').value = product.price || '';
                document.getElementById('stock').value = product.stock || '';
                document.getElementById('category').value = product.category || '';
                document.getElementById('sku').value = product.sku || '';
                document.getElementById('description').value = product.description || '';
            } else {
                showMessage('加载商品数据失败', 'error');
            }
        })
        .catch(function(error) {
            console.error('加载商品数据失败:', error);
            showMessage('加载商品数据失败', 'error');
        });
}

// 编辑商品
function editProduct(id) {
    console.log('编辑商品:', id);
    showAddProduct(id);
}

// 删除商品
function deleteProduct(id) {
    console.log('删除商品:', id);
    
    if (!confirm('确定要删除这个商品吗？')) {
        return;
    }
    
    showLoading();
    
    fetch('/api/products/' + id, {
        method: 'DELETE'
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            showMessage('商品删除成功');
            loadProducts(window.appState.currentProductPage);
        } else {
            showMessage(data.error || '删除失败', 'error');
        }
    })
    .catch(function(error) {
        console.error('删除失败:', error);
        showMessage('删除失败', 'error');
    })
    .finally(function() {
        hideLoading();
    });
}

// 批量导入页面
function showImport() {
    console.log('显示批量导入页面');
    const content = document.getElementById('page-content');
    
    content.innerHTML = '<div class="max-w-4xl mx-auto">' +
        '<div class="mb-6">' +
            '<h2 class="text-3xl font-bold text-gray-800">批量导入商品</h2>' +
            '<p class="text-gray-600 mt-2">支持CSV格式文件导入</p>' +
        '</div>' +
        
        '<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">' +
            '<h3 class="text-lg font-semibold text-blue-800 mb-3">' +
                '<i class="fas fa-info-circle mr-2"></i>CSV 文件格式要求' +
            '</h3>' +
            '<div class="text-sm text-blue-700">' +
                '<p class="mb-2">CSV文件第一行为表头：</p>' +
                '<code class="bg-white px-2 py-1 rounded border">' +
                    'name,company_name,price,stock,description,category,sku' +
                '</code>' +
                '<ul class="mt-3 space-y-1">' +
                    '<li>• name: 商品名称（必填）</li>' +
                    '<li>• company_name: 公司名称（必填）</li>' +
                    '<li>• price: 售价（必填，数字格式）</li>' +
                    '<li>• stock: 库存（必填，整数）</li>' +
                    '<li>• description, category, sku: 可选字段</li>' +
                '</ul>' +
            '</div>' +
        '</div>' +
        
        '<div class="bg-white rounded-lg shadow-md p-6">' +
            '<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">' +
                '<i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>' +
                '<p class="text-lg text-gray-600 mb-4">选择CSV文件上传</p>' +
                '<input type="file" id="csvFile" accept=".csv" class="hidden" onchange="handleCSVFile(this)">' +
                '<button onclick="document.getElementById(\'csvFile\').click()" class="btn-primary">' +
                    '<i class="fas fa-folder-open mr-2"></i>选择文件' +
                '</button>' +
                '<p class="text-sm text-gray-500 mt-2">支持 .csv 格式，最大 10MB</p>' +
            '</div>' +
            
            '<div id="importResults" class="hidden mt-6">' +
                '<h4 class="text-lg font-semibold text-gray-800 mb-3">导入结果</h4>' +
                '<div id="importContent"></div>' +
            '</div>' +
        '</div>' +
    '</div>';
}

// 处理CSV文件
function handleCSVFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    console.log('处理CSV文件:', file.name);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showMessage('请选择CSV格式文件', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showMessage('文件大小不能超过10MB', 'error');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const lines = csvContent.trim().split('\n');
            
            if (lines.length < 2) {
                showMessage('CSV文件至少需要包含表头和一行数据', 'error');
                hideLoading();
                return;
            }
            
            // 解析表头
            const headers = lines[0].split(',').map(function(h) { return h.trim().replace(/"/g, ''); });
            
            // 验证必要字段
            const requiredFields = ['name', 'company_name', 'price', 'stock'];
            const missingFields = requiredFields.filter(function(field) {
                return headers.indexOf(field) === -1;
            });
            
            if (missingFields.length > 0) {
                showMessage('缺少必要字段: ' + missingFields.join(', '), 'error');
                hideLoading();
                return;
            }
            
            // 解析数据
            const products = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(function(v) { return v.trim().replace(/"/g, ''); });
                const product = {};
                
                headers.forEach(function(header, index) {
                    product[header] = values[index] || '';
                });
                
                products.push(product);
            }
            
            console.log('解析到商品数据:', products.length, '条');
            
            // 开始导入
            importProducts(products);
            
        } catch (error) {
            console.error('解析CSV文件失败:', error);
            showMessage('解析CSV文件失败', 'error');
            hideLoading();
        }
    };
    
    reader.readAsText(file, 'UTF-8');
}

// 导入商品数据
function importProducts(products) {
    console.log('开始导入商品:', products.length, '条');
    
    fetch('/api/products/batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: products })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        console.log('导入结果:', data);
        
        if (data.success) {
            const result = data.data;
            
            const resultsDiv = document.getElementById('importResults');
            const contentDiv = document.getElementById('importContent');
            
            let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">' +
                '<div class="text-center p-4 bg-blue-50 rounded-lg">' +
                    '<div class="text-2xl font-bold text-blue-600">' + result.total + '</div>' +
                    '<div class="text-sm text-blue-600">总数据数</div>' +
                '</div>' +
                '<div class="text-center p-4 bg-green-50 rounded-lg">' +
                    '<div class="text-2xl font-bold text-green-600">' + result.successCount + '</div>' +
                    '<div class="text-sm text-green-600">成功导入</div>' +
                '</div>' +
                '<div class="text-center p-4 bg-red-50 rounded-lg">' +
                    '<div class="text-2xl font-bold text-red-600">' + result.errorCount + '</div>' +
                    '<div class="text-sm text-red-600">导入失败</div>' +
                '</div>' +
            '</div>';
            
            if (result.errors && result.errors.length > 0) {
                html += '<div class="mt-4">' +
                    '<h5 class="font-medium text-red-800 mb-2">错误详情:</h5>' +
                    '<div class="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">';
                
                result.errors.forEach(function(error) {
                    html += '<div class="text-sm text-red-700">' + error + '</div>';
                });
                
                html += '</div></div>';
            }
            
            html += '<div class="flex justify-end mt-6">' +
                '<button onclick="showProducts()" class="btn-primary">查看商品</button>' +
            '</div>';
            
            contentDiv.innerHTML = html;
            resultsDiv.classList.remove('hidden');
            
            if (result.successCount > 0) {
                showMessage('成功导入 ' + result.successCount + ' 个商品');
            }
        } else {
            showMessage(data.error || '导入失败', 'error');
        }
    })
    .catch(function(error) {
        console.error('导入失败:', error);
        showMessage('导入失败', 'error');
    })
    .finally(function() {
        hideLoading();
    });
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面DOM加载完成');
    
    // 检查必要的元素是否存在
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error('找不到 page-content 元素');
        return;
    }
    
    console.log('开始初始化应用...');
    
    // 设置默认页面
    showPage('dashboard');
    
    console.log('应用初始化完成');
});

console.log('简化版JavaScript加载完成');