import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from "ionicons";
import {arrowBackSharp, ellipsisHorizontal, trash, walkOutline} from "ionicons/icons";
import {AlertController} from "@ionic/angular";
import {AuthService} from "../../services/auth-service";
import {FirestoreService} from "../../services/firestoreService";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-detalle-post',
  templateUrl: './detalle-post.page.html',
  styleUrls: ['./detalle-post.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, IonSpinner, IonIcon, IonButton, IonButtons, IonBackButton]
})
export class DetallePostPage implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(FirestoreService);
  private auth = inject(AuthService);
  private alertCtrl = inject(AlertController);


  post: any = null;
  cargando: boolean = true;
  currentUserUid: string = '';

  constructor() {
    addIcons({ trash, walkOutline, ellipsisHorizontal, arrowBackSharp });
  }

  async ngOnInit() {
    const postId = this.route.snapshot.paramMap.get('id');
    const user = await this.auth.getActualUser();

    if (user) {
      this.currentUserUid = user.uid;
    }

    if (postId) {
      this.cargarPost(postId);
    }
  }

  //con el id del post, llamamos a firestore para que nos devuelva el que coincida con ese id
  cargarPost(id: string) {
    this.firestore.getDocListen<any>('posts', id).subscribe({
      next: (data) => {
        if (data) {
          this.post = { id, ...data };
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;}
    });
  }

  //intecambiar foto principal
  intercambiarFotos() {
    if (this.post) {
      this.post.selfieEnGrande = !this.post.selfieEnGrande;
    }
  }

  //alert de confirmacion de eliminar
  async confirmarEliminacion() {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar Post?',
      message: 'Esta acción no se puede deshacer. El post desaparecerá para todos.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.eliminarPost();
          }
        }
      ]
    });
    await alert.present();
  }

  async eliminarPost() {

    try {
      await this.firestore.borrarItem('posts', this.post.id);
      this.router.navigate(['/tabs/perfil'], { replaceUrl: true });

    } catch (error) {
      console.log("Error al eliminar el post")
    }
  }

}
