# 库输出格式说明

这是 `extractReceiptItems()` 函数的输出格式示例。

## 完整 JSON 输出

```json
[
  {
    "id": "1737123456789-abc123",
    "name": "有机牛奶 1L",
    "price": 12.5,
    "quantity": 1,
    "needsVerification": false,
    "hasTax": false,
    "isEditing": false
  },
  {
    "id": "1737123456790-def456",
    "name": "可口可乐瓶装 330ml",
    "price": 3.5,
    "quantity": 2,
    "needsVerification": false,
    "hasTax": true,
    "taxAmount": 0.35,
    "deposit": 1.0,      // ✨ 押金已合并（原本是独立的 "Deposit VL" 项）
    "discount": -0.5,    // ✨ 折扣已合并（原本是独立的 "TPD" 项）
    "isEditing": false
  },
  {
    "id": "1737123456791-ghi789",
    "name": "有机面包",
    "price": 8.0,
    "quantity": 1,
    "needsVerification": false,
    "hasTax": true,
    "taxAmount": 0.8,
    "isEditing": false
  }
]
```

## 字段说明

### 必有字段（8个）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识符，格式：`{timestamp}-{random}` |
| `name` | `string` | 商品名称 |
| `price` | `number` | 商品单价（正数） |
| `quantity` | `number` | 商品数量（默认 1） |
| `needsVerification` | `boolean` | LLM 判断是否需要验证（缩写/模糊） |
| `hasTax` | `boolean` | 是否含税 |
| `isEditing` | `boolean` | UI 状态，默认 false |

### 可选字段（3个）

| 字段 | 类型 | 说明 |
|------|------|------|
| `taxAmount` | `number?` | 税额（可选） |
| `deposit` | `number?` | 押金金额（自动合并，通常为正数） |
| `discount` | `number?` | 折扣金额（自动合并，通常为负数） |

## 附加费用合并逻辑

### 原始小票数据（LLM 识别到的）

```
1. 可口可乐瓶装 330ml    ¥3.50 x 2
2. Deposit VL            ¥0.50 x 2
3. TPD                   ¥-0.50 x 1
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
    "price": -0.5,
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
    "id": "1737123456790-def456",
    "name": "可口可乐瓶装 330ml",
    "price": 3.5,
    "quantity": 2,
    "needsVerification": false,
    "hasTax": true,
    "taxAmount": 0.35,
    "deposit": 1.0,      // 0.5 * 2 = 1.0
    "discount": -0.5,    // -0.5
    "isEditing": false
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
    total += item.discount; // discount 通常是负数
  }
  
  return total;
}

// 示例
const item = {
  name: "可口可乐瓶装 330ml",
  price: 3.5,
  quantity: 2,
  deposit: 1.0,
  discount: -0.5
};

const total = calculateItemTotal(item);
// total = (3.5 * 2) + 1.0 + (-0.5) = 7.5
```

## TypeScript 类型定义

```typescript
interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  needsVerification: boolean;
  hasTax: boolean;
  taxAmount?: number;
  deposit?: number;      // ✨ 新增：押金
  discount?: number;     // ✨ 新增：折扣
  isEditing: boolean;
}
```
