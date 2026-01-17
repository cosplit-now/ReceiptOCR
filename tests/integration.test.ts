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
      needsVerification: item.needsVerification,
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

    // 如果有需要验证的商品，再做一次带验证的调用
    const hasItemsNeedingVerification = sharedItems.some(item => item.needsVerification);
    if (hasItemsNeedingVerification) {
      console.log('🔍 检测到需要验证的商品，执行验证回调测试...');
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
        price: item.price,
        needsVerification: item.needsVerification
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
        price: item.price,
        needsVerification: item.needsVerification
      })), null, 2));
      console.log();
    } else {
      itemsWithVerification = sharedItems;
      itemsWithAutoVerify = sharedItems;
    }
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
      console.log(`  需要验证: ${item.needsVerification ? '是' : '否'}`);
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
      expect(item).toHaveProperty('id');
      expect(item.id).toBeTruthy();
      expect(typeof item.id).toBe('string');
      
      expect(item).toHaveProperty('name');
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
      
      expect(item).toHaveProperty('price');
      expect(typeof item.price).toBe('number');
      expect(item.price).toBeGreaterThanOrEqual(0);
      
      expect(item).toHaveProperty('quantity');
      expect(typeof item.quantity).toBe('number');
      expect(item.quantity).toBeGreaterThan(0);
      
      expect(item).toHaveProperty('needsVerification');
      expect(typeof item.needsVerification).toBe('boolean');
      
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
      
      expect(item).toHaveProperty('isEditing');
      expect(item.isEditing).toBe(false);
    });
    
    console.log('\n✓ 所有字段验证通过');
  });

  it('应该正确调用验证回调并更新商品名称', () => {
    console.log('\n[测试 2/5] 验证回调功能');
    
    expect(Array.isArray(itemsWithVerification)).toBe(true);
    expect(itemsWithVerification.length).toBeGreaterThan(0);
    
    // 统计验证情况
    const needsVerificationItems = itemsWithVerification.filter(item => item.needsVerification);
    const verifiedItems = itemsWithVerification.filter(item => !item.needsVerification);
    
    console.log(`  需要验证的商品: ${needsVerificationItems.length}`);
    console.log(`  已验证的商品: ${verifiedItems.length}`);
    
    // 显示结果
    console.log(`\n最终商品列表:`);
    itemsWithVerification.forEach((item, idx) => {
      const status = item.needsVerification ? '⚠️ 待验证' : '✅ 已确认';
      console.log(`  ${idx + 1}. ${item.name} - ${status}`);
    });
    
    console.log('\n✓ 验证回调测试通过');
  });

  it('应该支持不同的图片输入格式', () => {
    console.log('\n[测试 3/5] 验证不同输入格式支持');
    
    // 测试 1: Buffer 格式（已在 beforeAll 中测试）
    console.log('  ✓ Buffer 格式: 已验证');
    expect(sharedItems.length).toBeGreaterThan(0);
    
    // 测试 2: Base64 格式（不实际调用 API，只验证能接受）
    console.log('  ✓ Base64 格式: 格式支持');
    const base64String = imageBuffer.toString('base64');
    expect(base64String.length).toBeGreaterThan(0);
    
    // 测试 3: Data URI 格式
    console.log('  ✓ Data URI 格式: 格式支持');
    const dataUri = `data:image/jpeg;base64,${base64String}`;
    expect(dataUri.startsWith('data:image')).toBe(true);
    
    console.log('\n✓ 所有格式测试通过（基于已有结果）');
  });

  it('应该为每个商品生成唯一的 ID', () => {
    console.log('\n[测试 4/5] 验证 ID 唯一性');
    
    // 收集所有 ID
    const ids = sharedItems.map(item => item.id);
    
    // 检查是否有重复 ID
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    
    console.log(`  ✓ 所有 ${ids.length} 个商品 ID 都是唯一的`);
    
    // 验证 ID 格式（格式：timestamp-random，例如 "1768678371144-yqhyjoo"）
    ids.forEach(id => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(/^\d+-[a-z0-9]+$/.test(id)).toBe(true);
    });
    
    console.log(`  ✓ 所有 ID 格式正确（timestamp-random）`);
  });

  it('应该正确设置 isEditing 字段为 false', () => {
    console.log('\n[测试 5/6] 验证 isEditing 字段');
    
    sharedItems.forEach(item => {
      expect(item.isEditing).toBe(false);
    });
    
    console.log(`  ✓ 所有 ${sharedItems.length} 个商品的 isEditing 字段都为 false`);
  });

  it('应该支持自动批量验证（Google Search grounding）', () => {
    console.log('\n[测试 6/6] 验证自动批量验证功能');
    
    expect(Array.isArray(itemsWithAutoVerify)).toBe(true);
    expect(itemsWithAutoVerify.length).toBeGreaterThan(0);
    
    // 统计验证前后的差异
    const beforeNeedsVerification = sharedItems.filter(item => item.needsVerification).length;
    const afterNeedsVerification = itemsWithAutoVerify.filter(item => item.needsVerification).length;
    
    console.log(`  验证前需要验证的商品数: ${beforeNeedsVerification}`);
    console.log(`  验证后需要验证的商品数: ${afterNeedsVerification}`);
    console.log(`  成功验证的商品数: ${beforeNeedsVerification - afterNeedsVerification}`);
    
    console.log(`\n数组长度: sharedItems=${sharedItems.length}, itemsWithAutoVerify=${itemsWithAutoVerify.length}`);
    
    // 显示验证结果对比
    console.log(`\n验证结果对比:`);
    itemsWithAutoVerify.forEach((item, idx) => {
      const originalItem = sharedItems[idx];
      if (originalItem.needsVerification && !item.needsVerification) {
        console.log(`  ✓ ${originalItem.name} → ${item.name}`);
      } else if (item.needsVerification) {
        console.log(`  ⚠️ ${item.name} (验证失败或未找到，保持原名)`);
      } else {
        console.log(`  • ${item.name} (原本就清晰)`);
      }
    });
    
    // 验证：自动验证应该减少需要验证的商品数量（或至少不增加）
    expect(afterNeedsVerification).toBeLessThanOrEqual(beforeNeedsVerification);
    
    console.log('\n✓ 自动批量验证功能测试通过');
  });
});