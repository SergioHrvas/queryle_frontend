import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "@core/environments/environment";
import { PlayerStats } from "@modules/challenges/models/player-stats";

@Injectable({
  providedIn: 'root',
})
export class PlayerStatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/player-stats`;

  getPlayerStats(): Observable<PlayerStats> {
    return this.http.get<PlayerStats>(`${this.baseUrl}/me`);
  }
}