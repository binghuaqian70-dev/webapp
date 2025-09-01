// 产品管理系统 - 前端JavaScript

// 全局状态
window.appState = {
    currentPage: 'dashboard',
    currentProductPage: 1,
    currentFilters: {},
    products: [],
    stats: {},
    // 新增认证状态
    isAuthenticated: false,
    authToken: null,
    // 用户管理状态
    currentUser: null,
    users: [],
    currentUserPage: 1,
    userFilters: {}
};

// 认证相关函数
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem('authToken', token);
        window.appState.authToken = token;
        window.appState.isAuthenticated = true;
    } else {
        localStorage.removeItem('authToken');
        window.appState.authToken = null;
        window.appState.isAuthenticated = false;
    }
}

function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        showLoginPage();
        return false;
    }
    
    // 验证token有效性
    return fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(function(response) {
        if (response.ok) {
            window.appState.isAuthenticated = true;
            window.appState.authToken = token;
            return true;
        } else {
            setAuthToken(null);
            showLoginPage();
            return false;
        }
    })
    .catch(function(error) {
        console.error('Token验证失败:', error);
        setAuthToken(null);
        showLoginPage();
        return false;
    });
}

function showLoginPage() {
    
    // 显示HTML中的登录页面
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    
    if (loginPage) {
        loginPage.classList.remove('hidden');
    }
    if (mainApp) {
        mainApp.classList.add('hidden');
    }
    
    // HTML中已有onsubmit事件，无需重复绑定
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 创建错误显示区域（如果不存在）
    let errorDiv = document.getElementById('loginError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'loginError';
        errorDiv.className = 'hidden text-red-600 text-sm text-center mt-4';
        const form = document.getElementById('login-form');
        if (form) {
            form.appendChild(errorDiv);
        }
    }
    
    // 隐藏之前的错误消息
    errorDiv.classList.add('hidden');
    
    // 显示加载状态
    const submitButton = event.target.querySelector('button[type="submit"]');
    if (!submitButton) {
        return false;
    }
    
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登录中...';
    submitButton.disabled = true;
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            // 登录成功
            setAuthToken(data.data.token);
            // 保存用户信息
            window.appState.currentUser = data.data.user;
            showMainApp();
        } else {
            // 登录失败
            console.log('登录失败:', data.error);
            errorDiv.textContent = data.error || '登录失败';
            errorDiv.classList.remove('hidden');
        }
    })
    .catch(function(error) {
        errorDiv.textContent = '网络连接失败，请重试';
        errorDiv.classList.remove('hidden');
    })
    .finally(function() {
        // 恢复按钮状态
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    });
    
    return false;
}

function showMainApp() {
    console.log('显示主应用界面');
    
    // 隐藏登录页面，显示主应用
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    
    if (loginPage) {
        loginPage.classList.add('hidden');
    }
    if (mainApp) {
        mainApp.classList.remove('hidden');
    }
    
    // 更新用户显示
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && window.appState.currentUser) {
        usernameDisplay.textContent = window.appState.currentUser.username;
    }
    
    // 根据用户角色控制用户管理菜单显示
    const userManagementLink = document.getElementById('user-management-link');
    if (userManagementLink) {
        if (window.appState.currentUser && window.appState.currentUser.role === 'admin') {
            userManagementLink.style.display = 'block';
        } else {
            // 普通用户完全隐藏用户管理菜单
            userManagementLink.style.display = 'none';
        }
    }
    
    // 初始化主应用
    showPage('dashboard');
}

function handleLogout() {
    const token = getAuthToken();
    if (token) {
        // 向服务器发送登出请求
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .catch(function(error) {
            // 忽略登出请求错误
        });
    }
    
    // 清除本地状态
    setAuthToken(null);
    showLoginPage();
}

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

