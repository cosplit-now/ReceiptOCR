# 测试固件目录

此目录用于存放集成测试所需的资源。

## 需要准备的文件

### 1. 测试图片

请在此目录下放置一张真实的购物小票图片，命名为 `receipt-sample.jpg`。

**图片要求：**
- 格式：JPG、PNG 或 WEBP
- 内容：清晰的购物小票，包含商品名称、价格、数量等信息
- 建议：包含一些缩写或不完整的商品名称，以便测试验证功能

**获取测试图片的方法：**
1. 拍摄真实购物小票
2. 使用在线示例图片
3. 创建模拟小票图片

### 2. 产品数据库 (product-db.ts)

已提供模拟产品数据库，用于验证回调测试。

**包含的商品映射：**
- `ORG MLK` → 有机牛奶 1L
- `ORG BRD` → 有机全麦面包
- `APL` → 富士苹果
- 等等...

## 目录结构

```
tests/fixtures/
├── README.md              # 本文件
├── product-db.ts          # 模拟产品数据库
└── receipt-sample.jpg     # 测试图片（需要手动添加）
```

## 使用说明

在运行集成测试前，确保：

1. **已添加测试图片**：`receipt-sample.jpg` 存在于此目录
2. **已设置 API Key**：
   ```bash
   export GEMINI_API_KEY=your-api-key
   ```
3. **已安装依赖**：
   ```bash
   npm install
   ```

然后运行测试：

```bash
npm test
```

## 注意事项

- 测试图片不会被提交到 git（已在 .gitignore 中配置）
- 真实 API 调用会消耗 Gemini API 配额
- 测试运行时间约 5-10 秒（取决于网络和 API 响应时间）
