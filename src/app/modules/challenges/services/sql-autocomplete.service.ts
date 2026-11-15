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

export type SqlAutocompleteContext = 'TABLE' | 'COLUMN' | 'KEYWORD';

export interface SqlColumn {
  name: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

export interface SqlSchema {
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

interface SqlToken {
  word: string;
  qualifier: string | null;
  start: number;
}

const JOINS = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'];
const CONDITIONS = ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];

@Injectable({
  providedIn: 'root',
})
export class SqlAutocompleteService {
  /** Keywords que tienen sentido mientras el cursor está dentro de cada cláusula. */
  private readonly clauseKeywords: Record<SqlClause, string[]> = {
    UNKNOWN: ['SELECT'],
    SELECT: ['DISTINCT', 'AS', 'FROM'],
    FROM: ['AS', ...JOINS, 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'],
    JOIN: ['AS', 'ON'],
    ON: [...CONDITIONS, ...JOINS, 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT'],
    WHERE: [...CONDITIONS, 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'],
    'GROUP BY': ['HAVING', 'ORDER BY', 'LIMIT'],
    HAVING: [...CONDITIONS, 'ORDER BY', 'LIMIT'],
    'ORDER BY': ['ASC', 'DESC', 'LIMIT', 'OFFSET'],
    LIMIT: ['OFFSET'],
    OFFSET: [],
  };

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

  /** Palabras sueltas que nunca pueden ser un alias de tabla. */
  private readonly reservedWords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'OUTER',
    'ON', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'EXCEPT', 'INTERSECT',
    'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS',
  ];

  private readonly tableReferenceRegex = new RegExp(
    `\\b(?:FROM|JOIN)\\s+([a-zA-Z_]\\w*)` +
      `(?:\\s+(?:AS\\s+)?((?!(?:${this.reservedWords.join('|')})\\b)[a-zA-Z_]\\w*))?`,
    'gi',
  );

  getSuggestions(query: string, cursorPosition: number, schema: SqlSchema): SqlAutocompleteResult {
    const prefix = query.substring(0, cursorPosition);
    const token = this.getCurrentToken(prefix);

    if (!token) {
      return this.emptyResult(cursorPosition);
    }

    const clause = this.getCurrentClause(prefix);
    const context = this.getAutocompleteContext(clause);
    const tableReferences = this.getTableReferences(query, schema);
    const textBeforeToken = prefix.substring(0, token.start);

    const suggestions = this.getContextSuggestions(
      context,
      clause,
      token,
      textBeforeToken,
      tableReferences,
      schema,
    );

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
        return 'KEYWORD';
    }
  }

  private getContextSuggestions(
    context: SqlAutocompleteContext,
    clause: SqlClause,
    token: SqlToken,
    textBeforeToken: string,
    tableReferences: SqlTableReference[],
    schema: SqlSchema,
  ): string[] {
    // alias. -> solo columnas de esa tabla
    if (token.qualifier) {
      return this.getColumnsOfQualifier(token.qualifier, tableReferences, schema);
    }

    const keywords = this.clauseKeywords[clause];

    switch (context) {
        case 'TABLE': {
        if (this.expectsTableName(textBeforeToken)) {
            return schema.tables.map((table) => table.name);
        }

        return this.isRightAfterTableName(textBeforeToken)
            ? keywords
            : keywords.filter((keyword) => keyword !== 'AS');
        }
      case 'COLUMN':
        return [...this.getAvailableColumns(tableReferences, schema), ...this.functions, ...keywords];

      case 'KEYWORD':
      default:
        return keywords;
    }
  }

    private isRightAfterTableName(textBeforeToken: string): boolean {
        return /\b(?:FROM|JOIN)\s+[a-zA-Z_]\w*\s+$/i.test(textBeforeToken);
    }

  private getColumnsOfQualifier(
    qualifier: string,
    references: SqlTableReference[],
    schema: SqlSchema,
  ): string[] {
    const q = qualifier.toLowerCase();
    const reference = references.find(
      (t) => t.alias.toLowerCase() === q || t.name.toLowerCase() === q,
    );
    const table = reference ? this.findTable(reference.name, schema) : undefined;

    return table?.columns.map((column) => column.name) ?? [];
  }

  /** True si justo antes del token hay FROM, JOIN o una coma (se espera nombre de tabla). */
  private expectsTableName(textBeforeToken: string): boolean {
    return /\b(?:FROM|JOIN)\s+$/i.test(textBeforeToken) || /,\s*$/.test(textBeforeToken);
  }

  private getCurrentToken(prefix: string): SqlToken | null {
    // Detecta "nombre", "alias.nombre" y "alias."
    const match = prefix.match(/(?:(\w+)\.)?(\w*)$/);
    if (!match) {
      return null;
    }

    const word = match[2];
    const qualifier = match[1] ?? null;

    // Sin texto que completar solo sugerimos tras espacio o tras "alias."
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
    const references: SqlTableReference[] = [];

    // Regex global compartida: reiniciamos el cursor antes de usarla.
    this.tableReferenceRegex.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = this.tableReferenceRegex.exec(sanitized)) !== null) {
      const tableName = match[1];

      if (!this.findTable(tableName, schema)) {
        continue;
      }

      references.push({
        name: tableName,
        alias: match[2] ?? tableName, // sin alias, usamos el nombre de la tabla
      });
    }

    return references;
  }

  private getAvailableColumns(references: SqlTableReference[], schema: SqlSchema): string[] {
    const qualified: string[] = [];
    const bare: string[] = [];

    for (const reference of references) {
      const table = this.findTable(reference.name, schema);

      for (const column of table?.columns ?? []) {
        qualified.push(`${reference.alias}.${column.name}`);
        bare.push(column.name);
      }
    }

    return [...bare, ...qualified];
  }

  private findTable(name: string, schema: SqlSchema): SqlTable | undefined {
    return schema.tables.find((table) => table.name.toLowerCase() === name.toLowerCase());
  }

  private filterSuggestions(suggestions: string[], currentWord: string): string[] {
    const word = currentWord.toLowerCase();

    return [...new Set(suggestions)].filter((suggestion) => {
      const s = suggestion.toLowerCase();
      // Sin duplicar lo que ya está escrito por completo
      return s.startsWith(word) && s !== word;
    });
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