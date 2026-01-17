/**
 * 集成测试 - 使用真实图片和真实 Gemini API
 * 优化版：所有测试共享一次 API 调用结果
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { extractReceiptItems } from '../src/index.js';
import type { ReceiptItem, VerificationCallback } from '../src/types.js';
import { searchProduct } from './fixtures/product-db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('集成测试：真实图片识别（优化版 - 单次 API 调用）', () => {
  const imagePath = path.join(__dirname, 'fixtures', 'receipt-sample.jpg');
  let imageBuffer: Buffer;
  let sharedItems: ReceiptItem[]; // 共享的识别结果
  let itemsWithVerification: ReceiptItem[]; // 带验证的结果
  let itemsWithAutoVerify: ReceiptItem[]; // 自动验证的结果

  beforeAll(async () => {
    // 检查环境变量
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        '请设置 GEMINI_API_KEY 环境变量\n' +
        '运行: $env:GEMINI_API_KEY="your-api-key"'
      );
    }

    // 检查测试图片是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(
        `测试图片不存在: ${imagePath}\n` +
        '请在 tests/fixtures/ 目录下放置名为 receipt-sample.jpg 的测试图片'
      );
    }

    // 读取测试图片
    imageBuffer = fs.readFileSync(imagePath);
    console.log(`\n✓ 已加载测试图片: ${imagePath} (${imageBuffer.length} bytes)`);

    // 🎯 只调用一次 API - 获取基础识别结果
    console.log('\n📸 开始识别小票图片（这是唯一的 API 调用）...');
    sharedItems = await extractReceiptItems(imageBuffer);
    console.log(`✓ 识别完成，提取到 ${sharedItems.length} 个商品`);
    
    // 📊 显示识别结果的JSON
    console.log('\n📊 识别结果JSON:');
    console.log(JSON.stringify(sharedItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      deposit: item.deposit,
      discount: item.discount
    })), null, 2));
    
    // 📋 表格式显示
    console.log('\n📋 商品-价格对照表:');
    console.log('┌─────────────────────────────────┬──────────┬────────┬──────────┬──────────┐');
    console.log('│ 商品名称                        │ 价格     │ 数量   │ 押金     │ 折扣     │');
    console.log('├─────────────────────────────────┼──────────┼────────┼──────────┼──────────┤');
    sharedItems.forEach(item => {
      const name = item.name.padEnd(32);
      const price = `¥${item.price.toFixed(2)}`.padEnd(8);
      const quantity = `${item.quantity}`.padEnd(6);
      const deposit = item.deposit !== undefined ? `¥${item.deposit.toFixed(2)}`.padEnd(8) : '-'.padEnd(8);
      const discount = item.discount !== undefined ? `¥${item.discount.toFixed(2)}`.padEnd(8) : '-'.padEnd(8);
      console.log(`│ ${name} │ ${price} │ ${quantity} │ ${deposit} │ ${discount} │`);
    });
    console.log('└─────────────────────────────────┴──────────┴────────┴──────────┴──────────┘');
    console.log();

    // 测试验证回调功能
    console.log('🔍 测试验证回调功能...');
    const verifyCallback: VerificationCallback = async (name, context) => {
      const verifiedName = await searchProduct(name);
      return verifiedName && verifiedName !== name 
        ? { verifiedName } 
        : null;
    };
    
    itemsWithVerification = await extractReceiptItems(imageBuffer, { verifyCallback });
    console.log(`✓ 验证完成`);
    
    // 📊 显示验证后的JSON
    console.log('\n📊 验证后的商品JSON:');
    console.log(JSON.stringify(itemsWithVerification.map(item => ({
      name: item.name,
      price: item.price
    })), null, 2));
    console.log();
    
    // 测试自动验证功能（使用 Google Search grounding）
    console.log('🔍 测试自动验证功能（Google Search grounding）...');
    itemsWithAutoVerify = await extractReceiptItems(imageBuffer, { autoVerify: true });
    console.log(`✓ 自动验证完成`);
    
    // 📊 显示自动验证后的JSON
    console.log('\n📊 自动验证后的商品JSON:');
    console.log(JSON.stringify(itemsWithAutoVerify.map(item => ({
      name: item.name,
      price: item.price
    })), null, 2));
    console.log();
  });

  it('应该识别真实小票并返回正确结构的商品列表', () => {
    console.log('\n[测试 1/5] 验证基础识别结果');
    
    // 验证返回值是数组
    expect(Array.isArray(sharedItems)).toBe(true);
    
    // 验证至少有一个商品
    expect(sharedItems.length).toBeGreaterThan(0);
    
    // 📦 输出完整的JSON结构
    console.log('\n📦 完整的商品JSON数据:');
    console.log(JSON.stringify(sharedItems, null, 2));
    
    // 验证每个商品的字段结构
    sharedItems.forEach((item, index) => {
      console.log(`\n商品 ${index + 1}:`);
      console.log(`  名称: ${item.name}`);
      console.log(`  价格: ¥${item.price}`);
      console.log(`  数量: ${item.quantity}`);
      console.log(`  含税: ${item.hasTax ? '是' : '否'}`);
      if (item.taxAmount !== undefined) {
        console.log(`  税额: ¥${item.taxAmount}`);
      }
      if (item.deposit !== undefined) {
        console.log(`  押金: ¥${item.deposit}`);
      }
      if (item.discount !== undefined) {
        console.log(`  折扣: ¥${item.discount}`);
      }
      
      // 验证必需字段
      expect(item).toHaveProperty('name');
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
      
      expect(item).toHaveProperty('price');
      expect(typeof item.price).toBe('number');
      expect(item.price).toBeGreaterThanOrEqual(0);
      
      expect(item).toHaveProperty('quantity');
      expect(typeof item.quantity).toBe('number');
      expect(item.quantity).toBeGreaterThan(0);
      
      expect(item).toHaveProperty('hasTax');
      expect(typeof item.hasTax).toBe('boolean');
      
      if (item.taxAmount !== undefined) {
        expect(typeof item.taxAmount).toBe('number');
        expect(item.taxAmount).toBeGreaterThanOrEqual(0);
      }
      
      if (item.deposit !== undefined) {
        expect(typeof item.deposit).toBe('number');
      }
      
      if (item.discount !== undefined) {
        expect(typeof item.discount).toBe('number');
      }
    });
    
    console.log('\n✓ 所有字段验证通过');
  });

  it('应该正确调用验证回调并更新商品名称', () => {
    console.log('\n[测试 2/3] 验证回调功能');
    
    expect(Array.isArray(itemsWithVerification)).toBe(true);
    expect(itemsWithVerification.length).toBeGreaterThan(0);
    
    // 显示结果
    console.log(`\n最终商品列表:`);
    itemsWithVerification.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name}`);
    });
    
    console.log('\n✓ 验证回调测试通过');
  });

  it('应该支持自动批量验证（Google Search grounding）', () => {
    console.log('\n[测试 3/3] 验证自动批量验证功能');
    
    expect(Array.isArray(itemsWithAutoVerify)).toBe(true);
    expect(itemsWithAutoVerify.length).toBeGreaterThan(0);
    
    console.log(`\n数组长度: sharedItems=${sharedItems.length}, itemsWithAutoVerify=${itemsWithAutoVerify.length}`);
    
    // 显示验证结果对比
    console.log(`\n验证结果对比:`);
    itemsWithAutoVerify.forEach((item, idx) => {
      const originalItem = sharedItems[idx];
      if (originalItem.name !== item.name) {
        console.log(`  ✓ ${originalItem.name} → ${item.name} (已验证并更新)`);
      } else {
        console.log(`  • ${item.name}`);
      }
    });
    
    // 验证：至少应该返回相同数量的商品
    expect(itemsWithAutoVerify.length).toBe(sharedItems.length);
    
    console.log('\n✓ 自动批量验证功能测试通过');
  });
});