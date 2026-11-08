import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DailyChallenge, DailyChallengeBase } from '@modules/challenges/models/challenge';
import { environment } from '@core/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DailyChallengeService {
  private readonly http = inject(HttpClient);

  getToday(): Observable<DailyChallengeBase[]> {
    return this.http.get<DailyChallengeBase[]>(
      `${environment.apiUrl}/dailychallenges/today`,
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      }
    );
  }

  getChallengeById(id: string): Observable<DailyChallenge> {
    return this.http.get<DailyChallenge>(
      `${environment.apiUrl}/dailychallenges/${id}`,
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      }
    );
  }
}