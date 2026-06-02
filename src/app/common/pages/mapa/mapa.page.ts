import {Component, inject, NgZone, OnInit, signal, ViewChild, ViewEncapsulation, WritableSignal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonAvatar,
  IonBadge, IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon, IonImg, IonModal,
  IonSearchbar, IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import * as geofire from 'geofire-common';
import {
  query,
  collection,
  orderBy,
  startAt,
  endAt,
  getDocs,
  Firestore,
  Timestamp,
  arrayUnion,
  doc,
  getDoc, updateDoc, onSnapshot
} from '@angular/fire/firestore';
import {FirestoreService} from "../../services/firestoreService";
import {GoogleMap, MapAdvancedMarker} from "@angular/google-maps";
import {Actividad} from "../../interfaces/actividad";
import {Geolocation} from "@capacitor/geolocation";
import {addIcons} from "ionicons";
import {locate, fastFoodOutline, beer, americanFootball, cafe,fastFood, musicalNotes, calendar, location} from "ionicons/icons";
import {Router} from "@angular/router";
import {ToastController} from "@ionic/angular";
import {Auth, authState} from "@angular/fire/auth";
import {toSignal} from "@angular/core/rxjs-interop";
import { map } from 'rxjs/operators';
import {Subscription} from "rxjs";

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, GoogleMap, MapAdvancedMarker, IonFab, IonSearchbar, IonContent, IonFabButton, IonIcon, IonModal, IonAvatar, IonButton]
})
export class MapaPage implements OnInit {
  firestore = inject(Firestore);
  firestoreService = inject(FirestoreService);
  router = inject(Router);
  toastCtrl = inject(ToastController);
  auth = inject(Auth);
  zone = inject(NgZone)

  actividadSeleccionada = signal<Actividad | null>(null);
  nombreAnfitrion = signal<string>(null);
  public uidUsuario = toSignal(
    authState(this.auth).pipe(
      map(user => user?.uid || null)
    ),
    { initialValue: null }
  );

  imagenAnfitrion = signal<string>("https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp");
  private unsubscribeActividad: (() => void) | null = null;
  private subActividad: Subscription | null = null;

