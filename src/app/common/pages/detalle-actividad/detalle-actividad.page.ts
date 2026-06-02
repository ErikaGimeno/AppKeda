import {Component, inject, OnInit} from '@angular/core';
import { Share } from '@capacitor/share';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton, IonBadge,
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent, IonFooter,
  IonHeader,
  IonIcon, IonItem, IonLabel, IonList, IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {
  arrowBackSharp,
  americanFootball,
  cafe,
  fastFoodOutline,
  beer,
  musicalNotes,
  arrowBack,
  heartOutline, shareSocialOutline, calendar, locate, chatbubbleEllipsesOutline
} from "ionicons/icons";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {arrayRemove, arrayUnion, doc, Firestore, getDoc} from "@angular/fire/firestore";
import {Actividad} from "../../interfaces/actividad";
import {AuthService} from "../../services/auth-service";
import {FirestoreService} from "../../services/firestoreService";
import {LoadingController, ToastController} from "@ionic/angular";
import {firstValueFrom} from "rxjs";
import {GoogleMapsModule} from "@angular/google-maps";

@Component({
  selector: 'app-detalle-actividad',
  templateUrl: './detalle-actividad.page.html',
  styleUrls: ['./detalle-actividad.page.scss'],
  standalone: true,
  imports: [IonContent, IonTitle, IonToolbar, CommonModule,
    FormsModule, IonButton, IonIcon, RouterLink, IonCard, IonCardHeader,
    IonCardSubtitle, GoogleMapsModule, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonSpinner, IonBadge, IonFooter, IonButtons, IonBackButton]
})
export class DetalleActividadPage {

  mapCenter: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  mapOptions: google.maps.ControlPosition = {
    disableDefaultUI: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 15,
    minZoom: 12
  } as any;

  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
    icon: {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 ' +
        '13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 ' +
        '9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 ' +
        '1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: '#8A2BE2',
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff',
      scale: 2,
      anchor: new google.maps.Point(12, 22)
    }
  };

  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private fireService = inject(FirestoreService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  actividadId: string = '';
  actividad: any = null;
  host: any = null;
  participantesFotos: string[] = [];

  uidActual: string = '';
  yaUnido: boolean = false;
  cargando: boolean = true;
  estaFinalizada: boolean = false;

  constructor() {
    addIcons({ arrowBack, heartOutline, shareSocialOutline, calendar, locate, chatbubbleEllipsesOutline });
  }

  async ionViewWillEnter() {
    this.actividadId = this.ruta.snapshot.paramMap.get('id') || '';
    if (this.actividadId) {
      await this.cargarDatos();
    }
  }

  //cargamos los datos de la actividad filtrada por id
  async cargarDatos() {
    try {
      this.cargando = true;
      this.estaFinalizada = false;

      const user = await this.auth.getActualUser();
      if (user) this.uidActual = user.uid;

      const actData = await firstValueFrom(this.fireService.getDocListen<any>('actividades', this.actividadId));
      if (!actData) {
        this.volver();
        return;
      }
      this.actividad = actData;

      const ahora = new Date();

      if (this.actividad.fechaFin) {
        const fechaFin = this.actividad.fechaFin.toDate();
        this.estaFinalizada = ahora > fechaFin;
      }


      this.yaUnido = this.actividad.participantesUids?.includes(this.uidActual);

      const hostData = await firstValueFrom(this.fireService.getDocListen<any>('usuarios', this.actividad.creadorUid));
      this.host = hostData || { nombre: 'Usuario', fotoPerfilUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg' };

      this.participantesFotos = [];
      const uidsParaMostrar = this.actividad.participantesUids?.slice(0, 4) || [];
      for (const uid of uidsParaMostrar) {
        const uData = await firstValueFrom(this.fireService.getDocListen<any>('usuarios', uid));
        if (uData && uData.fotoPerfilUrl) {
          this.participantesFotos.push(uData.fotoPerfilUrl);
        } else {
          this.participantesFotos.push('https://ionicframework.com/docs/img/demos/avatar.svg');
        }
      }
      if (this.actividad && this.actividad.ubicacion) {
        this.mapCenter = {
          lat: this.actividad.ubicacion.latitude,
          lng: this.actividad.ubicacion.longitude
        };
      }

    } catch (error) {
      console.error('Error cargando actividad:', error);
    } finally {
      this.cargando = false;
    }
  }


  volver() {
    this.router.navigate(['/tabs/perfil']);

  }

  abrirChat() {
    this.router.navigate(['/interior-chat', this.actividadId]);
  }

  //montamos un correo o un mensaje de texto para mandar el link a la actividad

  async compartir() {
    try {
      await Share.share({
        title: this.actividad.titulo,
        text: `¡Mira este planazo en Keda: ${this.actividad.titulo}!`,
        url: `https://tuapp.com/actividad/${this.actividadId}`,
        dialogTitle: 'Compartir con amigos',
      });
    } catch (e) {
      console.log('Compartir cancelado o no soportado');
    }
  }

  //metodo para unirnos a la actividad, que realiza algunas validaciones, como que no estemos unidos ya, que no esté acabada la actividad, etc
  //si no se cumple nada de eso, actualiza el campo participantesUids y mete el del usuario actual logeado
  async unirse() {
    if (!this.uidActual) return;

    if (!this.yaUnido && this.actividad.participantesUids.length >= (this.actividad.cantidadParticipantes || 15)) {
      const t = await this.toastCtrl.create({ message: 'El plan está lleno', duration: 2000, color: 'warning' });
      return t.present();
    }

    const loading = await this.loadingCtrl.create({ message: this.yaUnido ? 'Saliendo...' : 'Uniéndote...' });
    await loading.present();

    try {
      const accion = this.yaUnido ? arrayRemove(this.uidActual) : arrayUnion(this.uidActual);

      await this.fireService.updateItem('actividades', this.actividadId, {
        participantesUids: accion
      });

      await this.fireService.updateItem('chats', this.actividadId, {
        participantesUids: accion
      });

      if (this.yaUnido) {
        this.actividad.participantesUids = this.actividad.participantesUids.filter((id: string) => id !== this.uidActual);
        this.yaUnido = false;
      } else {
        this.actividad.participantesUids.push(this.uidActual);
        this.yaUnido = true;
      }

      const msg = this.yaUnido ? '¡Te has unido al plan!' : 'Has salido del plan';
      const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'success' });
      await toast.present();

    } catch (error) {
      console.error(error);
      const toast = await this.toastCtrl.create({ message: 'Hubo un error', duration: 2000, color: 'danger' });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  obtenerIcono(categoria: string): string {
    switch (categoria?.toLowerCase()) {
      case 'deporte': return 'american-football';
      case 'fiesta': return 'beer';
      case 'cafe': return 'cafe';
      case 'musica': return 'musical-notes';
      case 'comida': return 'fast-food';
      default: return 'flash';
    }
  }


}
