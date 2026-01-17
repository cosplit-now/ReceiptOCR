/**
 * 小票商品提取的 Prompt 模板
 * 
 * 该模板要求 LLM：
 * 1. 从小票图片中提取所有商品信息
 * 2. 直接判断每个商品名称是否需要验证（needsVerification）
 * 3. 识别附加费用（押金、折扣）并标记归属关系
 * 4. 返回结构化的 JSON 数组
 */
export const EXTRACTION_PROMPT = `分析这张购物小票图片，提取所有商品信息。

输出格式为 JSON 数组，每个商品包含：
- name: 商品名称（字符串）
- price: 单价（数字）
- quantity: 数量（数字，默认 1）
- needsVerification: 是否需要验证（布尔值）
- hasTax: 是否含税（布尔值）
- taxAmount: 税额（数字，可选）

关于 needsVerification 的判断规则：
- 如果商品名称是缩写、不完整、被截断或存在歧义，设为 true
- 如果商品名称清晰完整，设为 false
- 不要猜测不确定的名称，而是保留原样并设 needsVerification 为 true

**重要：附加费用处理规则**
对于押金（Deposit、deposit、押金等）和折扣（TPD、discount、折扣等）这类附加费用：
- 添加额外字段 isAttachment: true
- 添加 attachmentType: "deposit" 或 "discount"
- **重要**：将附加费用紧跟在它所属的商品后面排列
- 系统会自动将附加费用合并到它前面的商品中
- 这些附加费用不会作为独立商品返回

归属规则（按照这个顺序排列）：
- 商品A
- 商品A的押金（如果有）
- 商品A的折扣（如果有）
- 商品B
- 商品B的押金（如果有）
- ...

只返回 JSON 数组，不要其他文字。

示例输出：
[
  {"name": "有机牛奶 1L", "price": 12.5, "quantity": 1, "needsVerification": false, "hasTax": false},
  {"name": "可口可乐瓶装", "price": 3.5, "quantity": 2, "needsVerification": false, "hasTax": true, "taxAmount": 0.35},
  {"name": "Deposit VL", "price": 0.5, "quantity": 2, "needsVerification": false, "hasTax": false, "isAttachment": true, "attachmentType": "deposit"},
  {"name": "TPD", "price": -0.5, "quantity": 1, "needsVerification": false, "hasTax": false, "isAttachment": true, "attachmentType": "discount"},
  {"name": "ORG BRD", "price": 8.0, "quantity": 1, "needsVerification": true, "hasTax": true, "taxAmount": 0.8}
]`;
