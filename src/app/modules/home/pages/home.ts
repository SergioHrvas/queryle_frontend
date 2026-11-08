import { Component, inject, signal } from '@angular/core';
import { Button } from '@shared/components/button';
import { HOME_MENU_OPTIONS, HomeMenuOption } from '@modules/home/home-menu-options';
import { Router } from '@angular/router';
import { DifficultySelector } from '@modules/challenges/components/difficulty-selector';
import { DailyChallengeBase } from '@modules/challenges/models/challenge';

@Component({
  selector: 'app-home',
  imports: [Button, DifficultySelector],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  protected readonly router = inject(Router);

  protected readonly menuOptions: HomeMenuOption[] = HOME_MENU_OPTIONS;

  protected readonly showChallengeSelector = signal(false);

  handle(option: HomeMenuOption) {
    switch (option.type) {
      case 'route':
        this.router.navigate([option.route]);
        console.log(`Navigating to route: ${option.route}`);
        break;
      case 'action':
        this.handleAction(option);
        break;
      default:
        console.warn(`Unknown menu option type`);
    }
  }

  private handleAction(option: HomeMenuOption) {
    if (option.type !== 'action') {
      console.warn(`Expected an action menu option, but got: ${option.type}`);
      return;
    }

    switch (option.action) {
      case 'open-challenge-selector':
        this.openChallengeSelector();
        console.log('Opening challenge selector...');
        break;
      default:
        console.warn(`Unknown action: ${option.action}`);
    }
  }

  protected openChallengeSelector(): void {
    this.showChallengeSelector.set(true);
  }

  protected closeChallengeSelector(): void {
    this.showChallengeSelector.set(false);
  }

  protected handleChallengeSelected(challenge: DailyChallengeBase): void {
    this.closeChallengeSelector();
    this.router.navigate(['/challenge', challenge.id]);

    console.log(`Selected daily challenge: ${challenge.id}`);
  }
}
