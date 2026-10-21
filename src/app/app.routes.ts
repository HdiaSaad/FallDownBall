import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '',          loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'game',      loadComponent: () => import('./pages/game/game.page').then(m => m.GamePage) },
  { path: 'game-over', loadComponent: () => import('./pages/game-over/game-over.page').then(m => m.GameOverPage) },
  { path: 'settings',  loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage) },
  { path: 'customize', loadComponent: () => import('./pages/customize/customize.page').then(m => m.CustomizePage) },
  { path: 'gift',      loadComponent: () => import('./pages/gift/gift.page').then(m => m.GiftPage) },
];
