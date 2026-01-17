import type { ReceiptItem } from '../types.js';

/**
 * LLM 返回的原始商品数据结构（未包含 id 和 isEditing）
 */
interface RawReceiptItem {
  name: string;
  price: number;
  quantity?: number;
  needsVerification: boolean;
  hasTax: boolean;
  taxAmount?: number;
}

/**
 * 生成唯一的商品 ID
 * 格式：{timestamp}-{random}，例如 "1768678371144-yqhyjoo"
 */
function generateItemId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * 从 LLM 响应中提取 JSON
 * 处理可能的 markdown 代码块包裹
 */
function extractJson(text: string): string {
  // 移除可能的 markdown 代码块标记
  let cleaned = text.trim();
  
  // 匹配 ```json ... ``` 或 ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  
  return cleaned;
}

/**
 * 验证并规范化原始商品数据
 */
function normalizeRawItem(raw: any): RawReceiptItem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid item: not an object');
  }

  if (typeof raw.name !== 'string' || !raw.name) {
    throw new Error('Invalid item: missing or invalid name field');
  }

  if (typeof raw.price !== 'number' || raw.price < 0) {
    throw new Error('Invalid item: missing or invalid price field');
  }

  return {
    name: raw.name,
    price: raw.price,
    quantity: typeof raw.quantity === 'number' ? raw.quantity : 1,
    needsVerification: Boolean(raw.needsVerification),
    hasTax: Boolean(raw.hasTax),
    taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : undefined,
  };
}

/**
 * 解析 LLM 返回的 JSON 响应为 ReceiptItem 数组
 * 
 * @param responseText - LLM 返回的文本响应
 * @returns 解析后的商品数组（未包含 id 和 isEditing）
 * @throws 如果解析失败
 */
export function parseResponse(responseText: string): Omit<ReceiptItem, 'id' | 'isEditing'>[] {
  try {
    // 提取 JSON
    const jsonText = extractJson(responseText);

    // 解析 JSON
    const parsed = JSON.parse(jsonText);

    // 确保是数组
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // 验证并规范化每个商品
    const items = parsed.map((raw, index) => {
      try {
        return normalizeRawItem(raw);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid item at index ${index}: ${message}`);
      }
    });

    return items;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse LLM response: ${error.message}\n\nResponse:\n${responseText}`);
    }
    throw new Error(`Failed to parse LLM response with unknown error\n\nResponse:\n${responseText}`);
  }
}

/**
 * 将解析后的商品数据转换为完整的 ReceiptItem
 * 添加 id 和 isEditing 字段
 * 
 * @param items - 解析后的商品数组
 * @returns 完整的 ReceiptItem 数组
 */
export function finalizeItems(items: Omit<ReceiptItem, 'id' | 'isEditing'>[]): ReceiptItem[] {
  return items.map((item) => ({
    ...item,
    id: generateItemId(),
    isEditing: false,
  }));
}
