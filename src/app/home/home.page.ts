import {
  Component,
  inject,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild, HostListener
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonFab,
  IonFabButton,
  IonIcon,
  IonRippleEffect,
  IonCard,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonAvatar,
  IonFabList, IonInfiniteScroll, IonInfiniteScrollContent, IonButtons, IonRouterLink
} from '@ionic/angular/standalone';
import {Usuario} from "../common/interfaces/user";
import {FirestoreService} from "../common/services/firestoreService";
import {FormsModule} from "@angular/forms";
import {AuthService} from "../common/services/auth-service";
import {Router, RouterLink} from "@angular/router";
import {
  addOutline, calendarClearOutline, camera, heart, heartOutline,
  locationOutline, peopleOutline, videocam, add,
  chatbubble, shareSocial, bookmark, search
} from "ionicons/icons";
import {addIcons} from "ionicons";
import {CurrencyPipe, DatePipe, UpperCasePipe} from "@angular/common";
import {Actividad} from "../common/interfaces/actividad";
import {Post} from "../common/interfaces/post";
import {Camera, CameraDirection, CameraResultType, CameraSource} from "@capacitor/camera";
import {arrayRemove, arrayUnion, Timestamp} from "@angular/fire/firestore";
import {firstValueFrom, Observable} from "rxjs";


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, FormsModule, IonIcon, IonRippleEffect, IonCard, DatePipe, CurrencyPipe, IonRefresher, IonSpinner, IonFab, IonFabButton, IonAvatar, IonRefresherContent, IonHeader, IonToolbar, IonTitle, IonFabList, IonInfiniteScroll, IonInfiniteScrollContent, IonButton, IonButtons, IonRouterLink, UpperCasePipe],
})
export class HomePage implements AfterViewInit, OnDestroy{
  users: Usuario[] = [];
  fireService: FirestoreService = inject(FirestoreService);
  authService : AuthService = inject(AuthService);
  router: Router = inject(Router);

  protected newUser: Usuario;
  protected cargado: boolean = true

  actividades: Actividad[] = []
  cargando: boolean = true

  posts: Post[] = [];
  cargaInicial: boolean = true
  ultimoPost: any = null
  hayMasPost: boolean = true

  actividadesPromocion: any[] = [];
  indicePromocion = 0;


  @ViewChildren('videoElement') videoElements!: QueryList<ElementRef<HTMLVideoElement>>
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  private observador: IntersectionObserver | null = null
  private temporizadoresLikes: { [postId: string]: any } = {}

  constructor() {
    addIcons({ camera, heart, heartOutline, addOutline, videocam, add,
      chatbubble, shareSocial, bookmark, search});
  }

  ngOnDestroy(): void {
      if (this.observador) {
        this.observador.disconnect();
      }
    }

  ngAfterViewInit(): void {
    this.configurarRadarDeVideos();
    this.videoElements.changes.subscribe(() => {
      this.actualizarVideosObservados();
    });
    }

  async ionViewWillEnter(){
    await Promise.all([
      this.cargarPostsIniciales(),
      this.cargarActividadesPromocionadas()
    ]);

  }

  // metodo que detecta si el objeto está siendo visualizado en pantall
  configurarRadarDeVideos() {
    const opciones = {threshold: 0.6};

    this.observador = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;

        if (entry.isIntersecting) {
          video.play().catch(error => {
            console.log("El navegador bloqueó el autoplay (suele pasar si tiene sonido).", error);
          });
        } else {
          video.pause();

          video.currentTime = 0;
        }
      });
    }, opciones);

    this.actualizarVideosObservados();
  }


  actualizarVideosObservados() {
    if (!this.observador) return;
    this.observador.disconnect();

    this.videoElements.forEach(videoRef => {
      this.observador!.observe(videoRef.nativeElement);
    });
  }

  // montamos un observable para recoger las actividades solamente las promocionadas y mostrarlas en el feed
  async cargarActividadesPromocionadas() {
    try {
      const obs$ = this.fireService.getFiltrado<Actividad>('actividades', 'estadoPromocion', 'promocionado');
      const todasLasPromociones = await firstValueFrom(obs$);

      const ahoraMs = Timestamp.now().toMillis();
      const promocionesVigentes: Actividad[] = [];

      for (const actividad of todasLasPromociones) {
        const fechaFinMs = actividad.fechaFin ? actividad.fechaFin.toMillis() : 0;

        if (fechaFinMs < ahoraMs) {
          if (actividad.id) {
            this.fireService.updateItem('actividades', actividad.id, {
              estadoPromocion: 'no-promocionado'
            }).catch(err => console.error("Error al limpiar promoción caducada:", err));
          }
        } else {
          promocionesVigentes.push(actividad);
        }
      }

      this.actividadesPromocion = promocionesVigentes;

    } catch (e) {
      console.error("Error cargando promociones", e);
    }
  }

  getActividadRelacionada(index: number): Actividad | null {
    if (this.actividadesPromocion.length === 0) return null;
    const i = index % this.actividadesPromocion.length;
    return this.actividadesPromocion[i];
  }

  //cargamos todos los post de la base de datos y llamamos al metodo getPostsPaginados para hacer un infinite scroll, no
  //no sobrecargamos al cliente cargando todos los post de toda la base de datos, por rendimiento
  async cargarPostsIniciales(event?: any) {
    try {
      this.cargaInicial = true;
      this.posts = [];
      this.ultimoPost = null;
      this.hayMasPost = true;

      const postsPaginados = await this.fireService.getPostsPaginados(10);
      this.procesadoPosts(postsPaginados);

    } catch (error) {
      console.error("Error al cargar posts:", error);
    } finally {
      this.cargaInicial = false;
      if (event) event.target.complete();
    }
  }

