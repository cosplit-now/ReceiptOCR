/**
 * ppocr API 适配器
 * 负责调用 ppocr API 并处理 OCR 结果
 */

import type { ImageInput, OcrConfig, PPocrResponse } from '../types.js';
import { processImage } from '../processors/image.js';
import { processOcrText } from '../processors/ocr-text-processor.js';

/**
 * 使用 ppocr API 提取文本
 * 
 * @param image - 图片输入（Buffer、base64 或 URL）
 * @param config - OCR 配置
 * @returns 格式化的文本和警告信息
 * 
 * @throws 如果 API 调用失败
 * @throws 如果响应格式无效
 */
export async function extractTextWithPPOcr(
  image: ImageInput,
  config: OcrConfig
): Promise<{ text: string; warnings: string[] }> {
  // 1. 处理图片格式（复用现有逻辑）
  const processedImage = await processImage(image);
  
  // 2. 构建请求 payload
  const payload = {
    file: processedImage.data,
    fileType: config.fileType ?? 1, // 默认为图片
    useDocOrientationClassify: config.useDocOrientationClassify ?? false,
    useDocUnwarping: config.useDocUnwarping ?? false,
    useTextlineOrientation: config.useTextlineOrientation ?? false,
    visualize: false, // 不需要可视化结果
  };
  
  // 3. 调用 ppocr API
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`ppocr API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as PPocrResponse;
    
    // 4. 验证响应
    if (data.errorCode !== 0) {
      throw new Error(`ppocr API error (${data.errorCode}): ${data.errorMsg}`);
    }
    
    if (!data.result || !data.result.ocrResults || data.result.ocrResults.length === 0) {
      throw new Error('ppocr API returned empty ocrResults');
    }
    
    // 5. 处理每个页面/图片的 OCR 结果
    const allTexts: string[] = [];
    const allWarnings: string[] = [];
    
    for (let i = 0; i < data.result.ocrResults.length; i++) {
      const ocrResult = data.result.ocrResults[i];
      const prunedResult = ocrResult.prunedResult;
      
      try {
        const { formattedText, warnings } = processOcrText(prunedResult);
        
        allTexts.push(formattedText);
        
        // 为警告添加页码前缀（如果有多页）
        if (data.result.ocrResults.length > 1) {
          warnings.forEach(warning => {
            allWarnings.push(`Page ${i + 1}: ${warning}`);
          });
        } else {
          allWarnings.push(...warnings);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to process OCR result (page ${i + 1}): ${message}`);
      }
    }
    
    // 6. 合并所有页面的文本（用双换行分隔）
    const finalText = allTexts.join('\n\n');
    
    return {
      text: finalText,
      warnings: allWarnings,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ppocr API call failed: ${error.message}`);
    }
    throw new Error('ppocr API call failed with unknown error');
  }
}
