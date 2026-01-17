import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ImageInput } from '../types.js';
import { processImage } from '../processors/image.js';

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
 * 调用 Gemini API 进行图片分析
 * 
 * @param image - 图片输入（Buffer、base64 或 URL）
 * @param prompt - 提示词
 * @param useGrounding - 是否使用 Google Search grounding
 * @returns LLM 返回的文本响应
 */
export async function callGemini(
  image: ImageInput,
  prompt: string,
  useGrounding?: boolean
): Promise<string> {
  const { apiKey, model } = getGeminiConfig();

  // 初始化 Gemini API 客户端
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  // 处理图片
  const processedImage = processImage(image);

  // 构建请求内容
  const contents = [];

  // 添加图片部分
  if (processedImage.url) {
    // 如果是 URL，使用 fileData
    contents.push({
      fileData: {
        mimeType: processedImage.mimeType,
        fileUri: processedImage.url,
      },
    });
  } else if (processedImage.data) {
    // 如果是 base64 数据，使用 inlineData
    contents.push({
      inlineData: {
        mimeType: processedImage.mimeType,
        data: processedImage.data,
      },
    });
  }

  // 添加文本提示
  contents.push({
    text: prompt,
  });

  try {
    // 调用 Gemini API
    // 如果启用 Google Search grounding，直接将 tools 作为顶级参数
    const requestParams: any = {
      contents: [{ role: 'user', parts: contents }],
    };
    
    if (useGrounding) {
      requestParams.tools = [{ googleSearch: {} }];
    }
    
    const result = await geminiModel.generateContent(requestParams);

    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Gemini API returned empty response');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API call failed: ${error.message}`);
    }
    throw new Error('Gemini API call failed with unknown error');
  }
}
