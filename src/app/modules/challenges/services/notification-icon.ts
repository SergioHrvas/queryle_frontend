import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { LucideCircleCheck, LucideCircleX, LucideInfo, LucideTriangleExclamationPoint } from '@lucide/angular';
import type { NotificationType } from './notification.service';

export interface NotificationIconData {
  message: string;
  type: NotificationType;
}

@Component({
  selector: 'app-notification-icon',
  imports: [LucideCircleCheck, LucideCircleX, LucideInfo, LucideTriangleExclamationPoint],
  template: `
    <span
      class="flex items-center gap-2"
      [attr.aria-label]="data.message"
      [title]="data.message"
    >
      @switch (data.type) {
        @case ('success') {
          <svg lucideCircleCheck class="h-6 w-6"></svg>
        }
        @case ('warning') {
          <svg lucideTriangleExclamationPoint class="h-6 w-6"></svg>
        }
        @case ('error') {
          <svg lucideCircleX class="h-6 w-6"></svg>
        }
        @default {
          <svg lucideInfo class="h-6 w-6"></svg>
        }
      }
      <span class="wrap-break-words text-sm">{{ data.message }}</span>
    </span>
  `,
})
export class NotificationIcon {
  protected readonly data = inject<NotificationIconData>(MAT_SNACK_BAR_DATA);
  protected readonly snackBarRef = inject(MatSnackBarRef<NotificationIcon>);
}