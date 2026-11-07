import { LucideCalendarDays, LucidePlay, LucideIcon, LucideTrophy } from "@lucide/angular";

export interface BaseMenuOption {
  label: string;
  icon: LucideIcon;
}

export interface RouteMenuOption extends BaseMenuOption {
  type: 'route';
  route: string;
}

export interface ActionMenuOption extends BaseMenuOption {
  type: 'action';
  action: string;
}

export type HomeMenuOption = RouteMenuOption | ActionMenuOption;

export const HOME_MENU_OPTIONS: HomeMenuOption[] = [
  {
    type: "action",
    label: "home.today",
    icon: LucidePlay,
    action: "open-challenge-selector"
  },
  {
    type: "route",
    label: "home.calendar",
    icon: LucideCalendarDays,
    route: "/calendar"
  },
  {
    type: "route",
    label: "home.stats",
    icon: LucideTrophy,
    route: "/stats"
  }
];