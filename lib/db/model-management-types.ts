// This file contains only type definitions and default data
// No imports from server-only files to avoid client-side import issues

import { SQL, Placeholder } from "drizzle-orm";

// Types for model management
export type ModelProvider = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  apiConfigKey: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};
export type ModelCategory = {
  id: string;
  name: string;
  type: string; // Using string type to allow any category type dynamically
  description?: string;
  order: number;
  defaultProviderId?: string; // New field to store the default provider ID
  defaultModelId?: string;    // New field to store the default model ID
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to extract unique category types from DEFAULT_CATEGORIES
// This maintains a single source of truth and follows DRY principles
export function getKnownCategoryTypes(): string[] {
  return [...new Set(DEFAULT_CATEGORIES.map(category => category.type))];
}

export type AIModel = {
  id: string;
  providerId: string;
  categoryIds: string[];
  modelId: string;
  displayName: string;
  description?: string;
  contextLength?: number;
  capabilities: string[];
  isEnabled: boolean;
  isPrimary: boolean;
  pricing?: any;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  provider?: ModelProvider;
  categories?: ModelCategory[];
};

// Default categories for fallback
export const DEFAULT_CATEGORIES: ModelCategory[] = [
  { id: '550e8400-e29b-41d4-a716-446655441001', name: 'chat-model-quick', type: 'text', description: 'Get fast responses for simple questions and tasks', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441002', name: 'chat-model-complete', type: 'text', description: 'Receive comprehensive, detailed answers with nuance', order: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441003', name: 'chat-model-creative', type: 'text', description: 'Explore innovative ideas and imaginative solutions', order: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441004', name: 'title-model', type: 'text', description: 'Models for generating titles and short text', order: 4, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441005', name: 'artifact-model', type: 'text', description: 'Models for generating artifacts and content', order: 5, createdAt: new Date(), updatedAt: new Date() },
  // Embedding models
  { id: '550e8400-e29b-41d4-a716-446655441006', name: 'embed-model-small', type: 'embedding', description: 'Small, efficient embedding models', order: 6, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441007', name: 'embed-model-large', type: 'embedding', description: 'Large, more capable embedding models', order: 7, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441008', name: 'embed-model-reasoning', type: 'embedding', description: 'Embedding models optimized for reasoning and RAG', order: 8, createdAt: new Date(), updatedAt: new Date() },
  // Image models
  { id: '550e8400-e29b-41d4-a716-446655441009', name: 'small-model', type: 'image', description: 'Smaller image generation models', order: 9, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441010', name: 'large-model', type: 'image', description: 'Higher quality image generation models', order: 10, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441011', name: 'inpainting-model', type: 'image', description: 'Models for image inpainting', order: 11, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441012', name: 'real-time-model', type: 'image', description: 'Fast image generation models', order: 12, createdAt: new Date(), updatedAt: new Date() },
  // Audio models
  { id: '550e8400-e29b-41d4-a716-446655441013', name: 'transcription-model', type: 'audio', description: 'Models for audio transcription', order: 13, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441014', name: 'tts-model', type: 'audio', description: 'Models for text-to-speech conversion', order: 14, createdAt: new Date(), updatedAt: new Date() },
  // Video models
  { id: '550e8400-e29b-41d4-a716-446655441015', name: 'video-model', type: 'video', description: 'Models for video generation', order: 15, createdAt: new Date(), updatedAt: new Date() },
  // Code models
  { id: '550e8400-e29b-41d4-a716-446655441016', name: 'code-model-quick', type: 'code', description: 'Generate efficient code snippets and simple solutions quickly', order: 16, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441017', name: 'code-model-complete', type: 'code', description: 'Create comprehensive, well-documented, production-ready code', order: 17, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441023', name: 'code-model-creative', type: 'code', description: 'Discover innovative approaches and optimized solutions', order: 18, createdAt: new Date(), updatedAt: new Date() },
  // Vision models
  { id: '550e8400-e29b-41d4-a716-446655441018', name: 'vision-model-quick', type: 'vision', description: 'Get basic image understanding and quick descriptions', order: 19, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441019', name: 'vision-model-complete', type: 'vision', description: 'Receive detailed image analysis with comprehensive context', order: 20, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441024', name: 'vision-model-creative', type: 'vision', description: 'Explore insightful interpretations and creative perspectives', order: 21, createdAt: new Date(), updatedAt: new Date() },
  // JSON models
  { id: '550e8400-e29b-41d4-a716-446655441020', name: 'json-model-small', type: 'json', description: 'Models for structured JSON output (small)', order: 20, createdAt: new Date(), updatedAt: new Date() },
  { id: '550e8400-e29b-41d4-a716-446655441021', name: 'json-model-large', type: 'json', description: 'Models for structured JSON output (large)', order: 21, createdAt: new Date(), updatedAt: new Date() },
  // Logprobs models
  { id: '550e8400-e29b-41d4-a716-446655441022', name: 'logprobs-model', type: 'logprobs', description: 'Models that provide token logprobs for analysis', order: 22, createdAt: new Date(), updatedAt: new Date() }
];

// Default providers
export const DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000', // UUID for openai
    name: 'openai',
    description: 'OpenAI API provider',
    logoUrl: 'https://openai.com/favicon.ico',
    apiConfigKey: 'OPENAI_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001', // UUID for anthropic
    name: 'anthropic',
    description: 'Anthropic API provider',
    logoUrl: 'https://anthropic.com/favicon.ico',
    apiConfigKey: 'ANTHROPIC_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', // UUID for togetherai
    name: 'togetherai',
    description: 'Together AI provider',
    logoUrl: 'https://together.ai/favicon.ico',
    apiConfigKey: 'TOGETHERAI_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003', // UUID for cohere
    name: 'cohere',
    description: 'Cohere API provider',
    logoUrl: 'https://cohere.com/favicon.ico',
    apiConfigKey: 'COHERE_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004', // UUID for xai
    name: 'xai',
    description: 'xAI Grok provider',
    logoUrl: 'https://x.ai/favicon.ico',
    apiConfigKey: 'XAI_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005', // UUID for azure
    name: 'azure',
    description: 'Azure OpenAI provider',
    logoUrl: 'https://azure.microsoft.com/favicon.ico',
    apiConfigKey: 'AZURE_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006', // UUID for amazonbedrock
    name: 'amazonbedrock',
    description: 'Amazon Bedrock provider',
    logoUrl: 'https://aws.amazon.com/favicon.ico',
    apiConfigKey: 'AWS_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007', // UUID for googleai
    name: 'googleai',
    description: 'Google Generative AI provider',
    logoUrl: 'https://google.com/favicon.ico',
    apiConfigKey: 'GOOGLE_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008', // UUID for googlevertex
    name: 'googlevertex',
    description: 'Google Vertex AI provider',
    logoUrl: 'https://cloud.google.com/favicon.ico',
    apiConfigKey: 'GOOGLE_VERTEX_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009', // UUID for mistral
    name: 'mistral',
    description: 'Mistral AI provider',
    logoUrl: 'https://mistral.ai/favicon.ico',
    apiConfigKey: 'MISTRAL_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010', // UUID for fireworks
    name: 'fireworks',
    description: 'Fireworks AI provider',
    logoUrl: 'https://fireworks.ai/favicon.ico',
    apiConfigKey: 'FIREWORKS_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011', // UUID for deepinfra
    name: 'deepinfra',
    description: 'DeepInfra provider',
    logoUrl: 'https://deepinfra.com/favicon.ico',
    apiConfigKey: 'DEEPINFRA_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012', // UUID for deepseek
    name: 'deepseek',
    description: 'DeepSeek provider',
    logoUrl: 'https://deepseek.com/favicon.ico',
    apiConfigKey: 'DEEPSEEK_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013', // UUID for cerebras
    name: 'cerebras',
    description: 'Cerebras provider',
    logoUrl: 'https://cerebras.net/favicon.ico',
    apiConfigKey: 'CEREBRAS_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014', // UUID for groq
    name: 'groq',
    description: 'Groq provider',
    logoUrl: 'https://groq.com/favicon.ico',
    apiConfigKey: 'GROQ_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015', // UUID for perplexity
    name: 'perplexity',
    description: 'Perplexity provider',
    logoUrl: 'https://perplexity.ai/favicon.ico',
    apiConfigKey: 'PERPLEXITY_API_KEY',
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Default AI models
export const DEFAULT_MODELS: AIModel[] = [
  // OpenAI additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442042',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'o1',
    displayName: 'o1',
    description: 'OpenAI\'s most advanced model with vision capabilities',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442052',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'o3-mini',
    displayName: 'o3-mini',
    description: 'OpenAI\'s efficient language model for quick responses',
    contextLength: 16000,
    capabilities: ['chat', 'text-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // xAI additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442045',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'grok-beta',
    displayName: 'Grok Beta',
    description: 'xAI\'s beta version of Grok',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442046',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-complete
    modelId: 'grok-vision-beta',
    displayName: 'Grok Vision Beta',
    description: 'xAI\'s beta version of Grok with vision capabilities',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442053',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'grok-2-1212',
    displayName: 'Grok 2',
    description: 'xAI\'s advanced language model with object generation and tool capabilities',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442054',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'grok-2-vision-1212',
    displayName: 'Grok 2 Vision',
    description: 'xAI\'s vision-enabled language model with object generation and tool capabilities',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Anthropic additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442047',
    providerId: '550e8400-e29b-41d4-a716-446655440001', // anthropic UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet (Oct 2024)',
    description: 'Anthropic\'s Claude 3.5 Sonnet model with vision capabilities',
    contextLength: 200000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442048',
    providerId: '550e8400-e29b-41d4-a716-446655440001', // anthropic UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655441018'], // chat-model-quick, vision-model-quick
    modelId: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku (Oct 2024)',
    description: 'Anthropic\'s Claude 3.5 Haiku model with vision capabilities',
    contextLength: 200000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442055',
    providerId: '550e8400-e29b-41d4-a716-446655440001', // anthropic UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'claude-3-7-sonnet-20250219',
    displayName: 'Claude 3.7 Sonnet (Feb 2025)',
    description: 'Anthropic\'s most advanced Claude model with vision capabilities',
    contextLength: 200000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442056',
    providerId: '550e8400-e29b-41d4-a716-446655440001', // anthropic UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'claude-3-5-sonnet-20240620',
    displayName: 'Claude 3.5 Sonnet (Jun 2024)',
    description: 'Anthropic\'s Claude 3.5 Sonnet model from June 2024 with vision capabilities',
    contextLength: 200000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Mistral additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442049',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-complete
    modelId: 'pixtral-12b-2409',
    displayName: 'Pixtral 12B',
    description: 'Mistral\'s 12B parameter vision-enabled language model',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442057',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-complete
    modelId: 'pixtral-large-latest',
    displayName: 'Pixtral Large',
    description: 'Mistral\'s large vision-enabled language model',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442058',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'mistral-large-latest',
    displayName: 'Mistral Large',
    description: 'Mistral\'s large language model',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442059',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'mistral-small-latest',
    displayName: 'Mistral Small',
    description: 'Mistral\'s small language model for quick responses',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Google Generative AI additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442050',
    providerId: '550e8400-e29b-41d4-a716-446655440007', // googleai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash Experimental',
    description: 'Google\'s experimental fast multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442060',
    providerId: '550e8400-e29b-41d4-a716-446655440007', // googleai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Google\'s fast multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442061',
    providerId: '550e8400-e29b-41d4-a716-446655440007', // googleai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Google\'s advanced multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Google Vertex AI additional models
  {
    id: '550e8400-e29b-41d4-a716-446655442051',
    providerId: '550e8400-e29b-41d4-a716-446655440008', // googlevertex UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash Experimental (Vertex)',
    description: 'Google Vertex AI\'s experimental fast multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442062',
    providerId: '550e8400-e29b-41d4-a716-446655440008', // googlevertex UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash (Vertex)',
    description: 'Google Vertex AI\'s fast multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442063',
    providerId: '550e8400-e29b-41d4-a716-446655440008', // googlevertex UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002', '550e8400-e29b-41d4-a716-446655441019'], // chat-model-complete, vision-model-complete
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro (Vertex)',
    description: 'Google Vertex AI\'s advanced multimodal model with full capabilities',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Additional embedding models
  {
    id: '550e8400-e29b-41d4-a716-446655442001',
    providerId: '550e8400-e29b-41d4-a716-446655440003', // cohere
    categoryIds: ['550e8400-e29b-41d4-a716-446655441006'], // embed-model-small
    modelId: 'embed-english-light-v3.0',
    displayName: 'Embed English Light v3.0',
    description: 'Small, efficient embedding model',
    capabilities: ['text-embedding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442002',
    providerId: '550e8400-e29b-41d4-a716-446655440003', // cohere UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441007'], // embed-model-large
    modelId: 'embed-english-v3.0',
    displayName: 'Embed English v3.0',
    description: 'Large, high-quality embedding model',
    capabilities: ['text-embedding', 'high-dimensional'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442003',
    providerId: '550e8400-e29b-41d4-a716-446655440003', // cohere UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441008'], // embed-model-reasoning
    modelId: 'embed-multilingual-v3.0',
    displayName: 'Embed Multilingual v3.0',
    description: 'Embedding model optimized for multilingual and reasoning tasks',
    capabilities: ['text-embedding', 'reasoning-enhanced', 'multilingual'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442005',
    providerId: '550e8400-e29b-41d4-a716-446655440001', // anthropic UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-large
    modelId: 'claude-3-7-sonnet-20250219-chat',
    displayName: 'claude-3-7-sonnet-20250219', // Use actual model name
    description: 'High-capability language model for complex tasks (Large category)',
    contextLength: 200000,
    capabilities: ['chat', 'text-generation', 'reasoning'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Image models
  {
    id: '550e8400-e29b-41d4-a716-446655442006',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441009'], // small-model
    modelId: 'dall-e-2',
    displayName: 'DALL-E 2',
    description: 'Fast image generation model (Small category)',
    capabilities: ['image-generation'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442007',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441010'], // large-model
    modelId: 'dall-e-3',
    displayName: 'DALL-E 3',
    description: 'High-quality image generation model (Large category)',
    capabilities: ['image-generation', 'high-resolution'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442020',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441010'], // large-model
    modelId: 'flux-free',
    displayName: 'Flux Free',
    description: 'High-quality image generation model from TogetherAI',
    capabilities: ['image-generation', 'high-resolution'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Audio models
  {
    id: '550e8400-e29b-41d4-a716-446655442008',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441013'], // transcription-model
    modelId: 'whisper-1',
    displayName: 'whisper-1', // Use actual model name
    description: 'Converts speech to text with high accuracy (Transcription category)',
    capabilities: ['transcription', 'translation'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Video models
  {
    id: '550e8400-e29b-41d4-a716-446655442009',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441015'], // video-model
    modelId: 'flux',
    displayName: 'Flux', // TogetherAI model
    description: 'Generates videos from text descriptions (Video category)',
    capabilities: ['video-generation'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Code models - Using existing models for code tasks
  // Title model
  {
    id: '550e8400-e29b-41d4-a716-446655442012',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441004'], // title-model
    modelId: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    description: 'Model for generating titles and short text',
    contextLength: 128000,
    capabilities: ['text-generation', 'summarization'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Artifact model
  {
    id: '550e8400-e29b-41d4-a716-446655442013',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441005'], // artifact-model
    modelId: 'gpt-4o-mini-artifact',
    displayName: 'GPT-4o Mini',
    description: 'Model for generating artifacts and content',
    contextLength: 16000,
    capabilities: ['text-generation', 'content-creation'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Vision models
  {
    id: '550e8400-e29b-41d4-a716-446655442014',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441018'], // vision-model-small
    modelId: 'gpt-4o-mini-vision',
    displayName: 'GPT-4o Mini Vision',
    description: 'Efficient model for image understanding and analysis',
    contextLength: 16000,
    capabilities: ['image-understanding', 'image-description'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442015',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-large
    modelId: 'gpt-4o-vision',
    displayName: 'GPT-4o Vision',
    description: 'Advanced model for image understanding and analysis',
    contextLength: 128000,
    capabilities: ['image-understanding', 'image-description', 'image-analysis'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // JSON models
  {
    id: '550e8400-e29b-41d4-a716-446655442016',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441020'], // json-model-small
    modelId: 'meta-llama/Llama-3-8b-instruct',
    displayName: 'Llama 3 8B',
    description: 'Efficient model for structured JSON output',
    contextLength: 8192,
    capabilities: ['json-output', 'structured-data'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442017',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441021'], // json-model-large
    modelId: 'meta-llama/Llama-3-70b-instruct',
    displayName: 'Llama 3 70B',
    description: 'Advanced model for structured JSON output',
    contextLength: 8192,
    capabilities: ['json-output', 'structured-data', 'complex-schemas'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442019',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441021'], // json-model-large
    modelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct',
    displayName: 'Llama 3.3',
    description: 'Best model for structured JSON output',
    contextLength: 128000,
    capabilities: ['json-output', 'structured-data', 'complex-schemas'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Logprobs model
  {
    id: '550e8400-e29b-41d4-a716-446655442018',
    providerId: '550e8400-e29b-41d4-a716-446655440000', // openai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441022'], // logprobs-model
    modelId: 'gpt-4o-logprobs',
    displayName: 'GPT-4o with Logprobs',
    description: 'Model that provides token logprobs for analysis',
    contextLength: 128000,
    capabilities: ['logprobs', 'token-analysis'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Cohere chat models
  {
    id: '550e8400-e29b-41d4-a716-446655442021',
    providerId: '550e8400-e29b-41d4-a716-446655440003', // cohere UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'command-r-plus',
    displayName: 'Command R+',
    description: 'Cohere\'s most capable model for complex reasoning and generation',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Creative model (TogetherAI DeepSeek)
  {
    id: '550e8400-e29b-41d4-a716-446655442023',
    providerId: '550e8400-e29b-41d4-a716-446655440002', // togetherai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441003'], // chat-model-creative
    modelId: 'deepseek-ai/DeepSeek-R1',
    displayName: 'DeepSeek R1',
    description: 'Innovative model for creative solutions and imaginative ideas',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'creativity'],
    isEnabled: true,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // xAI models
  {
    id: '550e8400-e29b-41d4-a716-446655442024',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'grok-2-1212',
    displayName: 'Grok 2',
    description: 'xAI\'s advanced language model with reasoning capabilities',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'reasoning'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442025',
    providerId: '550e8400-e29b-41d4-a716-446655440004', // xai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-complete
    modelId: 'grok-2-vision-1212',
    displayName: 'Grok 2 Vision',
    description: 'xAI\'s vision-enabled language model',
    contextLength: 128000,
    capabilities: ['chat', 'text-generation', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Mistral models
  {
    id: '550e8400-e29b-41d4-a716-446655442026',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'mistral-large-latest',
    displayName: 'Mistral Large',
    description: 'Mistral\'s large language model for complex tasks',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'reasoning'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442027',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'mistral-small-latest',
    displayName: 'Mistral Small',
    description: 'Mistral\'s efficient language model for quick responses',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442028',
    providerId: '550e8400-e29b-41d4-a716-446655440009', // mistral UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441019'], // vision-model-complete
    modelId: 'pixtral-large-latest',
    displayName: 'Pixtral Large',
    description: 'Mistral\'s vision-enabled language model',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Google AI models
  {
    id: '550e8400-e29b-41d4-a716-446655442029',
    providerId: '550e8400-e29b-41d4-a716-446655440007', // googleai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Google\'s advanced multimodal model',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442030',
    providerId: '550e8400-e29b-41d4-a716-446655440007', // googleai UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Google\'s fast multimodal model',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Google Vertex AI models
  {
    id: '550e8400-e29b-41d4-a716-446655442031',
    providerId: '550e8400-e29b-41d4-a716-446655440008', // googlevertex UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro (Vertex)',
    description: 'Google Vertex AI\'s advanced multimodal model',
    contextLength: 1000000,
    capabilities: ['chat', 'text-generation', 'reasoning', 'image-understanding'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // DeepSeek models
  {
    id: '550e8400-e29b-41d4-a716-446655442032',
    providerId: '550e8400-e29b-41d4-a716-446655440012', // deepseek UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    description: 'DeepSeek\'s conversational language model with object generation and tool capabilities',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442033',
    providerId: '550e8400-e29b-41d4-a716-446655440012', // deepseek UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441003'], // chat-model-creative
    modelId: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner',
    description: 'DeepSeek\'s reasoning-focused language model',
    contextLength: 32000,
    capabilities: ['chat', 'text-generation', 'reasoning'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Cerebras models
  {
    id: '550e8400-e29b-41d4-a716-446655442034',
    providerId: '550e8400-e29b-41d4-a716-446655440013', // cerebras UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'llama3.1-8b',
    displayName: 'Llama 3.1 8B',
    description: 'Cerebras\' efficient language model with object generation and tool capabilities',
    contextLength: 8192,
    capabilities: ['chat', 'text-generation', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442035',
    providerId: '550e8400-e29b-41d4-a716-446655440013', // cerebras UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'llama3.1-70b',
    displayName: 'Llama 3.1 70B',
    description: 'Cerebras\' advanced language model with object generation and tool capabilities',
    contextLength: 8192,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442036',
    providerId: '550e8400-e29b-41d4-a716-446655440013', // cerebras UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441003'], // chat-model-creative
    modelId: 'llama3.3-70b',
    displayName: 'Llama 3.3 70B',
    description: 'Cerebras\' latest advanced language model with object generation and tool capabilities',
    contextLength: 8192,
    capabilities: ['chat', 'text-generation', 'reasoning', 'creativity', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Groq models
  {
    id: '550e8400-e29b-41d4-a716-446655442037',
    providerId: '550e8400-e29b-41d4-a716-446655440014', // groq UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B Versatile',
    description: 'Groq\'s high-performance language model with object generation and tool capabilities',
    contextLength: 32768,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442038',
    providerId: '550e8400-e29b-41d4-a716-446655440014', // groq UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant',
    description: 'Groq\'s fast language model with object generation and tool capabilities',
    contextLength: 32768,
    capabilities: ['chat', 'text-generation', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442039',
    providerId: '550e8400-e29b-41d4-a716-446655440014', // groq UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'mixtral-8x7b-32768',
    displayName: 'Mixtral 8x7B',
    description: 'Groq\'s mixture of experts language model with object generation and tool capabilities',
    contextLength: 32768,
    capabilities: ['chat', 'text-generation', 'reasoning', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655442040',
    providerId: '550e8400-e29b-41d4-a716-446655440014', // groq UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441001'], // chat-model-quick
    modelId: 'gemma2-9b-it',
    displayName: 'Gemma 2 9B',
    description: 'Groq\'s efficient language model with object generation and tool capabilities',
    contextLength: 8192,
    capabilities: ['chat', 'text-generation', 'object-generation', 'tool-usage', 'tool-streaming'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Perplexity models
  {
    id: '550e8400-e29b-41d4-a716-446655442041',
    providerId: '550e8400-e29b-41d4-a716-446655440015', // perplexity UUID
    categoryIds: ['550e8400-e29b-41d4-a716-446655441002'], // chat-model-complete
    modelId: 'pplx-7b-online',
    displayName: 'Perplexity 7B Online',
    description: 'Perplexity\'s online-aware language model',
    contextLength: 4096,
    capabilities: ['chat', 'text-generation', 'online-search'],
    isEnabled: true,
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];