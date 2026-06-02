import {Component, inject, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons,
  IonContent,
  IonHeader, IonIcon, IonImg,
  IonInput, IonInputPasswordToggle,
  IonItem,
  IonLabel, IonModal, IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {AuthService} from "../../services/auth-service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {AlertController, LoadingController, ToastController} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import {mail, lockClosed, arrowBackSharp, refreshOutline, keyOutline, mailOutline} from "ionicons/icons";

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonItem, IonInput,
    IonButton, IonIcon, IonImg, IonText, IonInputPasswordToggle, RouterLink,
    IonLabel, IonModal, IonToolbar, IonButtons]
})
export class LoginPage {
  email = '';
  password = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private route = inject(ActivatedRoute);

  @ViewChild('modalForgot') modalForgot: IonModal;
  emailRecuperacion: string = '';
  errorRecuperacion: string = '';
  errorLogin: boolean = false;

  constructor() {
    addIcons({
      mail,
      lockClosed,
      arrowBackSharp,
      refreshOutline,
      keyOutline,
      mailOutline
    })
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorLogin = true;
      await this.mostrarToast('Por favor, rellena todos los campos');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(this.email)) {
      this.errorLogin = true;
      await this.mostrarToast('El formato del correo electrónico no es válido.');
      return;
    }

    try {
      const credencialUsuario = await this.authService.login(this.email, this.password);
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/tabs/home';
      await this.router.navigateByUrl(returnUrl);

    } catch (error: any) {
      this.errorLogin = true;
      console.error("Error detallado:", error);

      let mensajeError = 'Error al iniciar sesión. Inténtalo de nuevo.';

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        mensajeError = 'Correo electrónico o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        mensajeError = 'Demasiados intentos fallidos. Inténtalo más tarde.';
      }

      await this.mostrarToast(mensajeError);
    }
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: 'danger',
      icon: 'alert-circle-outline'
    });
    await toast.present();

  }


  //metodo para mandar un enlace por correo electronico al usuario para que cambie su contraseña
  //Gestionado por Firebase
  async enviarEnlaceRecuperacion() {
    if (!this.emailRecuperacion || this.emailRecuperacion.trim() === '') {
      this.errorRecuperacion = "Por favor, introduce un correo electrónico.";
      return;
    }

    try {
      await this.authService.recuperarPassword(this.emailRecuperacion);
      this.emailRecuperacion = '';
      await this.modalForgot.dismiss();

    } catch (error: any) {

      this.errorRecuperacion = "No se pudo enviar el correo. Inténtalo de nuevo.";

      if (error.code === 'auth/user-not-found') {
        this.errorRecuperacion = "No existe ninguna cuenta asociada a este correo.";
      } else if (error.code === 'auth/invalid-email') {
        this.errorRecuperacion = "El formato del correo electrónico no es válido.";
      }

      console.error("Error en Password Reset:", error);
    }
  }

}
