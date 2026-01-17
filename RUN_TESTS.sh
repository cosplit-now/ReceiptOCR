#!/bin/bash
# 测试运行脚本 - Linux/Mac

set -e

echo "========================================"
echo "Receipt OCR 库测试运行脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请访问 https://nodejs.org/ 安装"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装 npm"
    exit 1
fi

echo "✓ npm 版本: $(npm --version)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    echo ""
fi

# 检查环境变量
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ 错误: 未设置 GEMINI_API_KEY 环境变量"
    echo ""
    echo "请运行:"
    echo "  export GEMINI_API_KEY=your-api-key"
    echo ""
    echo "获取 API Key: https://ai.google.dev/"
    exit 1
fi

echo "✓ GEMINI_API_KEY 已设置"

# 检查测试图片
if [ ! -f "tests/fixtures/receipt-sample.jpg" ]; then
    echo ""
    echo "❌ 错误: 测试图片不存在"
    echo ""
    echo "请在 tests/fixtures/ 目录下放置名为 receipt-sample.jpg 的测试图片"
    echo ""
    echo "获取测试图片的方法:"
    echo "  1. 拍摄真实购物小票"
    echo "  2. 使用在线示例图片"
    echo "  3. 创建模拟小票图片"
    exit 1
fi

echo "✓ 测试图片已准备"
echo ""

# 运行测试
echo "========================================"
echo "开始运行测试..."
echo "========================================"
echo ""

npm test

echo ""
echo "========================================"
echo "✓ 测试完成！"
echo "========================================"
