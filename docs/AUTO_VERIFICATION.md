# 自动验证功能

## 概述

自动验证功能使用 Google Search grounding 来批量验证不确定的商品名称。这是一个可选功能，可以显著提高识别准确性。

## 工作原理

1. **识别阶段**：Gemini 从小票图片中提取商品信息
2. **内部标记阶段**：对于不完整、缩写或模糊的商品名称，在内部标记为需要验证
3. **批量验证**：如果启用 `autoVerify`，库会将所有需要验证的商品一次性发送给 Gemini
4. **搜索增强**：Gemini 使用 Google Search grounding 查找完整的商品名称
5. **结果应用**：
   - 找到匹配：更新为完整的商品名称
   - 未找到：保持原始识别的名称
6. **输出清理**：最终返回的结果中不包含内部标记字段

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
  
  // 直接使用结果，库已经自动处理了验证
  items.forEach(item => {
    console.log(`✅ ${item.name} - ¥${item.price} x ${item.quantity}`);
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
3. 继续处理其他商品
4. 正常返回结果（不会抛出异常）

```typescript
// 验证失败不会抛出异常
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true,
});

// 即使验证失败，也会返回原始识别的商品名称
// 这些名称虽然可能不完整，但仍然是从小票中识别出的真实数据
console.log(`成功提取 ${items.length} 个商品`);
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

### 2. 组合自定义验证

如果需要更高的准确性，可以结合自定义验证回调：

```typescript
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true, // 先用 Google Search 验证
  verifyCallback: async (name, context) => {
    // 再用自定义产品库验证
    const result = await myProductDB.search(name);
    return result ? { verifiedName: result.name } : null;
  },
});

console.log(`成功提取 ${items.length} 个商品`);
```

### 3. 处理大量商品

对于商品数量较多的小票，自动验证可以显著节省 API 调用次数：

```typescript
async function processBulkReceipt(imageBuffer: Buffer) {
  const items = await extractReceiptItems(imageBuffer, {
    autoVerify: true, // 批量验证，仅 1 次额外 API 调用
  });
  
  console.log(`提取了 ${items.length} 个商品`);
  
  return items;
}
```

## 限制

1. **依赖 Gemini API**：需要有效的 `GEMINI_API_KEY`
2. **需要网络连接**：Google Search grounding 需要实时搜索
3. **可能的延迟**：批量验证会增加处理时间（通常 2-5 秒）
4. **搜索质量**：依赖 Google Search 的结果质量

## 示例对比

### 不使用自动验证

```typescript
const items = await extractReceiptItems(imageBuffer);
// 返回原始识别结果：
// [
//   { "name": "ORG MLK", "price": 12.5, ... },
//   { "name": "CEMΟΙ 6Χ", "price": 8.0, ... },
//   { "name": "富士苹果", "price": 4.2, ... }
// ]
```

### 使用自动验证

```typescript
const items = await extractReceiptItems(imageBuffer, {
  autoVerify: true
});
// 返回验证后的结果：
// [
//   { "name": "Organic Milk 1L", "price": 12.5, ... },
//   { "name": "CEMOI Chocolate 6x100g", "price": 8.0, ... },
//   { "name": "富士苹果", "price": 4.2, ... }
// ]
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
