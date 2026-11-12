export interface DataContext {
    name: string;
    description: string;
    schema: Schema;
    dataset: Dataset;
}

export interface Schema {
    tables: SchemaTable[];
}

export interface Dataset {
    tables: DataContextTable[];
}

export interface SchemaTable {
    name: string;
    columns: Column[];
}

export interface Column {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    position: number;
}

export interface DataContextTable {
    name: string;
    columns: string[];
    rows: string[][];
}