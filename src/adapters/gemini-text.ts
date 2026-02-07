/**
 * Gemini 文本解析适配器
 * 使用 Gemini API 解析纯文本（不使用图片）
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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
 * 使用 Gemini 解析 OCR 文本
 * 
 * @param text - OCR 提取的文本
 * @param prompt - 解析 prompt
 * @returns LLM 返回的 JSON 响应文本
 * 
 * @throws 如果环境变量 GEMINI_API_KEY 未设置
 * @throws 如果 API 调用失败
 */
export async function parseTextWithGemini(
  text: string,
  prompt: string
): Promise<string> {
  const { apiKey, model } = getGeminiConfig();

  // 初始化 Gemini API 客户端
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  // 构建完整的 prompt（包含 OCR 文本）
  const fullPrompt = `${prompt}\n\n以下是从小票图片中提取的文本：\n\n${text}`;

  try {
    // 调用 Gemini API（纯文本，不使用图片）
    const result = await geminiModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: fullPrompt }] 
      }],
    });

    const response = result.response;
    const responseText = response.text();

    if (!responseText) {
      throw new Error('Gemini API returned empty response');
    }

    return responseText;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini text parsing failed: ${error.message}`);
    }
    throw new Error('Gemini text parsing failed with unknown error');
  }
}
