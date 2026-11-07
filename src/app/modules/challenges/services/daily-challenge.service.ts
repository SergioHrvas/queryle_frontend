import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DailyChallenge } from '@modules/challenges/models/challenge-difficulty';
import { environment } from '@core/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DailyChallengeService {
  private readonly http = inject(HttpClient);

  getToday(): Observable<DailyChallenge[]> {
    return this.http.get<DailyChallenge[]>(
      `${environment.apiUrl}/dailychallenges/today`,
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      }
    );
  }
}