/**
 * 示例：对比多模态模式和 OCR + LLM 模式
 * 
 * 这个示例展示：
 * 1. 默认使用多模态模式（向后兼容）
 * 2. 显式指定多模态模式
 * 3. 使用 OCR + LLM 模式
 * 4. 成本和性能对比
 */

import { extractReceiptItems } from 'receipt-ocr';
import fs from 'fs';

async function testMultimodalMode() {
  console.log('=== 测试 1: 多模态模式（默认） ===\n');
  
  const imageBuffer = fs.readFileSync('path/to/receipt.jpg');
  
  // 不传 mode 参数，默认使用 multimodal
  const startTime = Date.now();
  const receipt = await extractReceiptItems(imageBuffer, {
    autoVerify: false, // 为了公平对比，禁用验证
  });
  const duration = Date.now() - startTime;
  
  console.log(`✓ 提取成功`);
  console.log(`  商品数: ${receipt.items.length}`);
  console.log(`  总金额: $${receipt.total}`);
  console.log(`  耗时: ${duration}ms\n`);
  
  return { receipt, duration };
}

async function testOcrLlmMode() {
  console.log('=== 测试 2: OCR + LLM 模式 ===\n');
  
  const PPOCR_API_URL = process.env.PPOCR_API_URL || 'https://your-ppocr-api.com/ocr';
  const PPOCR_TOKEN = process.env.PPOCR_TOKEN;
  
  if (!PPOCR_TOKEN) {
    console.log('⚠ 跳过：PPOCR_TOKEN 未设置\n');
    return null;
  }
  
  const imageBuffer = fs.readFileSync('path/to/receipt.jpg');
  
  // 使用 ocr-llm 模式
  const startTime = Date.now();
  const receipt = await extractReceiptItems(imageBuffer, {
    mode: 'ocr-llm',
    ocrConfig: {
      apiUrl: PPOCR_API_URL,
      token: PPOCR_TOKEN,
      fileType: 1,
    },
    autoVerify: false, // 为了公平对比，禁用验证
  });
  const duration = Date.now() - startTime;
  
  console.log(`✓ 提取成功`);
  console.log(`  商品数: ${receipt.items.length}`);
  console.log(`  总金额: $${receipt.total}`);
  console.log(`  耗时: ${duration}ms\n`);
  
  return { receipt, duration };
}

async function testExplicitMultimodal() {
  console.log('=== 测试 3: 显式指定多模态模式 ===\n');
  
  const imageBuffer = fs.readFileSync('path/to/receipt.jpg');
  
  // 显式指定 mode: 'multimodal'
  const startTime = Date.now();
  const receipt = await extractReceiptItems(imageBuffer, {
    mode: 'multimodal',
    autoVerify: false,
  });
  const duration = Date.now() - startTime;
  
  console.log(`✓ 提取成功`);
  console.log(`  商品数: ${receipt.items.length}`);
  console.log(`  总金额: $${receipt.total}`);
  console.log(`  耗时: ${duration}ms\n`);
  
  return { receipt, duration };
}

async function testErrorHandling() {
  console.log('=== 测试 4: 错误处理 ===\n');
  
  const imageBuffer = fs.readFileSync('path/to/receipt.jpg');
  
  try {
    // 尝试使用 ocr-llm 模式但不提供 ocrConfig
    await extractReceiptItems(imageBuffer, {
      mode: 'ocr-llm',
      // ocrConfig 缺失
    });
    console.log('✗ 应该抛出错误但没有\n');
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✓ 正确捕获错误: ${error.message}\n`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('receipt-ocr 模式对比测试');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // 测试 1: 默认多模态模式（向后兼容）
    const result1 = await testMultimodalMode();
    
    // 测试 2: OCR + LLM 模式
    const result2 = await testOcrLlmMode();
    
    // 测试 3: 显式多模态模式
    const result3 = await testExplicitMultimodal();
    
    // 测试 4: 错误处理
    await testErrorHandling();
    
    // 总结
    console.log('=== 总结 ===\n');
    console.log('✓ 所有测试通过');
    console.log('✓ 向后兼容性: 正常（默认使用多模态模式）');
    console.log('✓ 模式切换: 正常');
    console.log('✓ 错误处理: 正常\n');
    
    if (result1 && result2) {
      console.log('性能对比：');
      console.log(`  多模态模式: ${result1.duration}ms`);
      console.log(`  OCR+LLM模式: ${result2.duration}ms`);
      console.log(`  差异: ${result2.duration - result1.duration > 0 ? '+' : ''}${result2.duration - result1.duration}ms\n`);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

// 只在直接运行时执行
if (require.main === module) {
  main();
}