// 统一的API请求函数，自动处理认证
function makeAuthenticatedRequest(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    
    const token = getAuthToken();
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    return fetch(url, options)
        .then(function(response) {
            if (response.status === 401) {
                // 认证失败，重新登录
                setAuthToken(null);
                showLoginPage();
                throw new Error('认证失败，请重新登录');
            }
            return response;
        });
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
        case 'users':
            // 只有管理员才能访问用户管理页面
            if (window.appState.currentUser && window.appState.currentUser.role === 'admin') {
                showUsers();
            } else {
                showPage('dashboard'); // 普通用户重定向到首页
                showMessage('您没有权限访问用户管理功能', 'error');
            }
            break;
        default:
            showDashboard();
    }
}

// 仪表板页面
function showDashboard() {
    console.log('显示仪表板');
    showLoading();
    
    // 使用认证请求
    makeAuthenticatedRequest('/api/stats')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
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
            '<!-- 搜索输入行 -->' +
            '<div class="flex items-center space-x-4 mb-4">' +
                '<input type="text" id="searchInput" class="flex-1 form-input" placeholder="输入搜索关键词">' +
                '<button onclick="toggleAdvancedSearch()" class="btn-secondary" id="advancedToggle">' +
                    '<i class="fas fa-filter mr-2"></i>高级搜索' +
                '</button>' +
                '<button onclick="searchProducts()" class="btn-primary">' +
                    '<i class="fas fa-search mr-2"></i>搜索' +
                '</button>' +
                '<button onclick="clearSearch()" class="btn-secondary">' +
                    '<i class="fas fa-times mr-2"></i>清空' +
                '</button>' +
            '</div>' +
            
            '<!-- 高级搜索选项 -->' +
            '<div id="advancedSearchOptions" class="hidden border-t pt-4">' +
                '<div class="mb-4">' +
                    '<label class="block text-sm font-medium text-gray-700 mb-2">搜索字段:</label>' +
                    '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">' +
                        '<label class="flex items-center space-x-2">' +
                            '<input type="checkbox" value="name" class="search-field-checkbox" checked>' +
                            '<span class="text-sm">商品名称</span>' +
                        '</label>' +
                        '<label class="flex items-center space-x-2">' +
                            '<input type="checkbox" value="company_name" class="search-field-checkbox" checked>' +
                            '<span class="text-sm">公司名称</span>' +
                        '</label>' +
                        '<label class="flex items-center space-x-2">' +
                            '<input type="checkbox" value="description" class="search-field-checkbox" checked>' +
                            '<span class="text-sm">商品描述</span>' +
                        '</label>' +
                        '<label class="flex items-center space-x-2">' +
                            '<input type="checkbox" value="category" class="search-field-checkbox" checked>' +
                            '<span class="text-sm">商品分类</span>' +
                        '</label>' +
                        '<label class="flex items-center space-x-2">' +
                            '<input type="checkbox" value="sku" class="search-field-checkbox" checked>' +
                            '<span class="text-sm">商品编号</span>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
                
                '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
                    '<div>' +
                        '<label class="block text-sm font-medium text-gray-700 mb-1">公司筛选:</label>' +
                        '<input type="text" id="companyFilter" class="form-input" placeholder="公司名称">' +
                    '</div>' +
                    '<div>' +
                        '<label class="block text-sm font-medium text-gray-700 mb-1">分类筛选:</label>' +
                        '<input type="text" id="categoryFilter" class="form-input" placeholder="商品分类">' +
                    '</div>' +
                    '<div class="grid grid-cols-2 gap-2">' +
                        '<div>' +
                            '<label class="block text-sm font-medium text-gray-700 mb-1">最低价格:</label>' +
                            '<input type="number" id="minPriceFilter" class="form-input" placeholder="0">' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-sm font-medium text-gray-700 mb-1">最高价格:</label>' +
                            '<input type="number" id="maxPriceFilter" class="form-input" placeholder="无限制">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
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
    
    // 绑定搜索输入事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // 回车键搜索
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
        
        // 实时搜索建议 (延迟执行)
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const value = e.target.value.trim();
            
            if (value.length >= 2) {
                searchTimeout = setTimeout(function() {
                    showSearchSuggestions(value);
                }, 500);
            } else {
                hideSearchSuggestions();
            }
        });
    }
    
    // 绑定高级搜索字段的回车键事件
    const advancedInputs = ['companyFilter', 'categoryFilter', 'minPriceFilter', 'maxPriceFilter'];
    advancedInputs.forEach(function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchProducts();
                }
            });
        }
    });
    
    loadProducts();
}

