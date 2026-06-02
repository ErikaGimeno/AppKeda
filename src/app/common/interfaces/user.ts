  import { Timestamp, GeoPoint } from '@angular/fire/firestore';

  export interface Usuario {
    uid: string;
    nombre: string;
    apellidos: string;
    email: string;
    fotoPerfilUrl: string;
    bio: string;
    fechaRegistro: Timestamp;
    ubicacionActual: GeoPoint;
    verificado: boolean;
    estadoVerificacion: string;
    dniUrl: string;
    edad?: string;
    intereses?: [string];
    ciudad?: string;
    fechaNacimiento?: string;
  }

