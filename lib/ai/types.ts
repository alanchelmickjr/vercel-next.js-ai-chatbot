/**
 * Core types for the provider system
 * Centralizes all type definitions to prevent duplication
 */

import { Provider, LanguageModel, EmbeddingModel, ImageModel } from 'ai';

// Base provider interface matching Vercel SDK
export interface BaseProvider extends Provider {
  languageModel(modelId: string): LanguageModel;
  textEmbeddingModel(modelId: string): EmbeddingModel<string>;
  imageModel(modelId: string): ImageModel;
}

// Additional capabilities (will merge with Vercel's when they add them)
export interface MultimodalCapabilities {
  audioModel?(modelId: string): AudioModel;
  videoModel?(modelId: string): VideoModel;
  visionModel?(modelId: string): VisionModel;
}

// Extended provider combining base and multimodal
export type ExtendedProvider = BaseProvider & MultimodalCapabilities;

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId?: string;
}

// Base metadata types
export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

// Model capability types
export interface ModelCapability {
  type: string;
  version: string;
  features: string[];
}

// Detailed model capability for provider configuration
export interface DetailedModelCapability {
  name: string;
  method: string;
  inputType: 'string' | 'buffer' | 'json';
  outputType: 'string' | 'json' | 'number[]';
}

// Provider configuration
export interface ProviderConfig {
  name: string;
  capabilities: DetailedModelCapability[];
  models: Record<string, string>;
  apiKey?: string;
}

// Model tag types
export interface ModelTag {
  name: string;
  description?: string;
  capabilities: string[];
}

// Provider metadata
export type ProviderMetadata = JSONObject;

// Provider options
export interface ThinkingConfig {
  type: 'enabled';
  budgetTokens: number;
}

// Make AnthropicProviderOptions compatible with JSONObject
export interface AnthropicProviderOptions {
  metadata?: JSONObject;
  thinking: {
    type: 'enabled';
    budgetTokens: number;
    [key: string]: any; // Add index signature to make compatible with JSONObject
  };
  [key: string]: any; // Add index signature to make compatible with JSONObject
}

// Model configuration for customProvider
export interface ModelConfig<T = any> {
  provider: string;
  modelId: string;
  tags?: string[];
  capabilities?: string[];
  settings?: JSONObject;
  middleware?: T;
}

// Capability metadata
export type CapabilityMetadata = {
  metadata?: JSONObject;
  type: string;
  version: string;
  features: string[];
};

// Tag metadata
export type TagMetadata = {
  metadata?: JSONObject;
  name: string;
  description?: string;
  capabilities: string[];
};

// Full provider metadata
export type FullProviderMetadata = {
  metadata?: JSONObject;
  capabilities?: CapabilityMetadata[];
  tags?: TagMetadata[];
};

// Generic model interface
export interface ModelInterface<Input, Output> {
  [key: string]: (input: Input) => Promise<Output>;
}

// Model type definitions
export type AudioModel = ModelInterface<Buffer, { text: string }>;
export type VideoModel = ModelInterface<string, { url: string }>;
export type VisionModel = ModelInterface<Buffer, { description: string }>;

// Model type mapping for registry
export interface ModelTypeDefinition {
  source: Function;
}

export interface ModelDefinitions {
  text: ModelTypeDefinition;
  embedding: ModelTypeDefinition;
  image: ModelTypeDefinition;
  audio: ModelTypeDefinition;
  video: ModelTypeDefinition;
  vision: ModelTypeDefinition;
  [key: string]: ModelTypeDefinition;
}

// Type mapping for model handlers
export type ModelTypeMapping<T extends ModelDefinitions> = {
  [K in keyof T]: T[K]['source'];
};