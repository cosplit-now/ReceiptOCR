/**
 * OCR 文本处理器单元测试
 * 详细展示四阶段处理过程
 */

import { describe, it, expect } from 'vitest';
import { processOcrText } from '../src/processors/ocr-text-processor.js';

describe('OCR 文本处理器 - 详细过程展示', () => {
  it('测试 1: 简单单行文本', () => {
    console.log('\n=== 测试 1: 简单单行文本 ===');
    
    const mockPrunedResult = {
      rec_texts: ['Apple', '$2.99'],
      rec_polys: [
        [[10, 20], [100, 20], [100, 50], [10, 50]],   // Apple
        [[500, 22], [580, 22], [580, 52], [500, 52]]  // $2.99 (Y轴接近，应该在同一行)
      ],
      rec_scores: [0.98, 0.99]
    };

    console.log('\n📥 输入数据:');
    console.log('  文本块:', mockPrunedResult.rec_texts);
    console.log('  坐标:', mockPrunedResult.rec_polys.map(p => `Y中心: ${(p[0][1] + p[2][1]) / 2}`));
    console.log('  置信度:', mockPrunedResult.rec_scores);

    const result = processOcrText(mockPrunedResult);
    
    console.log('\n📤 处理结果:');
    console.log('  格式化文本:', `"${result.formattedText}"`);
    console.log('  警告数量:', result.warnings.length);
    
    console.log('\n✅ 验证:');
    console.log('  - 两个文本块应该被识别为同一行');
    console.log('  - 用双空格分隔');
    
    expect(result.formattedText).toBe('Apple  $2.99');
    expect(result.warnings).toHaveLength(0);
    
    console.log('  ✓ 测试通过\n');
  });

  it('测试 2: 多行文本聚类', () => {
    console.log('\n=== 测试 2: 多行文本聚类 ===');
    
    const mockPrunedResult = {
      rec_texts: ['KS ORG', 'MLK 1L', '12.50', 'ORG BRD', 'H', '8.00'],
      rec_polys: [
        // 第 1 行 (Y ≈ 35)
        [[10, 20], [80, 20], [80, 50], [10, 50]],     // KS ORG
        [[90, 22], [170, 22], [170, 52], [90, 52]],   // MLK 1L
        [[500, 24], [560, 24], [560, 54], [500, 54]], // 12.50
        // 第 2 行 (Y ≈ 95)
        [[10, 80], [90, 80], [90, 110], [10, 110]],   // ORG BRD
        [[100, 82], [120, 82], [120, 112], [100, 112]], // H
        [[500, 84], [560, 84], [560, 114], [500, 114]]  // 8.00
      ],
      rec_scores: [0.95, 0.97, 0.99, 0.96, 0.92, 0.99]
    };

    console.log('\n📥 输入数据:');
    console.log('  共 6 个文本块');
    
    // 计算每个块的几何信息
    const blocks = mockPrunedResult.rec_texts.map((text, i) => {
      const poly = mockPrunedResult.rec_polys[i];
      const yCenter = (poly[0][1] + poly[2][1]) / 2;
      const height = poly[2][1] - poly[0][1];
      const xStart = Math.min(...poly.map(p => p[0]));
      return { text, yCenter, height, xStart, score: mockPrunedResult.rec_scores[i] };
    });

    console.log('\n📊 文本块几何信息:');
    blocks.forEach((block, i) => {
      console.log(`  块 ${i + 1}: "${block.text}"`);
      console.log(`       Y中心=${block.yCenter.toFixed(1)}, 高度=${block.height}, X起始=${block.xStart}, 置信度=${block.score}`);
    });

    const result = processOcrText(mockPrunedResult);
    
    const lines = result.formattedText.split('\n');
    
    console.log('\n🔄 聚类结果:');
    console.log(`  检测到 ${lines.length} 行`);
    lines.forEach((line, i) => {
      console.log(`  第 ${i + 1} 行: "${line}"`);
    });

    console.log('\n📋 聚类分析:');
    console.log('  - 块 1-3 的 Y中心在 20-24 之间 → 聚为第 1 行');
    console.log('  - 块 4-6 的 Y中心在 80-84 之间 → 聚为第 2 行');
    console.log('  - Y轴差距约 55，远大于高度的 50%，所以分为两行');

    console.log('\n✅ 验证:');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('KS ORG  MLK 1L  12.50');
    expect(lines[1]).toBe('ORG BRD  H  8.00');
    
    console.log('  ✓ 测试通过\n');
  });

  it('测试 3: Y轴重叠度计算（边界情况）', () => {
    console.log('\n=== 测试 3: Y轴重叠度计算 ===');
    
    // 测试两个文本块，Y轴接近但高度不同
    const mockPrunedResult = {
      rec_texts: ['Big', 'small', 'far'],
      rec_polys: [
        // Big - 大字 (Y: 10-50, 中心35, 高度40)
        [[10, 10], [100, 10], [100, 50], [10, 50]],
        // small - 小字 (Y: 25-40, 中心32.5, 高度15) - 应该和 Big 同一行
        [[120, 25], [180, 25], [180, 40], [120, 40]],
        // far - 远处 (Y: 100-130, 中心115, 高度30) - 应该是新的一行
        [[10, 100], [100, 100], [100, 130], [10, 130]]
      ],
      rec_scores: [0.95, 0.90, 0.95]
    };

    console.log('\n📥 输入数据:');
    const blocks = mockPrunedResult.rec_texts.map((text, i) => {
      const poly = mockPrunedResult.rec_polys[i];
      const yCenter = (poly[0][1] + poly[2][1]) / 2;
      const height = poly[2][1] - poly[0][1];
      return { text, yCenter, height };
    });

    console.log('\n📊 块的几何信息:');
    blocks.forEach((block, i) => {
      console.log(`  块 ${i + 1} "${block.text}": Y中心=${block.yCenter}, 高度=${block.height}`);
    });

    console.log('\n🧮 重叠度计算:');
    console.log('  块1 vs 块2:');
    const minHeight12 = Math.min(blocks[0].height, blocks[1].height);
    const centerDiff12 = Math.abs(blocks[0].yCenter - blocks[1].yCenter);
    const overlap12 = (minHeight12 - centerDiff12) / minHeight12;
    console.log(`    最小高度 = ${minHeight12}`);
    console.log(`    中心点距离 = ${centerDiff12.toFixed(1)}`);
    console.log(`    重叠度 = ${overlap12.toFixed(2)} ${overlap12 >= 0.5 ? '≥ 0.5 ✓ (同一行)' : '< 0.5 (不同行)'}`);

    console.log('\n  块2 vs 块3:');
    const minHeight23 = Math.min(blocks[1].height, blocks[2].height);
    const centerDiff23 = Math.abs(blocks[1].yCenter - blocks[2].yCenter);
    const overlap23 = centerDiff23 > minHeight23 / 2 ? 0 : (minHeight23 - centerDiff23) / minHeight23;
    console.log(`    最小高度 = ${minHeight23}`);
    console.log(`    中心点距离 = ${centerDiff23.toFixed(1)}`);
    console.log(`    重叠度 = ${overlap23.toFixed(2)} ${overlap23 >= 0.5 ? '≥ 0.5 (同一行)' : '< 0.5 ✗ (不同行)'}`);

    const result = processOcrText(mockPrunedResult);
    const lines = result.formattedText.split('\n');
    
    console.log('\n🔄 聚类结果:');
    lines.forEach((line, i) => {
      console.log(`  第 ${i + 1} 行: "${line}"`);
    });

    console.log('\n✅ 验证:');
    console.log('  - "Big" 和 "small" 应该在同一行（大小字混排）');
    console.log('  - "far" 应该在新的一行（Y轴距离太远）');
    
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Big  small');
    expect(lines[1]).toBe('far');
    
    console.log('  ✓ 测试通过\n');
  });

  it('测试 4: 低置信度警告', () => {
    console.log('\n=== 测试 4: 低置信度警告 ===');
    
    const mockPrunedResult = {
      rec_texts: ['TOTAL', '99.99'],
      rec_polys: [
        [[10, 20], [100, 20], [100, 50], [10, 50]],
        [[500, 22], [580, 22], [580, 52], [500, 52]]
      ],
      rec_scores: [0.95, 0.75]  // 第二个置信度低
    };

    console.log('\n📥 输入数据:');
    console.log('  文本块:', mockPrunedResult.rec_texts);
    console.log('  置信度:', mockPrunedResult.rec_scores);
    console.log('  平均置信度:', ((0.95 + 0.75) / 2).toFixed(2));

    const result = processOcrText(mockPrunedResult);
    
    console.log('\n⚠️  置信度分析:');
    console.log('  行内容: "TOTAL  99.99"');
    console.log('  包含数字: 是');
    console.log('  平均置信度: 0.85');
    console.log('  阈值: 0.8');
    console.log('  应该发出警告: 否（0.85 > 0.8）');
    
    console.log('\n📤 处理结果:');
    console.log('  格式化文本:', `"${result.formattedText}"`);
    console.log('  警告数量:', result.warnings.length);
    if (result.warnings.length > 0) {
      console.log('  警告内容:');
      result.warnings.forEach(w => console.log(`    - ${w}`));
    }

    expect(result.formattedText).toBe('TOTAL  99.99');
    // 注意：平均 0.85 > 0.8，不应该有警告
    
    console.log('\n✅ 测试通过\n');
  });

  it('测试 5: 真正的低置信度（会触发警告）', () => {
    console.log('\n=== 测试 5: 真正的低置信度 ===');
    
    const mockPrunedResult = {
      rec_texts: ['TOTAL', '99.99'],
      rec_polys: [
        [[10, 20], [100, 20], [100, 50], [10, 50]],
        [[500, 22], [580, 22], [580, 52], [500, 52]]
      ],
      rec_scores: [0.65, 0.70]  // 两个都是低置信度
    };

    console.log('\n📥 输入数据:');
    console.log('  文本块:', mockPrunedResult.rec_texts);
    console.log('  置信度:', mockPrunedResult.rec_scores);
    console.log('  平均置信度:', ((0.65 + 0.70) / 2).toFixed(3));

    const result = processOcrText(mockPrunedResult);
    
    console.log('\n⚠️  置信度分析:');
    console.log('  行内容: "TOTAL  99.99"');
    console.log('  包含数字: 是');
    console.log('  平均置信度: 0.675');
    console.log('  阈值: 0.8');
    console.log('  应该发出警告: 是（0.675 < 0.8）');
    
    console.log('\n📤 处理结果:');
    console.log('  格式化文本:', `"${result.formattedText}"`);
    console.log('  警告数量:', result.warnings.length);
    if (result.warnings.length > 0) {
      console.log('  警告内容:');
      result.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
    }

    expect(result.formattedText).toBe('TOTAL  99.99');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('confidence');
    expect(result.warnings[0]).toMatch(/0\.6[78]/); // 接受 0.67 或 0.68（四舍五入）
    
    console.log('\n✅ 测试通过\n');
  });

  it('测试 6: 复杂场景 - 完整小票', () => {
    console.log('\n=== 测试 6: 复杂场景 - 模拟完整小票 ===');
    
    const mockPrunedResult = {
      rec_texts: [
        // 第 1 行
        'KS', 'ORG', 'MLK', '1L', '12.50',
        // 第 2 行
        'ORG', 'BRD', 'H', '8.00',
        // 第 3 行
        'Tax', '0.80',
        // 第 4 行
        'Deposit', 'VL', '0.50', '2',
        // 第 5 行
        'TOTAL', '37.30'
      ],
      rec_polys: [
        // 第 1 行 (Y ≈ 35)
        [[10, 20], [40, 20], [40, 50], [10, 50]],
        [[45, 22], [85, 22], [85, 52], [45, 52]],
        [[90, 21], [130, 21], [130, 51], [90, 51]],
        [[135, 23], [165, 23], [165, 53], [135, 53]],
        [[500, 24], [560, 24], [560, 54], [500, 54]],
        // 第 2 行 (Y ≈ 85)
        [[10, 70], [50, 70], [50, 100], [10, 100]],
        [[55, 72], [95, 72], [95, 102], [55, 102]],
        [[100, 71], [120, 71], [120, 101], [100, 101]],
        [[500, 74], [560, 74], [560, 104], [500, 104]],
        // 第 3 行 (Y ≈ 125) - 小字
        [[20, 115], [60, 115], [60, 135], [20, 135]],
        [[510, 117], [555, 117], [555, 137], [510, 137]],
        // 第 4 行 (Y ≈ 165)
        [[10, 150], [90, 150], [90, 180], [10, 180]],
        [[95, 152], [125, 152], [125, 182], [95, 182]],
        [[500, 154], [545, 154], [545, 184], [500, 184]],
        [[550, 153], [570, 153], [570, 183], [550, 183]],
        // 第 5 行 (Y ≈ 225)
        [[10, 210], [90, 210], [90, 240], [10, 240]],
        [[500, 214], [570, 214], [570, 244], [500, 244]]
      ],
      rec_scores: [
        0.96, 0.94, 0.97, 0.95, 0.99,  // 第 1 行
        0.95, 0.93, 0.91, 0.98,         // 第 2 行
        0.88, 0.92,                      // 第 3 行
        0.94, 0.96, 0.97, 0.95,         // 第 4 行
        0.99, 0.99                       // 第 5 行
      ]
    };

    console.log('\n📥 输入数据:');
    console.log(`  共 ${mockPrunedResult.rec_texts.length} 个文本块`);

    const result = processOcrText(mockPrunedResult);
    const lines = result.formattedText.split('\n');
    
    console.log('\n🔄 聚类结果:');
    console.log(`  检测到 ${lines.length} 行`);
    
    console.log('\n📋 每行详情:');
    lines.forEach((line, i) => {
      console.log(`  第 ${i + 1} 行: "${line}"`);
    });

    console.log('\n📊 预期的聚类:');
    console.log('  行 1: KS ORG MLK 1L 和 12.50 → "KS  ORG  MLK  1L  12.50"');
    console.log('  行 2: ORG BRD H 和 8.00 → "ORG  BRD  H  8.00"');
    console.log('  行 3: Tax 和 0.80 → "Tax  0.80"');
    console.log('  行 4: Deposit VL 0.50 2 → "Deposit  VL  0.50  2"');
    console.log('  行 5: TOTAL 和 37.30 → "TOTAL  37.30"');

    console.log('\n⚠️  警告检查:');
    console.log(`  警告数量: ${result.warnings.length}`);
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.log(`    - ${w}`));
    } else {
      console.log('    无警告（所有行置信度良好）');
    }

    console.log('\n✅ 验证:');
    expect(lines).toHaveLength(5);
    expect(lines[0]).toContain('KS');
    expect(lines[0]).toContain('12.50');
    expect(lines[4]).toContain('TOTAL');
    expect(lines[4]).toContain('37.30');
    
    console.log('  ✓ 测试通过\n');
  });

  it('测试 7: 空输入处理', () => {
    console.log('\n=== 测试 7: 空输入处理 ===');
    
    const mockPrunedResult = {
      rec_texts: [],
      rec_polys: [],
      rec_scores: []
    };

    console.log('\n📥 输入数据: 空数组');

    const result = processOcrText(mockPrunedResult);
    
    console.log('\n📤 处理结果:');
    console.log('  格式化文本:', `"${result.formattedText}"`);
    console.log('  警告数量:', result.warnings.length);
    if (result.warnings.length > 0) {
      console.log('  警告内容:');
      result.warnings.forEach(w => console.log(`    - ${w}`));
    }

    console.log('\n✅ 验证:');
    expect(result.formattedText).toBe('');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('No text detected');
    
    console.log('  ✓ 测试通过\n');
  });
});
