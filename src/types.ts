/**
 * 对外公开的商品数据结构
 */
export interface ReceiptItem {
  /** 商品名称 */
  name: string;
  /** 商品单价 */
  price: number;
  /** 商品数量，默认为 1 */
  quantity: number;
  /** 该商品是否产生税费 */
  hasTax: boolean;
  /** 该商品对应的具体税费金额（可选） */
  taxAmount?: number;
  /** 押金金额（可选，正数表示收押金，负数表示退押金） */
  deposit?: number;
  /** 折扣金额（可选，负数表示折扣） */
  discount?: number;
}

/**
 * 小票数据结构
 * 这是 extractReceiptItems 函数返回的类型
 */
export interface ReceiptData {
  /** 商品列表 */
  items: ReceiptItem[];
  /** 小票总金额 */
  total: number;
  /** 小计金额（税前金额，如果小票上有显示） */
  subtotal?: number;
  /** 总税额（如果小票上有显示） */
  tax?: number;
  /** 整单折扣（应用到整个账单的折扣，负数表示折扣，如果有） */
  totalDiscount?: number;
}

/**
 * 内部使用的商品数据结构
 * 包含用于内部处理的额外字段
 */
export interface InternalReceiptItem extends ReceiptItem {
  /** LLM 判断该商品名称是否需要验证（不完整/缩写/模糊） */
  needsVerification: boolean;
}

/**
 * 验证上下文，提供给验证回调/策略的额外信息
 */
export interface VerificationContext {
  /** OCR 识别的原始文本 */
  rawText: string;
  /** 当前已解析的所有商品（只包含公开字段） */
  allItems: ReceiptItem[];
}

/**
 * 验证结果
 */
export interface VerificationResult {
  /** 验证/补全后的商品名称 */
  verifiedName: string;
}

/**
 * 验证策略接口（B 的形状）
 * 这是预留的完整策略接口，用于未来扩展
 */
export interface VerificationStrategy {
  /**
   * 验证商品名称
   * @param name 原始商品名称
   * @param context 验证上下文
   * @returns 验证结果
   */
  verify(name: string, context: VerificationContext): Promise<VerificationResult>;
}

/**
 * 验证回调函数类型（A 的形态，但符合 B 的接口）
 * 这是当前使用的简化版本
 */
export type VerificationCallback = (
  name: string,
  context: VerificationContext
) => Promise<VerificationResult | null>;

/**
 * 图片输入类型
 * 支持 Buffer、base64 字符串或图片 URL
 */
export type ImageInput = Buffer | string;

/**
 * 提取模式
 */
export type ExtractionMode = 
  | 'multimodal'  // 默认：Gemini 多模态（图片 → 结构化数据）
  | 'ocr-llm';    // 新增：OCR + LLM（图片 → 文本 → 结构化数据）

/**
 * OCR 配置
 */
export interface OcrConfig {
  /** ppocr API URL */
  apiUrl: string;
  /** ppocr API Token */
  token: string;
  /** 文件类型：0=PDF, 1=图片 */
  fileType?: 0 | 1;
  /** 是否使用文档方向分类 */
  useDocOrientationClassify?: boolean;
  /** 是否使用文档展平 */
  useDocUnwarping?: boolean;
  /** 是否使用文本行方向检测 */
  useTextlineOrientation?: boolean;
}

/**
 * ppocr API 响应结构
 */
export interface PPocrResponse {
  logId: string;
  errorCode: number;
  errorMsg: string;
  result: {
    dataInfo?: {
      width: number;
      height: number;
      channels: number;
    };
    ocrResults: Array<{
      prunedResult: {
        dt_polys: number[][][];      // 检测框坐标数组
        rec_texts: string[];          // 识别文本数组
        rec_scores: number[];         // 识别置信度数组
        rec_polys: number[][][];      // 识别框坐标数组
        model_settings?: any;
        text_det_params?: any;
        text_type?: string;
        textline_orientation_angles?: number[];
        text_rec_score_thresh?: number;
      };
      ocrImage?: string;
      docPreprocessingImage?: string;
      inputImage?: string;
    }>;
  };
}

/**
 * 单个文本块的几何和内容信息
 */
export interface TextBlock {
  /** 文本内容 */
  text: string;
  /** 识别置信度 */
  score: number;
  /** Y轴中心点 */
  yCenter: number;
  /** 包围盒高度 */
  height: number;
  /** X轴起始坐标 */
  xStart: number;
  /** X轴结束坐标 */
  xEnd: number;
}

/**
 * 处理后的文本行
 */
export interface ProcessedTextLine {
  /** 拼接后的文本（含双空格分隔） */
  text: string;
  /** 平均置信度 */
  avgConfidence: number;
  /** 是否有低置信度警告 */
  hasLowConfidence: boolean;
}

/**
 * 提取选项
 */
export interface ExtractOptions {
  /**
   * 可选的验证回调函数
   * 当库内部检测到不确定的商品名称时自动调用
   */
  verifyCallback?: VerificationCallback;
  
  /**
   * 自动使用 Google Search 验证不确定的商品名称
   * 默认 true
   */
  autoVerify?: boolean;
  
  /**
   * 提取模式
   * - 'multimodal'（默认）：使用 Gemini 多模态直接处理图片
   * - 'ocr-llm'：先用 ppocr 提取文本，再用 Gemini 解析
   */
  mode?: ExtractionMode;
  
  /**
   * OCR 配置（mode='ocr-llm' 时必需）
   */
  ocrConfig?: OcrConfig;
}
