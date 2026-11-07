export type ButtonVariant = 'primary' | 'easy' | 'medium' | 'hard';

type DifficultyOption = {
    labelKey: string;
    variant: ButtonVariant;
};

export class DifficultySelector {
    protected readonly difficultyOptions: DifficultyOption[] = [
        { labelKey: 'difficulties.easy', variant: 'easy' },
        { labelKey: 'difficulties.medium', variant: 'medium' },
        { labelKey: 'difficulties.hard', variant: 'hard' },
    ];
}