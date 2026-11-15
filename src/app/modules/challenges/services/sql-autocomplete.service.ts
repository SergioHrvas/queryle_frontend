import { Injectable } from '@angular/core';

export interface SqlAutocompleteResult {
  suggestions: string[];
  start: number;
  end: number;
}

export interface SqlTableReference {
  name: string;
  alias: string;
}

export type SqlAutocompleteContext = 'TABLE' | 'COLUMN' | 'KEYWORD' | 'FUNCTION' | 'UNKNOWN';

interface SqlColumn {
  name: string;
}

interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

interface SqlSchema {
  tables: SqlTable[];
}

export type SqlClause =
  | 'SELECT'
  | 'FROM'
  | 'WHERE'
  | 'GROUP BY'
  | 'ORDER BY'
  | 'HAVING'
  | 'JOIN'
  | 'ON'
  | 'LIMIT'
  | 'OFFSET'
  | 'UNKNOWN';

@Injectable({
  providedIn: 'root',
})
export class SqlAutocompleteService {
  private readonly keywords = [
    'SELECT',
    'DISTINCT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'NOT',
    'IN',
    'LIKE',
    'BETWEEN',
    'IS NULL',
    'IS NOT NULL',
    'AS',
    'JOIN',
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'ON',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'ASC',
    'DESC',
    'LIMIT',
    'OFFSET',
  ];

  private readonly functions = [
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'ROUND',
    'UPPER',
    'LOWER',
    'LENGTH',
    'COALESCE',
    'COUNT(*)',
  ];

  getSuggestions(query: string, cursorPosition: number, schema: SqlSchema): SqlAutocompleteResult {
    const prefix = query.substring(0, cursorPosition);
    const token = this.getCurrentToken(prefix);

    if (!token) {
      return {
        suggestions: [],
        start: cursorPosition,
        end: cursorPosition,
      };
    }

    const clause = this.getCurrentClause(prefix);
    const context = this.getAutocompleteContext(clause);

    const tableReferences = this.getTableReferences(query, schema);

    const suggestions = this.getContextSuggestions(context, token.word, tableReferences, schema);

    return {
      suggestions: this.filterSuggestions(suggestions, token.word),
      start: token.start,
      end: cursorPosition,
    };
  }

  private getAutocompleteContext(clause: SqlClause): SqlAutocompleteContext {
    switch (clause) {
      case 'FROM':
      case 'JOIN':
        return 'TABLE';

      case 'SELECT':
      case 'WHERE':
      case 'ON':
      case 'GROUP BY':
      case 'HAVING':
      case 'ORDER BY':
        return 'COLUMN';

      default:
        return 'UNKNOWN';
    }
  }
  private getContextSuggestions(
    context: SqlAutocompleteContext,
    currentWord: string,
    tableReferences: SqlTableReference[],
    schema: SqlSchema,
  ): string[] {
    // Si el usuario ha escrito un alias o nombre de tabla seguido de un punto.
    // Ejemplo: A. -> ID, NOMBRE, FECHA...
    const qualifier = currentWord.includes('.') ? currentWord.split('.')[0] : null;

    if (qualifier) {
      const reference = tableReferences.find(
        (table) =>
          table.alias.toLowerCase() === qualifier.toLowerCase() ||
          table.name.toLowerCase() === qualifier.toLowerCase(),
      );

      if (!reference) {
        return [];
      }

      const table = this.findTable(reference.name, schema);

      return table?.columns.map((column) => column.name) ?? [];
    }

    const columns = this.getAvailableColumns(tableReferences, schema);
    const tables = schema.tables.map((table) => table.name);

    switch (context) {
      case 'TABLE':
        return tables;

      case 'COLUMN':
        return [...columns, ...this.functions];

      case 'KEYWORD':
        return this.keywords;

      case 'FUNCTION':
        return this.functions;

      case 'UNKNOWN':
      default:
        return [...columns, ...this.functions, ...tables, ...this.keywords];
    }
  }

