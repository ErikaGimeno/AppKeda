import {inject, Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData, endAt,
  getDocs, limit, orderBy, Firestore,
  query,
  setDoc, startAt, Timestamp, updateDoc, where, startAfter
} from "@angular/fire/firestore";
import {Observable, of, switchMap, timestamp} from "rxjs";
import {v4 as uuidv4} from "uuid";
import {getDownloadURL, ref, Storage, uploadBytes} from "@angular/fire/storage";
import * as geofire from 'geofire-common';
import {Actividad} from "../interfaces/actividad";
import {Auth, authState} from "@angular/fire/auth";
import {Mensaje} from "../interfaces/mensaje";
import {Usuario} from "../interfaces/user";

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private auth= inject(Auth);
  private storage = inject(Storage);

  // getCollectionChanges<tipo>(path: string){
  //   const refCollection = collection(this.firestore, path);
  //   return collectionData(refCollection) as Observable<tipo[]>;
  // }

  getColleccion<tipo>(ruta: string, campo: string, valor: string): Observable<tipo[]> {
    const item = collection(this.firestore, ruta);
    const q = query(item, where(campo, '==', valor));
    return collectionData(q, { idField: 'id' }) as Observable<tipo[]>;
  }

  //filtramos por cualquier campo la coleccion que sea
  getFiltrado<T>(ruta: string, campo: string, valor: string): Observable<T[]> {
    const ref = collection(this.firestore, ruta);
    const q = query(ref, where(campo, '==', valor));
    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }

  //Devuelve las actividades en las que el usario participa
  getActividadesParticipando<tipo>(uid: string): Observable<tipo[]> {
    const itemCollection = collection(this.firestore, 'actividades');
    const q = query(itemCollection, where('participantesUids', 'array-contains', uid));
    return collectionData(q, { idField: 'id' }) as Observable<tipo[]>;
  }

  //Crear item en una coleccion de la base de datos pasando un id
  postItem(data: any, enlace: string, idItem: string){
    const nuevoItem =
      doc(this.firestore, `${enlace}/${idItem}`);
    return setDoc(nuevoItem, data);
  }

  //Actualizar un item de una coleccion por id
  async updateItem(enlace: string, idItem: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, `${enlace}/${idItem}`);
    return await updateDoc(docRef, data);
  }

  //generar un id automatico
  createIDdoc(){
    return uuidv4();
  }

  //Escucha permanente del objeto designado, para realizar cambios instantaneos
  getDocListen<tipo extends { [key: string]: any }>(path: string, id: string): Observable<tipo> {
    const itemDoc = doc(this.firestore, `${path}/${id}`);
    return docData(itemDoc, {idField: 'uid' as keyof tipo}) as Observable<tipo>;
  }

  async borrarItem(path: string, id: string) {
    const docRef = doc(this.firestore, `${path}/${id}`);
    return await deleteDoc(docRef);
  }

  getMensajes(chatId: string): Observable<Mensaje[]>{
    const mensajesRef = collection(this.firestore, `chats/${chatId}/mensajes`);
    const q = query(mensajesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Mensaje[]>;
  }

  //Subir archivo a Storage y devolver la URL
  async subirArchivo(blob: Blob, uid: string, tipo: string): Promise<string> {
    const extension = tipo === 'video' ? 'mp4' : 'jpg';
    const nombreUnico = Date.now();
    const filePath = `posts/${uid}/post_${nombreUnico}.${extension}`;

    const storageRef = ref(this.storage, filePath);
    const result = await uploadBytes(storageRef, blob);
    return await getDownloadURL(result.ref);
  }

  //Subir a la base de datos el mensaje en la coleccion de chats dentro de la subcoleccion de mensajes
  async enviarMensaje(chatId: string, texto: string, user: Usuario){
    if (!texto.trim()) {
      return null;
    }

    const mensajesRef = collection(this.firestore, `chats/${chatId}/mensajes`);
    const chatRef = doc(this.firestore, 'chats', chatId);

    const nuevoMensaje = {
      texto: texto,
      senderId: user.uid,
      senderName: user.nombre || "Usuario de Keda",
      senderPhoto: user.fotoPerfilUrl || "",
      timestamp: Timestamp.now(),
    };

    return Promise.all([
      addDoc(mensajesRef, nuevoMensaje),
      updateDoc(chatRef, {
        ultimoMensaje: texto,
        fechaUltimoMensaje: Timestamp.now()
      })
    ]);
  }

  //Recoger los posts por tramos
  async getPostsPaginados(limite: number, ultimoDocumento?: any) {
    const postsRef = collection(this.firestore, 'posts');

    let q;
    if (ultimoDocumento) {
      q = query(
        postsRef,
        orderBy('fechaCreacion', 'asc'),
        startAfter(ultimoDocumento),
        limit(limite)
      );
    } else {
      q = query(
        postsRef,
        orderBy('fechaCreacion', 'asc'),
        limit(limite)
      );
    }
    return await getDocs(q);
  }
}
