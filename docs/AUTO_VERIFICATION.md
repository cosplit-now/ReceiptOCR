# 自动验证功能

## 概述

自动验证功能使用 Google Search grounding 来批量验证不确定的商品名称。这是一个可选功能，可以显著提高识别准确性。

## 工作原理

1. **识别阶段**：Gemini 从小票图片中提取商品信息
2. **标记阶段**：对于不完整、缩写或模糊的商品名称，设置 `needsVerification: true`
3. **批量验证**：如果启用 `autoVerify`，库会将所有需要验证的商品一次性发送给 Gemini
4. **搜索增强**：Gemini 使用 Google Search grounding 查找完整的商品名称
5. **结果应用**：
   - 找到匹配：更新商品名称，设置 `needsVerification: false`
   - 未找到：保持原名称，`needsVerification` 保持为 `true`

## 使用方法

### 基础用法

```typescript
import { extractReceiptItems } from 'receipt-ocr';

const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true, // 启用自动验证
});
```

### 完整示例

```typescript
import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

async function processReceipt() {
  const imageBuffer = fs.readFileSync('receipt.jpg');
  
  // 使用自动验证
  const items = await extractReceiptItems(imageBuffer, {
    autoVerify: true,
  });
  
  // 检查结果
  items.forEach(item => {
    if (item.needsVerification) {
      console.log(`⚠️ ${item.name} - 需要人工确认`);
    } else {
      console.log(`✅ ${item.name} - 已验证`);
    }
  });
}
```

## 验证 Prompt 策略

自动验证使用专门的 prompt 来提高准确性：

```
这是从 Costco 超市小票中识别出的商品名称，部分名称可能不完整或有缩写。
请使用 Google Search 查找并补全这些商品的完整正确名称。

需要验证的商品：
1. "ORG MLK"
2. "CEMΟΙ 6Χ"

请返回 JSON 数组格式...
```

### 关键策略点

1. **上下文提供**：明确告知这是 Costco 小票，帮助缩小搜索范围
2. **批量处理**：一次验证多个商品，减少 API 调用
3. **失败容错**：如果验证失败，保持原名称而不是删除或猜测

## 与自定义验证回调的区别

| 特性 | 自动验证 (`autoVerify`) | 自定义回调 (`verifyCallback`) |
|------|------------------------|------------------------------|
| 实现方式 | Google Search grounding | 用户提供的函数 |
| 批量处理 | ✅ 是 | ❌ 逐个处理 |
| 依赖注入 | ❌ 内置功能 | ✅ 完全自定义 |
| 适用场景 | 通用商品验证 | 特定产品库匹配 |
| API 调用 | 1 次（批量） | N 次（每个商品） |

## 组合使用

两种验证方式可以同时使用：

```typescript
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true, // 先用 Google Search 批量验证
  verifyCallback: async (name, context) => {
    // 如果自动验证失败，再用自定义逻辑
    const result = await myProductDatabase.search(name);
    return result ? { verifiedName: result.name } : null;
  },
});
```

**执行顺序**：
1. 自动验证（批量）
2. 自定义回调（逐个处理仍需验证的商品）

## 成本考虑

### API 调用次数

- **不使用验证**：1 次 API 调用（仅识别）
- **使用 autoVerify**：2 次 API 调用（识别 + 批量验证）
- **使用 verifyCallback**：1 + N 次（识别 + 每个需验证的商品）

### 建议

- 对于通用零售小票：使用 `autoVerify`
- 对于特定商家/产品库：使用 `verifyCallback`
- 对于高准确性要求：组合使用两者

## 错误处理

自动验证失败时，库会：

1. 记录错误到控制台（`console.error`）
2. 保持原始识别结果
3. 保持 `needsVerification: true`
4. 继续处理其他商品

```typescript
// 验证失败不会抛出异常
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true,
});

// 检查是否有需要人工确认的商品
const needsManualReview = items.filter(item => item.needsVerification);
if (needsManualReview.length > 0) {
  console.log(`有 ${needsManualReview.length} 个商品需要人工确认`);
}
```

## 最佳实践

### 1. 提供商家上下文

未来版本可能支持自定义商家信息：

```typescript
// 计划中的功能
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true,
  merchantContext: 'Costco', // 帮助提高搜索准确性
});
```

### 2. 处理验证失败的商品

```typescript
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true,
});

// 分类处理
const verified = items.filter(item => !item.needsVerification);
const needsReview = items.filter(item => item.needsVerification);

console.log(`已验证: ${verified.length}`);
console.log(`需要审核: ${needsReview.length}`);

// 可以将需要审核的商品展示给用户
needsReview.forEach(item => {
  showToUser(item); // 让用户手动确认或编辑
});
```

### 3. 监控验证成功率

```typescript
async function processWithMetrics(imageBuffer: Buffer) {
  const items = await extractReceiptItems(imageBuffer, {
    autoVerify: true,
  });
  
  const totalItems = items.length;
  const verifiedItems = items.filter(item => !item.needsVerification).length;
  const successRate = (verifiedItems / totalItems) * 100;
  
  console.log(`验证成功率: ${successRate.toFixed(1)}%`);
  
  return items;
}
```

## 限制

1. **依赖 Gemini API**：需要有效的 `GEMINI_API_KEY`
2. **需要网络连接**：Google Search grounding 需要实时搜索
3. **可能的延迟**：批量验证会增加处理时间（通常 2-5 秒）
4. **搜索质量**：依赖 Google Search 的结果质量

## 示例输出

### 验证前

```json
[
  { "name": "ORG MLK", "needsVerification": true },
  { "name": "CEMΟΙ 6Χ", "needsVerification": true },
  { "name": "富士苹果", "needsVerification": false }
]
```

### 验证后

```json
[
  { "name": "Organic Milk 1L", "needsVerification": false },
  { "name": "CEMOI Chocolate 6x100g", "needsVerification": false },
  { "name": "富士苹果", "needsVerification": false }
]
```

## 故障排查

### 验证没有效果

1. 检查 API key 是否有效
2. 检查网络连接
3. 查看控制台错误日志
4. 确认 Gemini 模型支持 Google Search grounding

### 验证结果不准确

1. 考虑使用自定义 `verifyCallback`
2. 提供更多上下文信息
3. 对结果进行人工审核

### API 配额问题

如果遇到配额限制：

1. 减少测试频率
2. 考虑升级 Gemini API 计划
3. 优先使用 `verifyCallback` 连接本地产品库
