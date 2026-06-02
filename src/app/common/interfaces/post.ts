import {Timestamp} from "@angular/fire/firestore";

export interface ReaccionFoto {
  uid: string;
  fotoUrl: string;
}

export interface Post {
  id?: string;
  usuarioUid: string;
  usuarioNombre: string;
  usuarioAvatar: string;
  actividadId: string;
  actividadNombre:string;
  titulo: string;
  tiempo?: string;
  descripcion?: string;
  imageUrl: string;
  imageUrlFrontal?: string;
  likes: number;
  likesUids: string[];
  haDadoLike?: boolean;
  reaccionesFotos: ReaccionFoto[];
  tipoMedia: string;
  fechaCreacion: Timestamp | any;
  selfieEnGrande?: boolean;
  fechaFinActividad: Timestamp;
}
