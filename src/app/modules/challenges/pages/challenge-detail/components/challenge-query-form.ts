
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '@shared/components/button';
import { getCaretCoordinates } from '@shared/utils/caret-coordinates';
import { DataContext } from '@modules/challenges/models/datacontext';
import {
  SqlAutocompleteService,
  SqlSuggestion,
} from '@modules/challenges/services/sql-autocomplete.service';
 
const QUICK_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
];

const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
 
type QueryForm = FormGroup<{
  query: FormControl<string>;
}>;
 
@Component({
  selector: 'app-challenge-query-form',
  imports: [ReactiveFormsModule, TranslatePipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-3 p-4" [formGroup]="form()" (ngSubmit)="submitted.emit()">
      <div class="flex flex-wrap gap-2">
        @for (keyword of quickKeywords(); track keyword) {
          <app-button
            type="button"
            [labelKey]="keyword"
            (click)="addSentence(keyword)"
            [color]="'rose'"
          ></app-button>
        }
      </div>
      <div class="flex flex-wrap gap-2">
        @for (table of dataContext().schema.tables; track table.name) {
          <app-button
            type="button"
            [labelKey]="table.name"
            (click)="addSentence(table.name)"
            [color]="'sky'"
          ></app-button>
        }
      </div>
      <label for="query" class="font-bold text-gray-800">{{
        'challenge.query.label' | translate
      }}</label>
      <div class="relative">
        <textarea
          #queryInput
          id="query"
          formControlName="query"
          rows="5"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="isOpen() ? listId : null"
          [attr.aria-activedescendant]="activeOptionId()"
          (input)="refresh()"
          (keydown)="onKeydown($event)"
          (keyup)="onKeyup($event)"
          (click)="close()"
          (scroll)="close()"
          (blur)="close()"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
          [placeholder]="'challenge.query.placeholder' | translate"
        ></textarea>
 
        @if (isOpen()) {
          <ul
            [id]="listId"
            role="listbox"
            class="absolute z-20 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            [style.width.px]="popupWidth()"
            [style.top.px]="popupPosition().top"
            [style.left.px]="popupPosition().left"
          >
            @for (suggestion of suggestions(); track suggestion.label; let i = $index) {
              <li
                role="option"
                [id]="optionId(i)"
                [attr.aria-selected]="i === activeIndex()"
                class="flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2 font-mono text-sm hover:bg-emerald-50"
                [class.bg-emerald-100]="i === activeIndex()"
                (mousedown)="$event.preventDefault(); accept(i)"
              >
                <span class="truncate">{{ suggestion.label }}</span>
                @if (suggestion.detail) {
                  <span class="shrink-0 text-xs text-gray-400">{{ suggestion.detail }}</span>
                }
              </li>
            }
          </ul>
        }
      </div>
      <button
        type="submit"
        class="cursor-pointer rounded bg-emerald-500 px-4 py-2 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-400"
        [disabled]="form().invalid || isSubmitting()"
      >
        {{ (isSubmitting() ? 'challenge.query.submitting' : 'challenge.query.submit') | translate }}
      </button>
    </form>
  `,
})
export class ChallengeQueryForm {
  private static nextId = 0;
 
  private readonly autocompleteService = inject(SqlAutocompleteService);
  private readonly instanceId = ChallengeQueryForm.nextId++;
 
  readonly form = input.required<QueryForm>();
  readonly isSubmitting = input(false);
  readonly dataContext = input.required<DataContext>();
  /** Atajos de palabras clave (antes `autocompleteOptions`). */
  readonly quickKeywords = input<string[]>(QUICK_KEYWORDS);
  readonly submitted = output<void>();
 
  private readonly queryInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('queryInput');
  readonly popupWidth = input(320); // px
 
  readonly suggestions = signal<SqlSuggestion[]>([]);
  /** -1 = el usuario aún no ha navegado con las flechas. */
  readonly activeIndex = signal(-1);
  readonly popupPosition = signal({ top: 0, left: 0 });
 
  readonly isOpen = computed(() => this.suggestions().length > 0);
  readonly listId = `sql-suggestions-${this.instanceId}`;
  readonly activeOptionId = computed(() =>
    this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );
 
  private replaceStart = 0;
  private replaceEnd = 0;
 
  optionId(index: number): string {
    return `${this.listId}-option-${index}`;
  }
 
  // ---------------------------------------------------------------------------
  // Eventos del textarea
  // ---------------------------------------------------------------------------
 
  onKeydown(event: KeyboardEvent): void {
    // No interferir con IME (composición de caracteres).
    if (event.isComposing) {
      return;
    }
 
    const hasModifier = event.ctrlKey || event.metaKey;
 
    // Ctrl/Cmd + Espacio: forzar sugerencias aunque no haya texto
    if (hasModifier && event.code === 'Space') {
      event.preventDefault();
      this.refresh(true);
      return;
    }
 
    // Ctrl/Cmd + Enter: enviar
    if (hasModifier && event.key === 'Enter') {
      event.preventDefault();
      if (this.form().valid && !this.isSubmitting()) {
        this.submitted.emit();
      }
      return;
    }
 
    if (!this.isOpen() || hasModifier || event.altKey || event.shiftKey) {
      return;
    }
 
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
 
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
 
      case 'Tab': 
      case 'Enter':
        event.preventDefault();
        this.accept(this.activeIndex());
        break;
      
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }
 
  /** Mover el cursor con teclado invalida el rango de reemplazo guardado. */
  onKeyup(event: KeyboardEvent): void {
    if (NAVIGATION_KEYS.includes(event.key)) {
      this.close();
    }
  }
 
  // ---------------------------------------------------------------------------
  // Sugerencias
  // ---------------------------------------------------------------------------
 
  refresh(force = false): void {
    const textarea = this.queryInput().nativeElement;
 
    // Con una selección no vacía no tiene sentido completar.
    if (textarea.selectionStart !== textarea.selectionEnd) {
      this.close();
      return;
    }
 
    const result = this.autocompleteService.getSuggestions(
      textarea.value,
      textarea.selectionStart,
      this.dataContext().schema,
      { force },
    );
 
    this.replaceStart = result.start;
    this.replaceEnd = result.end;
    this.suggestions.set(result.suggestions);
    this.activeIndex.set(result.suggestions.length > 0 ? 0 : -1); // antes: -1

    if (result.suggestions.length > 0) {
      this.updatePopupPosition();
    }
  }
 
  close(): void {
    if (this.isOpen()) {
      this.suggestions.set([]);
    }
    this.activeIndex.set(-1);
  }
 
  accept(index: number): void {
    const suggestion = this.suggestions()[index];
    if (!suggestion) {
      return;
    }
 
    const value = this.form().controls.query.value;
    let text = suggestion.insertText ?? suggestion.label;
 
    // Espacio tras keywords y tablas, salvo que ya haya uno (o una coma/paréntesis) detrás.
    const next = value[this.replaceEnd];
    if (
      (suggestion.kind === 'keyword' || suggestion.kind === 'table') &&
      (next === undefined || !/[\s,;)]/.test(next))
    ) {
      text += ' ';
    }
 
    this.replaceRange(this.replaceStart, this.replaceEnd, text);
 
    // Tras `COUNT(` el cursor queda dentro: volvemos a sugerir columnas.
    if (suggestion.kind === 'function' && text.endsWith('(')) {
      queueMicrotask(() => this.refresh());
    }
  }
 
  private moveActive(delta: 1 | -1): void {
    const count = this.suggestions().length;
    const current = this.activeIndex();
 
    const next = current < 0 ? (delta > 0 ? 0 : count - 1) : (current + delta + count) % count;
 
    this.activeIndex.set(next);
    // El <li> ya existe en el DOM: lo traemos a la vista dentro del listbox.
    document.getElementById(this.optionId(next))?.scrollIntoView({ block: 'nearest' });
  }
 
  private updatePopupPosition(): void {
    const textarea = this.queryInput().nativeElement;
    const { top, left, height } = getCaretCoordinates(textarea, textarea.selectionStart);
 
    this.popupPosition.set({
      top: top + height, // justo debajo de la línea actual
      left: Math.max(0, Math.min(left, textarea.clientWidth - this.popupWidth())), // dentro del textarea
    });
  }
 
  // ---------------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------------
 
  /** Inserta una palabra clave o tabla en la posición del cursor / selección. */
  addSentence(sentence: string): void {
    const textarea = this.queryInput().nativeElement;
    const value = this.form().controls.query.value;
 
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
 
    // Evita `SELECTFROM` y dobles espacios.
    const leadingSpace = before && !/[\s(]$/.test(before) ? ' ' : '';
    const trailingSpace = /^[\s,;)]/.test(after) ? '' : ' ';
 
    this.replaceRange(start, end, `${leadingSpace}${sentence}${trailingSpace}`);
  }
 
  /** Único punto que modifica el texto: reemplaza el rango y restaura el cursor. */
  private replaceRange(start: number, end: number, text: string): void {
    const textarea = this.queryInput().nativeElement;
    const control = this.form().controls.query;
    const value = control.value;
 
    control.setValue(`${value.slice(0, start)}${text}${value.slice(end)}`);
 
    const cursor = start + text.length;
    this.close();
 
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }
}
 