import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { appsettings } from '../../Settings/appsettings';
import { Observable, BehaviorSubject } from 'rxjs';

// Debe reflejar tu ProgresoCursoDTO de backend
export interface ProgresoCurso {
  cursoId: number;
  usuarioId: number;
  porcentaje: number;
  leccionesCompletadas: number;
  totalLecciones: number;
  ultimaLeccionId: number | null;
  ultimaLeccionTitulo: string | null;
  cursoCompletado: boolean;
  leccionesCompletadasIds: number[];
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

  /** GET /api/progreso/{cursoId}?usuarioId=XX */
  getProgresoCurso(cursoId: number, usuarioId: number): Observable<ProgresoCurso> {
    return this.http.get<ProgresoCurso>(`${this.apiUrl}/${cursoId}`, {
      params: { usuarioId: usuarioId.toString() },
    });
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
   * Obtener el porcentaje de un curso concreto en este momento.
   */
  obtenerProgresoCursoLocal(cursoId: number): number {
    return this.progresoMap$.value[cursoId] ?? 0;
  }
}
