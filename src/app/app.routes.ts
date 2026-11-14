import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { MainLayout } from '@core/layout/main-layout';

export const routes: Routes = [
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('./modules/home/pages/home').then(m => m.Home)
            },
            {
                path: 'calendar',
                canActivate: [authGuard],
                loadComponent: () => import('./modules/challenges/pages/calendar/calendar').then(m => m.Calendar)
            },
            {
                path: 'challenge/:id',
                canActivate: [authGuard],
                loadComponent: () => import('./modules/challenges/pages/challenge-detail/challenge-detail').then(m => m.ChallengeDetail)
            },
        ]
    },
    {
        path: 'login',
        loadComponent: () => import('./modules/auth/pages/login/login').then(m => m.Login)
    },
];
