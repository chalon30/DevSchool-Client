import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { appsettings } from '../../Settings/appsettings';
import { Usuario } from '../model/Usuario';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = `${appsettings.apiUrl}usuarios`;

  /** Listar todos los usuarios */
  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /** Obtener usuario por id */
  obtenerPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /** Buscar usuario por correo (filtrando en frontend) */
  buscarPorCorreo(correo: string): Observable<Usuario | null> {
    return this.listar().pipe(
      map((usuarios) => usuarios.find((u) => u.correo === correo) ?? null)
    );
  }
}
