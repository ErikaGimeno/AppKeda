import {Component, inject, OnInit, signal, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonAvatar,
  IonBackButton,
  IonButton, IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput, IonItem, IonLabel, IonList, IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {ActivatedRoute, Router} from "@angular/router";
import {doc, Firestore, getDoc, updateDoc, arrayRemove, Timestamp} from "@angular/fire/firestore";
import {Actividad} from "../../interfaces/actividad";
import {combineLatest, Subscription, timestamp} from "rxjs";
import {addIcons} from "ionicons";
import {
  americanFootball,
  arrowBackSharp,
  beer,
  cafe,
  fastFood,
  flash,
  informationCircle,
  musicalNotes,
  send
} from "ionicons/icons";
import {FirestoreService} from "../../services/firestoreService";
import {Auth, authState} from "@angular/fire/auth";
import {Mensaje} from "../../interfaces/mensaje";
import {Usuario} from "../../interfaces/user";
import {AlertController, ToastController} from "@ionic/angular/standalone";

@Component({
  selector: 'app-interior-chat',
  templateUrl: './interior-chat.page.html',
  styleUrls: ['./interior-chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonInput, IonFooter, IonButtons, IonBackButton, IonModal, IonList, IonItem, IonAvatar, IonLabel]
})
export class InteriorChatPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonModal) modalParticipantes!: IonModal;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private firebaseService = inject(FirestoreService);
  private auth = inject(Auth);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public actividadSeleccionada: Actividad | null = null;
  public chatId = "";
  public nuevoTexto = signal("");
  public mensajes = signal<Mensaje[]>([]);
  public usuarioActual: any = null;
  public listaParticipantes = signal<Usuario[]>([]);
  private participantesSub: Subscription | null = null;
  private actividadSub: Subscription | null = null;


  constructor() {
    addIcons({
      'arrow-back-sharp': arrowBackSharp,
      'send': send,
      'american-football': americanFootball,
      'beer': beer,
      'cafe': cafe,
      'musical-notes': musicalNotes,
      'fast-food': fastFood,
      'flash': flash,
      'information-circle': informationCircle,
    })
  }

 async ngOnInit() {

   this.chatId = this.route.snapshot.paramMap.get('id') || '';


   authState(this.auth).subscribe(userAuth => {
     if (userAuth) {
       this.firebaseService.getDocListen<Usuario>('usuarios', userAuth.uid)
         .subscribe(datosCompletos => {
           if (datosCompletos) {
             this.usuarioActual = datosCompletos;
             if (this.chatId) {
               this.cargarMensajes();
             }
           }
         });
     }
   });

   //codigo que se ejecuta al instante, se queda observando a la coleccion actividades en caso de que salga de la actividad o que la borre,
   //te devuelve a la pagina chats y te borra el chat
    if (this.chatId) {
      const docRef = doc(this.firestore, 'actividades', this.chatId);
      const docSnap = await getDoc(docRef);

      this.actividadSub = this.firebaseService.getDocListen<Actividad>('actividades', this.chatId)
        .subscribe(data => {
          if (data) {
            this.actividadSeleccionada = data;

            const miUid = this.auth.currentUser?.uid;
            const participantes = data.participantesUids || [];

            if (miUid && !participantes.includes(miUid)) {
              this.presentToast('La actividad ha finalizado o ya no formas parte de ella', 'danger');
              this.router.navigate(['/tabs/chats'], { replaceUrl: true });
              return;
            }

            this.getParticipantes(participantes);
          } else {

            this.router.navigate(['/tabs/chats'], { replaceUrl: true });
          }
        });

      if (docSnap.exists()) {
        this.actividadSeleccionada = { id: docSnap.id, ...docSnap.data() } as Actividad;
      }
    }
  }

  ngOnDestroy() {
    if (this.actividadSub) this.actividadSub.unsubscribe();
    if (this.participantesSub) this.participantesSub.unsubscribe();
  }


  protected readonly timestamp = timestamp;

  //cargamos los mensajes
  cargarMensajes() {
    this.firebaseService.getMensajes(this.chatId).subscribe(listadoMensajes => {
      this.mensajes.set(listadoMensajes);
      console.log(this.mensajes());
      this.scrollToBottom();
    });
  }

  //subimos los mensajes enviados a la base de datos
  async mandarMensaje(){
    if (this.nuevoTexto().trim() && this.usuarioActual){
      const texto = this.nuevoTexto();
      this.nuevoTexto.set('');
      await this.firebaseService.enviarMensaje(this.chatId, texto, this.usuarioActual);
    }
  }

  //si llegan mensajes bajamos la pantalla
  scrollToBottom() {
    setTimeout(() => {
      this.content.scrollToBottom(300);
    }, 100);
  }

  obtenerIcono(categoria: string): string {
    switch (categoria.toLowerCase()) {
      case 'deporte':
        return 'american-football';
      case 'fiesta':
        return 'beer';
      case 'cafe':
        return 'cafe';
      case 'musica':
        return 'musical-notes';
      case 'comida':
        return 'fast-food';
      default:
        return 'flash';
    }
  }

//cargamos una lista con los participantes de la actividad
  private getParticipantes(uids: string[]) {
    if (uids.length === 0) {
      this.listaParticipantes.set([]);
      return;
    }
    if (this.participantesSub) this.participantesSub.unsubscribe();

    const observables = uids.map(uid =>
      this.firebaseService.getDocListen<Usuario>('usuarios', uid)
    );

    this.participantesSub = combineLatest(observables).subscribe(usuarios => {
      this.listaParticipantes.set(usuarios.filter(u => u !== null));
    });
  }

  async openModal() {
    await this.modalParticipantes.present();
  }

  //alerts para confirmar la salida o el borrado de la actividad dependiendo de si somos hosts o no
  async confirmarSalida() {
    const alert = await this.alertCtrl.create({
      header: '¿Abandonar actividad?',
      message: 'Ya no podrás ver los mensajes ni participar en este plan.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, salir',
          role: 'destructive',
          handler: () => this.abandonarActividad()
        }
      ]
    });
    await alert.present();
  }

  async abandonarActividad() {
    const user = this.auth.currentUser;
    if (!user || !this.chatId) return;

    try {
      const actividadRef = doc(this.firestore, 'actividades', this.chatId);
      const chatRef = doc(this.firestore, 'chats', this.chatId);

      await Promise.all([
        updateDoc(actividadRef, { participantesUids: arrayRemove(user.uid) }),
        updateDoc(chatRef, { participantesUids: arrayRemove(user.uid) })
      ]);

      this.router.navigate(['/tabs/chats'], { replaceUrl: true });

    } catch (error) {
      await this.presentToast("Error al abandonar la actividad", "danger");
    }
  }

  async confirmarBorrado() {
    const alert = await this.alertCtrl.create({
      header: '¿Borrar actividad?',
      message: 'La actividad finalizará ahora mismo. Desaparecerá del mapa y el chat se cerrará para todos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar para todos',
          role: 'destructive',
          handler: () => this.borrarActividadTotal()
        }
      ]
    });
    await alert.present();
  }

  //"borramos" la actividad quiere decir que la actualizamos para que la fecha fin se ahora mismo y que así se oculte el chat y en el mapa
  async borrarActividadTotal() {
    if (!this.chatId) return;

    try {
      const ahora = Timestamp.now();
      const actividadRef = doc(this.firestore, 'actividades', this.chatId);
      const chatRef = doc(this.firestore, 'chats', this.chatId);

      await Promise.all([
        updateDoc(actividadRef, {
          fechaFin: ahora,
          participantesUids: []
        }),
        updateDoc(chatRef, {
          participantesUids: []
        })
      ]);

      this.router.navigate(['/tabs/chats'], { replaceUrl: true });

    } catch (error) {
      await this.presentToast("Error al borrar la actividad", "danger");

    }
  }

  async presentToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'bottom'
    })
    await toast.present();
  }
}
