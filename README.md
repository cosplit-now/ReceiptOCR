# ReceiptOCR

一个可复用的 TypeScript 库，用于借助多模态大语言模型从购物小票图片中提取结构化商品数据。

## 特性

- 🚀 **函数式 API**：无状态、异步、可组合
- 🎯 **类型安全**：完整的 TypeScript 类型定义
- 🔌 **依赖注入**：验证逻辑由调用方提供
- 📦 **双模块支持**：同时支持 ESM 和 CommonJS
- 🤖 **Gemini 驱动**：使用 Google Gemini 多模态模型

## 安装

```bash
npm install receipt-ocr
# 或
pnpm add receipt-ocr
```

## 环境配置

在使用前，需要设置环境变量：

```bash
# 必需
export GEMINI_API_KEY=your-gemini-api-key

# 可选（默认：gemini-2.0-flash）
export GEMINI_MODEL=gemini-2.0-flash
```

## 基础用法

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

// 从文件读取图片
const imageBuffer = fs.readFileSync('receipt.jpg');

// 提取商品信息
const items = await extractReceiptItems(imageBuffer);

console.log(items);
// [
//   {
//     id: "1737123456789",
//     name: "有机牛奶 1L",
//     price: 12.5,
//     quantity: 1,
//     needsVerification: false,
//     hasTax: false,
//     isEditing: false
//   },
//   ...
// ]
```

## 商品数据结构

每个商品包含以下字段：

```typescript
interface ReceiptItem {
  id: string;                    // 库生成的唯一标识
  name: string;                  // 商品名称
  price: number;                 // 单价
  quantity: number;              // 数量（默认 1）
  needsVerification: boolean;    // LLM 判断是否需要验证
  hasTax: boolean;               // 是否含税
  taxAmount?: number;            // 税额（可选）
  isEditing: boolean;            // UI 状态（默认 false）
}
```

## 高级用法

### 1. 自动验证（推荐）

使用 Google Search grounding 自动批量验证不确定的商品名称：

```typescript
import { extractReceiptItems } from 'receipt-ocr';

const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true, // 启用自动验证
});

// 验证失败的商品会保持 needsVerification: true
const needsReview = items.filter(item => item.needsVerification);
console.log(`有 ${needsReview.length} 个商品需要人工确认`);
```

**优势**：
- ✅ 批量处理，只需 1 次额外 API 调用
- ✅ 使用 Google Search，覆盖面广
- ✅ 自动处理，无需额外代码

详细文档：[自动验证功能](./docs/AUTO_VERIFICATION.md)

### 2. 自定义验证回调

当需要连接特定产品库时，可以使用自定义验证回调：

```typescript
import { extractReceiptItems } from 'receipt-ocr';

const items = await extractReceiptItems(imageBuffer, {
  verifyCallback: async (name, context) => {
    // 调用外部搜索服务验证/补全商品名称
    const result = await myProductDatabase.search(name);
    
    if (result) {
      return { verifiedName: result.fullName };
    }
    
    // 返回 null 保持原样
    return null;
  }
});
```

### 3. 组合使用

两种验证方式可以同时使用：

```typescript
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true,           // 先用 Google Search 批量验证
  verifyCallback: async (name, context) => {
    // 如果自动验证失败，再用自定义逻辑
    const result = await myProductDatabase.search(name);
    return result ? { verifiedName: result.name } : null;
  },
});
```

验证回调接口：

```typescript
type VerificationCallback = (
  name: string,
  context: {
    rawText: string;                      // OCR 原始文本
    allItems: Partial<ReceiptItem>[];     // 所有已解析商品
  }
) => Promise<{ verifiedName: string } | null>;
```

## 图片输入格式

支持以下三种格式：

```typescript
// 1. Buffer
const buffer = fs.readFileSync('receipt.jpg');
await extractReceiptItems(buffer);

// 2. Base64 字符串
const base64 = 'iVBORw0KGgoAAAANSUhEUgAA...';
await extractReceiptItems(base64);

// 3. 图片 URL
const url = 'https://example.com/receipt.jpg';
await extractReceiptItems(url);
```

## 策略接口（供扩展）

库预留了完整的策略接口，方便未来扩展：

```typescript
import { VerificationStrategy } from 'receipt-ocr';

const myStrategy: VerificationStrategy = {
  verify: async (name, context) => {
    const verified = await searchProductDB(name);
    return { verifiedName: verified };
  }
};
```

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npm run type-check

# 构建
npm run build

# 开发模式（监听变化）
npm run dev
```

## 设计原则

1. **无状态**：每次调用独立，无副作用
2. **确定性**：不猜测不确定的数据，而是标记 `needsVerification`
3. **可组合性**：验证逻辑通过依赖注入提供
4. **正确性优先**：宁可返回不完整但准确的数据

## License

MIT
