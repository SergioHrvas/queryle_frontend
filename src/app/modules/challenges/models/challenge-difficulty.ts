export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DailyChallenge {
  id: string;
  difficulty: ChallengeDifficulty;
}