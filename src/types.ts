export type QuestionStatus = "open" | "sealed";
export type VoteChoice = "yes" | "no";

export interface Question {
  id: string;
  owner_id: string;
  slug: string;
  question_text: string;
  response_limit: number;
  status: QuestionStatus;
  visit_count: number;
  view_count: number;
  created_at: string;
  sealed_at: string | null;
  results_email_sent_at: string | null;
}

export interface MachineSign {
  id: string;
  owner_id: string;
  question_text: string;
  answer: VoteChoice;
  created_at: string;
}

export interface VoteRow {
  id: string;
  question_id: string;
  choice: VoteChoice;
  created_at: string;
}

export interface MessageRow {
  id: string;
  question_id: string;
  body: string;
  created_at: string;
}

export interface PublicQuestionPayload {
  found: boolean;
  expired?: boolean;
  canRespond?: boolean;
  alreadyClaimed?: boolean;
  remainingSlots?: number;
  ownerName?: string;
  question?: {
    id: string;
    slug: string;
    questionText: string;
    responseLimit: number;
    visitCount: number;
    viewCount: number;
    status: QuestionStatus;
    sealedAt: string | null;
  };
}

export interface PublicMessagesPayload {
  found: boolean;
  expired?: boolean;
  messages?: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
}
