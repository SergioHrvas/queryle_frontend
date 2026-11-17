import { Component, inject, signal } from "@angular/core";
import { PlayerStatsService } from "@modules/challenges/services/player-stats.service";
import { PlayerStats } from "@modules/challenges/models/player-stats";

@Component({
    selector: 'player-stats-detail',
    templateUrl: './player-stats-detail.html',
})
export class PlayerStatsDetail {
    private readonly playerStatsService = inject(PlayerStatsService);

    protected readonly playerStats = signal<PlayerStats>({
        playedGames: 0,
        wonGames: 0,
        lostGames: 0,
        currentStreak: 0,
        longestStreak: 0,
    });

    constructor() {
        this.loadPlayerStats();
    }

    private loadPlayerStats(): void {
        this.playerStatsService.getPlayerStats().subscribe({
            next: (stats) => this.playerStats.set(stats),
            error: (error) => console.error('Error fetching player stats:', error),
        });
    }
}