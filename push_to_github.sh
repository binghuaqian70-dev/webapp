#!/bin/bash

# 9.4数据导入代码推送脚本
echo "🚀 准备推送9.4数据导入代码到GitHub"

# 检查git状态
echo "📊 检查当前git状态..."
git status

# 确认远程仓库
echo "🔗 当前远程仓库:"
git remote -v

# 尝试推送
echo "⬆️ 推送代码到GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功!"
    echo "🌐 GitHub仓库: https://github.com/binghuaqian70-dev/webapp"
else
    echo "❌ 推送失败，可能需要重新配置GitHub认证"
    echo ""
    echo "💡 解决方案:"
    echo "1. 确保已在GitHub中配置了正确的个人访问令牌"
    echo "2. 检查.git-credentials文件是否包含有效的认证信息"
    echo "3. 或者使用以下命令手动配置认证:"
    echo "   git config --global credential.helper store"
    echo "   git push origin main  # 会提示输入用户名和令牌"
fi