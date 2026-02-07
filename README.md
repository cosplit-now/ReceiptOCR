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
# Gemini API（必需）
export GEMINI_API_KEY=your-gemini-api-key

# 可选（默认：gemini-2.0-flash）
export GEMINI_MODEL=gemini-2.0-flash

# ppocr API（使用 OCR + LLM 模式时需要）
export PPOCR_API_URL=https://your-ppocr-api.com/ocr
export PPOCR_TOKEN=your-ppocr-token
```

或创建 `.env` 文件：

```env
GEMINI_API_KEY="your-gemini-api-key"
PPOCR_API_URL="https://your-ppocr-api.com/ocr"
PPOCR_TOKEN="your-ppocr-token"
```

## 基础用法

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

// 从文件读取图片
const imageBuffer = fs.readFileSync('receipt.jpg');

// 提取商品信息和总金额（默认启用自动验证）
const receipt = await extractReceiptItems(imageBuffer);

console.log(receipt);
// {
//   items: [
//     {
//       name: "有机牛奶 1L",
//       price: 12.5,
//       quantity: 1,
//       hasTax: false
//     },
//     {
//       name: "可口可乐瓶装",
//       price: 3.5,
//       quantity: 2,
//       hasTax: true,
//       taxAmount: 0.35,
//       deposit: 0.5,      // 押金已自动合并
//       discount: -0.5     // 折扣已自动合并
//     },
//     ...
//   ],
//   total: 95.75
// }
```

## 数据结构

### 小票数据

```typescript
interface ReceiptData {
  items: ReceiptItem[];          // 商品列表
  total: number;                 // 小票总金额
  subtotal?: number;             // 小计（税前金额，如果小票上有）
  tax?: number;                  // 总税额（如果小票上有）
  totalDiscount?: number;        // 整单折扣（应用到整个账单的折扣，负数）
}
```

### 商品数据

每个商品包含以下字段：

```typescript
interface ReceiptItem {
  name: string;                  // 商品名称
  price: number;                 // 单价
  quantity: number;              // 数量（默认 1）
  hasTax: boolean;               // 是否含税
  taxAmount?: number;            // 税额（可选）
  deposit?: number;              // 押金（可选，自动合并）
  discount?: number;             // 折扣（可选，自动合并）
}
```

### 附加费用自动合并

库会自动识别并合并押金（Deposit）和折扣（TPD）到对应的商品中，而不是作为独立的商品项返回：

- **押金（deposit）**：如 "Deposit VL"，会被合并到对应的瓶装商品中
- **折扣（discount）**：如 "TPD"，会被合并到对应的商品中（通常为负数）

这意味着您不需要手动处理这些附加费用，它们会自动关联到正确的商品上。

### 可选的金额字段

除了必需的 `items` 和 `total` 字段，`ReceiptData` 还包含以下可选字段：

- **`subtotal`（小计）**：如果小票上显示了税前总额，会自动提取此字段
- **`tax`（总税额）**：如果小票上显示了总税额（如 "TAX: $0.80"），会自动提取此字段
- **`totalDiscount`（整单折扣）**：如果有应用到整个账单的折扣（如会员折扣、优惠券），会提取为负数

**重要区分**：
- `ReceiptItem.discount` - 单个商品的折扣（如商品促销）
- `ReceiptData.totalDiscount` - 整单折扣（如会员优惠、满减、优惠券）

示例：
```typescript
{
  items: [...],
  total: 47.30,
  subtotal: 48.50,      // 税前总额
  tax: 0.80,            // 总税额
  totalDiscount: -2.00  // 会员折扣
}
```

## 提取模式

库支持两种提取模式，可通过 `mode` 参数选择：

### 多模态模式（默认）

```typescript
// 方式 1: 不传 mode 参数（默认）
const receipt = await extractReceiptItems(imageBuffer);

// 方式 2: 显式指定
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'multimodal'
});
```

**工作原理**：Gemini 直接分析图片，一步提取结构化数据  
**优势**：精度高，适合复杂布局  
**成本**：图片占用 2000-6000 tokens

### OCR + LLM 模式

```typescript
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',  // 指定 OCR + LLM 模式
  ocrConfig: {      // 必需：OCR API 配置
    apiUrl: process.env.PPOCR_API_URL,
    token: process.env.PPOCR_TOKEN,
    fileType: 1,  // 1=图片, 0=PDF
    // 可选参数
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useTextlineOrientation: false,
  }
});
```

**工作原理**：
1. ppocr 提取文本（800-1000 tokens）
2. Gemini 解析文本（不用图片）

**优势**：成本低（节省 60-80%）  
**适用场景**：大批量处理、成本敏感

### 模式选择建议

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 首次使用 | `multimodal` | 默认模式，精度最高 |
| 高精度要求 | `multimodal` | 复杂布局识别更准确 |
| 大批量处理 | `ocr-llm` | 节省 60-80% 成本 |
| 成本敏感 | `ocr-llm` | 文本占用 tokens 更少 |

## 高级用法

### 1. 自动验证（默认启用）

库默认使用 Google Search grounding 自动批量验证不确定的商品名称：

