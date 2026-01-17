# 测试指南

本文档提供完整的测试运行指南。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

```bash
# Linux/Mac
export GEMINI_API_KEY=your-gemini-api-key

# Windows PowerShell
$env:GEMINI_API_KEY="your-gemini-api-key"

# Windows CMD
set GEMINI_API_KEY=your-gemini-api-key
```

**获取 API Key：**
访问 https://ai.google.dev/ 创建一个 Gemini API key（免费层可用于测试）。

### 3. 准备测试图片

在 `tests/fixtures/` 目录下放置一张购物小票图片：

```bash
# 图片应命名为 receipt-sample.jpg
tests/fixtures/receipt-sample.jpg
```

**获取测试图片的方法：**

**方法 1：使用真实小票**
- 拍摄一张清晰的购物小票照片
- 确保商品名称、价格等信息清晰可见
- 保存为 JPG 格式

**方法 2：在线示例图片**
- 搜索 "receipt sample" 或 "购物小票示例"
- 下载适合的图片

**方法 3：创建模拟小票**
- 使用图片编辑软件创建简单的小票
- 包含商品名称、价格、数量等信息

**理想的测试图片应包含：**
- ✅ 3-5 个商品条目
- ✅ 清晰的商品名称
- ✅ 价格和数量信息
- ✅ 最好有 1-2 个缩写商品名（如 "ORG MLK"）以测试验证功能

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（自动重新运行）
npm run test:watch
```

## 测试内容说明

### 测试 1：基础识别

验证库能够：
- 读取图片文件
- 调用 Gemini API 识别商品
- 返回正确结构的数据

**预期输出：**
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
```

### 测试 2：验证回调

测试验证功能：
- 识别需要验证的商品名称（缩写或不完整）
- 调用验证回调补全名称

**预期输出：**
```
🔍 测试验证回调功能...
  验证请求: "ORG BRD"
    ✓ 找到匹配: "有机全麦面包"
✓ 验证回调被调用 1 次
```

### 测试 3：图片格式

测试多种输入格式：
- Buffer 格式
- Base64 字符串
- Data URI

### 测试 4：ID 唯一性

验证每个商品都有唯一的 ID。

### 测试 5：字段初始化

验证 `isEditing` 字段正确初始化。

### 测试 6：自动批量验证

测试 Google Search grounding 自动验证功能。

## 预期测试结果

如果一切正常，您应该看到：

```
✓ tests/integration.test.ts (6) 12345ms
  ✓ 集成测试：真实图片识别（优化版 - 单次 API 调用） (6) 12345ms
    ✓ 应该识别真实小票并返回正确结构的商品列表 3456ms
    ✓ 应该正确调用验证回调并更新商品名称 3456ms
    ✓ 应该支持不同的图片输入格式 4567ms
    ✓ 应该为每个商品生成唯一的 ID 567ms
    ✓ 应该正确设置 isEditing 字段为 false 456ms
    ✓ 应该支持自动批量验证（Google Search grounding） 3456ms

Test Files  1 passed (1)
     Tests  6 passed (6)
  Start at  12:34:56
  Duration  12.34s
```

## 常见问题

### ❌ 错误：GEMINI_API_KEY not set

**原因：** 未设置环境变量

**解决：**
```bash
export GEMINI_API_KEY=your-api-key
```

### ❌ 错误：测试图片不存在

**原因：** 缺少测试图片文件

**解决：**
```bash
# 检查文件是否存在
ls tests/fixtures/receipt-sample.jpg

# 如果不存在，请添加图片
cp /path/to/your/receipt.jpg tests/fixtures/receipt-sample.jpg
```

### ❌ 错误：Gemini API call failed

**可能原因：**
1. API Key 无效或过期
2. 网络连接问题
3. API 配额用尽

**解决步骤：**
1. 验证 API Key 是否正确
2. 检查网络连接
3. 访问 https://ai.google.dev/ 检查配额

### ❌ 错误：Test timeout

**原因：** API 响应时间过长

**解决：**
- 使用更小的图片（< 5MB）
- 检查网络连接
- 在 `vitest.config.ts` 中增加超时时间：
  ```typescript
  testTimeout: 60000 // 60 秒
  ```

### ⚠️ 警告：提取的商品数量为 0

**可能原因：**
1. 图片不清晰
2. 图片不是购物小票
3. API 识别失败

**解决：**
- 使用清晰的小票图片
- 确保图片内容正确
- 检查 API 响应日志

## 测试数据说明

### 模拟产品数据库

测试使用 `tests/fixtures/product-db.ts` 中的模拟数据库：

```typescript
'ORG MLK' → '有机牛奶 1L'
'ORG BRD' → '有机全麦面包'
'APL' → '富士苹果'
// ... 更多映射
```

如果您的测试图片包含这些缩写，验证功能会自动补全名称。

### 自定义测试数据

您可以编辑 `tests/fixtures/product-db.ts` 添加更多商品映射：

```typescript
export const productDatabase = new Map<string, string>([
  // 添加您的映射
  ['YOUR_ABBR', '完整商品名称'],
]);
```

## 性能说明

### 测试时间

- 单次 API 调用：约 2-5 秒
- 完整测试套件：约 10-20 秒
- 具体时间取决于网络速度和 API 响应时间

### API 配额

测试经过优化，共享 API 调用结果：
- 基础识别：1 次调用（所有测试共享）
- 验证回调测试：1 次调用（如果有需要验证的商品）
- 自动验证测试：1 次调用（如果有需要验证的商品）

**总计：1-3 次 API 调用**（取决于是否有需要验证的商品）

免费层配额通常足够开发测试使用。

## 持续集成 (CI)

如果要在 CI 环境中运行测试：

1. **设置 secrets：**
   - 在 GitHub Actions / GitLab CI 中设置 `GEMINI_API_KEY`

2. **准备测试图片：**
   - 将测试图片编码为 base64 存储在 secrets 中
   - 或在 CI 中下载公开的示例图片

3. **CI 配置示例（GitHub Actions）：**
   ```yaml
   - name: Run tests
     env:
       GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
     run: |
       echo "${{ secrets.TEST_IMAGE_BASE64 }}" | base64 -d > tests/fixtures/receipt-sample.jpg
       npm test
   ```

## 下一步

测试通过后，您可以：

1. **构建库：**
   ```bash
   npm run build
   ```

2. **类型检查：**
   ```bash
   npm run type-check
   ```

3. **运行示例：**
   ```bash
   npx tsx examples/basic.ts
   ```

4. **发布到 npm：**
   ```bash
   npm publish
   ```

## 需要帮助？

- 查看 `README.md` 了解完整 API 文档
- 查看 `examples/` 目录了解使用示例
- 查看源码注释了解实现细节
