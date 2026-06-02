import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, NgZone, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {FirestoreService} from "../../services/firestoreService";
import {collection, doc, Firestore, GeoPoint, setDoc, Timestamp} from "@angular/fire/firestore";
import {Auth} from "@angular/fire/auth";
import * as geofire from 'geofire-common';
import {Router, RouterLink} from '@angular/router';
import {ToastController} from '@ionic/angular/standalone';
import {
  addSharp,
  americanFootball,
  arrowBackSharp,
  beer,
  cafe,
  calendarClearOutline,
  cloudUpload,
  fastFood,
  flash,
  musicalNotes,
  removeSharp,
  search,
  timeOutline
} from "ionicons/icons";
import {addIcons} from "ionicons";
import {GoogleMap, MapMarker} from "@angular/google-maps";
import {Camera, CameraResultType, CameraSource} from "@capacitor/camera";
import {getDownloadURL, getStorage, ref, uploadBytes} from "@angular/fire/storage";

@Component({
  selector: 'app-crear-actividad',
  templateUrl: './crear-actividad.page.html',
  styleUrls: ['./crear-actividad.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButton, IonInput, IonLabel, IonDatetime, IonModal, IonDatetimeButton,
    IonTextarea, ReactiveFormsModule, IonIcon, RouterLink, GoogleMap, MapMarker, IonSegment, IonSegmentButton],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})

export class CrearActividadPage implements AfterViewInit{

  @ViewChild('inputDireccion') inputElement!: ElementRef;
  autocomplete!: google.maps.places.Autocomplete;

  protected cantidadParticipantes:number = 1;

  public categorias = [
    { value: 'deporte', label: 'Deporte' },
    { value: 'fiesta', label: 'Fiesta' },
    { value: 'cafe', label: 'Café' },
    { value: 'musica', label: 'Música' },
    { value: 'comida', label: 'Comida' }
  ];

  center: google.maps.LatLngLiteral = { lat: 40.4168, lng: -3.7038 };
  markerPosition: google.maps.LatLngLiteral | null = null;
  zoom = 15;

  zone = inject(NgZone);
  router = inject(Router);
  toastController = inject(ToastController);
  storage = getStorage();


  fotoActividad: string | null = null;
  archivoActividad: Blob | null = null;

  actividadForm: FormGroup;
  protected default: boolean = true;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.actividadForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required]],
      precio: ['0'],
      categoria: ['cafe', Validators.required],
      nombreUbicacion: ['', Validators.required],
      direccion: ['', Validators.required],
      lat: [null, [Validators.required]],
      lng: [null, [Validators.required]],
      fechaInicio: [new Date().toISOString(), Validators.required],
      fechaFin: [new Date().toISOString(), Validators.required],
      imageUrl: [''],
      cantidadParticipantes: [1],
    });
  }


  ngAfterViewInit() {
    setTimeout(() => {
      this.autocompletarGoogleMaps();
    }, 500);
    addIcons({
      'arrow-back-sharp': arrowBackSharp,
      'cafe': cafe,
      'fast-food': fastFood,
      'musical-notes': musicalNotes,
      'american-football': americanFootball,
      'beer': beer,
      'flash': flash,
      'search': search,
      'add-sharp': addSharp,
      'remove-sharp': removeSharp,
      'calendar': calendarClearOutline,
      'time': timeOutline,
      'cloud-upload': cloudUpload
    })

  }

  // metodo para coger una foto de la galeria y lo transforma en un fichero que firebase pueda interpretar (BLOB)

  async capturarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (!image.webPath) return;

      this.fotoActividad = image.webPath;

      const response = await fetch(image.webPath);
      this.archivoActividad = await response.blob();

    } catch {
      console.log('Usuario canceló la selección');
    }
  }

  //metodo para subir la foto a la storage y que nos devuelva una url real para meter en el objeto Actividad
  async subirFotoActividad(actividadId: string): Promise<string | null> {
    const user = this.auth.currentUser;

    if (!user || !this.archivoActividad) {
      return null;
    }

    //el path de firebase storage
    const path = `actividades/${user.uid}/${actividadId}/portada.jpg`;
    const storageRef = ref(this.storage, path);

    try {
      const metadata = { contentType: 'image/jpeg' };
      await uploadBytes(storageRef, this.archivoActividad, metadata);
      return await getDownloadURL(storageRef);
    } catch (e) {
      console.error('Error crítico en Storage:', e);
      throw e;
    }
  }

