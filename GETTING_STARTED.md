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

创建 `.env` 文件（或直接在环境中设置）：

```bash
export GEMINI_API_KEY=your-gemini-api-key
```

获取 API Key：访问 https://ai.google.dev/ 并创建一个 API key。

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

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

const imageBuffer = fs.readFileSync('receipt.jpg');
const items = await extractReceiptItems(imageBuffer);

console.log(items);
```

## 项目结构

```
ReceiptOCR/
├── src/                      # 源代码
│   ├── index.ts             # 主导出
│   ├── types.ts             # 类型定义
│   ├── extract.ts           # 主提取函数
│   ├── adapters/            # LLM 适配器
│   │   └── gemini.ts        # Gemini 实现
│   ├── processors/          # 数据处理器
│   │   ├── image.ts         # 图片处理
│   │   └── parser.ts        # JSON 解析
│   └── utils/               # 工具函数
│       └── prompt.ts        # Prompt 模板
├── examples/                 # 使用示例
├── dist/                     # 构建输出（npm run build 后生成）
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 核心概念

### 1. 商品数据结构

每个提取的商品包含以下字段：

```typescript
{
  id: string;                    // 自动生成
  name: string;                  // 商品名称
  price: number;                 // 单价
  quantity: number;              // 数量
  needsVerification: boolean;    // 是否需要验证
  hasTax: boolean;               // 是否含税
  taxAmount?: number;            // 税额（可选）
  deposit?: number;              // 押金（可选，自动合并）
  discount?: number;             // 折扣（可选，自动合并）
  isEditing: boolean;            // UI 状态
}
```

### 2. needsVerification 字段

LLM 会判断商品名称是否：
- 是缩写（如 "ORG MLK"）
- 不完整（如 "面包..."）
- 被截断
- 存在歧义

如果是，则 `needsVerification` 设为 `true`。

### 3. 验证回调

当 `needsVerification: true` 时，可以通过回调进行补全：

```typescript
const items = await extractReceiptItems(imageBuffer, {
  verifyCallback: async (name, context) => {
    // 你的验证逻辑
    const fullName = await searchDatabase(name);
    return fullName ? { verifiedName: fullName } : null;
  }
});
```

## 常见问题

### Q: 构建时报错找不到 @google/generative-ai？

A: 确保已运行 `npm install` 安装依赖。

### Q: 运行时报错 GEMINI_API_KEY not set？

A: 确保已设置环境变量：`export GEMINI_API_KEY=your-key`

### Q: 如何支持其他 LLM（如 OpenAI、Anthropic）？

A: 在 `src/adapters/` 目录下创建新的适配器，参考 `gemini.ts` 的实现。

### Q: 如何调整 prompt？

A: 编辑 `src/utils/prompt.ts` 文件中的 `EXTRACTION_PROMPT` 常量。

## 下一步

- 查看 `examples/` 目录了解更多用法
- 阅读 `README.md` 了解完整 API 文档
- 探索 `src/types.ts` 了解所有类型定义