```typescript
import { extractReceiptItems } from 'receipt-ocr';

// 默认启用自动验证
const receipt = await extractReceiptItems(imageBuffer);

// 如需禁用自动验证，显式设置为 false
const receiptWithoutVerify = await extractReceiptItems(imageBuffer, {
  autoVerify: false, // 禁用自动验证
});

console.log(receipt.items);  // 商品列表
console.log(receipt.total);  // 总金额

// 库会自动验证并补全模糊的商品名称
// 如果验证失败，会保持原始名称
```

**优势**：
- ✅ 批量处理，只需 1 次额外 API 调用
- ✅ 使用 Google Search，覆盖面广
- ✅ 自动处理，无需额外代码
- ✅ 验证失败时自动保持原始数据

详细文档：[自动验证功能](./docs/AUTO_VERIFICATION.md)

### 2. 自定义验证回调

当需要连接特定产品库时，可以使用自定义验证回调：

```typescript
import { extractReceiptItems } from 'receipt-ocr';

const receipt = await extractReceiptItems(imageBuffer, {
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

两种验证方式可以同时使用（自动验证默认启用）：

```typescript
const receipt = await extractReceiptItems(imageBuffer, {
  // autoVerify 默认为 true，会先用 Google Search 批量验证
  verifyCallback: async (name, context) => {
    // 如果自动验证失败，再用自定义逻辑
    const result = await myProductDatabase.search(name);
    return result ? { verifiedName: result.name } : null;
  },
});
```

### 验证回调接口

```typescript
type VerificationCallback = (
  name: string,
  context: {
    rawText: string;           // OCR 原始文本
    allItems: ReceiptItem[];   // 所有已解析商品（不含 total）
  }
) => Promise<{ verifiedName: string } | null>;
```

### 访问总金额

```typescript
const receipt = await extractReceiptItems(imageBuffer);

// 访问商品列表
receipt.items.forEach(item => {
  console.log(`${item.name}: ¥${item.price} × ${item.quantity}`);
});

// 访问总金额
console.log(`总计: ¥${receipt.total}`);
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

### 注意事项

- **图片大小限制**：单次请求（包括图片和提示文本）总大小不能超过 **20MB**
- **URL 处理方式**：URL 图片会被自动下载并转换为 base64 后发送给 API
- **性能建议**：对于购物小票等文档图片，通常大小在几百 KB 到几 MB 之间，完全在限制范围内

## API 参考

### `extractReceiptItems()`

```typescript
function extractReceiptItems(
  image: ImageInput,
  options?: ExtractOptions
): Promise<ReceiptData>
```

**参数**：

- `image: ImageInput` - 图片输入，支持 Buffer、Base64 字符串或图片 URL
- `options?: ExtractOptions` - 可选配置对象

**ExtractOptions 接口**：

```typescript
interface ExtractOptions {
  // 提取模式（新增）
  mode?: 'multimodal' | 'ocr-llm';  // 默认：'multimodal'
  
  // OCR 配置（mode='ocr-llm' 时必需）
  ocrConfig?: {
    apiUrl: string;                      // ppocr API 地址
    token: string;                       // API token
    fileType?: 0 | 1;                    // 0=PDF, 1=图片（默认：1）
    useDocOrientationClassify?: boolean; // 文档方向分类（默认：false）
    useDocUnwarping?: boolean;           // 文档矫正（默认：false）
    useTextlineOrientation?: boolean;    // 文本行方向（默认：false）
  };
  
  // 验证相关
  autoVerify?: boolean;                  // 自动验证（默认：true）
  verifyCallback?: VerificationCallback; // 自定义验证回调
}
```

**返回值**：

```typescript
interface ReceiptData {
  items: ReceiptItem[];       // 商品列表
  total: number;              // 总金额（必需）
  subtotal?: number;          // 小计/税前金额（可选）
  tax?: number;               // 总税额（可选）
  totalDiscount?: number;     // 整单折扣（可选，负数）
}

interface ReceiptItem {
  name: string;          // 商品名称
  price: number;         // 单价
  quantity: number;      // 数量
  hasTax: boolean;       // 是否含税
  taxAmount?: number;    // 该商品的税额（可选）
  deposit?: number;      // 押金（可选）
  discount?: number;     // 该商品的折扣（可选，负数）
}
```

**使用示例**：

```typescript
// 默认模式（multimodal）
const receipt = await extractReceiptItems(imageBuffer);

// OCR + LLM 模式
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',
  ocrConfig: {
    apiUrl: process.env.PPOCR_API_URL,
    token: process.env.PPOCR_TOKEN,
    fileType: 1
  }
});

// 带自定义验证
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',
  ocrConfig: { ... },
  verifyCallback: async (name, context) => {
    const result = await searchDatabase(name);
    return result ? { verifiedName: result } : null;
  }
});
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
2. **确定性**：不猜测不确定的数据，通过验证机制确保准确性
3. **可组合性**：验证逻辑通过依赖注入提供
4. **正确性优先**：内部处理不确定性，对外只返回可靠数据

## License

MIT
