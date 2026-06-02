import {Timestamp, GeoPoint, doc} from '@angular/fire/firestore';

export interface Actividad {
  precio: number;
  id?: string;
  creadorUid: string;
  titulo: string;
  descripcion: string;
  ubicacion: GeoPoint;
  nombreUbicacion: string;
  direccion: string;
  fechaInicio: Timestamp;
  fechaFin: Timestamp;
  fechaFinChat: Timestamp;
  participantesUids: string[];
  lat: number;
  lng: number;
  categoria: string;
  imageUrl: string;
  markerElement?: HTMLElement;
  cantidadParticipantes: number;
  estadoPromocion?: 'promocionado' | 'no-promocionado',
  estado: 'activo' | 'caducado'
}


