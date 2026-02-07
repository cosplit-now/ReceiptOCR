/**
 * 真实图片测试脚本
 * 使用真实的 ppocr API 和 Gemini API
 */

import { extractReceiptItems } from './src/index.js';
import { processOcrText } from './src/processors/ocr-text-processor.js';
import fs from 'fs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 验证环境变量
function checkEnv() {
  const required = ['GEMINI_API_KEY', 'PPOCR_API_URL', 'PPOCR_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n请在 .env 文件中设置这些变量');
    process.exit(1);
  }
  
  console.log('✅ 环境变量检查通过\n');
  console.log('📋 当前配置:');
  console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY?.substring(0, 20)}...`);
  console.log(`   PPOCR_API_URL: ${process.env.PPOCR_API_URL}`);
  console.log(`   PPOCR_TOKEN: ${process.env.PPOCR_TOKEN?.substring(0, 20)}...\n`);
}

// 测试 1: 多模态模式（默认）
async function testMultimodalMode(imagePath: string) {
  console.log('='.repeat(60));
  console.log('测试 1: 多模态模式（Gemini 直接处理图片）');
  console.log('='.repeat(60));
  
  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`📸 图片大小: ${imageBuffer.length} bytes`);
  
  const startTime = Date.now();
  
  try {
    const result = await extractReceiptItems(imageBuffer, {
      autoVerify: false, // 先不启用验证，快速测试
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ 提取成功！耗时: ${duration}ms\n`);
    console.log(`📊 结果统计:`);
    console.log(`   商品数量: ${result.items.length}`);
    console.log(`   总金额: $${result.total}\n`);
    
    console.log('📋 商品列表:');
    result.items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.name}`);
      console.log(`      价格: $${item.price} × ${item.quantity}`);
      if (item.hasTax) console.log(`      含税: 是${item.taxAmount ? ` (税额: $${item.taxAmount})` : ''}`);
      if (item.deposit) console.log(`      押金: $${item.deposit}`);
      if (item.discount) console.log(`      折扣: $${item.discount}`);
    });
    
    return result;
  } catch (error) {
    console.error(`\n❌ 测试失败:`, error);
    throw error;
  }
}

// 测试 2: OCR + LLM 模式
async function testOcrLlmMode(imagePath: string) {
  console.log('\n' + '='.repeat(60));
  console.log('测试 2: OCR + LLM 模式（ppocr + Gemini）');
  console.log('='.repeat(60));
  
  const imageBuffer = fs.readFileSync(imagePath);
  
  const startTime = Date.now();
  
  try {
    console.log('\n📸 步骤 1: 调用 ppocr API 提取文本...');
    
    const result = await extractReceiptItems(imageBuffer, {
      mode: 'ocr-llm',
      ocrConfig: {
        apiUrl: process.env.PPOCR_API_URL!,
        token: process.env.PPOCR_TOKEN!,
        fileType: 1, // 图片
      },
      autoVerify: false,
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ 提取成功！总耗时: ${duration}ms\n`);
    console.log(`📊 结果统计:`);
    console.log(`   商品数量: ${result.items.length}`);
    console.log(`   总金额: $${result.total}\n`);
    
    console.log('📋 商品列表:');
    result.items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.name}`);
      console.log(`      价格: $${item.price} × ${item.quantity}`);
      if (item.hasTax) console.log(`      含税: 是${item.taxAmount ? ` (税额: $${item.taxAmount})` : ''}`);
      if (item.deposit) console.log(`      押金: $${item.deposit}`);
      if (item.discount) console.log(`      折扣: $${item.discount}`);
    });
    
    return result;
  } catch (error) {
    console.error(`\n❌ 测试失败:`, error);
    throw error;
  }
}

// 主函数
async function main() {
  // 检查命令行参数
  const imagePath = process.argv[2];
  
  if (!imagePath) {
    console.error('❌ 请提供图片路径');
    console.error('\n用法:');
    console.error('  npx tsx test-real-image.ts <图片路径>');
    console.error('\n示例:');
    console.error('  npx tsx test-real-image.ts ./receipt.jpg');
    console.error('  npx tsx test-real-image.ts ./tests/fixtures/receipt-sample.jpg');
    process.exit(1);
  }
  
  // 检查图片是否存在
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ 图片不存在: ${imagePath}`);
    process.exit(1);
  }
  
  console.log('\n🚀 开始真实图片测试\n');
  console.log(`📷 图片路径: ${imagePath}\n`);
  
  // 检查环境变量
  checkEnv();
  
  try {
    // 测试 1: 多模态模式
    const result1 = await testMultimodalMode(imagePath);
    
    // 测试 2: OCR + LLM 模式
    const result2 = await testOcrLlmMode(imagePath);
    
    // 对比结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 对比分析');
    console.log('='.repeat(60));
    console.log(`\n商品数量:`);
    console.log(`   多模态模式: ${result1.items.length}`);
    console.log(`   OCR+LLM模式: ${result2.items.length}`);
    
    console.log(`\n总金额:`);
    console.log(`   多模态模式: $${result1.total}`);
    console.log(`   OCR+LLM模式: $${result2.total}`);
    console.log(`   差异: ${result1.total === result2.total ? '✓ 一致' : '✗ 不一致'}`);
    
    console.log('\n✅ 所有测试完成！\n');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error);
    process.exit(1);
  }
}

// 运行
main();
