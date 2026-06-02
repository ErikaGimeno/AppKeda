import { Component, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton, IonButton, IonButtons, IonCheckbox,
  IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonInput,
  IonInputPasswordToggle, IonItem, IonLabel, IonModal, IonText, IonToolbar
} from '@ionic/angular/standalone';
import { AuthService } from "../../services/auth-service";
import { Router } from "@angular/router";
import { LoadingController, ToastController } from "@ionic/angular/standalone";
import { Usuario } from "../../interfaces/user";
import { FirestoreService } from "../../services/firestoreService";
import { addIcons } from "ionicons";
import {arrowBack, mail, person, lockClosed, calendarOutline, locate} from "ionicons/icons";
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, IonBackButton, IonIcon, IonButtons, IonLabel, IonItem, IonInput, IonCheckbox, IonText, IonButton, IonInputPasswordToggle, IonModal, IonDatetime, IonDatetimeButton]
})
export class RegistroPage {

  protected password = '';

  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private ngZone = inject(NgZone);

  errores = {
    nombre: false,
    apellidos: false,
    email: false,
    ciudad: false,
    password: false
  };

  newUsuario: Usuario = {
    uid: '',
    nombre: '',
    apellidos: '',
    email: '',
    fotoPerfilUrl: '',
    bio: '¡Hola! Soy nuevo en Keda.',
    fechaRegistro: new Date() as any,
    ubicacionActual: null as any,
    verificado: false,
    estadoVerificacion: 'no_requerido',
    dniUrl: '',
    edad: '',
    intereses: [''],
    ciudad: '',
    fechaNacimiento: new Date().toISOString(),
  };
  protected aceptaTerminos: boolean = false;

  constructor() {
    addIcons({
    arrowBack,
    mail,
    person,
    lockClosed,
    calendarOutline,
    locate,
  });
  }

  manejarErrores(codigo: string) {
    if (codigo === 'auth/email-already-in-use') {
      alert('Este correo ya está registrado en Keda.');
    } else if (codigo === 'auth/weak-password') {
      alert('La contraseña es muy débil. Prueba con más de 6 caracteres.');
    }
  }

  //metodo registrar, recogemos la informacion del formulario ngforms, verificamos esa información
  //llamamos al servicio registrar y metemos la información del formulario junto con la del objeto newUsuario por defecto
  //si el registro es correcto nos lleva a la pagina de intro
  async registrar() {

    if (!this.newUsuario) {
      console.error('ERROR: this.newUsuario no está inicializado');
      return;
    }

    this.errores = { nombre: false, apellidos: false, email: false, ciudad: false, password: false };
    let hayErrores = false;
    let mensajeErrorToast = 'Por favor, rellena todos los campos correctamente.';


    if (!this.newUsuario.nombre || this.newUsuario.nombre.trim() === '') { this.errores.nombre = true; hayErrores = true; }
    if (!this.newUsuario.apellidos || this.newUsuario.apellidos.trim() === '') { this.errores.apellidos = true; hayErrores = true; }

    if (!this.password || this.password.trim() === '') { this.errores.password = true; hayErrores = true; }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.newUsuario.email || !emailRegex.test(this.newUsuario.email.trim())) {
      this.errores.email = true;
      hayErrores = true;
      mensajeErrorToast = 'El formato del correo no es válido.';
    }


    const ciudadRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/;

    if (!this.newUsuario.ciudad || this.newUsuario.ciudad.trim() === '') {
      this.errores.ciudad = true;
      hayErrores = true;
    } else if (!ciudadRegex.test(this.newUsuario.ciudad.trim())) {
      this.errores.ciudad = true;
      hayErrores = true;
      mensajeErrorToast = 'La ciudad no puede contener números ni símbolos.';
    }

    if (hayErrores) {
      await this.mostrarToast(mensajeErrorToast, "danger");
      return;
    }

    const edadCalculada = parseInt(this.calcularEdad(this.newUsuario.fechaNacimiento), 10);

    if (isNaN(edadCalculada) || edadCalculada < 18) {
      await this.mostrarToast("Debes ser mayor de 18 años para poder registrarte en Keda.", "danger");
      return;
    }

    if (!this.aceptaTerminos) {
      await this.mostrarToast("Debes aceptar los términos y condiciones", "danger");
      return;
    }

    const nombre = this.newUsuario.nombre?.trim();
    const apellidos = this.newUsuario.apellidos?.trim();
    const email = this.newUsuario.email?.trim();
    const pass = this.password?.trim();

    try {

      const res = await this.authService.register(email, pass);
      const uid = res.user.uid;

      this.newUsuario.uid = uid;
      this.newUsuario.email = email.toLowerCase();
      this.newUsuario.verificado = false;
      this.newUsuario.estadoVerificacion = 'no_requerido';
      this.newUsuario.edad = this.calcularEdad(this.newUsuario.fechaNacimiento);

      await this.firestoreService.postItem(this.newUsuario, 'usuarios', uid);

      this.toastCtrl.create({
        message: '¡Cuenta creada con éxito!',
        duration: 3000,
        color: 'success',
        position: 'bottom'
      }).then(toast => toast.present());

      this.ngZone.run(() => {

        this.router.navigate(['/intro']).then(navSuccess => {
          if (navSuccess) {
            console.log('7. ¡Navegación exitosa!');
          } else {
            console.log('7. Navegación DENEGADA (Revisa tus AuthGuards o app.routes.ts)');
          }
        }).catch(err => {
          console.error('ERROR EN EL ROUTER:', err);
        });
      });

    } catch (error: any) {
      console.error('ERROR DETECTADO:', error);

      this.manejarErrores(error.code);
      await this.mostrarToast(`Error: ${error.message}`, "danger");
    }
  }

  //calculamos la edad del usuario
  private calcularEdad(fechaNacimientoStr: string): string {
    if (!fechaNacimientoStr) return '';

    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimientoStr);

    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const diferenciaMeses = hoy.getMonth() - cumpleanos.getMonth();

    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }

    return edad.toString();
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'Ok',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  protected toggleTerminos(event: any) {
    this.aceptaTerminos = event.detail.checked;
  }
}