//hace la carga de los posts desde el último post cargado de la carga inicial
  async cargarMasPosts(event: any) {
    try {
      if (!this.ultimoPost || !this.hayMasPost) {
        event.target.complete();
        return;
      }

      const postsPaginados = await this.fireService.getPostsPaginados(10, this.ultimoPost);
      this.procesadoPosts(postsPaginados);

      if (postsPaginados.empty || postsPaginados.docs.length < 10) {
        this.hayMasPost = false;
      }
    } catch (error) {
      console.error("Error al cargar más posts:", error);
    } finally {
      event.target.complete();
    }
  }

  //formateamos la fecha de los posts nuevos cargados y controlamos si el usuario ya ha dado like al post
  async procesadoPosts(snapshot: any) {

    const authUser = await this.authService.getActualUser();
    const uidUserActual = authUser.uid;

    if (!snapshot.empty) {
      this.ultimoPost = snapshot.docs[snapshot.docs.length - 1];

      const nuevosPosts = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        data.id = doc.id;
        if (data.fechaCreacion) {
          data.tiempo = this.calcularTiempoString(data.fechaCreacion.toDate());
        }
        data.haDadoLike = uidUserActual ? data.likesUids?.includes(uidUserActual) : false;
        data.selfieEnGrande = false;
        return data;
      });

      this.posts = [...this.posts, ...nuevosPosts];
    } else {
      this.hayMasPost = false;
    }
  }

  private calcularTiempoString(fecha: Date): string {
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return `Ayer`;
    return `Hace ${diffDias} d`;
  }

  //metodo para actualizar variable like cuando le damos al boton que tiene un tiempo de retardo para evitar que el usuario sture el servidor
  async toggleLike(post: Post) {
    const authUser = await this.authService.getActualUser();
    if (!authUser || !post.id) return;

    const uidUserActual =  authUser.uid;

    if (!post.likesUids) post.likesUids = [];

    if (post.haDadoLike) {
      post.likesUids = post.likesUids.filter(id => id !== uidUserActual);
      post.haDadoLike = false;
    } else {
      post.likesUids.push(uidUserActual);
      post.haDadoLike = true;
    }

    if (this.temporizadoresLikes[post.id]) clearTimeout(this.temporizadoresLikes[post.id]);

    this.temporizadoresLikes[post.id] = setTimeout(async () => {
      try {
        await this.fireService.updateItem('posts', post.id!, {
          likesUids: post.haDadoLike
            ? arrayUnion(uidUserActual)
            : arrayRemove(uidUserActual)
        });
      } catch (e) {
        console.error(e);
      }
    }, 1500);
  }

//metodo para cambiar de fotografia principal el post
  intercambiarFotos(post: any) {
    if (post.imageUrlFrontal) {
      post.selfieEnGrande = !post.selfieEnGrande;
    }
  }

  protected readonly Timestamp = Timestamp;

  irActividadDetalle(id: string) {
    this.router.navigate([`/detalle-actividad/${id}`]);
  }

  @HostListener('window:scroll-home-top')
  subirArriba() {
    if (this.content) {
      this.content.scrollToTop(500);
    }
  }
}
