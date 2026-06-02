import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonFab, IonFabButton, IonFabList,
  IonIcon, IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons} from "ionicons";
import {compass, search, caretForwardCircle, person, add, chatboxEllipses, bicycleOutline, home} from "ionicons/icons";
import {Router, RouterLink} from "@angular/router";
import {Camera, CameraDirection, CameraResultType, CameraSource} from "@capacitor/camera";

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonFab, IonFabButton, RouterLink, IonFabList]
})
export class TabsPage{

  private router = inject(Router)
  constructor() {
    addIcons({
      compass,
      search,
      caretForwardCircle,
      person,
      add,
      chatboxEllipses,
      bicycleOutline,
      home
    })
  }

  // metodo para capturar las fotografias con el capacitor de la cámara, que manda por url a la pagina crear post una serie de parametros
  async capturarPostRapido() {
    try {
      const fotoTrasera = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear
      });

      const fotoFrontal = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: CameraDirection.Front
      });

      if (fotoTrasera.webPath && fotoFrontal.webPath) {
        this.router.navigate(['/crear-post'], {
          queryParams: {
            mediaTemporalUrl: fotoTrasera.webPath,
            mediaTemporalFrontUrl: fotoFrontal.webPath,
            tipoMedia: 'imagen'
          }
        });
      }
    } catch (e) {
      console.log('Captura de foto cancelada', e);
    }
  }

  //metodo para capturar el video, también envia por la url los parametros para que el video viaje a la pantalla de crear posts
  protected capturarVideoRapido(event: any) {
    const file = event.target.files[0];

    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('El vídeo es demasiado grande. El límite son 50MB.');
        event.target.value = '';
        return;
      }

      const videoUrlTemporal = URL.createObjectURL(file);

      this.router.navigate(['/crear-post'], {
        queryParams: {
          mediaTemporalUrl: videoUrlTemporal,
          tipoMedia: 'video'
        }
      });
    }
  }
}
