import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { Register } from './register/register';
import { Profile } from './profile/profile';
import { Projects } from './projects/projects';

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
];
