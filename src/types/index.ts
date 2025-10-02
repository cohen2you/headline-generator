export interface ImageAnalysisResult {
  altText: string;
  imageData: string;
  predictions: Array<{
    className: string;
    probability: number;
  }>;
  colorInfo: string;
  compositionInfo: string;
}

export interface UploadResponse {
  success: boolean;
  data?: ImageAnalysisResult;
  error?: string;
}

export interface Prediction {
  className: string;
  probability: number;
}

export interface ColorAnalysis {
  dominantColor: string;
  colorPalette: string[];
}

export interface CompositionAnalysis {
  orientation: 'landscape' | 'portrait' | 'square';
  aspectRatio: number;
  description: string;
}

export interface AltTextGenerationOptions {
  includeColor: boolean;
  includeComposition: boolean;
  maxPredictions: number;
  confidenceThreshold: number;
}

export interface PriceActionObj {
  ticker: string;
  companyName: string;
  priceAction: string;
  narrativeType?: string;
  smartAnalysis?: boolean;
} 