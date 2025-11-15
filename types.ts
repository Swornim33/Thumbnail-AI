export type Tool = 'prompt' | 'image';

export interface HistoryItem {
  id: number;
  prompt: string;
  topic: string;
  customElementsImages: string[];
  referenceImages: string[];
  timestamp: string;
}

export interface ImageHistoryItem {
  id: number;
  prompt: string;
  imageSrc: string;
  referenceImages: string[];
  customElementsImages: string[];
  timestamp: string;
}