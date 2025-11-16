import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { CourseService } from '../../core/services/course.service';
import { Curso } from '../../core/model/course.model';

// 🔥 Nuevos servicios
import { InscripcionService } from '../../core/services/inscripcion.service';
import { ProgresoService, ProgresoCurso } from '../../core/services/progreso.service';
import { AuthService } from '../../core/services/auth.service';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface CursoCard {
  id: number;
  titulo: string;
  descripcion: string;
  nivel: string;
  lecciones?: number;
  progreso: number;          // 0–100
  imagenUrl?: string | null;
  inscrito: boolean;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  templateUrl: './courses.html',
  styleUrls: ['./courses.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
})
export class Courses {
  cursos: CursoCard[] = [];
  cargando = false;
  error = '';

  private usuarioId: number | null = null;

  constructor(
    private courseService: CourseService,
    private inscripcionService: InscripcionService,
    private progresoService: ProgresoService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    // 🔐 Ver si hay usuario logueado
    const usuario = this.authService.getUsuarioActual();
    if (usuario && usuario.id) {
      this.usuarioId = usuario.id;
    }

    this.cargarCursos();
  }

  // ============================
  //   CARGA DE CURSOS
  // ============================
  private cargarCursos() {
    this.cargando = true;
    this.error = '';

    this.courseService.getCursos().subscribe({
      next: (data: Curso[]) => {
        console.log('Cursos desde API:', data);

        this.cursos = data.map((c: any) => ({
          id: c.id ?? 0,
          titulo: c.titulo ?? 'Curso sin título',
          descripcion: c.descripcion ?? 'Sin descripción',
          nivel: 'Básico',               // luego puedes sacarlo del backend
          lecciones: c.modulos?.length ?? 0,
          progreso: 0,                    // se actualizará con el progreso real
          imagenUrl: this.buildImagenUrl(c.imagenUrl),
          inscrito: false,               // se actualizará con inscripciones reales
        }));

        this.cargando = false;

        // Si hay usuario logueado, cargamos inscripciones + progreso
        if (this.usuarioId) {
          this.cargarInscripcionesUsuario(this.usuarioId);
          this.cargarProgresoUsuario(this.usuarioId);
        }
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los cursos. Inténtalo más tarde.';
        this.cargando = false;
      },
    });
  }

  // ============================
  //   INSCRIPCIONES
  // ============================
  private cargarInscripcionesUsuario(usuarioId: number) {
    this.inscripcionService.getInscripcionesUsuario(usuarioId).subscribe({
      next: (inscripciones: any[]) => {
        // Suponiendo que cada inscripción tiene un campo `cursoId`
        const cursosIdsInscritos = inscripciones.map((i) => i.cursoId);

        this.cursos = this.cursos.map((curso) => ({
          ...curso,
          inscrito: cursosIdsInscritos.includes(curso.id),
        }));
      },
      error: (err) => {
        console.error('Error obteniendo inscripciones del usuario', err);
      },
    });
  }

  // ============================
  //   PROGRESO
  // ============================
  private cargarProgresoUsuario(usuarioId: number) {
    // Asegúrate de que ProgresoService tenga este método:
    // getProgresoPorUsuario(usuarioId: number): Observable<ProgresoCurso[]>
    this.progresoService.getProgresoPorUsuario(usuarioId).subscribe({
      next: (progresos: ProgresoCurso[]) => {
        progresos.forEach((p) => {
          const curso = this.cursos.find((c) => c.id === p.cursoId);
          if (curso) {
            // ajusta `porcentaje` si en tu DTO se llama distinto
            curso.progreso = p.porcentaje ?? 0;
          }
        });
      },
      error: (err) => {
        console.error('Error obteniendo progreso del usuario', err);
      },
    });
  }

  // ============================
  //   HELPERS
  // ============================
  private buildImagenUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;

    if (raw.startsWith('http')) return raw;
    if (raw.startsWith('/')) return raw;

    return `assets/img/${raw}`;
  }

  // ============================
  //   BOTÓN PRINCIPAL DEL CURSO
  // ============================
  onClickCurso(curso: CursoCard) {
    // 1️⃣ Sin sesión → mandar a login con returnUrl
    if (!this.usuarioId) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/course/${curso.id}` },
      });
      return;
    }

    // 2️⃣ Ya está inscrito → ir directo al curso
    if (curso.inscrito) {
      this.router.navigate(['/course', curso.id]);
      return;
    }

    // 3️⃣ No está inscrito → inscribir y luego navegar
    this.inscripcionService.inscribirme(this.usuarioId, curso.id).subscribe({
      next: () => {
        curso.inscrito = true;
        this.mostrarSnackBar('Te has inscrito al curso 🎉', 'success');
        this.router.navigate(['/course', curso.id]);
      },
      error: (err) => {
        console.error(err);
        this.mostrarSnackBar(
          'No se pudo completar la inscripción. Intenta nuevamente.',
          'error'
        );
      },
    });
  }

  getEtiquetaBoton(curso: CursoCard): string {
    if (!curso.inscrito) return 'Inscribirme';
    if (curso.progreso >= 100) return 'Ver contenido';
    if (curso.progreso > 0) return 'Continuar';
    return 'Comenzar';
  }

  private mostrarSnackBar(mensaje: string, tipo: 'success' | 'error') {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [
        tipo === 'success' ? 'snackbar-success' : 'snackbar-error',
      ],
    });
  }
}
