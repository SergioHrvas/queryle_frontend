import { Injectable } from '@angular/core';

// -----------------------------------------------------------------------------
// Tipos públicos
// -----------------------------------------------------------------------------

export type SqlSuggestionKind = 'table' | 'column' | 'alias' | 'function' | 'keyword';

export interface SqlSuggestion {
  /** Texto mostrado en la lista. */
  label: string;
  kind: SqlSuggestionKind;
  /** Información secundaria (tipo de columna, tabla de origen...). */
  detail?: string;
  /** Texto a insertar si es distinto del label (p. ej. `COUNT(`). */
  insertText?: string;
}

export interface SqlAutocompleteResult {
  suggestions: SqlSuggestion[];
  start: number;
  end: number;
}

export interface SqlAutocompleteOptions {
  /** Abre sugerencias incluso sin texto escrito (Ctrl+Espacio). */
  force?: boolean;
}

export interface SqlColumn {
  name: string;
  type?: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

export interface SqlSchema {
  tables: SqlTable[];
}

export interface SqlTableReference {
  name: string;
  alias: string;
  table: SqlTable;
}

export type SqlAutocompleteContext = 'TABLE' | 'COLUMN' | 'KEYWORD';

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

// -----------------------------------------------------------------------------
// Tipos internos
// -----------------------------------------------------------------------------

interface SqlToken {
  word: string;
  qualifier: string | null;
  start: number;
}

/** Rango de texto de una (sub)consulta. */
interface SqlScope {
  start: number; // primer carácter dentro del paréntesis
  end: number; // índice del ')' (o fin del texto si aún no se cerró)
}

interface AnalysisContext {
  sanitized: string;
  subqueries: SqlScope[];
  /** Esquema real + CTEs de la sentencia actual. */
  schema: SqlSchema;
}

interface SuggestionRequest {
  context: SqlAutocompleteContext;
  clause: SqlClause;
  token: SqlToken;
  textBeforeToken: string;
  references: SqlTableReference[];
  selectAliases: string[];
  schema: SqlSchema;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const JOINS = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'];
const CONDITIONS = ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];
const OPERATORS = ['=', '<>', '!=', '<', '>', '<=', '>='];

/** Identificador con soporte Unicode (ñ, acentos...). */
const ID = String.raw`[\p{L}_$][\p{L}\p{N}_$]*`;
const WORD_CHARS = String.raw`\p{L}\p{N}_$`;

const TOKEN_REGEX = new RegExp(String.raw`(?:([${WORD_CHARS}]+)\.)?([${WORD_CHARS}]*)$`, 'u');
const ENDS_WITH_WORD_REGEX = new RegExp(String.raw`([${WORD_CHARS}]+)$`, 'u');

const CLAUSE_REGEX =
  /\b(SELECT|FROM|JOIN|ON|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET)\b/gi;

/** Contenido de cada FROM hasta la siguiente cláusula (se aplica sobre texto de nivel 0). */
const FROM_REGION_REGEX =
  /\bFROM\b([\s\S]*?)(?=\b(?:WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|UNION|EXCEPT|INTERSECT|WINDOW|FETCH)\b|$)/gi;

/** Palabras que, si preceden al cursor, indican que se espera un operando (columna/valor). */
const OPERAND_EXPECTING = new Set([
  'SELECT', 'DISTINCT', 'ALL', 'ANY', 'EXISTS', 'WHERE', 'ON', 'HAVING', 'BY',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'CASE', 'WHEN', 'THEN', 'ELSE',
]);

/** Palabras que nunca son un alias implícito en el SELECT. */
const NOT_ALIASES = new Set(['END', 'NULL', 'ASC', 'DESC', 'DISTINCT', 'ALL']);

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
    'NATURAL', 'ON', 'USING', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'EXCEPT',
    'INTERSECT', 'WINDOW', 'FETCH', 'FOR', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'AS',
  ];

  /**
   * Un elemento del FROM: `JOIN x [AS] a`, `, x a`, `(subconsulta) a` o el primero tras FROM.
   * Admite nombres con esquema (`public.users`).
   */
  private readonly fromItemRegex = new RegExp(
    String.raw`(?:^|\bJOIN\b|,)\s*(\(\s*\)|${ID}(?:\.${ID})?)` +
      String.raw`(?:\s+(?:AS\s+)?(?!(?:${this.reservedWords.join('|')})\b)(${ID}))?`,
    'giu',
  );

  /** `WITH nombre AS (` / `, nombre AS (` */
  private readonly cteRegex = new RegExp(
    String.raw`(?:\bWITH\b(?:\s+RECURSIVE\b)?|,)\s*(${ID})\s+AS\s*\(`,
    'giu',
  );

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  getSuggestions(
    query: string,
    cursorPosition: number,
    schema: SqlSchema,
    options: SqlAutocompleteOptions = {},
  ): SqlAutocompleteResult {
    const prefix = query.substring(0, cursorPosition);
    const token = this.getCurrentToken(prefix, options.force ?? false);

    if (!token) {
      return this.emptyResult(cursorPosition);
    }

    // Un único recorrido: texto saneado (misma longitud) + estado del cursor.
    const { sanitized, insideLiteral } = this.scan(query, cursorPosition);

    if (insideLiteral) {
      return this.emptyResult(cursorPosition);
    }

    const subqueries = this.findSubqueryScopes(sanitized);
    const chain = this.getScopeChain(sanitized, subqueries, cursorPosition); // raíz → más interno
    const current = chain[chain.length - 1];

    // CTEs de la sentencia: se comportan como tablas más del esquema.
    const baseContext: AnalysisContext = { sanitized, subqueries, schema };
    const effectiveSchema: SqlSchema = {
      tables: [...schema.tables, ...this.getCtes(chain[0], baseContext)],
    };
    const ctx: AnalysisContext = { ...baseContext, schema: effectiveSchema };

    const clause = this.getCurrentClause(
      this.topLevelText(sanitized, { start: current.start, end: cursorPosition }),
    );

    // Tablas visibles: primero las del scope actual y luego las de los exteriores
    // (consultas correlacionadas). Los aliases internos sombrean a los externos.
    const references = [...chain].reverse().flatMap((scope) => this.getTableReferences(scope, ctx));

    // Alias definidos en el SELECT, utilizables en GROUP BY / HAVING / ORDER BY
    const selectAliases = ['GROUP BY', 'HAVING', 'ORDER BY'].includes(clause)
      ? this.getSelectAliases(this.topLevelText(sanitized, current))
      : [];

    const suggestions = this.getContextSuggestions({
      context: this.getAutocompleteContext(clause),
      clause,
      token,
      textBeforeToken: prefix.substring(0, token.start),
      references,
      selectAliases,
      schema: effectiveSchema,
    });

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

  private getContextSuggestions(request: SuggestionRequest): SqlSuggestion[] {
    const { context, clause, token, textBeforeToken, references, selectAliases, schema } = request;

    // alias. -> solo columnas de esa tabla
    if (token.qualifier) {
      return this.getColumnsOfQualifier(token.qualifier, references, schema);
    }

    // AS | -> se espera un nombre nuevo, no hay nada que sugerir
    if (/\bAS\s+$/i.test(textBeforeToken)) {
      return [];
    }

    // IN ( | EXISTS ( | ANY ( | ALL (  -> se espera una subconsulta
    if (/\b(?:IN|EXISTS|ANY|ALL)\s*\(\s*$/i.test(textBeforeToken)) {
      return [this.keyword('SELECT')];
    }

    const keywords = this.clauseKeywords[clause];

    switch (context) {
      case 'TABLE': {
        if (this.expectsTableName(textBeforeToken)) {
          return schema.tables.map((table) => ({ label: table.name, kind: 'table' as const }));
        }

        const available = this.isRightAfterTableName(textBeforeToken)
          ? keywords
          : keywords.filter((keyword) => keyword !== 'AS');

        return available.map((keyword) => this.keyword(keyword));
      }

      case 'COLUMN': {
        // Tras un operando solo tienen sentido operadores y palabras clave.
        if (this.isAfterOperand(textBeforeToken)) {
          return this.getAfterOperandKeywords(clause).map((keyword) => this.keyword(keyword));
        }

        return [
          ...selectAliases.map((alias) => ({ label: alias, kind: 'alias' as const })),
          ...this.getAvailableColumns(references, schema),
          ...this.functions.map((name) => this.functionSuggestion(name)),
          ...this.getOperandKeywords(clause, textBeforeToken).map((keyword) => this.keyword(keyword)),
        ];
      }

      case 'KEYWORD':
      default:
        return keywords.map((keyword) => this.keyword(keyword));
    }
  }

  private keyword(label: string): SqlSuggestion {
    return { label, kind: 'keyword' };
  }

  private functionSuggestion(name: string): SqlSuggestion {
    return {
      label: name,
      kind: 'function',
      insertText: name.includes('(') ? undefined : `${name}(`,
    };
  }

  /** Keywords válidas cuando se espera un operando. */
  private getOperandKeywords(clause: SqlClause, textBeforeToken: string): string[] {
    switch (clause) {
      case 'SELECT':
        return /\bSELECT\s+$/i.test(textBeforeToken) ? ['DISTINCT'] : [];
      case 'WHERE':
      case 'ON':
      case 'HAVING':
        return ['NOT', 'EXISTS'];
      default:
        return [];
    }
  }

  /** Keywords y operadores válidos justo después de un operando. */
  private getAfterOperandKeywords(clause: SqlClause): string[] {
    switch (clause) {
      case 'SELECT':
        return ['AS', 'FROM'];
      case 'WHERE':
      case 'ON':
      case 'HAVING':
        return [...OPERATORS, ...this.clauseKeywords[clause]];
      default:
        return this.clauseKeywords[clause];
    }
  }

  /**
   * True si la última palabra significativa antes del cursor es un operando
   * (identificador, número, ")" o "*" del SELECT), no un operador, coma o keyword.
   */
  private isAfterOperand(textBeforeToken: string): boolean {
    const text = textBeforeToken.trimEnd();
    if (!text) {
      return false;
    }

    // SELECT * | , SELECT a, * |, t.* |
    if (/(?:\bSELECT(?:\s+DISTINCT)?|,|\.)\s*\*$/i.test(text)) {
      return true;
    }

    const word = text.match(ENDS_WITH_WORD_REGEX);
    if (word) {
      return !OPERAND_EXPECTING.has(word[1].toUpperCase());
    }

    return /[)\]'"]$/.test(text);
  }

  private isRightAfterTableName(textBeforeToken: string): boolean {
    return new RegExp(String.raw`\b(?:FROM|JOIN)\s+${ID}(?:\.${ID})?\s+$`, 'iu').test(
      textBeforeToken,
    );
  }

  /** True si justo antes del token hay FROM, JOIN o una coma (se espera nombre de tabla). */
  private expectsTableName(textBeforeToken: string): boolean {
    return /\b(?:FROM|JOIN)\s+$/i.test(textBeforeToken) || /,\s*$/.test(textBeforeToken);
  }

  private getColumnsOfQualifier(
    qualifier: string,
    references: SqlTableReference[],
    schema: SqlSchema,
  ): SqlSuggestion[] {
    const q = qualifier.toLowerCase();
    const reference = references.find(
      (t) => t.alias.toLowerCase() === q || t.name.toLowerCase() === q,
    );
    // Respaldo: `users.` aunque todavía no exista el FROM.
    const table = reference?.table ?? this.findTable(qualifier, schema);

    return (table?.columns ?? []).map((column) => ({
      label: column.name,
      kind: 'column' as const,
      detail: column.type,
    }));
  }

  private getAvailableColumns(references: SqlTableReference[], schema: SqlSchema): SqlSuggestion[] {
    // Sin FROM todavía: ofrecemos todas las columnas cualificadas como respaldo.
    if (references.length === 0) {
      return schema.tables.flatMap((table) =>
        table.columns.map((column) => ({
          label: `${table.name}.${column.name}`,
          kind: 'column' as const,
          detail: column.type,
        })),
      );
    }

    // Si un alias ya apareció en un scope más interno, el externo queda sombreado.
    const seenAliases = new Set<string>();
    const visible: SqlTableReference[] = [];

    for (const reference of references) {
      const key = reference.alias.toLowerCase();
      if (!seenAliases.has(key)) {
        seenAliases.add(key);
        visible.push(reference);
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

    const bare: SqlSuggestion[] = [];
    const qualified: SqlSuggestion[] = [];

    for (const { alias, table } of visible) {
      for (const column of table.columns) {
        if (occurrences.get(column.name.toLowerCase()) === 1) {
          bare.push({ label: column.name, kind: 'column', detail: column.type ?? table.name });
        }
        qualified.push({ label: `${alias}.${column.name}`, kind: 'column', detail: column.type });
      }
    }

    return [...bare, ...qualified];
  }

  private findTable(name: string, schema: SqlSchema): SqlTable | undefined {
    return schema.tables.find((table) => table.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Deduplica, descarta lo ya escrito por completo y ordena: primero prefijo, luego
   * coincidencias internas (solo con 2+ caracteres). Conserva el orden original entre iguales.
   */
  private filterSuggestions(suggestions: SqlSuggestion[], currentWord: string): SqlSuggestion[] {
    const word = currentWord.toLowerCase();
    const seen = new Set<string>();
    const scored: { suggestion: SqlSuggestion; score: number }[] = [];

    for (const suggestion of suggestions) {
      const label = suggestion.label.toLowerCase();

      if (seen.has(label) || label === word) {
        continue;
      }
      seen.add(label);

      let score: number;
      if (label.startsWith(word)) {
        score = 0;
      } else if (word.length >= 2 && label.includes(word)) {
        score = 1;
      } else {
        continue;
      }

      scored.push({ suggestion: this.matchCase(suggestion, currentWord), score });
    }

    return scored.sort((a, b) => a.score - b.score).map((entry) => entry.suggestion);
  }

  /** Si el usuario escribe en minúsculas, keywords y funciones se sugieren en minúsculas. */
  private matchCase(suggestion: SqlSuggestion, typed: string): SqlSuggestion {
    const isLower = typed.length > 0 && typed === typed.toLowerCase();
    const isCaseInsensitiveKind = suggestion.kind === 'keyword' || suggestion.kind === 'function';

    if (!isLower || !isCaseInsensitiveKind) {
      return suggestion;
    }

    return {
      ...suggestion,
      label: suggestion.label.toLowerCase(),
      insertText: suggestion.insertText?.toLowerCase(),
    };
  }

  // ---------------------------------------------------------------------------
  // Token bajo el cursor
  // ---------------------------------------------------------------------------

  private getCurrentToken(prefix: string, force: boolean): SqlToken | null {
    // Detecta "nombre", "alias.nombre" y "alias."
    const match = prefix.match(TOKEN_REGEX);
    if (!match) {
      return null;
    }

    const qualifier = match[1] ?? null;
    const word = match[2];

    // Sin texto que completar solo sugerimos si el usuario lo pide (Ctrl+Espacio).
    if (!word && !qualifier && !force) {
      return null;
    }

    return {
      word,
      qualifier,
      start: prefix.length - word.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Escáner único: literales y comentarios
  // ---------------------------------------------------------------------------

  /**
   * Recorre la query una sola vez. Devuelve:
   *  - `sanitized`: strings, identificadores entrecomillados y comentarios blanqueados
   *    (misma longitud, se conservan los saltos de línea).
   *  - `insideLiteral`: si el cursor está dentro de alguno de ellos.
   */
  private scan(query: string, cursor: number): { sanitized: string; insideLiteral: boolean } {
    const out = query.split('');
    const length = query.length;
    let state: 'none' | 'single' | 'double' | 'line' | 'block' = 'none';
    let insideLiteral = false;
    let i = 0;

    while (i < length) {
      const c = query[i];
      const n = query[i + 1];
      const before = state;
      let len = 1;

      if (i === cursor) {
        insideLiteral = state !== 'none';
      }

      switch (state) {
        case 'none':
          if (c === "'") {
            state = 'single';
          } else if (c === '"') {
            state = 'double';
          } else if (c === '-' && n === '-') {
            state = 'line';
            len = 2;
          } else if (c === '/' && n === '*') {
            state = 'block';
            len = 2;
          }
          break;

        case 'single':
          if (c === "'") {
            if (n === "'") {
              len = 2; // '' escapado
            } else {
              state = 'none';
            }
          }
          break;

        case 'double':
          if (c === '"') {
            if (n === '"') {
              len = 2; // "" escapado
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
            len = 2;
          }
          break;
      }

      // Se blanquea lo que está dentro, la apertura y el cierre (excepto saltos de línea).
      if (before !== 'none' || state !== 'none') {
        for (let k = i; k < i + len; k++) {
          if (out[k] !== '\n') {
            out[k] = ' ';
          }
        }
      }

      // Cursor en medio de un token de 2 caracteres: vale el estado previo al token.
      if (len === 2 && cursor === i + 1) {
        insideLiteral = before !== 'none';
      }

      i += len;
    }

    if (cursor >= length) {
      insideLiteral = state !== 'none';
    }

    return { sanitized: out.join(''), insideLiteral };
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

  /**
   * Texto del scope sin lo que haya a más de un nivel de paréntesis (subconsultas, funciones,
   * `IN (1, 2)`...). Conserva la longitud: los índices siguen valiendo respecto a `scope.start`.
   * Los paréntesis de nivel 0 se mantienen para poder localizar tablas derivadas.
   */
  private topLevelText(sanitized: string, scope: SqlScope): string {
    let depth = 0;
    let text = '';

    for (let i = scope.start; i < scope.end; i++) {
      const c = sanitized[i];

      if (c === '(') {
        text += depth === 0 ? '(' : ' ';
        depth++;
      } else if (c === ')') {
        depth = Math.max(0, depth - 1);
        text += depth === 0 ? ')' : ' ';
      } else {
        text += depth > 0 && c !== '\n' ? ' ' : c;
      }
    }

    return text;
  }

  // ---------------------------------------------------------------------------
  // Análisis de un scope
  // ---------------------------------------------------------------------------

  private getCurrentClause(topLevelBeforeCursor: string): SqlClause {
    let last: string | undefined;

    for (const match of topLevelBeforeCursor.matchAll(CLAUSE_REGEX)) {
      last = match[1];
    }

    return last ? (last.toUpperCase().replace(/\s+/g, ' ') as SqlClause) : 'UNKNOWN';
  }

  /**
   * Tablas del FROM/JOIN del scope: tablas reales, CTEs y tablas derivadas
   * (`FROM (SELECT ...) alias`), con varias separadas por coma y nombres con esquema.
   */
  private getTableReferences(scope: SqlScope, ctx: AnalysisContext): SqlTableReference[] {
    const top = this.topLevelText(ctx.sanitized, scope);
    const references: SqlTableReference[] = [];

    for (const region of top.matchAll(FROM_REGION_REGEX)) {
      const regionOffset = (region.index ?? 0) + 'FROM'.length;

      for (const item of region[1].matchAll(this.fromItemRegex)) {
        const target = item[1];
        const alias = item[2];

        if (target.startsWith('(')) {
          // Tabla derivada: buscamos la subconsulta cuyo "(" está en esa posición.
          const parenIndex =
            scope.start + regionOffset + (item.index ?? 0) + item[0].indexOf('(');
          const child = ctx.subqueries.find((s) => s.start === parenIndex + 1);

          if (child && alias) {
            references.push({
              name: alias,
              alias,
              table: { name: alias, columns: this.inferColumns(child, ctx) },
            });
          }
          continue;
        }

        const name = target.split('.').pop() as string; // public.users -> users
        const table = this.findTable(name, ctx.schema);

        if (table) {
          references.push({ name, alias: alias ?? name, table });
        }
      }
    }

    return references;
  }

  /** CTEs definidos en la sentencia, con las columnas inferidas de su SELECT. */
  private getCtes(root: SqlScope, ctx: AnalysisContext): SqlTable[] {
    const top = this.topLevelText(ctx.sanitized, root);
    const tables: SqlTable[] = [];

    for (const match of top.matchAll(this.cteRegex)) {
      const bodyStart = root.start + (match.index ?? 0) + match[0].length;
      const body = ctx.subqueries.find((s) => s.start === bodyStart);

      if (!body) {
        continue;
      }

      // Un CTE puede usar los anteriores.
      const local: AnalysisContext = {
        ...ctx,
        schema: { tables: [...ctx.schema.tables, ...tables] },
      };
      tables.push({ name: match[1], columns: this.inferColumns(body, local) });
    }

    return tables;
  }

  /** Columnas que produce un SELECT (para CTEs y tablas derivadas). */
  private inferColumns(scope: SqlScope, ctx: AnalysisContext): SqlColumn[] {
    const select = this.topLevelText(ctx.sanitized, scope).match(
      /\bSELECT\b([\s\S]*?)(?:\bFROM\b|$)/i,
    );
    if (!select) {
      return [];
    }

    const references = this.getTableReferences(scope, ctx);
    const columns: SqlColumn[] = [];
    const starOfAlias = new RegExp(String.raw`^(${ID})\.\*$`, 'u');
    const explicitAlias = new RegExp(String.raw`\bAS\s+(${ID})$`, 'iu');
    const simpleColumn = new RegExp(String.raw`^(?:${ID}\.)*(${ID})(?:\s+(${ID}))?$`, 'u');
    const functionAlias = new RegExp(String.raw`\)\s+(${ID})$`, 'u');

    for (const raw of select[1].split(',')) {
      const item = raw.trim().replace(/^(?:DISTINCT|ALL)\s+/i, '');
      let match: RegExpMatchArray | null;

      if (item === '*') {
        references.forEach((reference) => columns.push(...reference.table.columns));
      } else if ((match = item.match(starOfAlias))) {
        const q = match[1].toLowerCase();
        const reference = references.find((r) => r.alias.toLowerCase() === q);
        columns.push(...(reference?.table.columns ?? []));
      } else if ((match = item.match(explicitAlias)) || (match = item.match(functionAlias))) {
        columns.push({ name: match[1] });
      } else if ((match = item.match(simpleColumn))) {
        columns.push({ name: match[2] ?? match[1] });
      }
    }

    return columns;
  }

  /** Alias definidos entre el SELECT y el FROM del scope (con o sin `AS`). */
  private getSelectAliases(topLevel: string): string[] {
    const select = topLevel.match(/\bSELECT\b([\s\S]*?)(?:\bFROM\b|$)/i);
    if (!select) {
      return [];
    }

    const explicitAlias = new RegExp(String.raw`\bAS\s+(${ID})$`, 'iu');
    const implicitAlias = new RegExp(String.raw`[${WORD_CHARS})\]]\s+(${ID})$`, 'u');
    const aliases: string[] = [];

    for (const raw of select[1].split(',')) {
      const item = raw.trim().replace(/^(?:DISTINCT|ALL)\s+/i, '');
      const match = item.match(explicitAlias) ?? item.match(implicitAlias);

      if (match && !NOT_ALIASES.has(match[1].toUpperCase())) {
        aliases.push(match[1]);
      }
    }

    return aliases;
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  private emptyResult(cursorPosition: number): SqlAutocompleteResult {
    return {
      suggestions: [],
      start: cursorPosition,
      end: cursorPosition,
    };
  }
}