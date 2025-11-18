import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Home } from './pages/home/home';
import { Login } from './pages/auth/login/login';
import { Profile } from './pages/profile/profile';
import { Register } from './pages/auth/register/register';
import { Courses } from './pages/courses/courses';
import { CourseDetail } from './pages/course-detail/course-detail';
import { authGuard } from './core/guards/auth.guard'; 

export const routes: Routes = [
  { path: '', component: Landing },       
  { path: 'home', component: Home },     
  { path: 'login', component: Login },
  //{ path: 'register', component: Register },
  { path: 'courses', component: Courses },

  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'course/:id', component: CourseDetail, canActivate: [authGuard] },
  
];
