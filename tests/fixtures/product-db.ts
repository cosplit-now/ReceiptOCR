/**
 * 模拟产品数据库
 * 用于验证回调测试
 */

export const productDatabase = new Map<string, string>([
  // 常见缩写
  ['ORG MLK', '有机牛奶 1L'],
  ['ORG BRD', '有机全麦面包'],
  ['APL', '富士苹果'],
  ['BAN', '香蕉'],
  ['CHKN', '鸡胸肉'],
  ['EGG', '鸡蛋'],
  ['RICE', '大米 5kg'],
  ['TOMATO', '番茄'],
  
  // 可能的缩写变体
  ['MLK', '牛奶'],
  ['BRD', '面包'],
  ['APPLE', '苹果'],
  ['BANANA', '香蕉'],
  ['CHICKEN', '鸡肉'],
]);

/**
 * 搜索产品数据库
 * @param abbreviation 商品缩写或部分名称
 * @returns 完整商品名称，如果未找到返回 null
 */
export async function searchProduct(abbreviation: string): Promise<string | null> {
  // 模拟异步数据库查询延迟
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 精确匹配
  const exactMatch = productDatabase.get(abbreviation.toUpperCase());
  if (exactMatch) {
    return exactMatch;
  }
  
  // 模糊匹配（部分匹配）
  for (const [key, value] of productDatabase.entries()) {
    if (key.includes(abbreviation.toUpperCase()) || 
        value.includes(abbreviation)) {
      return value;
    }
  }
  
  return null;
}