  @ViewChild(GoogleMap) map!: GoogleMap;
  @ViewChild('modalActividadDetalle') modal!: IonModal;
  pinesTotales: Actividad[] = [];
  pinesVisibles: Actividad[] = [];
  textoBusqueda: string = '';

  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: true,
    zoomControl: false,
  };

  center: google.maps.LatLngLiteral = { lat: 40.4167, lng: -3.7037 };
  zoom = 14;

  constructor() {
    addIcons({
      locate,
      cafe,
      americanFootball,
      musicalNotes,
      fastFood,
      beer,
      calendar,
      location
    })
  }

  async ngOnInit() {

    await this.obtenerUbicacionActual();
  }

  ngOnDestroy() {
    if (this.subActividad) this.subActividad.unsubscribe();
  }


  //metodo para cargar en el mapa los pines creados, solamente se ejecuta cuando el usuario no está interactuando con el mapa, es decir, no arrastra el dedo para moverse
  //Apuntamos el centro del mapa, sus coordenadas y miramos en un radio de 5 km
  //metodo para cargar en el mapa los pines creados, solamente se ejecuta cuando el usuario no está interactuando con el mapa, es decir, no arrastra el dedo para moverse
  async cargarMapa() {
    if (!this.map) return;

    this.zone.run(async () => {
      try {
        const center = this.map.getCenter()!;
        const lat = center.lat();
        const lng = center.lng();
        const radiusInM = 5000;

        const ahora = Timestamp.now();

        const bounds = geofire.geohashQueryBounds([lat, lng], radiusInM);
        const promises = [];

        for (const b of bounds) {
          const q = query(
            collection(this.firestore, 'actividades'),
            orderBy('geohash'),
            startAt(b[0]),
            endAt(b[1])
          );
          promises.push(getDocs(q));
        }

        const snapshots = await Promise.all(promises);
        const nuevosPines: Actividad[] = [];
        const coordenadasOcupadas = new Map<string, number>();

        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data() as Actividad;

            const latOriginal = data.lat;
            const lngOriginal = data.lng;

            const distance = geofire.distanceBetween([latOriginal, lngOriginal], [lat, lng]);
            const estaActiva = data.fechaFin && data.fechaFin.toMillis() > ahora.toMillis();

            if (distance * 1000 <= radiusInM && estaActiva) {

              const coordenadaKey = `${latOriginal.toFixed(5)},${lngOriginal.toFixed(5)}`;

              let latAjustada = latOriginal;
              let lngAjustada = lngOriginal;

              if (coordenadasOcupadas.has(coordenadaKey)) {
                const repetidos = coordenadasOcupadas.get(coordenadaKey)!;
                coordenadasOcupadas.set(coordenadaKey, repetidos + 1);

                const angulo = repetidos * (2 * Math.PI / 6);
                const radioDesvio = 0.00004 * (1 + Math.floor(repetidos / 6) * 0.3);

                latAjustada += Math.sin(angulo) * radioDesvio;
                lngAjustada += Math.cos(angulo) * radioDesvio;
              } else {
                coordenadasOcupadas.set(coordenadaKey, 1);
              }

              nuevosPines.push({
                id: docSnap.id,
                ...data,
                lat: latAjustada,
                lng: lngAjustada
              } as Actividad);
            }
          });
        });

        this.pinesTotales = nuevosPines;
        this.aplicarFiltro();

      } catch (error) {
        console.error("Error crítico cargando el mapa:", error);
      }
    });
  }

  //metodo usado por el buscador que según el input, filtra el listado que tenemos de pines en el mapa y solo visualiza aquellos que coincidan con la query
  // se puede buscar por titulo o categoria
  aplicarFiltro(event?: any) {
    const termino = event ? event.target.value.toLowerCase() : this.textoBusqueda.toLowerCase();
    this.textoBusqueda = termino;

    if (!termino.trim()) {
      this.pinesVisibles = [...this.pinesTotales];
      return;
    }

    this.pinesVisibles = this.pinesTotales.filter(p => {
      return p.titulo.toLowerCase().includes(termino) ||
        p.categoria.toLowerCase().includes(termino);
    });
  }

  protected verDetalle(pin: Actividad) {
    this.router.navigate(['/detalle-actividad', pin.id]);
  }

  //metodo para darle a la propiedad center, los datos de ubicación del usuario
  async centrarEnMiUbicacion() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });

      this.center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.zoom = 16;

      console.log('Mapa centrado en:', this.center);
    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
      this.presentToast('No se pudo acceder al GPS', 'danger');
    }
  }

  //obtenemos la ubicación del usuario pidiendo permisos, luego actualizamos el mapa y centramos al usuario
  async obtenerUbicacionActual() {
    try {
      const checkPermissions = await Geolocation.checkPermissions();

      if (checkPermissions.location !== 'granted') {
        const requestPermissions = await Geolocation.requestPermissions();
        if (requestPermissions.location !== 'granted') {
          await this.presentToast('Permiso de ubicación denegado', 'danger');
          return;
        }
      }

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });

      this.center = {
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude
      };

    } catch (error) {
      console.error('Error obteniendo la ubicación', error);
    }
  }

  obtenerIcono(categoria: string): string {
    switch (categoria.toLowerCase()) {
      case 'deporte': return 'american-Football';
      case 'fiesta': return 'beer';
      case 'cafe': return 'cafe';
      case 'musica': return 'musical-notes';
      case 'comida': return 'fast-food';
      default: return 'flash';
    }
  }

  async presentToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'Reintentar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  //metodo para crear pines personalizados con las ubicaciones exactas de las actividades
  crearMarker(pin: Actividad): HTMLElement {
    if (pin.markerElement) {
      return pin.markerElement;
    }

    const container = document.createElement('div');
    container.className = 'marker-container';

    const price = document.createElement('div');
    price.className = 'price-tag';
    price.innerText = pin.precio > 0 ? `$${pin.precio}` : 'Free';
    container.appendChild(price);

    const bubble = document.createElement('div');

    if (pin.estadoPromocion === 'promocionado'){
      bubble.className = 'pin-bubble-premium';

    } else {
      bubble.className = 'pin-bubble';
    }

    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', this.obtenerIcono(pin.categoria));

    bubble.appendChild(icon);

    const shadow = document.createElement('div');
    shadow.className = 'pin-shadow';

    container.appendChild(bubble);
    container.appendChild(shadow);

    pin.markerElement = container;

    return container;
  }

  //metodo que abre el modal del detalle de la actividad y que carga los datos de esta al instante de ser llamada
  async openModal(pin: Actividad) {
    if (this.subActividad) this.subActividad.unsubscribe();

    this.subActividad = this.firestoreService.getDocListen<Actividad>('actividades', pin.id)
      .subscribe(data => {
        if (data) {
          this.actividadSeleccionada.set({ ...data, id: pin.id });
        }
      });
    this.nombreAnfitrion.set("Cargando...");

    if (pin.creadorUid) {
      try {
        const userRef = doc(this.firestore, 'usuarios', pin.creadorUid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          const nombre = userData['nombre'] || '';
          const apellidos = userData['apellidos'] || '';
          const fotoPerfil = userData['fotoPerfilUrl'] || '';

          const nombreCompleto = `${nombre} ${apellidos}`.trim();

          this.nombreAnfitrion.set(nombreCompleto || 'Usuario sin nombre');
          this.imagenAnfitrion.set(fotoPerfil || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp');
        } else {
          this.nombreAnfitrion.set('Anfitrión desconocido');
          this.imagenAnfitrion.set('https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp');
        }
      } catch (error) {
        console.error("Error al obtener el anfitrión:", error);
        this.nombreAnfitrion.set('Error al cargar nombre');
        this.imagenAnfitrion.set('https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp');
      }
    }
    await this.modal.present();
  }

  //metodo para unirse a la actividad, que actualiza en base de datos la propiedad participantesUids y añade la id del usuario actual

  async unirmeAActividad() {
    const user = this.auth.currentUser;
    const actividadActual = this.actividadSeleccionada();

    if (!user || !actividadActual) return;

    try {
      const actividadRef = doc(this.firestore, 'actividades', actividadActual.id);
      const chatRef = doc(this.firestore, 'chats', actividadActual.id);

      await Promise.all([
        updateDoc(actividadRef, { participantesUids: arrayUnion(user.uid) }),
        updateDoc(chatRef, { participantesUids: arrayUnion(user.uid) })
      ]);

      await this.presentToast('¡Te has unido!', 'success');

      await this.modal.dismiss();

    } catch (error) {
      console.error('Error al unirse:', error);
    }
  }

}