// 显示搜索建议
function showSearchSuggestions(query) {
    // 获取当前选中的搜索字段
    const selectedFields = [];
    const checkboxes = document.querySelectorAll('.search-field-checkbox:checked');
    checkboxes.forEach(function(checkbox) {
        selectedFields.push(checkbox.value);
    });
    
    const searchFields = selectedFields.length > 0 && selectedFields.length < 5 
        ? selectedFields.join(',') : 'all';
    
    makeAuthenticatedRequest('/api/search?q=' + encodeURIComponent(query) + '&limit=5&searchFields=' + searchFields)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.data && data.data.length > 0) {
                renderSearchSuggestions(data.data);
            } else {
                hideSearchSuggestions();
            }
        })
        .catch(function(error) {
            console.error('搜索建议失败:', error);
            hideSearchSuggestions();
        });
}

// 渲染搜索建议
function renderSearchSuggestions(suggestions) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // 创建建议容器
    let suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'searchSuggestions';
        suggestionsContainer.className = 'absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1';
        searchInput.parentNode.style.position = 'relative';
        searchInput.parentNode.appendChild(suggestionsContainer);
    }
    
    let html = '';
    suggestions.forEach(function(item) {
        html += '<div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 suggestion-item" onclick="selectSuggestion(\'' + 
            item.name.replace(/'/g, "\\'") + '\')">' +
            '<div class="font-medium text-gray-900">' + item.name + '</div>' +
            '<div class="text-sm text-gray-600">' + item.company_name + ' • ¥' + item.price + '</div>' +
        '</div>';
    });
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

// 隐藏搜索建议
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// 选择搜索建议
function selectSuggestion(suggestion) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = suggestion;
        hideSearchSuggestions();
        searchProducts();
    }
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
    
    makeAuthenticatedRequest('/api/products?' + params.toString())
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
    
    // 重置过滤条件
    window.appState.currentFilters = {};
    
    // 添加搜索关键词
    if (searchValue) {
        window.appState.currentFilters.search = searchValue;
        
        // 获取选中的搜索字段
        const selectedFields = [];
        const checkboxes = document.querySelectorAll('.search-field-checkbox:checked');
        checkboxes.forEach(function(checkbox) {
            selectedFields.push(checkbox.value);
        });
        
        // 如果没有全选，则指定搜索字段
        if (selectedFields.length > 0 && selectedFields.length < 5) {
            window.appState.currentFilters.searchFields = selectedFields.join(',');
        }
    }
    
    // 添加高级搜索条件
    const companyFilter = document.getElementById('companyFilter');
    if (companyFilter && companyFilter.value.trim()) {
        window.appState.currentFilters.company = companyFilter.value.trim();
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && categoryFilter.value.trim()) {
        window.appState.currentFilters.category = categoryFilter.value.trim();
    }
    
    const minPriceFilter = document.getElementById('minPriceFilter');
    if (minPriceFilter && minPriceFilter.value) {
        window.appState.currentFilters.minPrice = minPriceFilter.value;
    }
    
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    if (maxPriceFilter && maxPriceFilter.value) {
        window.appState.currentFilters.maxPrice = maxPriceFilter.value;
    }
    
    console.log('当前搜索条件:', window.appState.currentFilters);
    loadProducts(1);
}

