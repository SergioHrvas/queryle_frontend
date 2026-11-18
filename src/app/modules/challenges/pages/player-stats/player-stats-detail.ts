import { Component, inject, OnInit, signal, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
    LucideCalendarDays,
    LucideTrophy,
    LucideCircleX,
    LucideFlame,
    LucideCrown,
} from '@lucide/angular';

import { PlayerStatsService } from '@modules/challenges/services/player-stats.service';
import { PlayerStats } from '@modules/challenges/models/player-stats';

interface StatsCard {
    key: keyof PlayerStats;
    label: string;
    icon: Type<unknown>;
    color: string;
    background: string;
}

@Component({
    selector: 'player-stats-detail',
    imports: [TranslatePipe, NgComponentOutlet],
    templateUrl: './player-stats-detail.html',
})
export class PlayerStatsDetail implements OnInit {

    private readonly playerStatsService = inject(PlayerStatsService);

    protected readonly playerStats = signal<PlayerStats>({
        playedGames: 0,
        wonGames: 0,
        lostGames: 0,
        currentStreak: 0,
        longestStreak: 0,
    });

    protected readonly loading = signal(true);
    protected readonly error = signal(false);

    protected readonly statsCards: StatsCard[] = [
        {
            key: 'playedGames',
            label: 'stats.playedGames',
            icon: LucideCalendarDays,
            color: 'text-emerald-700',
            background: 'bg-emerald-100',
        },
        {
            key: 'wonGames',
            label: 'stats.wonGames',
            icon: LucideTrophy,
            color: 'text-green-700',
            background: 'bg-green-100',
        },
        {
            key: 'lostGames',
            label: 'stats.lostGames',
            icon: LucideCircleX,
            color: 'text-red-600',
            background: 'bg-red-100',
        },
        {
            key: 'currentStreak',
            label: 'stats.currentStreak',
            icon: LucideFlame,
            color: 'text-orange-600',
            background: 'bg-orange-100',
        },
        {
            key: 'longestStreak',
            label: 'stats.longestStreak',
            icon: LucideCrown,
            color: 'text-yellow-600',
            background: 'bg-yellow-100',
        },
    ];

    ngOnInit(): void {
        this.loadPlayerStats();
    }

    private loadPlayerStats(): void {
        this.loading.set(true);
        this.error.set(false);

        this.playerStatsService.getPlayerStats().subscribe({
            next: (stats) => {
                this.playerStats.set(stats);
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error fetching player stats:', error);
                this.error.set(true);
                this.loading.set(false);
            },
        });
    }
}