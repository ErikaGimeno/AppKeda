import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton, IonButton,
  IonButtons,
  IonContent,
  IonHeader, IonIcon,
  IonInput,
  IonItem,
  IonLabel, IonSelect, IonSelectOption, IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {ActivatedRoute, Router} from "@angular/router";
import {FirestoreService} from "../../services/firestoreService";
import {AuthService} from "../../services/auth-service";
import {LoadingController, ToastController} from "@ionic/angular/standalone";
import {Actividad} from "../../interfaces/actividad";
import {Timestamp} from "@angular/fire/firestore";
import {firstValueFrom} from "rxjs";
import {Usuario} from "../../interfaces/user";
import {addIcons} from "ionicons";
import {arrowBack, saveOutline} from "ionicons/icons";

@Component({
  selector: 'app-crear-post',
  templateUrl: './crear-post.page.html',
  styleUrls: ['./crear-post.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonItem, IonLabel, IonTextarea, IonInput, IonSelectOption, IonSelect, IonSpinner, IonButtons, IonBackButton, IonButton, IonIcon]
})
export class CrearPostPage implements OnInit {

  private ruta = inject(ActivatedRoute)
  private router = inject(Router)
  private firestore = inject(FirestoreService)
  private auth = inject(AuthService)
  private loaderCtrl = inject(LoadingController)
  private toastCtrl = inject(ToastController)

  mediaTemporalUrl: string | null = null
  mediaTemporalFrontUrl: string | null = null
  tipoMedia: string = 'imagen'
  tituloPost: string = ''
  descripcionPost: string = ''
  actividadSeleccionadaId: string = ''

  actividadesUsuario: Actividad[] = []
  cargandoActividades: boolean = true

  constructor() {
    addIcons({
      saveOutline, arrowBack
    })
  }

  ngOnInit() {
    this.ruta.queryParams.subscribe(params => {
      if (params['mediaTemporalUrl']) {
        this.mediaTemporalUrl = params['mediaTemporalUrl']
        this.mediaTemporalFrontUrl = params['mediaTemporalFrontUrl']
        this.tipoMedia = params['tipoMedia'] || 'imagen'
      }
    });

    this.cargarMisActividades();
  }

  async cargarMisActividades() {
    try {
      const user = await this.auth.getActualUser();
      if (!user) return;

      this.firestore.getActividadesParticipando<Actividad>(user.uid).subscribe(actividades => {
        const ahora = new Date();
        this.actividadesUsuario = actividades.filter(act => act.fechaFin.toDate() > ahora);
        this.cargandoActividades = false;
      });
    } catch (error) {
      this.cargandoActividades = false;
    }
  }

  async publicar() {
    if (!this.mediaTemporalUrl || !this.actividadSeleccionadaId || !this.tituloPost.trim()) {
      return this.mostrarToast('Rellena los campos principales y asegúrate de tener una foto/video.', 'warning');
    }

    try {
      const user = await this.auth.getActualUser();
      if (!user) throw new Error("No hay usuario activo");

      const userData = await firstValueFrom(
        this.firestore.getDocListen<Usuario>('usuarios', user.uid)
      );

      if (!userData) throw new Error("No se encontraron los datos del usuario");

      const responseTrasera = await fetch(this.mediaTemporalUrl!);
      const blobTrasera = await responseTrasera.blob();
      const urlRealTrasera = await this.firestore.subirArchivo(blobTrasera, user.uid, this.tipoMedia);

      let urlRealFrontal = '';
      if (this.mediaTemporalFrontUrl) {
        const responseFrontal = await fetch(this.mediaTemporalFrontUrl);
        const blobFrontal = await responseFrontal.blob();
        urlRealFrontal = await this.firestore.subirArchivo(blobFrontal, user.uid, 'imagen');
      }

      const actividadElegida = this.actividadesUsuario.find(a => a.id === this.actividadSeleccionadaId);

      const nuevoPost = {
        usuarioUid: user.uid,
        usuarioNombre: `${userData.nombre} ${userData.apellidos || ''}`.trim(),
        usuarioAvatar: userData.fotoPerfilUrl || 'https://ionicframework.com/docs/img/demos/avatar.svg',
        actividadId: this.actividadSeleccionadaId,
        actividadNombre: actividadElegida?.titulo || 'Actividad',
        titulo: this.tituloPost,
        descripcion: this.descripcionPost,
        imageUrl: urlRealTrasera,
        imageUrlFrontal: urlRealFrontal,
        tipoMedia: this.tipoMedia,
        likes: 0,
        reaccionesFotos: [] as Array<{ uid: string, fotoUrl: string }>,
        fechaCreacion: Timestamp.now(),
        fechaFinActividad: actividadElegida?.fechaFin || Timestamp.now()
      }

      await this.firestore.postItem(nuevoPost, 'posts', this.firestore.createIDdoc());
      this.router.navigate(['/tabs/home'], { replaceUrl: true });

    } catch (error) {
      console.error(error);
      this.mostrarToast('Error al publicar el post', 'danger');
    }
  }

  mostrarToast(mensaje: string, color: string) {
    this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [{ text: 'Ok', role: 'cancel' }]
    }).then(toast => {
      toast.present();
    }).catch(err => {
      console.error('Error al mostrar Toast:', err);
    });
  }
}
