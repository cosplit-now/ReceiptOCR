/**
 * 示例：使用 OCR + LLM 模式提取小票数据（成本优化）
 * 
 * 这个示例展示如何使用 ppocr + Gemini 的组合模式，
 * 相比多模态模式可以节省 60-80% 的 API 成本。
impor//import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

// 确保设置了环境变量
量读取配置
量读取配置
量读取配置
const PPOCR_API_URL = process.env.PPOCR_API_URL || 'https://your-ppocr-api.com/ocr';
const PPOCR_TOKEN = process.env.PPOCR_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PPOCR_TOKEN) {
  console.error('Error: PPOCR_TOKEN environment variable is not set');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

async function main() {
  try {
    // 读取小票图片
    const imageBuffer = fs.readFileSync('path/to/receipt.jpg');
    
    console.log('使用 OCR + LLM 模式提取小票数据...\n');
    
    // 使用 ocr-llm 模式
    const receipt = await extractReceiptItems(imageBuffer, {
      mode: 'ocr-llm',
      ocrConfig: {
        apiUrl: PPOCR_API_URL,
        token: PPOCR_TOKEN,
        fileType: 1, // 图片
        // 可选配置
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useTextlineOrientation: false,
      },
      // 仍然可以使用自动验证和自定义回调
      autoVerify: true,
    });
    
    console.log('提取成功！\n');
    console.log('商品列表：');
    receipt.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   价格: $${item.price} × ${item.quantity}`);
      console.log(`   含税: ${item.hasTax ? '是' : '否'}`);
      if (item.taxAmount) {
        console.log(`   税额: $${item.taxAmount}`);
      }
      if (item.deposit) {
        console.log(`   押金: $${item.deposit}`);
      }
      if (item.discount) {
        console.log(`   折扣: $${item.discount}`);
      }
      console.log('');
    });
    
    console.log(`总计: $${receipt.total}`);
    
  } catch (error) {
    console.error('提取失败:', error);
    process.exit(1);
  }
}

main();
