import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { Register } from './register/register';
import { Profile } from './profile/profile';

export const routes: Routes = [
  { 
    path: 'login', 
    component: Login,
    title: 'Login'
  },
  { 
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },
  {
    path: 'dashboard',
    component: Dashboard,
    title: 'Dashboard'
  },
  {
    path: 'register',
    component: Register,
    title: 'Registrati'
  },
  {
    path: 'profile',
    component: Profile,
    title: 'Profilo'
  }
];
