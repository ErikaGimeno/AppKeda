import {inject, Injectable} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  user
} from "@angular/fire/auth";
import {getDownloadURL, ref, Storage, uploadBytes} from "@angular/fire/storage";
import {ToastController} from "@ionic/angular";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private autenticador: Auth = inject(Auth);
  private storage: Storage = inject(Storage);
  private toastCtrl: ToastController = inject(ToastController);

  user$ = user(this.autenticador);

  register(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.autenticador, email, pass);
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.autenticador, email, pass);
  }

  logout() {
    return signOut(this.autenticador);
  }
  async getActualUser() {
    return this.autenticador.currentUser;
  }

  recuperarPassword(email: string) {
    return sendPasswordResetEmail(this.autenticador, email);
  }


}
