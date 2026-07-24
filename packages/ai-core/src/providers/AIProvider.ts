import { AIRequest, ProviderCapabilities, ProviderResult } from '@rapport/shared';

export interface ModelDescription {
  id: string;
  displayName: string;
  speed: string;
  reasoning: string;
  useCase: string;
  contextLength?: string;
  isRecommended?: boolean;
  isDefault?: boolean;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  generateReply(request: AIRequest, options?: { signal?: AbortSignal }): Promise<ProviderResult>;
  validateKey?(apiKey: string): Promise<boolean>;
  generateReplyStream?(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult>;

  // Decoupled dynamic models API
  verifyKey(apiKey: string): Promise<boolean>;
  listModels(): Promise<ModelDescription[]>;
  refreshModels(): Promise<ModelDescription[]>;
  selectModel(modelId: string): Promise<void>;
  generate(request: AIRequest, options?: { signal?: AbortSignal }): Promise<ProviderResult>;
}
