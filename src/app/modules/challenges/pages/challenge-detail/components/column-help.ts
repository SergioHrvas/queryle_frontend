import { ElementRef, HostListener, Component, ViewChild, input } from "@angular/core";
import { LucideCircleQuestionMark } from "@lucide/angular";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
    selector: "app-column-help",
    imports: [LucideCircleQuestionMark, TranslatePipe],
    template: `
        <details #helpDetails name="column-help" class="relative inline-flex">
            <summary
                class="flex cursor-pointer list-none items-center rounded-full p-0.5 hover:bg-emerald-200 [&::-webkit-details-marker]:hidden"
                [attr.aria-label]="titleKey() | translate"
            >
                <svg lucideCircleQuestionMark class="h-3 w-3"></svg>
            </summary>
            <div
                [class]="align() === 'right'
                    ? 'absolute right-0 top-full z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] wrap-break-words whitespace-normal rounded-lg border border-emerald-200 bg-white p-3 text-left text-xs font-normal normal-case text-gray-700 shadow-lg'
                    : 'absolute left-1/2 top-full z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 wrap-break-words whitespace-normal rounded-lg border border-emerald-200 bg-white p-3 text-left text-xs font-normal normal-case text-gray-700 shadow-lg'"
            >
                <strong class="block text-emerald-700">{{ titleKey() | translate }}</strong>
                {{ descriptionKey() | translate }}
            </div>
        </details>
    `,
})
export class ColumnHelp {
    @ViewChild("helpDetails") private readonly helpDetails?: ElementRef<HTMLDetailsElement>;
    readonly titleKey = input.required<string>();
    readonly descriptionKey = input.required<string>();
    readonly align = input<"center" | "right">("center");

    constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

    @HostListener("document:click", ["$event"])
    protected closeOnOutsideClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target as Node)) {
            this.helpDetails?.nativeElement.removeAttribute("open");
        }
    }
}
