/**
 * 展示如何使用新增的可选字段：subtotal、tax、totalDiscount
 * 
 * 这些字段只有在小票上明确显示时才会返回
 */

import { extractReceiptItems } from '../src/index.js';
import fs from 'fs';

async function main() {
  const imagePath = process.argv[2];
  
  if (!imagePath) {
    console.error('请提供图片路径');
    console.error('用法: npx tsx examples/with-additional-fields.ts <图片路径>');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`文件不存在: ${imagePath}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);

  console.log('🔍 提取小票数据（包含可选字段）...\n');

  try {
    const receipt = await extractReceiptItems(imageBuffer);

    // 显示商品列表
    console.log('📦 商品列表:');
    receipt.items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   单价: $${item.price.toFixed(2)}`);
      console.log(`   数量: ${item.quantity}`);
      console.log(`   含税: ${item.hasTax ? '是' : '否'}`);
      
      if (item.taxAmount) {
        console.log(`   税额: $${item.taxAmount.toFixed(2)}`);
      }
      if (item.deposit) {
        console.log(`   押金: $${item.deposit.toFixed(2)}`);
      }
      if (item.discount) {
        console.log(`   折扣: $${item.discount.toFixed(2)}`);
      }
    });

    // 显示金额汇总
    console.log('\n💰 金额汇总:');
    console.log('─────────────────────────────');
    
    // 可选字段 - 只在存在时显示
    if (receipt.subtotal !== undefined) {
      console.log(`小计（税前）: $${receipt.subtotal.toFixed(2)}`);
    }
    
    if (receipt.tax !== undefined) {
      console.log(`总税额:       $${receipt.tax.toFixed(2)}`);
    }
    
    if (receipt.totalDiscount !== undefined) {
      console.log(`整单折扣:     $${receipt.totalDiscount.toFixed(2)} ⬅️ 注意：这是整单折扣，不是商品级别的折扣`);
    }
    
    console.log(`总计:         $${receipt.total.toFixed(2)}`);
    console.log('─────────────────────────────');

    // 显示字段说明
    console.log('\n📝 字段说明:');
    console.log('• subtotal（小计）: 只有小票上有"SUBTOTAL"或"小计"等标记时才会返回');
    console.log('• tax（总税额）: 只有小票上有"TAX"或"税额合计"等标记时才会返回');
    console.log('• totalDiscount（整单折扣）: 只有应用到整个账单的折扣（如会员折扣、优惠券）时才会返回');
    console.log('• 这些字段与商品级别的 taxAmount 和 discount 不同');

    // 显示区别说明
    console.log('\n🔍 商品折扣 vs 整单折扣:');
    console.log('• 商品折扣 (item.discount): 单个商品的促销折扣，紧跟在商品后');
    console.log('• 整单折扣 (receipt.totalDiscount): 应用到整个账单的折扣（如"会员优惠 -$5"）');

  } catch (error) {
    console.error('❌ 提取失败:', error);
    process.exit(1);
  }
}

main();
