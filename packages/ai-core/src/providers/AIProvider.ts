import { AIRequest, ProviderCapabilities, ProviderResult } from '@rapport/shared';

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  generateReply(request: AIRequest): Promise<ProviderResult>;
}
