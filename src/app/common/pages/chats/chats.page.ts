import {
  Component,
  inject,
  NgZone,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonAvatar,
  IonContent,
  IonHeader,
  IonIcon, IonImg,
    IonRippleEffect,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {collection, collectionData, Firestore, orderBy, query, Timestamp, where} from "@angular/fire/firestore";
import {Auth, authState} from "@angular/fire/auth";
import {Chat} from "../../interfaces/chat";
import {Observable, of, switchMap} from "rxjs";
import {Router} from "@angular/router";
import {addIcons} from "ionicons";
import {peopleOutline, chatbubblesOutline, people, chevronForward} from "ionicons/icons";

@Component({
  selector: 'app-chats',
  templateUrl: './chats.page.html',
  styleUrls: ['./chats.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonIcon, IonRippleEffect, IonAvatar, IonImg]
})
export class ChatsPage implements OnInit {

  auth = inject(Auth);
  firestore = inject(Firestore);
  router = inject(Router)
  zone = inject(NgZone);

  chats$: Observable<Chat[]> = of([]);
  constructor() { }

  ngOnInit() {
    this.obtenerMisChatsActivos();
    addIcons({
      chatbubblesOutline,
      peopleOutline,
      people,
      chevronForward
    })
  }

  /*metodo para devolver los chats asociados a un id de usuario, para poder mapearlos en la página.
  * Se ordenan por fecha de caducidad, solo muestra los que estén activos*/
  obtenerMisChatsActivos() {
    this.chats$ = authState(this.auth).pipe(
      switchMap(user => {
        if (user) {
          const ahora = Timestamp.now();
          const chatsRef = collection(this.firestore, 'chats');
          const q = query(
            chatsRef,
            where('participantesUids', 'array-contains', user.uid),
            where('fechaFin', '>', ahora),
            orderBy('fechaFin', 'asc')
          );
          console.log(this.chats$)
          return collectionData(q, { idField: 'actividadId' });
        } else {
          return of([]);
        }
      })
    );
  }


  abrirChat(actividadId: string) {
    this.zone.run(() => {
      this.router.navigate(['/interior-chat', actividadId]);
    });
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
