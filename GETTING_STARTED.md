# 快速开始指南

## 1. 安装依赖

```bash
npm install
```

这会安装以下依赖：
- `@google/generative-ai` - Google Gemini API SDK
- `typescript` - TypeScript 编译器
- `tsup` - 构建工具
- `@types/node` - Node.js 类型定义

## 2. 配置环境变量

创建 `.env` 文件：

```env
# Gemini API（必需）
GEMINI_API_KEY="your-gemini-api-key"

# 可选：指定模型版本（默认：gemini-2.0-flash）
GEMINI_MODEL="gemini-2.0-flash"

# ppocr API（使用 OCR + LLM 模式时需要）
PPOCR_API_URL="https://your-ppocr-api.com/ocr"
PPOCR_TOKEN="your-ppocr-token"
```

或在 Shell 中设置：

```bash
# Linux/Mac
export GEMINI_API_KEY=your-gemini-api-key
export PPOCR_API_URL=https://your-ppocr-api.com/ocr
export PPOCR_TOKEN=your-ppocr-token

# Windows PowerShell
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:PPOCR_API_URL="https://your-ppocr-api.com/ocr"
$env:PPOCR_TOKEN="your-ppocr-token"
```

**获取 API Key**：
- Gemini API: 访问 https://ai.google.dev/ 创建
- ppocr API: 根据你的 OCR 服务提供商获取

## 3. 构建库

```bash
npm run build
```

这会在 `dist/` 目录下生成：
- `index.cjs` - CommonJS 模块
- `index.mjs` - ES 模块
- `index.d.ts` - TypeScript 类型定义

## 4. 运行示例

### 基础示例

```bash
# 准备一张小票图片
cp /path/to/your/receipt.jpg examples/sample-receipt.jpg

# 运行示例（使用 tsx）
npx tsx examples/basic.ts
```

### 带验证回调的示例

```bash
npx tsx examples/with-verification.ts
```

## 5. 在你的项目中使用

### 基础用法（多模态模式）

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

const imageBuffer = fs.readFileSync('receipt.jpg');

// 方式 1: 默认使用多模态模式（不传 mode 参数）
const receipt = await extractReceiptItems(imageBuffer);

// 方式 2: 显式指定多模态模式
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'multimodal'  // ← 可选，默认就是 multimodal
});

console.log(receipt.items);  // 商品列表
console.log(receipt.total);  // 总金额
```

### 使用 OCR + LLM 模式（成本优化）

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

const imageBuffer = fs.readFileSync('receipt.jpg');

// 使用 OCR + LLM 模式（节省 60-80% 成本）
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',  // ← 指定 OCR + LLM 模式
  ocrConfig: {      // ← 必需：OCR API 配置
    apiUrl: process.env.PPOCR_API_URL,
    token: process.env.PPOCR_TOKEN,
    fileType: 1,  // 1=图片, 0=PDF
  }
});

console.log(receipt.items);
console.log(receipt.total);
```

### 模式对比

| 参数 | 模式 | 说明 | 成本 |
|------|------|------|------|
| 不传 `mode` | multimodal | Gemini 直接处理图片（默认） | 100% |
| `mode: 'multimodal'` | multimodal | 同上（显式指定） | 100% |
| `mode: 'ocr-llm'` | OCR + LLM | 先 OCR 提取文本，再 LLM 解析 | 20-40% |

**选择建议**：
- **高精度场景**：使用 `multimodal`（默认）
- **大批量/成本敏感**：使用 `ocr-llm`
- **不确定**：先用默认的 `multimodal`

## 项目结构

```
ReceiptOCR/
├── src/                              # 源代码
│   ├── index.ts                     # 主导出
│   ├── types.ts                     # 类型定义（含 ExtractionMode、OcrConfig）
│   ├── extract.ts                   # 主提取函数（模式切换逻辑）
│   ├── adapters/                    # 外部服务适配器
│   │   ├── gemini.ts               # Gemini 多模态
│   │   ├── gemini-text.ts          # Gemini 文本解析（新增）
│   │   ├── ppocr.ts                # ppocr OCR API（新增）
│   │   └── verifier.ts             # 批量验证
│   ├── processors/                  # 数据处理器
│   │   ├── image.ts                # 图片格式处理
│   │   ├── parser.ts               # JSON 响应解析
│   │   └── ocr-text-processor.ts   # OCR 文本处理（新增）
│   └── utils/                       # 工具和模板
│       ├── prompt.ts               # 多模态 Prompt
│       └── text-prompt.ts          # 文本解析 Prompt（新增）
├── examples/                         # 使用示例
│   ├── basic.ts                    # 基础用法
│   ├── with-verification.ts        # 带验证回调
│   ├── with-auto-verification.ts   # 自动验证
│   ├── with-ocr-llm-mode.ts       # OCR + LLM 模式（新增）
│   └── mode-comparison.ts          # 模式对比（新增）
├── tests/                           # 测试文件
│   ├── ocr-text-processor.test.ts  # OCR 处理器单元测试（新增）
│   └── integration.test.ts         # 集成测试
├── dist/                            # 构建输出（npm run build 后生成）
├── .env                             # 环境变量配置
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 核心概念

### 1. 返回数据结构

函数返回 `ReceiptData` 对象：

```typescript
interface ReceiptData {
  items: ReceiptItem[];       // 商品列表
  total: number;              // 总金额（必需）
  subtotal?: number;          // 小计/税前金额（可选）
  tax?: number;               // 总税额（可选）
  totalDiscount?: number;     // 整单折扣（可选，负数）
}
```

每个商品包含以下字段：

```typescript
interface ReceiptItem {
  name: string;                  // 商品名称
  price: number;                 // 单价
  quantity: number;              // 数量
  hasTax: boolean;               // 是否含税
  taxAmount?: number;            // 该商品的税额（可选）
  deposit?: number;              // 押金（可选，自动合并）
  discount?: number;             // 该商品的折扣（可选，负数）
}
```

**可选字段说明**：
- `subtotal`、`tax`、`totalDiscount` 只有在小票上明确显示时才会出现
- `totalDiscount` 是整单折扣（如会员优惠、优惠券），与商品级别的 `discount` 不同

### 2. 内部验证机制

库在内部会自动判断商品名称是否不完整或模糊（如缩写、截断等），并在需要时自动触发验证流程。这个过程对调用者透明，返回的结果已经过处理。

### 3. 提取模式

库支持两种提取模式，通过 `mode` 参数选择：

#### 多模态模式（默认）

```typescript
// 不传 mode 参数 → 默认使用 multimodal
const receipt = await extractReceiptItems(imageBuffer);

