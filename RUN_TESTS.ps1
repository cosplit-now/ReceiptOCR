# 测试运行脚本 - Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Receipt OCR 库测试运行脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 Node.js" -ForegroundColor Red
    Write-Host "请访问 https://nodejs.org/ 安装"
    exit 1
}

# 检查 npm
try {
    $npmVersion = npm --version
    Write-Host "✓ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 npm" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# 检查环境变量
if (-not $env:GEMINI_API_KEY) {
    Write-Host "❌ 错误: 未设置 GEMINI_API_KEY 环境变量" -ForegroundColor Red
    Write-Host ""
    Write-Host "请运行:"
    Write-Host '  $env:GEMINI_API_KEY="your-api-key"'
    Write-Host ""
    Write-Host "获取 API Key: https://ai.google.dev/"
    exit 1
}

Write-Host "✓ GEMINI_API_KEY 已设置" -ForegroundColor Green

# 检查测试图片
if (-not (Test-Path "tests/fixtures/receipt-sample.jpg")) {
    Write-Host ""
    Write-Host "❌ 错误: 测试图片不存在" -ForegroundColor Red
    Write-Host ""
    Write-Host "请在 tests/fixtures/ 目录下放置名为 receipt-sample.jpg 的测试图片"
    Write-Host ""
    Write-Host "获取测试图片的方法:"
    Write-Host "  1. 拍摄真实购物小票"
    Write-Host "  2. 使用在线示例图片"
    Write-Host "  3. 创建模拟小票图片"
    exit 1
}

Write-Host "✓ 测试图片已准备" -ForegroundColor Green
Write-Host ""

# 运行测试
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始运行测试..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm test

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ 测试完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
