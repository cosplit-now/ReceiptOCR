/**
 * Receipt OCR Library
 * 
 * 一个可复用的 TypeScript 库，用于借助多模态大语言模型
 * 从购物小票图片中提取结构化商品数据。
 * 
 * @packageDocumentation
 */

// 导出主函数
export { extractReceiptItems } from './extract.js';

// 导出验证功能
export { batchVerifyItems } from './adapters/verifier.js';

// 导出 OCR 文本处理器（可选，供高级用户直接使用）
export { processOcrText } from './processors/ocr-text-processor.js';

// 导出所有类型定义
export type {
  ReceiptItem,
  ReceiptData,
  ImageInput,
  ExtractOptions,
  VerificationStrategy,
  VerificationCallback,
  VerificationContext,
  VerificationResult,
  ExtractionMode,
  OcrConfig,
  TextBlock,
  ProcessedTextLine,
} from './types.js';