// 切换高级搜索选项
function toggleAdvancedSearch() {
    const options = document.getElementById('advancedSearchOptions');
    const toggle = document.getElementById('advancedToggle');
    
    if (options.classList.contains('hidden')) {
        options.classList.remove('hidden');
        toggle.innerHTML = '<i class="fas fa-filter mr-2"></i>收起高级';
    } else {
        options.classList.add('hidden');
        toggle.innerHTML = '<i class="fas fa-filter mr-2"></i>高级搜索';
    }
}

// 清空搜索
function clearSearch() {
    console.log('清空搜索');
    
    // 清空搜索输入框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 清空高级搜索字段
    const companyFilter = document.getElementById('companyFilter');
    if (companyFilter) companyFilter.value = '';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = '';
    
    const minPriceFilter = document.getElementById('minPriceFilter');
    if (minPriceFilter) minPriceFilter.value = '';
    
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    if (maxPriceFilter) maxPriceFilter.value = '';
    
    // 重新选中所有搜索字段
    const checkboxes = document.querySelectorAll('.search-field-checkbox');
    checkboxes.forEach(function(checkbox) {
        checkbox.checked = true;
    });
    
    // 清空过滤条件并重新加载
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
    
    makeAuthenticatedRequest(url, {
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
    
    makeAuthenticatedRequest('/api/products/' + id)
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
    
    makeAuthenticatedRequest('/api/products/' + id, {
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

// 处理CSV文件（直接使用独立页面成功的逻辑）
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
    
    // 首先尝试检测文件编码并正确读取
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let csvContent = e.target.result;
            console.log('📋 读取CSV文件内容，长度:', csvContent.length);
            console.log('📋 文件内容前100字符:', csvContent.substring(0, 100));
            
            // 检测是否包含GBK乱码字符，如果有则标记需要处理
            const hasGBKIssues = csvContent.includes('��') || 
                                csvContent.includes('') || 
                                /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(csvContent);
            
            if (hasGBKIssues) {
                console.log('🔍 检测到可能的GBK编码问题，尝试重新读取...');
                // 重新使用ArrayBuffer方式读取，然后让后端处理
                const arrayReader = new FileReader();
                arrayReader.onload = function(arrayEvent) {
                    const arrayBuffer = arrayEvent.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    // 转换为原始字符串（保留原始字节）
                    let rawContent = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        rawContent += String.fromCharCode(uint8Array[i]);
                    }
                    
                    console.log('🔧 ArrayBuffer读取完成，长度:', rawContent.length);
                    console.log('🔧 原始内容前100字符:', rawContent.substring(0, 100));
                    
                    importCSVContent(rawContent);
                };
                arrayReader.readAsArrayBuffer(file);
                return;
            }
            
            // 直接调用后端的import-csv API
            importCSVContent(csvContent);
            
        } catch (error) {
            console.error('读取CSV文件失败:', error);
            showMessage('读取CSV文件失败', 'error');
            hideLoading();
        }
    };
    
    // 首先尝试用UTF-8读取
    reader.readAsText(file, 'UTF-8');
}

// 调用后端CSV导入API（使用独立页面相同的API端点）
function importCSVContent(csvContent) {
    console.log('🚀 调用后端CSV导入API...');
    
    makeAuthenticatedRequest('/api/products/import-csv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvData: csvContent })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        console.log('📥 API返回结果:', data);
        
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
                html += '<div class="mt-4 p-4 bg-red-50 rounded-lg">' +
                    '<h5 class="font-semibold text-red-800 mb-2">错误详情:</h5>' +
                    '<ul class="text-sm text-red-700 space-y-1">';
                result.errors.forEach(function(error) {
                    html += '<li>• ' + error + '</li>';
                });
                html += '</ul></div>';
            }
            
            contentDiv.innerHTML = html;
            resultsDiv.classList.remove('hidden');
            
            showMessage('导入完成！成功导入 ' + result.successCount + ' 条记录', 'success');
            
            // 刷新产品列表
            if (window.appState.currentPage === 'products') {
                loadProducts();
            }
            
        } else {
            showMessage('CSV导入失败: ' + data.error, 'error');
        }
        
    })
    .catch(function(error) {
        console.error('CSV导入API调用失败:', error);
        showMessage('CSV导入失败: ' + error.message, 'error');
    })
    .finally(function() {
        hideLoading();
    });
}

