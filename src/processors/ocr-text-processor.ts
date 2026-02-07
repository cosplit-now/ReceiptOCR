import type { TextBlock, ProcessedTextLine } from '../types.js';

/**
 * 阶段 1：空间坐标标准化
 * 将 ppocr 的坐标数据转换为几何属性
 * 
 * @param texts - 识别的文本数组
 * @param polys - 坐标数组（每个元素是 4 个点的坐标）
 * @param scores - 置信度数组
 * @returns 标准化的文本块数组
 */
function normalizeTextBlocks(
  texts: string[],
  polys: number[][][],
  scores: number[]
): TextBlock[] {
  const blocks: TextBlock[] = [];
  
  for (let i = 0; i < texts.length; i++) {
    const poly = polys[i];
    const text = texts[i];
    const score = scores[i];
    
    // 计算 Y 轴中心点：(上边 Y + 下边 Y) / 2
    // poly[0] 是左上角，poly[2] 是右下角
    const yCenter = (poly[0][1] + poly[2][1]) / 2;
    
    // 计算高度
    const height = poly[2][1] - poly[0][1];
    
    // 计算 X 轴范围
    const xCoords = poly.map(p => p[0]);
    const xStart = Math.min(...xCoords);
    const xEnd = Math.max(...xCoords);
    
    blocks.push({
      text,
      score,
      yCenter,
      height,
      xStart,
      xEnd,
    });
  }
  
  return blocks;
}

/**
 * 计算两个文本块的 Y 轴重叠度
 * 
 * @param block1 - 第一个文本块
 * @param block2 - 第二个文本块
 * @returns 重叠比例（0-1）
 */
function calculateOverlap(block1: TextBlock, block2: TextBlock): number {
  const minHeight = Math.min(block1.height, block2.height);
  const centerDiff = Math.abs(block1.yCenter - block2.yCenter);
  const maxAllowedDiff = minHeight / 2; // 50% 阈值
  
  if (centerDiff > maxAllowedDiff) {
    return 0; // 不重叠
  }
  
  const overlap = minHeight - centerDiff;
  return overlap / minHeight; // 返回重叠比例
}

/**
 * 阶段 2：自适应垂直聚类
 * 根据 Y 轴重叠度将文本块分组为行
 * 
 * @param blocks - 标准化的文本块数组
 * @returns 分组后的二维数组（每个子数组是一行）
 */
function clusterTextLines(blocks: TextBlock[]): TextBlock[][] {
  if (blocks.length === 0) return [];
  
  // 按 Y 中心点排序
  const sortedBlocks = [...blocks].sort((a, b) => a.yCenter - b.yCenter);
  
  const lines: TextBlock[][] = [];
  let currentLine: TextBlock[] = [sortedBlocks[0]];
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    const prevBlock = sortedBlocks[i - 1];
    const currBlock = sortedBlocks[i];
    
    // 计算重叠度
    const overlap = calculateOverlap(prevBlock, currBlock);
    
    // 如果重叠度 >= 0.5，认为在同一行
    if (overlap >= 0.5) {
      currentLine.push(currBlock);
    } else {
      // 开始新的一行
      lines.push(currentLine);
      currentLine = [currBlock];
    }
  }
  
  // 添加最后一行
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * 阶段 3：横向排序与语义间距
 * 对每一行内的文本块按 X 坐标排序，并用双空格拼接
 * 
 * @param lineGroups - 分组后的文本行
 * @returns 处理后的文本行数组
 */
function formatTextLines(lineGroups: TextBlock[][]): ProcessedTextLine[] {
  const processedLines: ProcessedTextLine[] = [];
  
  for (const line of lineGroups) {
    // 按 X 起始坐标排序
    const sortedLine = [...line].sort((a, b) => a.xStart - b.xStart);
    
    // 用双空格拼接文本
    const text = sortedLine.map(block => block.text).join('  ');
    
    // 计算平均置信度
    const avgConfidence = sortedLine.reduce((sum, block) => sum + block.score, 0) / sortedLine.length;
    
    processedLines.push({
      text,
      avgConfidence,
      hasLowConfidence: false, // 将在阶段 4 中设置
    });
  }
  
  return processedLines;
}

/**
 * 检查文本行是否应该发出低置信度警告
 * 
 * @param line - 文本行
 * @returns 是否应该警告
 */
function shouldWarnLowConfidence(line: ProcessedTextLine): boolean {
  // 只对包含数字的行（可能是金额）发出警告
  const hasNumber = /\d/.test(line.text);
  return hasNumber && line.avgConfidence < 0.8;
}

/**
 * 阶段 4：置信度加权
 * 检测低置信度行并标记警告
 * 
 * @param lines - 处理后的文本行数组
 * @returns 标记后的文本行数组
 */
function detectLowConfidence(
  lines: ProcessedTextLine[]
): ProcessedTextLine[] {
  return lines.map(line => ({
    ...line,
    hasLowConfidence: shouldWarnLowConfidence(line),
  }));
}

/**
 * 处理 ppocr 的 OCR 结果，生成格式化文本
 * 
 * 处理流程：
 * 1. 空间坐标标准化：计算每个文本块的几何属性
 * 2. 自适应垂直聚类：根据 Y 轴重叠度分组为行
 * 3. 横向排序与语义间距：按 X 坐标排序并用双空格拼接
 * 4. 置信度加权：检测并标记低置信度行
 * 
 * @param prunedResult - ppocr API 返回的 prunedResult 对象
 * @returns 格式化文本和警告信息
 */
export function processOcrText(prunedResult: any): {
  formattedText: string;
  warnings: string[];
} {
  const { rec_texts, rec_polys, rec_scores } = prunedResult;
  
  // 验证数据
  if (!rec_texts || !rec_polys || !rec_scores) {
    throw new Error('Invalid prunedResult: missing rec_texts, rec_polys, or rec_scores');
  }
  
  if (rec_texts.length === 0) {
    return {
      formattedText: '',
      warnings: ['No text detected in image'],
    };
  }
  
  if (rec_texts.length !== rec_polys.length || rec_texts.length !== rec_scores.length) {
    throw new Error('Invalid prunedResult: array lengths do not match');
  }
  
  // 阶段 1：标准化
  const blocks = normalizeTextBlocks(rec_texts, rec_polys, rec_scores);
  
  // 阶段 2：聚类
  const lineGroups = clusterTextLines(blocks);
  
  // 阶段 3：格式化
  let processedLines = formatTextLines(lineGroups);
  
  // 阶段 4：置信度检测
  processedLines = detectLowConfidence(processedLines);
  
  // 生成最终文本
  const formattedText = processedLines.map(line => line.text).join('\n');
  
  // 收集警告
  const warnings: string[] = [];
  processedLines.forEach((line, index) => {
    if (line.hasLowConfidence) {
      warnings.push(
        `Line ${index + 1} (${line.text.substring(0, 50)}...): average confidence ${line.avgConfidence.toFixed(2)} below threshold 0.8`
      );
    }
  });
  
  return {
    formattedText,
    warnings,
  };
}
