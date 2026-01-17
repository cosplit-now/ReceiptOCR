# 使用示例

这个目录包含了 Receipt OCR 库的使用示例。

## 运行示例前的准备

1. 设置环境变量：

```bash
export GEMINI_API_KEY=your-gemini-api-key
```

2. 构建库：

```bash
cd ..
npm install
npm run build
```

3. 准备测试图片：

将一张小票图片放在 `examples/` 目录下，命名为 `sample-receipt.jpg`

## 示例文件

### `basic.ts` - 基础用法

演示如何从图片中提取商品信息的基本流程。

```bash
npx tsx examples/basic.ts
```

### `with-verification.ts` - 带验证回调

演示如何使用验证回调来补全不完整的商品名称。

```bash
npx tsx examples/with-verification.ts
```

### `with-auto-verification.ts` - 自动验证（Google Search）

演示如何使用 Google Search grounding 自动批量验证不确定的商品名称。

```bash
npx tsx examples/with-auto-verification.ts
```

## 预期输出

### 基础用法输出示例：

```
示例 1: 从文件读取并提取商品信息

提取到 3 个商品：

1. 有机牛奶 1L
   价格: ¥12.5
   数量: 1
   需要验证: 否
   含税: 否

2. ORG BRD
   价格: 8.0
   数量: 2
   需要验证: 是
   含税: 是
   税额: ¥0.8

3. 富士苹果
   价格: 5.5
   数量: 3
   需要验证: 否
   含税: 否
```

### 带验证输出示例：

```
示例 2: 带验证回调的商品提取

正在验证商品名称: "ORG BRD"
✓ 验证成功: "ORG BRD" -> "有机全麦面包"

最终提取到 3 个商品：

1. 有机牛奶 1L
   价格: ¥12.5
   数量: 1
   需要验证: 否
   含税: 否

2. 有机全麦面包
   价格: 8.0
   数量: 2
   需要验证: 否
   含税: 是

3. 富士苹果
   价格: 5.5
   数量: 3
   需要验证: 否
   含税: 否

统计:
  已验证: 3
  待验证: 0
```
