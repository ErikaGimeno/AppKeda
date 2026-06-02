import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import {getAuth, provideAuth} from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';

import { environment } from "./environments/environment";
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {Capacitor} from "@capacitor/core";
import {getMessaging, provideMessaging} from "@angular/fire/messaging";
import {defineCustomElements} from "@ionic/pwa-elements/loader";

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    // provideAuth(() => getAuth()),
    provideAuth(() => {
      if (Capacitor.isNativePlatform()) {
        return initializeAuth(initializeApp(environment.firebaseConfig), {
          persistence: indexedDBLocalPersistence
        });
      } else {
        return getAuth();
      }
    }),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideAnimationsAsync(),
  ],
});
defineCustomElements(window);
