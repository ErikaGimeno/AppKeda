import { Timestamp, GeoPoint } from '@angular/fire/firestore';

export interface Experiencia {
  id?: string;
  autorUid: string;
  actividadId: string;
  tipo: 'foto' | 'video';
  mediaUrl: string;
  descripcion?: string;
  fechaCreacion: Timestamp;
  fechaExpiracion: Timestamp;
}