// 导入商品数据
function importProducts(products) {
    console.log('开始导入商品:', products.length, '条');
    
    makeAuthenticatedRequest('/api/products/batch', {
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
    
    // 检查认证状态
    const authCheck = checkAuthentication();
    
    // 如果返回的是Promise（异步检查），等待结果
    if (authCheck && typeof authCheck.then === 'function') {
        authCheck.then(function(isAuthenticated) {
            if (isAuthenticated) {
                showMainApp();
            }
        });
    } else if (authCheck === false) {
        // 同步检查失败，显示登录页面
        showLoginPage();
    } else {
        // 已认证，显示主应用
        showMainApp();
    }
    
    console.log('应用初始化完成');
});

// 将主要函数暴露到全局作用域
window.handleLogin = handleLogin;
window.showPage = showPage;
window.handleLogout = handleLogout;
window.showProducts = showProducts;
window.showAddProduct = showAddProduct;
window.showImport = showImport;
window.showDashboard = showDashboard;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.submitProductForm = submitProductForm;
window.searchProducts = searchProducts;
window.clearSearch = clearSearch;
window.toggleAdvancedSearch = toggleAdvancedSearch;
window.selectSuggestion = selectSuggestion;
window.loadProducts = loadProducts;
window.handleCSVFile = handleCSVFile;
window.showUsers = showUsers;
window.addUser = addUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.resetUserPassword = resetUserPassword;
window.searchUsers = searchUsers;
window.loadUsers = loadUsers;
window.submitUserForm = submitUserForm;

// 用户管理相关函数

// 显示用户管理页面
function showUsers() {
    // 权限检查：只有管理员可以访问用户管理功能
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限访问用户管理功能', 'error');
        showPage('dashboard');
        return;
    }
    
    console.log('显示用户管理页面');
    
    const content = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
                <i class="fas fa-users mr-2 text-blue-600"></i>用户管理
            </h2>
            
            <!-- 用户操作栏 -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">用户操作</h3>
                    <button onclick="addUser()" class="btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>添加用户
                    </button>
                </div>
                
                <!-- 用户搜索 -->
                <div class="flex space-x-4">
                    <div class="flex-1">
                        <input type="text" id="userSearchInput" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md" 
                               placeholder="搜索用户名或邮箱...">
                    </div>
                    <div class="w-32">
                        <select id="roleFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">所有角色</option>
                            <option value="admin">管理员</option>
                            <option value="manager">经理</option>
                            <option value="user">用户</option>
                        </select>
                    </div>
                    <div class="w-32">
                        <select id="statusFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                            <option value="">所有状态</option>
                            <option value="active">活跃</option>
                            <option value="inactive">停用</option>
                            <option value="suspended">暂停</option>
                        </select>
                    </div>
                    <button onclick="searchUsers()" class="btn-primary">
                        <i class="fas fa-search mr-2"></i>搜索
                    </button>
                </div>
            </div>
            
            <!-- 用户列表 -->
            <div class="bg-white rounded-lg shadow-md">
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-4">用户列表</h3>
                    <div id="users-table-container">
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-4"></i>
                            <p class="text-gray-600">正在加载用户数据...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 用户表单模态框 -->
        <div id="userModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 id="userModalTitle" class="text-lg font-semibold text-gray-700">添加用户</h3>
                            <button onclick="closeUserModal()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <form id="userForm" onsubmit="return submitUserForm(event)">
                            <input type="hidden" id="userId" value="">
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                                    <input type="text" id="userUsername" class="form-input" required>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                                    <input type="email" id="userEmail" class="form-input" required>
                                </div>
                                
                                <div id="passwordField">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                                    <input type="password" id="userPassword" class="form-input">
                                    <p class="text-xs text-gray-500 mt-1">至少6位，包含字母和数字</p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
                                    <select id="userRole" class="form-input" required>
                                        <option value="user">用户</option>
                                        <option value="manager">经理</option>
                                        <option value="admin">管理员</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
                                    <select id="userStatus" class="form-input" required>
                                        <option value="active">活跃</option>
                                        <option value="inactive">停用</option>
                                        <option value="suspended">暂停</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="mt-6 flex space-x-3">
                                <button type="submit" class="btn-primary flex-1">
                                    <i class="fas fa-save mr-2"></i>保存
                                </button>
                                <button type="button" onclick="closeUserModal()" class="btn-secondary flex-1">
                                    <i class="fas fa-times mr-2"></i>取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('page-content').innerHTML = content;
    
    // 绑定事件
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }
    
    // 加载用户数据
    loadUsers();
}

