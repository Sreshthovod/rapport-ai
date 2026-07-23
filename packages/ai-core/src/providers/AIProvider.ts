import { AIRequest, ProviderCapabilities, ProviderResult } from '@rapport/shared';

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
}