  private getCurrentToken(
    prefix: string,
  ): { word: string; qualifier: string | null; start: number } | null {
    // Detecta tanto "nombre" como "alias.nombre" y "alias."
    const match = prefix.match(/(?:(\w+)\.)?(\w*)$/);
    if (!match) {
      return null;
    }

    const word = match[2];
    const qualifier = match[1] ?? null;

    // Evitamos mostrar sugerencias cuando no hay texto que completar,
    // salvo que se haya escrito un alias seguido de un punto.
    if (!word && !qualifier && !/\s$/.test(prefix)) {
      return null;
    }

    return {
      word,
      qualifier,
      start: prefix.length - word.length,
    };
  }
  private getCurrentClause(prefix: string): SqlClause {
    const sanitized = this.sanitizeQuery(prefix);

    const clauses: { clause: SqlClause; pattern: RegExp }[] = [
      { clause: 'SELECT', pattern: /\bSELECT\b/gi },
      { clause: 'FROM', pattern: /\bFROM\b/gi },
      { clause: 'JOIN', pattern: /\bJOIN\b/gi },
      { clause: 'ON', pattern: /\bON\b/gi },
      { clause: 'WHERE', pattern: /\bWHERE\b/gi },
      { clause: 'GROUP BY', pattern: /\bGROUP\s+BY\b/gi },
      { clause: 'HAVING', pattern: /\bHAVING\b/gi },
      { clause: 'ORDER BY', pattern: /\bORDER\s+BY\b/gi },
      { clause: 'LIMIT', pattern: /\bLIMIT\b/gi },
      { clause: 'OFFSET', pattern: /\bOFFSET\b/gi },
    ];

    let latestClause: SqlClause = 'UNKNOWN';
    let latestIndex = -1;

    for (const { clause, pattern } of clauses) {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(sanitized)) !== null) {
        if (match.index > latestIndex) {
          latestIndex = match.index;
          latestClause = clause;
        }
      }
    }

    return latestClause;
  }

  private getTableReferences(query: string, schema: SqlSchema): SqlTableReference[] {
    const sanitized = this.sanitizeQuery(query);

    const reservedWords = [
      ...this.keywords,
      'ON',
      'UNION',
      'EXCEPT',
      'INTERSECT',
      'INNER',
      'LEFT',
      'RIGHT',
      'FULL',
      'CROSS',
    ];

    const reservedPattern = reservedWords
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const regex = new RegExp(
      `\\b(?:FROM|JOIN)\\s+([a-zA-Z_]\\w*)(?:\\s+(?:AS\\s+)?((?!(?:${reservedPattern})\\b)[a-zA-Z_]\\w*))?`,
      'gi',
    );
    const references: SqlTableReference[] = [];

    let match: RegExpExecArray | null;

    while ((match = regex.exec(sanitized)) !== null) {
      const tableName = match[1];

      if (!this.findTable(tableName, schema)) {
        continue;
      }

      // Si no hay alias, utilizamos el propio nombre de la tabla.
      const alias = match[2] ?? tableName;

      references.push({
        name: tableName,
        alias,
      });
    }

    return references;
  }

  private getAvailableColumns(references: SqlTableReference[], schema: SqlSchema): string[] {
    return references.flatMap((reference) => {
      const table = this.findTable(reference.name, schema);

      return table?.columns.map((column) => `${reference.alias}.${column.name}`) ?? [];
    });
  }

  private findTable(name: string, schema: SqlSchema): SqlTable | undefined {
    return schema.tables.find((table) => table.name.toLowerCase() === name.toLowerCase());
  }

  private filterSuggestions(suggestions: string[], currentWord: string): string[] {
    return [...new Set(suggestions)].filter((suggestion) =>
      suggestion.toLowerCase().startsWith(currentWord.toLowerCase()),
    );
  }

  private lastIndexOfKeyword(query: string, keyword: string): number {
    const regex = new RegExp(`\\b${keyword.replace(' ', '\\s+')}\\b`, 'gi');

    let lastIndex = -1;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(query)) !== null) {
      lastIndex = match.index;
    }

    return lastIndex;
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/--.*$/gm, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/'(?:''|[^'])*'/g, ' ')
      .replace(/"(?:[^"]|"")*"/g, ' ');
  }

  private emptyResult(cursorPosition: number): SqlAutocompleteResult {
    return {
      suggestions: [],
      start: cursorPosition,
      end: cursorPosition,
    };
  }
}