// 加载用户列表
function loadUsers(page = 1) {
    // 权限检查：只有管理员可以加载用户列表
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限访问用户数据', 'error');
        return;
    }
    
    const search = document.getElementById('userSearchInput')?.value || '';
    const role = document.getElementById('roleFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    let url = `/api/users?page=${page}&limit=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role) url += `&role=${role}`;
    if (status) url += `&status=${status}`;
    
    makeAuthenticatedRequest(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderUsersTable(data.data.users, data.data.pagination);
            } else {
                showError('加载用户数据失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            console.error('加载用户失败:', error);
            showError('加载用户数据失败');
        });
}

// 渲染用户表格
function renderUsersTable(users, pagination) {
    const container = document.getElementById('users-table-container');
    if (!container) return;
    
    let html = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    if (users && users.length > 0) {
        users.forEach(user => {
            const roleText = {
                'admin': '管理员',
                'manager': '经理', 
                'user': '用户'
            }[user.role] || user.role;
            
            const statusText = {
                'active': '活跃',
                'inactive': '停用',
                'suspended': '暂停'
            }[user.status] || user.status;
            
            const statusClass = {
                'active': 'bg-green-100 text-green-800',
                'inactive': 'bg-gray-100 text-gray-800',
                'suspended': 'bg-red-100 text-red-800'
            }[user.status] || 'bg-gray-100 text-gray-800';
            
            const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('zh-CN') : '从未登录';
            
            html += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <i class="fas fa-user-circle text-gray-400 mr-2"></i>
                            <span class="text-sm font-medium text-gray-900">${user.username}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${roleText}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastLogin}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-3" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="resetUserPassword(${user.id})" class="text-orange-600 hover:text-orange-900 mr-3" title="重置密码">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    <i class="fas fa-users text-4xl mb-2 opacity-50"></i>
                    <p>暂无用户数据</p>
                </td>
            </tr>
        `;
    }
    
    html += '</tbody></table></div>';
    
    // 添加分页
    if (pagination && pagination.totalPages > 1) {
        html += '<div class="mt-6 flex justify-center">';
        html += '<nav class="flex space-x-2">';
        
        if (pagination.hasPrev) {
            html += `<button onclick="loadUsers(${pagination.page - 1})" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">上一页</button>`;
        }
        
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.totalPages, pagination.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === pagination.page;
            const buttonClass = isActive 
                ? 'px-3 py-2 text-sm bg-blue-600 text-white rounded' 
                : 'px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200';
            
            html += `<button onclick="loadUsers(${i})" class="${buttonClass}">${i}</button>`;
        }
        
        if (pagination.hasNext) {
            html += `<button onclick="loadUsers(${pagination.page + 1})" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">下一页</button>`;
        }
        
        html += '</nav></div>';
    }
    
    container.innerHTML = html;
}

