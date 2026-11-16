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

/** Rango de texto de una (sub)consulta. */
interface SqlScope {
  start: number; // índice del primer carácter dentro del paréntesis
  end: number; // índice del ')' (o fin del texto si aún no se cerró)
}

const JOINS = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'];
const CONDITIONS = ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];

const CLAUSE_REGEX =
  /\b(SELECT|FROM|JOIN|ON|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET)\b/gi;

@Injectable({
  providedIn: 'root',
})
export class SqlAutocompleteService {
  /** Keywords que tienen sentido mientras el cursor está dentro de cada cláusula. */
  private readonly clauseKeywords: Record<SqlClause, string[]> = {
    UNKNOWN: ['SELECT', 'WITH'],
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

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  getSuggestions(query: string, cursorPosition: number, schema: SqlSchema): SqlAutocompleteResult {
    const prefix = query.substring(0, cursorPosition);
    const token = this.getCurrentToken(prefix);

    if (!token || this.isInsideLiteralOrComment(prefix)) {
      return this.emptyResult(cursorPosition);
    }

    // Misma longitud que la query original, así los índices siguen valiendo.
    const sanitized = this.sanitizeQuery(query);
    const subqueries = this.findSubqueryScopes(sanitized);
    const chain = this.getScopeChain(sanitized, subqueries, cursorPosition); // raíz → más interno
    const current = chain[chain.length - 1];

    // Texto del scope actual, sin el contenido de sus subconsultas hijas
    const currentText = this.maskNestedScopes(sanitized, current, subqueries);

    const clause = this.getCurrentClause(currentText.substring(current.start, cursorPosition));
    const context = this.getAutocompleteContext(clause);

    // Tablas visibles: primero las del scope actual y luego las de los exteriores
    // (consultas correlacionadas). Los aliases internos sombrean a los externos.
    const tableReferences = [...chain].reverse().flatMap((scope) =>
      this.getTableReferences(
        this.maskNestedScopes(sanitized, scope, subqueries).substring(scope.start, scope.end),
        schema,
      ),
    );

    // Alias definidos en el SELECT, utilizables en GROUP BY / HAVING / ORDER BY
    const selectAliases = ['GROUP BY', 'HAVING', 'ORDER BY'].includes(clause)
      ? this.getSelectAliases(currentText.substring(current.start, current.end))
      : [];

    const suggestions = this.getContextSuggestions(
      context,
      clause,
      token,
      prefix.substring(0, token.start),
      tableReferences,
      selectAliases,
      schema,
    );

    return {
      suggestions: this.filterSuggestions(suggestions, token.word),
      start: token.start,
      end: cursorPosition,
    };
  }

  // ---------------------------------------------------------------------------
  // Contexto y sugerencias
  // ---------------------------------------------------------------------------

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
    selectAliases: string[],
    schema: SqlSchema,
  ): string[] {
    // alias. -> solo columnas de esa tabla
    if (token.qualifier) {
      return this.getColumnsOfQualifier(token.qualifier, tableReferences, schema);
    }

    // IN ( | EXISTS ( | ANY ( | ALL (  -> se espera una subconsulta
    if (/\b(?:IN|EXISTS|ANY|ALL)\s*\(\s*$/i.test(textBeforeToken)) {
      return ['SELECT'];
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
        return [
          ...selectAliases,
          ...this.getAvailableColumns(tableReferences, schema),
          ...this.functions,
          ...keywords,
        ];

      case 'KEYWORD':
      default:
        return keywords;
    }
  }

  private isRightAfterTableName(textBeforeToken: string): boolean {
    return /\b(?:FROM|JOIN)\s+[a-zA-Z_]\w*\s+$/i.test(textBeforeToken);
  }

  /** True si justo antes del token hay FROM, JOIN o una coma (se espera nombre de tabla). */
  private expectsTableName(textBeforeToken: string): boolean {
    return /\b(?:FROM|JOIN)\s+$/i.test(textBeforeToken) || /,\s*$/.test(textBeforeToken);
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

  private getAvailableColumns(references: SqlTableReference[], schema: SqlSchema): string[] {
    // Si un alias ya apareció en un scope más interno, el externo queda sombreado.
    const seenAliases = new Set<string>();
    const visible: { alias: string; table: SqlTable }[] = [];

    for (const reference of references) {
      const key = reference.alias.toLowerCase();
      if (seenAliases.has(key)) {
        continue;
      }
      seenAliases.add(key);

      const table = this.findTable(reference.name, schema);
      if (table) {
        visible.push({ alias: reference.alias, table });
      }
    }

    // Una columna sin cualificar solo se sugiere si no es ambigua entre tablas.
    const occurrences = new Map<string, number>();
    for (const { table } of visible) {
      for (const column of table.columns) {
        const key = column.name.toLowerCase();
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
      }
    }

    const bare: string[] = [];
    const qualified: string[] = [];

    for (const { alias, table } of visible) {
      for (const column of table.columns) {
        if (occurrences.get(column.name.toLowerCase()) === 1) {
          bare.push(column.name);
        }
        qualified.push(`${alias}.${column.name}`);
      }
    }

    return [...bare, ...qualified];
  }

  private findTable(name: string, schema: SqlSchema): SqlTable | undefined {
    return schema.tables.find((table) => table.name.toLowerCase() === name.toLowerCase());
  }

  private filterSuggestions(suggestions: string[], currentWord: string): string[] {
    const word = currentWord.toLowerCase();

    // El Set conserva el orden de inserción: columnas, funciones y keywords.
    return [...new Set(suggestions)].filter((suggestion) => {
      const s = suggestion.toLowerCase();
      // Sin duplicar lo que ya está escrito por completo
      return s.startsWith(word) && s !== word;
    });
  }

  // ---------------------------------------------------------------------------
  // Token bajo el cursor
  // ---------------------------------------------------------------------------

  private getCurrentToken(prefix: string): SqlToken | null {
    // Detecta "nombre", "alias.nombre" y "alias."
    const match = prefix.match(/(?:(\w+)\.)?(\w*)$/);
    if (!match) {
      return null;
    }

    const word = match[2];
    const qualifier = match[1] ?? null;

    // Sin texto que completar solo sugerimos al inicio, tras espacio, "(" o ",", o tras "alias."
    if (!word && !qualifier && prefix.length > 0 && !/[\s(,]$/.test(prefix)) {
      return null;
    }

    return {
      word,
      qualifier,
      start: prefix.length - word.length,
    };
  }

  /** True si el cursor está dentro de un string, identificador entrecomillado o comentario. */
  private isInsideLiteralOrComment(prefix: string): boolean {
    let state: 'none' | 'single' | 'double' | 'line' | 'block' = 'none';

    for (let i = 0; i < prefix.length; i++) {
      const c = prefix[i];
      const n = prefix[i + 1];

      switch (state) {
        case 'none':
          if (c === "'") {
            state = 'single';
          } else if (c === '"') {
            state = 'double';
          } else if (c === '-' && n === '-') {
            state = 'line';
            i++;
          } else if (c === '/' && n === '*') {
            state = 'block';
            i++;
          }
          break;

        case 'single':
          if (c === "'") {
            if (n === "'") {
              i++; // '' escapado
            } else {
              state = 'none';
            }
          }
          break;

        case 'double':
          if (c === '"') {
            if (n === '"') {
              i++; // "" escapado
            } else {
              state = 'none';
            }
          }
          break;

        case 'line':
          if (c === '\n') {
            state = 'none';
          }
          break;

        case 'block':
          if (c === '*' && n === '/') {
            state = 'none';
            i++;
          }
          break;
      }
    }

    return state !== 'none';
  }

  // ---------------------------------------------------------------------------
  // Scopes (subconsultas)
  // ---------------------------------------------------------------------------

  /** Encuentra los "(" que abren una subconsulta y su ")" correspondiente. */
  private findSubqueryScopes(sanitized: string): SqlScope[] {
    const scopes: SqlScope[] = [];
    const stack: (SqlScope | null)[] = [];
    const subqueryStart = /\s*(?:SELECT|WITH)\b/iy;

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];

      if (char === '(') {
        subqueryStart.lastIndex = i + 1;

        if (subqueryStart.test(sanitized)) {
          const scope: SqlScope = { start: i + 1, end: sanitized.length };
          scopes.push(scope);
          stack.push(scope);
        } else {
          stack.push(null); // paréntesis de función, expresión, IN (1, 2)...
        }
      } else if (char === ')') {
        const scope = stack.pop();
        if (scope) {
          scope.end = i;
        }
      }
    }

    return scopes;
  }

  /** Scopes que contienen el cursor, del exterior (sentencia actual) al interior. */
  private getScopeChain(sanitized: string, subqueries: SqlScope[], cursor: number): SqlScope[] {
    const statementStart = cursor > 0 ? sanitized.lastIndexOf(';', cursor - 1) + 1 : 0;
    const nextSemicolon = sanitized.indexOf(';', cursor);

    const root: SqlScope = {
      start: statementStart,
      end: nextSemicolon === -1 ? sanitized.length : nextSemicolon,
    };

    const containing = subqueries
      .filter((s) => s.start <= cursor && cursor <= s.end)
      .sort((a, b) => a.start - b.start);

    return [root, ...containing];
  }

  /** Sustituye por espacios las subconsultas hijas para que sus keywords y tablas no contaminen. */
  private maskNestedScopes(sanitized: string, scope: SqlScope, subqueries: SqlScope[]): string {
    let text = sanitized;

    for (const nested of subqueries) {
      if (nested !== scope && nested.start >= scope.start && nested.end <= scope.end) {
        text =
          text.slice(0, nested.start) +
          ' '.repeat(nested.end - nested.start) +
          text.slice(nested.end);
      }
    }

    return text;
  }

  // ---------------------------------------------------------------------------
  // Análisis de un scope
  // ---------------------------------------------------------------------------

  private getCurrentClause(scopeTextBeforeCursor: string): SqlClause {
    // Ignora paréntesis ya cerrados (EXTRACT(YEAR FROM x), COUNT(*), IN (1, 2)...)
    const text = this.blankClosedParentheses(scopeTextBeforeCursor);

    let last: string | undefined;

    for (const match of text.matchAll(CLAUSE_REGEX)) {
      last = match[1];
    }

    return last ? (last.toUpperCase().replace(/\s+/g, ' ') as SqlClause) : 'UNKNOWN';
  }

  private blankClosedParentheses(text: string): string {
    const blank = (match: string) => ' '.repeat(match.length);
    let previous: string;

    do {
      previous = text;
      text = text.replace(/\([^()]*\)/g, blank);
    } while (text !== previous);

    return text;
  }

  private getTableReferences(scopeText: string, schema: SqlSchema): SqlTableReference[] {
    const references: SqlTableReference[] = [];

    // matchAll clona la regex, así que no hay que reiniciar lastIndex.
    for (const match of scopeText.matchAll(this.tableReferenceRegex)) {
      if (this.findTable(match[1], schema)) {
        references.push({
          name: match[1],
          alias: match[2] ?? match[1], // sin alias, usamos el nombre de la tabla
        });
      }
    }

    return references;
  }

  /** Alias `AS nombre` definidos entre el SELECT y el FROM del scope. */
  private getSelectAliases(scopeText: string): string[] {
    const select = scopeText.match(/\bSELECT\b([\s\S]*?)(?:\bFROM\b|$)/i);
    if (!select) {
      return [];
    }

    return [...select[1].matchAll(/\bAS\s+([a-zA-Z_]\w*)/gi)].map((match) => match[1]);
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  /** Blanquea comentarios y strings conservando la longitud (y los saltos de línea). */
  private sanitizeQuery(query: string): string {
    const blank = (match: string) => match.replace(/[^\n]/g, ' ');

    return query
      .replace(/--.*$/gm, blank)
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/'(?:''|[^'])*'/g, blank)
      .replace(/"(?:[^"]|"")*"/g, blank);
  }

  private emptyResult(cursorPosition: number): SqlAutocompleteResult {
    return {
      suggestions: [],
      start: cursorPosition,
      end: cursorPosition,
    };
  }
}