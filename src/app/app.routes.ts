import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Home } from './home/home';

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
    path: '/home',
    component: Home,
    title: 'Home'
  },
];
