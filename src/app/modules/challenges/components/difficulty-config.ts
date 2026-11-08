import {
  LucideFaceNeutral,
  LucideFaceSlightlyFrowning,
  LucideFaceSlightlySmiling,
  LucideIcon,
} from '@lucide/angular';
import { ChallengeDifficulty } from '@modules/challenges/models/challenge';

export type DifficultyOption = {
  labelKey: string;
  difficulty: ChallengeDifficulty;
  className: string;
  icon: LucideIcon;
};

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    labelKey: 'difficulties.easy',
    difficulty: 'EASY',
    className: 'difficulty-button--easy',
    icon: LucideFaceSlightlySmiling,
  },
  {
    labelKey: 'difficulties.medium',
    difficulty: 'MEDIUM',
    className: 'difficulty-button--medium',
    icon: LucideFaceNeutral,
  },
  {
    labelKey: 'difficulties.hard',
    difficulty: 'HARD',
    className: 'difficulty-button--hard',
    icon: LucideFaceSlightlyFrowning,
  },
];

const DIFFICULTY_OPTIONS_BY_DIFFICULTY: Record<ChallengeDifficulty, DifficultyOption> = {
  EASY: DIFFICULTY_OPTIONS[0],
  MEDIUM: DIFFICULTY_OPTIONS[1],
  HARD: DIFFICULTY_OPTIONS[2],
};

export function difficultyOptionFor(
  difficulty: ChallengeDifficulty,
): DifficultyOption {
  return DIFFICULTY_OPTIONS_BY_DIFFICULTY[difficulty];
}
