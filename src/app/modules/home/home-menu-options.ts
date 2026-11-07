import { LucideCalendarDays, LucidePlay, LucideIcon, LucideTrophy } from "@lucide/angular";

export interface HomeMenuOption {
  label: string;
  icon: LucideIcon;
  route: string;
}

export const HOME_MENU_OPTIONS: HomeMenuOption[] = [
  {
    label: "home.today",
    icon: LucidePlay,
    route: "/challenge/:id"
  },
  {
    label: "home.calendar",
    icon: LucideCalendarDays,
    route: "/calendar"
  },
  {
    label: "home.stats",
    icon: LucideTrophy,
    route: "/stats"
  }
];