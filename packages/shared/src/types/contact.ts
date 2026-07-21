export type SupportedPlatform = 'slack' | 'whatsapp';

export interface Contact {
  id: string;
  platform: SupportedPlatform;
  platformUserId: string;
  name: string;
  avatarUrl?: string;
  styleTags: string[];
  formalityScore: number;
  brevityPreference: 'concise' | 'detailed';
  createdAt: number;
  updatedAt: number;
}
