import sharp from 'sharp';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Prediction, ColorAnalysis, CompositionAnalysis } from '../types';

export class ImageAnalysisService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    this.visionClient = new ImageAnnotatorClient({
      keyFilename: './vision-api-service.json'
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('Google Vision API client initialized');
    } catch (error) {
      console.error('Failed to initialize Google Vision API:', error);
      throw new Error('Failed to initialize image analysis service');
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<{
    predictions: Prediction[];
    colorAnalysis: ColorAnalysis;
    compositionAnalysis: CompositionAnalysis;
  }> {
    try {
      // Get real predictions from Google Vision API
      const predictions = await this.getVisionPredictions(imageBuffer);
      
      // Analyze colors and composition locally
      const colorAnalysis = await this.analyzeColors(imageBuffer);
      const compositionAnalysis = await this.analyzeComposition(imageBuffer);

      return {
        predictions,
        colorAnalysis,
        compositionAnalysis
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Fallback to mock predictions if Vision API fails
      return this.getFallbackAnalysis(imageBuffer);
    }
  }

  private async getVisionPredictions(imageBuffer: Buffer): Promise<Prediction[]> {
    try {
      const [result] = await this.visionClient.labelDetection(imageBuffer);
      const labels = result.labelAnnotations || [];
      
      return labels.map(label => ({
        className: label.description || '',
        probability: label.score || 0
      }));
    } catch (error) {
      console.error('Vision API error:', error);
      throw error;
    }
  }

  private async getFallbackAnalysis(imageBuffer: Buffer): Promise<{
    predictions: Prediction[];
    colorAnalysis: ColorAnalysis;
    compositionAnalysis: CompositionAnalysis;
  }> {
    console.log('Using fallback analysis due to Vision API error');
    
    const colorAnalysis = await this.analyzeColors(imageBuffer);
    const compositionAnalysis = await this.analyzeComposition(imageBuffer);
    
    const predictions: Prediction[] = [
      { className: 'image', probability: 0.9 },
      { className: 'visual_content', probability: 0.8 }
    ];

    return {
      predictions,
      colorAnalysis,
      compositionAnalysis
    };
  }

  private async analyzeColors(imageBuffer: Buffer): Promise<ColorAnalysis> {
    const image = sharp(imageBuffer);
    
    // Get dominant colors using sharp
    const { dominant } = await image.stats();
    
    const dominantColor = this.getColorName(dominant);
    const colorPalette = await this.extractColorPalette(imageBuffer);

    return {
      dominantColor,
      colorPalette
    };
  }

  private async analyzeComposition(imageBuffer: Buffer): Promise<CompositionAnalysis> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    const aspectRatio = metadata.width / metadata.height;
    let orientation: 'landscape' | 'portrait' | 'square';
    let description: string;

    if (aspectRatio > 1.2) {
      orientation = 'landscape';
      description = 'landscape orientation';
    } else if (aspectRatio < 0.8) {
      orientation = 'portrait';
      description = 'portrait orientation';
    } else {
      orientation = 'square';
      description = 'square or near-square format';
    }

    return {
      orientation,
      aspectRatio,
      description
    };
  }

  private getColorName(rgb: { r: number; g: number; b: number }): string {
    const { r, g, b } = rgb;
    
    // Simple color classification
    if (r > g && r > b) return 'red';
    if (g > r && g > b) return 'green';
    if (b > r && b > g) return 'blue';
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 50 && g < 50 && b < 50) return 'black';
    
    return 'mixed';
  }

  private async extractColorPalette(imageBuffer: Buffer): Promise<string[]> {
    // Extract a simple color palette
    const image = sharp(imageBuffer);
    const { dominant } = await image.stats();
    
    return [this.getColorName(dominant)];
  }
} 