// metodo principal, creacion de la actividad con todos los parametros y a su vez un chat dependiente de esta
//   tambien subimos las coordenadas a geohash para luego poder mostrarlas en el mapa de google maps
  async guardarActividad() {
    if (this.actividadForm.invalid) return;

    const ahora = new Date();
    const data = this.actividadForm.value;
    const fechaInicio = new Date(data.fechaInicio);
    const fechaFin = new Date(data.fechaFin);

    if (fechaInicio < ahora) {
      this.mostrarToast('La fecha de inicio no puede ser anterior al momento actual.', 'danger');
      return;
    }

    if (fechaFin < ahora) {
      this.mostrarToast('La fecha de finalización no puede ser anterior al momento actual.', 'danger');
      return;
    }

    if (fechaFin < fechaInicio) {
      this.mostrarToast('La fecha de fin no puede ser anterior a la fecha de inicio.', 'danger');
      return;
    }
    const user = this.auth.currentUser;
    if (!user) return;

    const rawData = this.actividadForm.value;
    const hash = geofire.geohashForLocation([rawData.lat, rawData.lng]);

    const actividadRef = doc(collection(this.firestore, 'actividades'));
    const actividadId = actividadRef.id;

    const imgUrl = await this.subirFotoActividad(actividadId);

    // clase para la actividad nueva del formulario
    const nuevaActividad = {
      ...rawData,
      id: actividadId,
      precio: Number(rawData.precio),
      cantidadParticipantes: Number(rawData.cantidadParticipantes),
      creadorUid: user.uid,
      ubicacion: new GeoPoint(rawData.lat, rawData.lng),
      geohash: hash,
      fechaInicio: Timestamp.fromDate(new Date(rawData.fechaInicio)),
      fechaFin: Timestamp.fromDate(new Date(rawData.fechaFin)),
      fechaFinChat: Timestamp.fromDate(new Date(rawData.fechaFin)),
      participantesUids: [user.uid],
      imageUrl: imgUrl ?? 'assets/noimgactividad.png',
      estadoPromocion: 'no-promocionado',
      estado: 'activo'
    };

    const nuevoChat = {
      actividadId,
      titulo: rawData.titulo,
      participantesUids: [user.uid],
      fechaFin: Timestamp.fromDate(new Date(rawData.fechaFin)),
      ultimoMensaje: '¡Grupo creado! Bienvenidos.',
      fechaUltimoMensaje: Timestamp.now(),
      actividadImg: imgUrl ?? null
    };

    try {
      await setDoc(actividadRef, nuevaActividad);
      await setDoc(doc(this.firestore, 'chats', actividadId), nuevoChat);

      this.mostrarToast('¡Plan y Chat creados!', 'success');
      this.actividadForm.reset();
      await this.router.navigateByUrl('/tabs/home');

    } catch (error) {
      console.error(error);
      this.mostrarToast('Error al crear la actividad', 'danger');
    }
  }


  //metodo para poder escribir texto, buscar una direccion de google maps y evitar tener que poner a mano las coordenadas
  private autocompletarGoogleMaps() {

    const autocomplete = new google.maps.places.Autocomplete(this.inputElement.nativeElement, {
      types: ['address'],
      fields: ['geometry', 'formatted_address', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      this.zone.run(() => {
        const place = autocomplete.getPlace();

        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();


          this.center = { lat, lng };
          this.markerPosition = { lat, lng };
          this.zoom = 17;

          this.actividadForm.patchValue({
            lat: lat,
            lng: lng,
            direccion: place.formatted_address,
            nombreUbicacion: place.name
          });
        }
      });
    });
  }

  mostrarToast(mensaje: string, color: string) {
    this.toastController.create({
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

   obtenerIcono(categoria: string): string {
    switch (categoria.toLowerCase()) {
      case 'deporte': return 'american-football';
      case 'fiesta': return 'beer';
      case 'cafe': return 'cafe';
      case 'musica': return 'musical-notes';
      case 'comida': return 'fast-food';
      default: return 'flash';
    }
  }

  seleccionarCategoria(categoria: string) {
    this.actividadForm.get('categoria')?.setValue(categoria);
  }

  sumarParticipantes() {
    if (this.cantidadParticipantes < 10) {
      this.cantidadParticipantes++;
      this.actividadForm.get('cantidadParticipantes')?.setValue(this.cantidadParticipantes);
    }
  }

  restarParticipantes() {
    if (this.cantidadParticipantes > 1) {
      this.cantidadParticipantes--;
      this.actividadForm.get('cantidadParticipantes')?.setValue(this.cantidadParticipantes);
    }
  }

  cambiarPestana(event: any) {
    const valor = event.detail.value;
    if (valor === 'pago'){
      this.default = false;
      this.actividadForm.get('precio')?.setValidators([Validators.required]);
      this.actividadForm.get('precio')?.updateValueAndValidity();
    } else {
      this.default = true;
      this.actividadForm.get('precio')?.setValue(0);

    }
  }
}
