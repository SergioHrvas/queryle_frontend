import { DataContext } from "@modules/challenges/models/datacontext";
import { Game } from "@modules/challenges/models/game";

export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DailyChallengeBase {
  id: string;
  difficulty: ChallengeDifficulty;
  game?: Game;
}

export interface DailyChallenge extends DailyChallengeBase {
  formulation: string;
  publicationDate: string;
  dataContext: DataContext;
}