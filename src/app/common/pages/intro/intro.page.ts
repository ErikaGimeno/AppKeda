import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonImg,
  IonLabel,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {Router, RouterLink} from "@angular/router";
import {animate, style, transition, trigger} from "@angular/animations";

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule,
    FormsModule, IonLabel, IonButton, IonImg, RouterLink],
  animations:[
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('400ms 200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})
export class IntroPage implements OnInit {

  stepIntro = 1;
  protected textoNextStep: string = "";
  router = inject(Router)
  constructor() { }

  ngOnInit() {
    this.textoNextStep = "Siguiente"
  }

  nextStep(){
    this.stepIntro++;
    if (this.stepIntro == 2){
      this.textoNextStep = "Continuar"
    } else if (this.stepIntro == 3){
      this.textoNextStep = "¡Vamos a ello!"
    } else {
      this.router.navigateByUrl('/tabs/home', {replaceUrl: true});
    }
  }

  prevStep(){
    this.stepIntro--;
  }

}
