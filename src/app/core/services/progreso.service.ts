import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appsettings } from '../../Settings/appsettings';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ProgresoCurso {
  cursoId: number;
  porcentaje: number;     // ajusta el nombre si tu DTO usa otro campo
  usuarioId?: number;     // opcional, por si tu backend lo devuelve
}

export interface MarcarLeccionCompletadaRequest {
  usuarioId: number;
  cursoId: number;
  leccionId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProgresoService {
  private http = inject(HttpClient);
  private apiUrl = `${appsettings.apiUrl}progreso`;

  /**
   * Mapa en memoria: { [cursoId]: porcentaje }
   * Sirve para que cualquier componente se pueda suscribir
   * y ver el progreso actualizado sin recargar todo.
   */
  private progresoMap$ = new BehaviorSubject<Record<number, number>>({});

  // --------- ENDPOINTS HTTP ---------

  /** GET /api/progreso/usuario/{usuarioId}  */
  getProgresoPorUsuario(usuarioId: number): Observable<ProgresoCurso[]> {
    return this.http.get<ProgresoCurso[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  /** POST /api/progreso/leccion-completada */
  marcarLeccionCompletada(
    payload: MarcarLeccionCompletadaRequest
  ): Observable<ProgresoCurso> {
    return this.http.post<ProgresoCurso>(
      `${this.apiUrl}/leccion-completada`,
      payload
    );
  }

  // --------- ESTADO EN MEMORIA (tiempo real) ---------

  /**
   * Actualiza el mapa local de progreso (porcentaje por curso).
   * Llama a esto en el `next` del POST cuando marques una lección como completada.
   */
  actualizarProgresoLocal(dto: ProgresoCurso) {
    const actual = this.progresoMap$.value;
    this.progresoMap$.next({
      ...actual,
      [dto.cursoId]: dto.porcentaje,
    });
  }

  /**
   * Stream para que otros componentes (Courses, dashboard, etc.) se suscriban
   * y reciban el progreso actualizado.
   */
  progresoStream() {
    return this.progresoMap$.asObservable();
  }

  /**
   * Opcional: obtener el porcentaje de un curso concreto en este momento.
   */
  obtenerProgresoCursoLocal(cursoId: number): number {
    return this.progresoMap$.value[cursoId] ?? 0;
  }
}
