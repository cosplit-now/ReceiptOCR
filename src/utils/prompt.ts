/**
 * 小票商品提取的 Prompt 模板
 * 
 * 该模板要求 LLM：
 * 1. 从小票图片中提取所有商品信息
 * 2. 直接判断每个商品名称是否需要验证（needsVerification）
 * 3. 返回结构化的 JSON 数组
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

特殊规则（这些项目不需要验证）：
- "Deposit VL" 或类似名称：这是购买酒类商品的押金，needsVerification 设为 false
- "TPD" 或包含 "TPD" 的名称：这是指减价/折扣项目，needsVerification 设为 false

只返回 JSON 数组，不要其他文字。

示例输出：
[
  {"name": "有机牛奶 1L", "price": 12.5, "quantity": 1, "needsVerification": false, "hasTax": false},
  {"name": "ORG BRD", "price": 8.0, "quantity": 2, "needsVerification": true, "hasTax": true, "taxAmount": 0.8},
  {"name": "Deposit VL", "price": 0.5, "quantity": 1, "needsVerification": false, "hasTax": false},
  {"name": "TPD", "price": -2.0, "quantity": 1, "needsVerification": false, "hasTax": false}
]`;