// 添加用户
function addUser() {
    // 权限检查：只有管理员可以添加用户
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限执行此操作', 'error');
        return;
    }
    
    document.getElementById('userModalTitle').textContent = '添加用户';
    document.getElementById('userId').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = 'user';
    document.getElementById('userStatus').value = 'active';
    
    // 显示密码字段
    document.getElementById('passwordField').style.display = 'block';
    document.getElementById('userPassword').required = true;
    
    document.getElementById('userModal').classList.remove('hidden');
}

// 编辑用户
function editUser(userId) {
    // 权限检查：只有管理员可以编辑用户
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限执行此操作', 'error');
        return;
    }
    
    // 从 API 获取用户详情
    makeAuthenticatedRequest(`/api/users?search=${userId}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.users.length > 0) {
                const user = data.data.users[0];
                
                document.getElementById('userModalTitle').textContent = '编辑用户';
                document.getElementById('userId').value = user.id;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userRole').value = user.role;
                document.getElementById('userStatus').value = user.status;
                
                // 隐藏密码字段
                document.getElementById('passwordField').style.display = 'none';
                document.getElementById('userPassword').required = false;
                
                document.getElementById('userModal').classList.remove('hidden');
            } else {
                showError('获取用户信息失败');
            }
        })
        .catch(error => {
            console.error('获取用户信息失败:', error);
            showError('获取用户信息失败');
        });
}

// 关闭用户模态框
function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

// 提交用户表单
function submitUserForm(event) {
    event.preventDefault();
    
    // 权限检查：只有管理员可以提交用户表单
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限执行此操作', 'error');
        return;
    }
    
    const userId = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;
    
    const isEdit = userId !== '';
    
    let requestData = {
        email: email,
        role: role,
        status: status
    };
    
    if (!isEdit) {
        requestData.username = username;
        requestData.password = password;
    }
    
    const url = isEdit ? `/api/users/${userId}` : '/api/auth/register';
    const method = isEdit ? 'PUT' : 'POST';
    
    makeAuthenticatedRequest(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(isEdit ? '用户更新成功' : '用户添加成功');
            closeUserModal();
            loadUsers();
        } else {
            showError(data.error || '操作失败');
        }
    })
    .catch(error => {
        console.error('提交用户表单失败:', error);
        showError('操作失败，请重试');
    });
    
    return false;
}

// 删除用户
function deleteUser(userId) {
    // 权限检查：只有管理员可以删除用户
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限执行此操作', 'error');
        return;
    }
    
    if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) {
        return;
    }
    
    makeAuthenticatedRequest(`/api/users/${userId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('用户删除成功');
            loadUsers();
        } else {
            showError(data.error || '删除失败');
        }
    })
    .catch(error => {
        console.error('删除用户失败:', error);
        showError('删除失败，请重试');
    });
}

// 重置用户密码
function resetUserPassword(userId) {
    // 权限检查：只有管理员可以重置用户密码
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限执行此操作', 'error');
        return;
    }
    
    const newPassword = prompt('请输入新密码（至少6位，包含字母和数字）:');
    
    if (!newPassword) {
        return;
    }
    
    if (newPassword.length < 6 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
        showError('密码格式不正确，至少6位且包含字母和数字');
        return;
    }
    
    makeAuthenticatedRequest(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('密码重置成功');
        } else {
            showError(data.error || '重置密码失败');
        }
    })
    .catch(error => {
        console.error('重置密码失败:', error);
        showError('重置密码失败，请重试');
    });
}

// 搜索用户
function searchUsers() {
    // 权限检查：只有管理员可以搜索用户
    if (!window.appState.currentUser || window.appState.currentUser.role !== 'admin') {
        showMessage('您没有权限搜索用户数据', 'error');
        return;
    }
    
    window.appState.currentUserPage = 1;
    loadUsers(1);
}

// JavaScript模块加载完成