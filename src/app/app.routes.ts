// import { Routes } from '@angular/router';
//
// export const routes: Routes = [
//   {
//     path: 'login',
//     loadComponent: () => import('./common/pages/login/login.page').then( m => m.LoginPage)
//   },
//   {
//     path: '',
//     redirectTo: 'login',
//     pathMatch: 'full',
//   },
//   {
//     path: 'home',
//     loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
//   },
//   {
//     path: 'registro',
//     loadComponent: () => import('./common/pages/registro/registro.page').then( m => m.RegistroPage)
//   },
//   {
//     path: 'intro',
//     loadComponent: () => import('./common/pages/intro/intro.page').then( m => m.IntroPage)
//   },
//   {
//     path: 'tabs',
//     loadComponent: () => import('./common/pages/tabs/tabs.page').then( m => m.TabsPage)
//   },
//   {
//     path: 'mapa',
//     loadComponent: () => import('./common/pages/mapa/mapa.page').then( m => m.MapaPage)
//   },
//   {
//     path: 'busqueda',
//     loadComponent: () => import('./common/pages/busqueda/busqueda.page').then( m => m.BusquedaPage)
//   },
//   {
//     path: 'perfil',
//     loadComponent: () => import('./common/pages/perfil/perfil.page').then( m => m.PerfilPage)
//   },
// ];

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./common/pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./common/pages/registro/registro.page').then(m => m.RegistroPage)
  },
  {
    path: 'intro',
    loadComponent: () => import('./common/pages/intro/intro.page').then(m => m.IntroPage)
  },
  {
    path: 'tabs',
    loadComponent: () => import('./common/pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'mapa',
        loadComponent: () => import('./common/pages/mapa/mapa.page').then(m => m.MapaPage)
      },
      {
        path: 'chats',
        loadComponent: () => import('./common/pages/chats/chats.page').then( m => m.ChatsPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./common/pages/perfil/perfil.page').then(m => m.PerfilPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'crear-actividad',
    loadComponent: () => import('./common/pages/crear-actividad/crear-actividad.page').then( m => m.CrearActividadPage)
  },
  {
    path: 'busqueda',
    loadComponent: () => import('./common/pages/busqueda/busqueda.page').then(m => m.BusquedaPage)
  },
  {
    path: 'interior-chat/:id',
    loadComponent: () => import('./common/pages/interior-chat/interior-chat.page').then( m => m.InteriorChatPage)
  },
  {
    path: 'detalle-actividad/:id',
    loadComponent: () => import('./common/pages/detalle-actividad/detalle-actividad.page').then( m => m.DetalleActividadPage)
  },
  {
    path: 'crear-post',
    loadComponent: () => import('./common/pages/crear-post/crear-post.page').then( m => m.CrearPostPage)
  },
  {
    path: 'editar-perfil',
    loadComponent: () => import('./common/pages/editar-perfil/editar-perfil.page').then( m => m.EditarPerfilPage)
  },
  {
    path: 'detalle-post/:id',
    loadComponent: () => import('./common/pages/detalle-post/detalle-post.page').then( m => m.DetallePostPage)
  },

];
