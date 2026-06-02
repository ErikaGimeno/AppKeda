import { Timestamp, GeoPoint } from '@angular/fire/firestore';

export interface Chat {
  actividadId: string;
  titulo: string;
  participantesUids: string[];
  fechaFin: Timestamp;
  ultimoMensaje: string;
  fechaUltimoMensaje: Timestamp;
  actividadImg: string;
}



