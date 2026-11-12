import { DataContext } from "@modules/challenges/models/datacontext";
import { Game } from "@modules/challenges/models/game";

export enum ChallengeDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export type ChallengeStatus =
  | 'IN_PROGRESS'
  | 'COMPLETED_FAILED'
  | 'COMPLETED_WON'
  | 'PENDING';

export interface DailyChallengeBase {
  id: string;
  difficulty: ChallengeDifficulty;
  game?: Game;
}

export interface DailyChallengeSummary {
  id: string;
  difficulty: ChallengeDifficulty;
  formulation: string;
  publicationDate: string;
  status: ChallengeStatus;
}

export interface DailyChallenge extends DailyChallengeBase {
  formulation: string;
  publicationDate: string;
  dataContext: DataContext;
}