import { Component } from '@angular/core';
import { Button } from '../../../shared/components/button';
import { HOME_MENU_OPTIONS } from '../home-menu-options';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [Button],
})
export class Home {
  protected readonly menuOptions = HOME_MENU_OPTIONS;

  constructor() {}
}
