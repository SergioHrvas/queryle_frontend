import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ChallengeDifficulty,
  DailyChallenge,
  DailyChallengeSummary,
} from '@modules/challenges/models/challenge';
import { environment } from '@core/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DailyChallengeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dailychallenges`;

  getToday(): Observable<DailyChallengeSummary[]> {
    return this.getSummaries(`${this.baseUrl}/today`);
  }

  getChallengesFromTo(
    difficulty: ChallengeDifficulty,
    from: Date,
    to: Date,
  ): Observable<DailyChallengeSummary[]> {
    if (from > to) {
      throw new RangeError('The challenge date range must start before it ends.');
    }

    const params = new HttpParams({
      fromObject: {
        difficulty,
        dateFrom: this.formatLocalDate(from),
        dateTo: this.formatLocalDate(to),
      },
    });

    return this.getSummaries(this.baseUrl, params);
  }

  getChallengeById(id: string): Observable<DailyChallenge> {
    return this.http.get<DailyChallenge>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
    );
  }

  submitAttempt(challengeId: string, query: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${encodeURIComponent(challengeId)}/attempts`,
      { query },
    );
  }

  private getSummaries(
    url: string,
    params?: HttpParams,
  ): Observable<DailyChallengeSummary[]> {
    return this.http
      .get<DailyChallengeSummary[]>(url, {
        params,
      })
      .pipe(
        map((challenges) =>
          challenges.map((challenge) => ({
            ...challenge,
            status: challenge.status ?? 'PENDING',
          })),
        ),
      );
  }

  private formatLocalDate(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      throw new RangeError('A valid date is required to fetch challenges.');
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}