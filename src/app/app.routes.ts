import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';

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
];
