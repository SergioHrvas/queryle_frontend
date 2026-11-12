import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationIcon, NotificationIconData } from './notification-icon';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
    private readonly snackBar = inject(MatSnackBar);
    
    success(message: string): void {
        this.show(message, 'success');
    }
    
    error(message: string): void {
        this.show(message, 'error');
    }

    warning(message: string): void {
        this.show(message, 'warning');
    }
    
    info(message: string): void {
        this.show(message, 'info');
    }

    private show(message: string, type: NotificationType): void {
        const data: NotificationIconData = { message, type };

        this.snackBar.openFromComponent(NotificationIcon, {
            data,
            duration: type === 'success' ? 5000 : 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: [`notification`, `notification-${type}`],
        });
    }
}