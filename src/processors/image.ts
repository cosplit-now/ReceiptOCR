import type { ImageInput } from '../types.js';

/**
 * 图片数据接口，用于传递给 Gemini API
 */
export interface ProcessedImage {
  /** 图片的 MIME 类型 */
  mimeType: string;
  /** base64 编码的图片数据（不包含 data URI 前缀） */
  data?: string;
  /** 图片 URL（如果输入是 URL） */
  url?: string;
}

/**
 * 检测是否为 URL
 */
function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

/**
 * 检测是否为 base64 字符串
 */
function isBase64(input: string): boolean {
  // 简单检测：如果以 data: 开头，或者看起来像 base64
  if (input.startsWith('data:')) {
    return true;
  }
  // Base64 字符串通常很长，且只包含特定字符
  return input.length > 100 && /^[A-Za-z0-9+/=]+$/.test(input);
}

/**
 * 从 data URI 中提取 MIME 类型和数据
 */
function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const match = dataUri.match(/^data:([^;,]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  // 如果没有匹配到，假设是纯 base64，默认 MIME 类型
  return {
    mimeType: 'image/jpeg',
    data: dataUri,
  };
}

/**
 * 从文件扩展名推断 MIME 类型
 */
function getMimeTypeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  // 默认
  return 'image/jpeg';
}

/**
 * 处理图片输入，转换为 Gemini API 可用的格式
 * 
 * @param image - 图片输入（Buffer、base64 字符串或 URL）
 * @returns 处理后的图片数据
 */
export function processImage(image: ImageInput): ProcessedImage {
  // 如果是 Buffer
  if (Buffer.isBuffer(image)) {
    return {
      mimeType: 'image/jpeg', // 默认，实际中可能需要更精确的检测
      data: image.toString('base64'),
    };
  }

  // 如果是字符串
  if (typeof image === 'string') {
    // URL
    if (isUrl(image)) {
      return {
        mimeType: getMimeTypeFromUrl(image),
        url: image,
      };
    }

    // data URI
    if (image.startsWith('data:')) {
      const { mimeType, data } = parseDataUri(image);
      return { mimeType, data };
    }

    // 纯 base64
    if (isBase64(image)) {
      return {
        mimeType: 'image/jpeg',
        data: image,
      };
    }

    // 无法识别，抛出错误
    throw new Error('Unsupported image format: string is not a valid URL or base64');
  }

  throw new Error('Unsupported image input type');
}
