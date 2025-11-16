import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appsettings } from '../../Settings/appsettings';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InscripcionService {
  private http = inject(HttpClient);

  private apiUrl = `${appsettings.apiUrl}inscripciones`;

  inscribirme(usuarioId: number, cursoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${cursoId}/inscribirme`, {
      usuarioId: usuarioId,
    });
  }

  getInscripcionesUsuario(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }
}
