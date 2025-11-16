import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { CourseService } from '../../core/services/course.service';
import { Curso } from '../../core/model/course.model';

@Component({
  selector: 'app-mini-courses',
  standalone: true,
  templateUrl: './mini-courses.html',
  styleUrls: ['./mini-courses.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
  ],
})
export class MiniCourses implements OnInit {
  cursos: Curso[] = [];
  cargando = true;
  error = '';

  constructor(private courseService: CourseService, private router: Router) {}

  ngOnInit(): void {
    this.courseService.getCursos().subscribe({
      next: (data) => {
        this.cursos = data;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los cursos.';
        this.cargando = false;
      },
    });
  }

  verCurso(curso: Curso) {
    this.router.navigate(['/course', curso.id]);
  }

  verTodos() {
    this.router.navigate(['/courses']);
  }
}
