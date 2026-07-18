export type TeamChoice = "argentina" | "spain";

export interface CurrentUser {
  id: string;
  uid: string;
  maskedUid: string;
  hasPrediction: boolean;
  submittedAt: string | null;
}

export interface ContestSettings {
  title: string;
  homeTeam: string;
  awayTeam: string;
  submissionClosesAt: string;
  predictionsOpen: boolean;
  acceptingPredictions: boolean;
}

export interface Prediction {
  winner: TeamChoice;
  argentinaScore: number;
  spainScore: number;
  messiScores: boolean;
  submittedAt: string;
}

export interface TimelineEntry extends Prediction {
  order: number;
  maskedUid: string;
}

export interface TimelinePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ContestResult {
  winner: TeamChoice;
  argentinaScore: number;
  spainScore: number;
  messiScores: boolean;
  publishedAt: string;
}

export interface ContestStats {
  participants: number;
  predictions: number;
}

export interface ContestData {
  settings: ContestSettings;
  result: ContestResult | null;
  stats: ContestStats;
}

export interface PredictionData {
  prediction: Prediction | null;
  timeline: TimelineEntry[];
  timelinePagination: TimelinePagination;
}

export interface LeaderboardEntry {
  rank: number;
  maskedUid: string;
  points: number;
  correctAnswers: number;
  submittedAt: string;
}

export interface LeaderboardData {
  published: boolean;
  result: ContestResult | null;
  entries: LeaderboardEntry[];
}

export interface AdminInviteCode {
  id: string;
  codeHint: string;
  status: string;
  claimCount: number;
  lastClaimedAt: string | null;
  createdAt: string;
}

export interface AdminParticipant {
  id: string;
  uid: string;
  maskedUid: string;
  codeHint: string;
  status: string;
  createdAt: string;
  prediction: Prediction | null;
}

export interface AdminParticipantPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
}

export interface AdminContestData extends ContestData {
  draftResult: (Omit<ContestResult, "publishedAt"> & { isPublished: boolean }) | null;
  inviteCodes: AdminInviteCode[];
  participants: AdminParticipant[];
  participantPagination: AdminParticipantPagination;
}
