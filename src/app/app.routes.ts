import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { Projects } from './pages/projects/projects';
import { Notifies } from './pages/notifies/notifies';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login,
    title: 'Login'
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
  },
  {
    path: 'projects',
    component: Projects,
    title: 'Progetti'
  },
  {
    path: 'dashboard/:id',
    component: Dashboard,
    title: 'Dashboard Progetto'
  },
  {
    path: 'notifications',
    component: Notifies,
    title: 'Notifiche'
  }
];
