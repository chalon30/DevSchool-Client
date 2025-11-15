import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Home } from './pages/home/home';
import { Login } from './pages/auth/login/login';

export const routes: Routes = [
  { path: '', component: Landing },       
  { path: 'home', component: Home },     
  { path: 'login', component: Login },
];
