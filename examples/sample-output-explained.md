# 库输出格式说明

这是 `extractReceiptItems()` 函数的输出格式示例。

## 完整 JSON 输出

```json
{
  "items": [
    {
      "name": "有机牛奶 1L",
      "price": 12.5,
      "quantity": 1,
      "hasTax": false
    },
    {
      "name": "可口可乐瓶装 330ml",
      "price": 3.5,
      "quantity": 2,
      "hasTax": true,
      "taxAmount": 0.35,
      "deposit": 1.0,      // ✨ 押金已合并（原本是独立的 "Deposit VL" 项）
      "discount": 0.5      // ✨ 折扣已合并（原本是独立的 "TPD" 项），存储为正数
    },
    {
      "name": "有机面包",
      "price": 8.0,
      "quantity": 1,
      "hasTax": true,
      "taxAmount": 0.8
    }
  ],
  "subtotal": 20.3,      // ✨ 小计金额（如果小票上有显示）
  "totalTax": 1.15,      // ✨ 税费总额（如果小票上有显示）
  "total": 21.45
}
```

## 字段说明

### ReceiptData（顶层对象）

| 字段 | 类型 | 说明 |
|------|------|------|
| `items` | `ReceiptItem[]` | 商品列表（必填） |
| `subtotal` | `number?` | 小计金额（可选 - 如果小票上有 SUBTOTAL 行） |
| `totalTax` | `number?` | 税费总额（可选 - 如果小票上有 TAX 行） |
| `total` | `number` | 小票总金额（必填） |

### ReceiptItem（商品对象）

#### 必有字段（4个）

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 商品名称 |
| `price` | `number` | 商品单价（正数） |
| `quantity` | `number` | 商品数量（默认 1） |
| `hasTax` | `boolean` | 是否含税 |

#### 可选字段（3个）

| 字段 | 类型 | 说明 |
|------|------|------|
| `taxAmount` | `number?` | 税额（可选） |
| `deposit` | `number?` | 押金金额（自动合并，通常为正数） |
| `discount` | `number?` | 折扣金额（自动合并，存储为正数，如 0.5 表示减免 0.5 元） |

## 附加费用合并逻辑

### 原始小票数据（LLM 识别到的）

```
1. 可口可乐瓶装 330ml    ¥3.50 x 2
2. Deposit VL            ¥0.50 x 2
3. TPD (折扣)            ¥0.50 x 1
```

### 处理前（LLM 返回的原始数据）

```json
[
  {
    "name": "可口可乐瓶装 330ml",
    "price": 3.5,
    "quantity": 2,
    "isAttachment": false
  },
  {
    "name": "Deposit VL",
    "price": 0.5,
    "quantity": 2,
    "isAttachment": true,
    "attachmentType": "deposit",
    "attachedTo": 0
  },
  {
    "name": "TPD",
    "price": 0.5,
    "quantity": 1,
    "isAttachment": true,
    "attachmentType": "discount",
    "attachedTo": 0
  }
]
```

### 处理后（库最终输出）

```json
[
  {
    "name": "可口可乐瓶装 330ml",
    "price": 3.5,
    "quantity": 2,
    "hasTax": true,
    "taxAmount": 0.35,
    "deposit": 1.0,      // 0.5 * 2 = 1.0
    "discount": 0.5      // 0.5 (存储为正数)
  }
]
```

## 计算总价示例

```typescript
function calculateItemTotal(item: ReceiptItem): number {
  let total = item.price * item.quantity;
  
  if (item.deposit) {
    total += item.deposit;
  }
  
  if (item.discount) {
    total -= item.discount; // discount 是正数，需要减去
  }
  
  return total;
}

// 示例
const item = {
  name: "可口可乐瓶装 330ml",
  price: 3.5,
  quantity: 2,
  deposit: 1.0,
  discount: 0.5
};

const total = calculateItemTotal(item);
// total = (3.5 * 2) + 1.0 - 0.5 = 7.5
```

## TypeScript 类型定义

```typescript
interface ReceiptData {
  items: ReceiptItem[];
  subtotal?: number;     // ✨ 小计（从小票提取）
  totalTax?: number;     // ✨ 总税额（从小票提取）
  total: number;
}

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  hasTax: boolean;
  taxAmount?: number;
  deposit?: number;      // ✨ 押金（自动合并）
  discount?: number;     // ✨ 折扣（自动合并）
}
```
