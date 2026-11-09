export interface Game {
    id: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    attempts: Attempt[];
}

export enum AttemptResult {
    NONE = 'NONE',
    PARTIAL = 'PARTIAL',
    EXACT = 'EXACT'
}

export interface Attempt {
    id: string;
    query: string;
    columnsNamesMatchLevel: AttemptResult;
    columnsCountMatchLevel: AttemptResult;
    rowsCountMatchLevel: AttemptResult;
    rowsDataMatchLevel: AttemptResult;
    rowsOrderMatchLevel: AttemptResult;
    submittedAt: string;
}