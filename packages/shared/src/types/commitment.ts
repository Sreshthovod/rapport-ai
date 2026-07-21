export type CommitmentStatus = 'pending' | 'fulfilled' | 'dismissed';
export type CommitmentType = 'user_promised' | 'contact_promised';

export interface Commitment {
  id: string;
  contactId: string;
  conversationId: string;
  text: string;
  type: CommitmentType;
  status: CommitmentStatus;
  dueDate?: number;
  createdAt: number;
}
