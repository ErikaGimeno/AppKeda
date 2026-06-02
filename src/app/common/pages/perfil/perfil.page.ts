import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule, formatDate} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
  IonAvatar, IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCol,
  IonContent, IonGrid, IonHeader, IonIcon, IonImg, IonInput, IonItem, IonLabel, IonList, IonRow, IonSegment,
  IonSegmentButton, IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {arrowBackSharp, createOutline, calendarClearOutline, settings, share, logOutOutline} from "ionicons/icons";
import {Router, RouterLink} from "@angular/router";
import {Usuario} from "../../interfaces/user";
import {Auth, user} from "@angular/fire/auth";
import {doc, Firestore, getDoc, Timestamp} from "@angular/fire/firestore";
import {ToastController} from "@ionic/angular/standalone";
import {FirestoreService} from "../../services/firestoreService";
import {Actividad} from "../../interfaces/actividad";
import {AuthService} from "../../services/auth-service";
import {Post} from "../../interfaces/post";

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonSpinner, IonIcon, IonLabel, IonList, IonAvatar, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonBadge, IonSegment, IonSegmentButton, IonInput, ReactiveFormsModule, IonCard, IonImg, IonCardHeader, IonCardContent, IonGrid, IonRow, IonCol, RouterLink,]
})
export class PerfilPage implements OnInit {

  private auth = inject(Auth);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private toasCtrl = inject(ToastController);
  private firestoreService = inject(FirestoreService);

  protected default = true;
  perfilUsuario = signal<Usuario | null>(null);
  actividadesHost = signal<Actividad[]>([]);
  actividadesParticipantes = signal<Actividad[]>([]);
  media = signal<Post[]>([]);
  segmentoActual: string = 'miseventos';
  listaPruebaHost: Actividad[] = [];
  fechaActual : Timestamp;
  listaPruebaParticipante: Actividad[] = [];
  listaIntereses: string[] = [];
  imagenAnfitrion = signal<string>("https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp");


  constructor() {
    addIcons({
      'arrow-back-sharp': arrowBackSharp,
      'settings': settings,
      'share': share,
      'calendar': calendarClearOutline,
      'log-out-outline': logOutOutline,
      'create-outline': createOutline
    });
  }

  ngOnInit() {
    this.getUsuario();
    this.fechaActual = Timestamp.now();
  }

  //metodo para cargar el usuario actual logeado para así hacer las querys correspondientes
  getUsuario() {
    user(this.auth).subscribe(u => {
      if (u) {
        this.cargarDatosPerfil(u.uid);
        this.cargarActividadesHost(u.uid);
        this.cargarActividadesParticipante(u.uid);
        this.cargarPosts(u.uid);
      }
    });
  }

  //cargamos los posts del usuario actual para filtrar por su id y los ordenamos por fecha
  cargarPosts(uid: string) {
    this.firestoreService.getColleccion<Post>('posts', 'usuarioUid', uid).subscribe({
      next: data => {
        const ordenados = data.sort((a: any, b: any) => b.fecha?.seconds - a.fecha?.seconds);
        this.media.set(ordenados);
      }
    });
  }

  //cargamos los datos del perfil, como su foto o sus intereses
  cargarDatosPerfil(uid: string) {
    if (uid){
      this.firestoreService.getDocListen<Usuario>("usuarios", uid).subscribe({
        next: data => {
          this.perfilUsuario.set(data);
          this.listaIntereses = this.perfilUsuario()?.intereses;
        }
      })
    }
  }

  //cargamos las actividades relacionadas con el usuario, donde el usuario es creador de esta
  cargarActividadesHost(uid: string) {
    this.firestoreService.getColleccion<Actividad>('actividades', 'creadorUid', uid).subscribe({
      next: data => {
        this.actividadesHost.set(data);
        this.listaPruebaHost = data;
        console.log(this.listaPruebaHost);
      }
    })
  }

  //cargamos las actividades donde el usuario es participante pero NO es el host
  cargarActividadesParticipante(uid: string) {
    this.firestoreService.getActividadesParticipando<Actividad>(uid)
      .subscribe(data => {
        const filtradas = data.filter(act => act.creadorUid !== uid);
        this.actividadesParticipantes.set(filtradas);
        this.listaPruebaParticipante = filtradas;
        console.log(this.listaPruebaParticipante);
      });
  }


  cambiarPestana(event: any) {
    this.segmentoActual = event.detail.value;
  }

  protected readonly formatDate = formatDate;

  logout(){
    this.authService.logout();
    this.router.navigate(["/login"]);
  }

  verDetalle(id: string) {
    if (!id) return;
    this.router.navigate(['/detalle-actividad', id]);
  }


  irADetalle(id: string) {
    if (!id) return;
    this.router.navigate(['/detalle-post', id]);
  }
}


