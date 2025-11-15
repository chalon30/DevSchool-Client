import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: '', component: Landing },       
  { path: 'home', component: Home },     
];
