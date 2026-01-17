# 测试说明

本目录包含 Receipt OCR 库的集成测试。

## 测试类型

**集成测试（Integration Tests）**：使用真实的 Gemini API 和真实图片进行端到端测试。

## 运行测试前的准备

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

```bash
export GEMINI_API_KEY=your-gemini-api-key
```

获取 API Key：访问 https://ai.google.dev/

### 3. 准备测试图片

在 `tests/fixtures/` 目录下放置一张购物小票图片，命名为 `receipt-sample.jpg`。

**图片要求：**
- 格式：JPG、PNG 或 WEBP
- 内容：清晰的购物小票
- 建议：包含一些缩写商品名称以测试验证功能

## 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（开发时）
npm run test:watch
```

## 测试内容

### 1. 基础识别测试

验证库能够：
- 读取真实图片
- 调用 Gemini API
- 返回正确结构的商品列表
- 所有必需字段都存在且类型正确

### 2. 验证回调测试

验证：
- `needsVerification=true` 时回调被调用
- 回调能够更新商品名称
- 验证后 `needsVerification` 变为 `false`

### 3. 图片格式测试

测试支持的输入格式：
- Buffer
- Base64 字符串
- Data URI

### 4. ID 唯一性测试

验证每个商品的 ID 都是唯一的。

### 5. 字段初始化测试

验证 `isEditing` 字段正确初始化为 `false`。

## 测试结构

```
tests/
├── README.md                 # 本文件
├── integration.test.ts       # 集成测试
└── fixtures/
    ├── README.md            # 固件说明
    ├── product-db.ts        # 模拟产品数据库
    └── receipt-sample.jpg   # 测试图片（需要手动添加）
```

## 预期输出

测试运行时会输出详细日志：

```
✓ 已加载测试图片: tests/fixtures/receipt-sample.jpg (123456 bytes)

📸 开始识别小票图片...
✓ 识别完成，提取到 3 个商品

商品 1:
  名称: 有机牛奶 1L
  价格: ¥12.5
  数量: 1
  需要验证: 否
  含税: 否

...

🔍 测试验证回调功能...
  验证请求: "ORG BRD"
    ✓ 找到匹配: "有机全麦面包"

✓ 处理完成，共提取 3 个商品
✓ 验证回调被调用 1 次

统计信息:
  需要验证的商品: 0
  已验证的商品: 3
```

## 注意事项

### API 费用
- 每次测试运行会调用真实的 Gemini API
- 会消耗 API 配额
- 建议使用免费层进行开发测试

### 测试时间
- 真实 API 调用需要时间（~2-5 秒/次）
- 总测试时间约 10-20 秒
- 设置了 30 秒超时以应对网络波动

### 网络依赖
- 需要稳定的网络连接
- 如果网络不稳定，测试可能失败

### 图片隐私
- 测试图片已添加到 `.gitignore`
- 不会被提交到 git 仓库
- 注意不要使用包含敏感信息的小票

## 故障排查

### 错误：GEMINI_API_KEY not set

**解决方案：**
```bash
export GEMINI_API_KEY=your-api-key
```

### 错误：测试图片不存在

**解决方案：**
```bash
# 确保图片存在
ls tests/fixtures/receipt-sample.jpg

# 如果不存在，请添加一张测试图片
```

### 错误：API 调用失败

**可能原因：**
1. API Key 无效或过期
2. 网络连接问题
3. API 配额用尽

**解决方案：**
- 检查 API Key 是否正确
- 检查网络连接
- 查看 API 配额使用情况

### 错误：测试超时

**可能原因：**
- 网络慢
- API 响应慢
- 图片太大

**解决方案：**
- 使用更小的测试图片（< 5MB）
- 检查网络连接
- 可以在 `vitest.config.ts` 中增加超时时间

## 贡献

如果你添加了新功能，请：
1. 添加相应的测试用例
2. 确保所有测试通过
3. 更新此文档
