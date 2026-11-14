import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@core/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {
  private readonly http = inject(HttpClient);

  registerMe() {
    return this.http.put<void>(
      `${environment.apiUrl}/players/me`,
      {}
    );
  }
}