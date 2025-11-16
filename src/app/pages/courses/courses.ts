import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { CourseService } from '../../core/services/course.service';
import { Curso } from '../../core/model/course.model';

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
  progreso: number;
  imagenUrl?: string | null;
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
  ],
})
export class Courses {
  cursos: CursoCard[] = [];
  cargando = false;
  error = '';

  constructor(
    private courseService: CourseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarCursos();
  }

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
          nivel: 'Básico', // luego puedes sacarlo del backend si lo agregas
          lecciones: c.modulos?.length ?? 0,
          progreso: 0, // luego lo conectarás al progreso real
          imagenUrl: this.buildImagenUrl(c.imagenUrl),
        }));

        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los cursos. Inténtalo más tarde.';
        this.cargando = false;
      },
    });
  }

  /** Normaliza la URL de la imagen según lo que venga del backend */
  private buildImagenUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;

    // Si ya viene como URL completa (tu caso actual)
    if (raw.startsWith('http')) {
      return raw;
    }

    // Si empieza con / (ruta absoluta en servidor)
    if (raw.startsWith('/')) {
      return raw;
    }

    // Si solo viene el nombre del archivo → asumimos que está en assets/img
    return `assets/img/${raw}`;
  }

  irAlCurso(curso: CursoCard) {
    this.router.navigate(['/course', curso.id]);
  }

  getEtiquetaBoton(curso: CursoCard): string {
    if (curso.progreso >= 100) return 'Ver contenido';
    if (curso.progreso > 0) return 'Continuar';
    return 'Comenzar';
  }
}
