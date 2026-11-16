import { Component, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '@shared/components/button';
import { DataContext } from '@modules/challenges/models/datacontext';
import { SqlAutocompleteService } from '@modules/challenges/services/sql-autocomplete.service';

const AUTOCOMPLETE_KEYWORDS = [
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

type QueryForm = FormGroup<{
  query: FormControl<string>;
}>;

@Component({
  selector: 'app-challenge-query-form',
  imports: [ReactiveFormsModule, TranslatePipe, Button],
  template: `
    <form class="flex flex-col gap-3 p-4" [formGroup]="form()" (ngSubmit)="submitted.emit()">
      <div class="flex flex-wrap gap-2">
        @for(keyword of autocompleteOptions(); track keyword; let i = $index) {
          <app-button
            type="button"
            [labelKey]="keyword"
            (click)="addSentence(keyword)"
            [color]="'rose'"
          ></app-button>
        }
      </div>
      <div class="flex flex-wrap gap-2">
        @for(table of dataContext().schema.tables.map((table) => table); track table; let i = $index) {
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
          (input)="onQueryInput()"
          (blur)="suggestions.set([])"
          (keydown)="onAutocompleteKeydown($event)"
          class="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
          [placeholder]="'challenge.query.placeholder' | translate"
        ></textarea>

        @if (suggestions().length > 0) {
          <ul
            class="absolute z-20 max-h-40 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            [style.top.px]="suggestionPosition().top"
            [style.left.px]="suggestionPosition().left"
          >
            @for (suggestion of suggestions(); track suggestion; let i = $index) {
              <li>
                <button
                  type="button"
                  class="w-full px-3 py-2 text-left font-mono text-sm hover:bg-emerald-50"
                  [class.bg-emerald-100]="i === activeSuggestionIndex()"
                  (mousedown)="$event.preventDefault(); selectSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </button>
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
  private readonly autocompleteService = inject(SqlAutocompleteService);

  readonly form = input.required<QueryForm>();
  readonly isSubmitting = input(false);
  readonly dataContext = input.required<DataContext>();
  readonly submitted = output<void>();

  @ViewChild('queryInput')
  private readonly queryInput?: ElementRef<HTMLTextAreaElement>;

  readonly autocompleteOptions = input<string[]>(AUTOCOMPLETE_KEYWORDS);

  readonly suggestions = signal<string[]>([]);
  readonly activeSuggestionIndex = signal<number>(0);
  readonly suggestionPosition = signal({ top: 0, left: 0 });
  private currentWordStart = 0;
  private currentWordEnd = 0;

  private updateSuggestionPosition(): void {
    const textarea = this.queryInput?.nativeElement;

    if (!textarea) return;

    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    const properties = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'padding',
      'border',
      'boxSizing',
      'width',
      'whiteSpace',
      'wordWrap',
    ] as const;

    properties.forEach((property) => {
      mirror.style[property] = style[property];
    });

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';

    const cursorPosition = textarea.selectionStart;

    mirror.textContent = textarea.value.substring(0, cursorPosition);

    const marker = document.createElement('span');
    marker.textContent = '\u200b';

    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    this.suggestionPosition.set({
      top: markerRect.top - mirrorRect.top + textarea.scrollTop,
      left: markerRect.left - mirrorRect.left + textarea.scrollLeft + 8,
    });

    mirror.remove();
  }

  onQueryInput(): void {
    const textarea = this.queryInput?.nativeElement;

    if (!textarea) return;

    const result = this.autocompleteService.getSuggestions(
      textarea.value,
      textarea.selectionStart,
      this.dataContext().schema,
    );

    this.currentWordStart = result.start;
    this.currentWordEnd = result.end;

    this.suggestions.set(result.suggestions);
    this.activeSuggestionIndex.set(0);

    if (result.suggestions.length > 0) {
      this.updateSuggestionPosition();
    }
  }

  onAutocompleteKeydown(event: KeyboardEvent): void {
    const suggestions = this.suggestions();

    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      this.activeSuggestionIndex.update((index) => (index + 1) % suggestions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      this.activeSuggestionIndex.update(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.selectSuggestion(suggestions[this.activeSuggestionIndex()]);
    }

    if (event.key === 'Escape') {
      this.suggestions.set([]);
    }
  }

  selectSuggestion(suggestion: string): void {
    const textArea = this.queryInput?.nativeElement;
    if (!textArea) {
      return;
    }

    const control = this.form().controls.query;
    if (!control) {
      return;
    }

    const value = control.value;
    const newValue = `${value.substring(0, this.currentWordStart)}${suggestion}${value.substring(this.currentWordEnd)}`;

    control.setValue(newValue);

    const cursorPosition = this.currentWordStart + suggestion.length;

    this.suggestions.set([]);

    queueMicrotask(() => {
      textArea.focus();
      textArea.setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  addSentence(sentence: string) {
    const textArea = this.queryInput?.nativeElement;
    if (!textArea) {
      return;
    }

    const control = this.form().controls.query;
    if (!control) {
      return;
    }

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const currentValue = control.value;
    const value = `${currentValue.slice(0, start)}${sentence}${currentValue.substring(end)} `;

    control.setValue(value);

    queueMicrotask(() => {
      textArea.focus();
      const cursorPosition = start + sentence.length + 1;
      textArea.setSelectionRange(cursorPosition, cursorPosition);
    });
  }
}