// 或显式指定
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'multimodal'
});
```

**工作原理**：Gemini 直接分析图片，提取结构化数据

**优势**：精度高，适合复杂布局  
**劣势**：成本较高（图片占用 2000-6000 tokens）

#### OCR + LLM 模式

```typescript
const receipt = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',  // ← 指定模式
  ocrConfig: {      // ← 必需配置
    apiUrl: process.env.PPOCR_API_URL,
    token: process.env.PPOCR_TOKEN,
    fileType: 1,
  }
});
```

**工作原理**：
1. ppocr 提取文本（800-1000 tokens）
2. Gemini 解析文本（不用图片）

**优势**：成本低（节省 60-80%）  
**劣势**：需要额外的 OCR 服务

### 4. 验证回调

当库检测到不完整的商品名称时，会自动调用验证回调进行补全：

```typescript
const items = await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',  // 可以在任何模式下使用验证
  ocrConfig: { ... },
  verifyCallback: async (name, context) => {
    // 你的验证逻辑
    const fullName = await searchDatabase(name);
    return fullName ? { verifiedName: fullName } : null;
  }
});
```

## 常见问题

### Q: 如何选择使用哪种模式？

A: 通过 `mode` 参数选择：

```typescript
// 默认：multimodal（不传参数）
await extractReceiptItems(imageBuffer);

// OCR + LLM 模式
await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',
  ocrConfig: { apiUrl, token, fileType: 1 }
});
```

**选择建议**：
- 首次使用/高精度要求 → 使用默认的 `multimodal`
- 大批量处理/成本敏感 → 使用 `ocr-llm`

### Q: OCR + LLM 模式报错 "ocrConfig is required"？

A: 使用 `mode: 'ocr-llm'` 时必须提供 `ocrConfig`：

```typescript
await extractReceiptItems(imageBuffer, {
  mode: 'ocr-llm',
  ocrConfig: {
    apiUrl: process.env.PPOCR_API_URL,
    token: process.env.PPOCR_TOKEN,
    fileType: 1
  }
});
```

### Q: 构建时报错找不到 @google/generative-ai？

A: 确保已运行 `npm install` 安装依赖。

### Q: 运行时报错 GEMINI_API_KEY not set？

A: 确保已设置环境变量。检查 `.env` 文件或运行：
```bash
echo $GEMINI_API_KEY  # Linux/Mac
echo $env:GEMINI_API_KEY  # Windows PowerShell
```

### Q: 两种模式的结果会一样吗？

A: 理论上应该相同，但可能有细微差异：
- multimodal：直接看图，精度更高
- ocr-llm：依赖 OCR 质量，可能在复杂布局时有差异

建议先用 multimodal 测试，确认效果后再切换到 ocr-llm 优化成本。

### Q: 如何支持其他 LLM（如 OpenAI、Anthropic）？

A: 在 `src/adapters/` 目录下创建新的适配器，参考 `gemini.ts` 的实现。

### Q: 如何调整 prompt？

A: 根据使用的模式编辑不同文件：
- 多模态模式：`src/utils/prompt.ts` 中的 `EXTRACTION_PROMPT`
- OCR + LLM 模式：`src/utils/text-prompt.ts` 中的 `TEXT_PARSING_PROMPT`

## 6. 测试你的实现

### 快速测试脚本

使用提供的测试脚本快速验证：

```bash
# 测试真实图片（对比两种模式）
npx tsx test-real-image.ts ./your-receipt.jpg

# 查看输出：
# - 多模态模式结果
# - OCR + LLM 模式结果
# - 两者对比
```

### 单元测试

```bash
# 测试 OCR 文本处理器（不需要真实 API）
npm test -- tests/ocr-text-processor.test.ts

# 运行所有测试
npm test
```

### 查看处理过程

单元测试会详细展示：
- 文本块的几何信息（Y中心、高度、X坐标）
- 哪些块被聚类为同一行
- Y轴重叠度计算过程
- 置信度警告判断

## 下一步

- 查看 `examples/` 目录了解更多用法
  - `examples/with-ocr-llm-mode.ts` - OCR + LLM 模式示例
  - `examples/mode-comparison.ts` - 模式对比示例
- 阅读 `README.md` 了解完整 API 文档
- 探索 `src/types.ts` 了解所有类型定义
- 查看 `TESTING.md` 了解详细测试指南
