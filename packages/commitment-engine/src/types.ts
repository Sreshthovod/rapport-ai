export type CommitmentStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface CommitmentItem {
  id: string;
  contactId: string;
  messageId: string;
  text: string;
  action: string;
  deadline?: string;
  status: CommitmentStatus;
  createdAt: number;
}
