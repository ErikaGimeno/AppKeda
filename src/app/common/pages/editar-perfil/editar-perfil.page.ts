import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons,
  IonChip,
  IonContent, IonFooter,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {Camera, CameraResultType, CameraSource} from "@capacitor/camera";
import {firstValueFrom} from "rxjs";
import {Usuario} from "../../interfaces/user";
import {addIcons} from "ionicons";
import {add, camera, locate, close, chevronBack} from "ionicons/icons";
import {Router} from "@angular/router";
import {LoadingController, ToastController} from "@ionic/angular/standalone";
import {FirestoreService} from "../../services/firestoreService";
import {AuthService} from "../../services/auth-service";

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.page.html',
  styleUrls: ['./editar-perfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSpinner, IonChip, IonIcon, IonLabel, IonFooter, IonButton, IonButtons]
})
export class EditarPerfilPage {

  private auth = inject(AuthService);
  private firestore = inject(FirestoreService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  usuario: Usuario | any = null;
  uid: string = '';
  nombreCompleto: string = '';
  cargando: boolean = true;

  constructor() {
    addIcons({ camera, locate, close, add, chevronBack });
  }

  async ionViewWillEnter() {
    this.cargando = true;
    await this.cargarDatosUsuario();
  }

  //nos hacemos con los datos del usuario actual logeado y lo cargamos
  async cargarDatosUsuario() {
    try {
      const authUser = await this.auth.getActualUser();
      if (authUser) {
        this.uid = authUser.uid;
        const data = await firstValueFrom(this.firestore.getDocListen<Usuario>('usuarios', this.uid));

        if (data) {
          this.usuario = data;
          this.nombreCompleto = `${this.usuario.nombre || ''} ${this.usuario.apellidos || ''}`.trim();
        }
      }
    } catch (error) {
      this.mostrarToast('Error al cargar perfil', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  //usamos el capacitor de camara para abrir la galeria y seleccionar una foto de perfil, llamamos al metodo subirArchivo para subirlo al Storage
  async cambiarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {

        const response = await fetch(image.webPath);
        const blob = await response.blob();

        const url = await this.firestore.subirArchivo(blob, this.uid, 'perfil');

        this.usuario.fotoPerfilUrl = url;
      }
    } catch (e) {
      console.log('El usuario canceló la selección de foto', e);
    }
  }

  eliminarInteres(interes: string) {
    this.usuario.intereses = this.usuario.intereses.filter((i: string) => i !== interes);
  }

  async agregarInteres() {
    if (!this.usuario.intereses) this.usuario.intereses = [];

    if (this.usuario.intereses.length >= 10) {
      this.mostrarToast('Máximo 10 intereses', 'warning');
      return;
    }

    const nuevo = prompt('Escribe un interés:');
    if (nuevo && nuevo.trim() !== '') {
      this.usuario.intereses.push(nuevo.trim());
    }
  }


  //cogemos de los campos del formulario los datos formateados y la url de la imagen subida y actualizamos el perfil del usurio
  async guardarCambios() {

    try {
      if (!this.uid) {
        return;
      }

      const partes = this.nombreCompleto.split(' ');
      const nombre = partes[0] || '';
      const apellidos = partes.slice(1).join(' ') || '';

      const datosActualizados = {
        nombre: nombre,
        apellidos: apellidos,
        bio: this.usuario.bio || '',
        ciudad: this.usuario.ciudad || '',
        intereses: this.usuario.intereses || [],
        fotoPerfilUrl: this.usuario.fotoPerfilUrl || ''
      };

      await this.firestore.updateItem('usuarios', this.uid, datosActualizados);


      await this.router.navigate(['/tabs/perfil']);

    } catch (error) {
      await this.mostrarToast('Error al guardar', 'danger');
    }
  }

  async mostrarToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }

  cancelar() {
    this.router.navigate(['/tabs/perfil']);
  }

}
