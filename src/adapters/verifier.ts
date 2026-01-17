/**
 * 使用 Google Search grounding 验证商品名称
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ReceiptItem } from '../types.js';

/**
 * 从环境变量读取 Gemini API 配置
 */
function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Please set it to use the Gemini adapter.'
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  return { apiKey, model };
}

/**
 * 构建批量验证 prompt
 */
function buildVerificationPrompt(items: Partial<ReceiptItem>[]): string {
  const itemList = items
    .map((item, index) => `${index + 1}. "${item.name}"`)
    .join('\n');

  return `这是从 Costco 超市小票中识别出的商品名称，部分名称可能不完整或有缩写。
请使用 Google Search 查找并补全这些商品的完整正确名称。

需要验证的商品：
${itemList}

验证方法建议：
- 在搜索引擎中输入：商品原名 + "Costco"（例如："CEMOI 6X Costco"）
- 这样能更准确地找到 Costco 销售的对应商品
- 注意确认商品的包装规格（如数量、容量等）

请返回 JSON 数组格式，每个商品包含：
- index: 序号（1-based）
- originalName: 原始名称
- verifiedName: 验证后的完整名称（如果找到）
- found: 是否找到匹配（布尔值）

示例输出：
[
  {"index": 1, "originalName": "ORG MLK", "verifiedName": "Kirkland Signature Organic 2% Milk 1L", "found": true},
  {"index": 2, "originalName": "CEMΟΙ 6Χ", "verifiedName": "CEMOI 82% Dark Chocolate Bars, 6 × 100 g", "found": true}
]

只返回 JSON 数组，不要其他文字。`;
}

/**
 * 解析验证响应
 */
interface VerificationResult {
  index: number;
  originalName: string;
  verifiedName: string;
  found: boolean;
}

function parseVerificationResponse(responseText: string): VerificationResult[] {
  try {
    // 移除可能的 markdown 代码块标记
    let cleaned = responseText.trim();
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse verification response:', error);
    return [];
  }
}

/**
 * 批量验证商品名称
 * 使用 Google Search grounding 查找完整商品名
 * 
 * @param items - 需要验证的商品列表
 * @returns 验证结果映射 (原始名称 -> 验证后名称)
 */
export async function batchVerifyItems(
  items: Partial<ReceiptItem>[]
): Promise<Map<string, string>> {
  if (items.length === 0) {
    return new Map();
  }

  const { apiKey, model } = getGeminiConfig();
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  // 构建验证 prompt
  const prompt = buildVerificationPrompt(items);

  try {
    // 使用 Google Search grounding
    // 注意：tools 应该直接作为 generateContent 的顶级参数，而不是嵌套在 config 里
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    } as any);

    const response = result.response;
    const text = response.text();

    if (!text) {
      console.warn('Verification returned empty response');
      return new Map();
    }

    // 解析验证结果
    const verificationResults = parseVerificationResponse(text);

    // 构建映射
    const resultMap = new Map<string, string>();
    verificationResults.forEach((result) => {
      if (result.found && result.verifiedName) {
        resultMap.set(result.originalName, result.verifiedName);
      }
    });

    return resultMap;
  } catch (error) {
    console.error('Batch verification failed:', error);
    return new Map();
  }
}
