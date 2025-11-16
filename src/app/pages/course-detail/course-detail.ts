// src/app/pages/course-detail/course-detail.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CourseService } from '../../core/services/course.service';
import {
  Curso,
  Modulo,
  Leccion,
  Pregunta,
  Opcion,
} from '../../core/model/course.model';

// 🔹 Auth + Progreso
import { AuthService } from '../../core/services/auth.service';
import {
  ProgresoService,
  ProgresoCurso,
} from '../../core/services/progreso.service';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';

interface LeccionLinea {
  index: number;
  modulo: Modulo;
  leccion: Leccion;
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  templateUrl: './course-detail.html',
  styleUrls: ['./course-detail.css'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDividerModule,
    MatChipsModule,
    MatRadioModule,
  ],
})
export class CourseDetail implements OnInit {
  curso: Curso | null = null;

  cargando = true;
  error = '';

  // Lecciones aplanadas (1,2,3,...)
  leccionesLineales: LeccionLinea[] = [];

  // Stepper
  stepForms: FormGroup[] = [];

  // respuestasUsuario[preguntaId] = opcionId
  respuestasUsuario: { [preguntaId: number]: number } = {};

  // 🔹 Usuario + progreso
  usuarioActual: any = null;
  progresoCurso?: ProgresoCurso;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private authService: AuthService,
    private progresoService: ProgresoService
  ) {}

  ngOnInit(): void {
    // 1) Verificar usuario logueado
    this.usuarioActual = this.authService.getUsuarioActual();
    if (!this.usuarioActual) {
      const returnUrl = this.router.url || `/courses/${this.route.snapshot.paramMap.get('id')}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    // 2) Cargar curso
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Curso no encontrado.';
      this.cargando = false;
      return;
    }

    this.courseService.getCurso(id).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.cargando = false;
        this.inicializarLeccionesLineales();
      },
      error: () => {
        this.error = 'No se pudo cargar el curso.';
        this.cargando = false;
      },
    });
  }

  private inicializarLeccionesLineales() {
    if (!this.curso) return;

    this.leccionesLineales = [];
    let index = 0;

    this.curso.modulos
      .sort((a, b) => a.numeroOrden - b.numeroOrden)
      .forEach((mod) => {
        mod.lecciones
          .sort((a, b) => a.numeroOrden - b.numeroOrden)
          .forEach((lec) => {
            this.leccionesLineales.push({ index, modulo: mod, leccion: lec });
            index++;
          });
      });

    // Crear un FormGroup por lección para el stepper linear
    this.stepForms = this.leccionesLineales.map(() =>
      this.fb.group({
        done: [false, Validators.requiredTrue], // tiene que ser true para avanzar
      })
    );

    // Primer paso lo marcamos como "no requerido" al inicio (para poder entrar)
    if (this.stepForms[0]) {
      this.stepForms[0].get('done')?.clearValidators();
      this.stepForms[0].get('done')?.updateValueAndValidity({
        emitEvent: false,
      });
    }
  }

  // Video embebido de YouTube
  getVideoUrl(leccion: Leccion): SafeResourceUrl | null {
    if (!leccion.videoUrl) return null;

    const url = leccion.videoUrl;
    const match = url.match(/v=([^&]+)/);
    const id = match ? match[1] : url;

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}`
    );
  }

  seleccionarOpcion(pregunta: Pregunta, opcion: Opcion) {
    this.respuestasUsuario[pregunta.id] = opcion.id;
  }

  esCorrecta(pregunta: Pregunta): boolean | null {
    const seleccionadaId = this.respuestasUsuario[pregunta.id];
    if (!seleccionadaId) return null;

    const correcta = pregunta.opciones.find((o) => o.correcta);
    if (!correcta) return null;

    return correcta.id === seleccionadaId;
  }

  puedeMarcarCompletada(leccion: Leccion): boolean {
    const tienePreguntas = leccion.preguntas && leccion.preguntas.length > 0;
    if (!tienePreguntas) return true;

    // Todas las preguntas deben ser correctas
    return leccion.preguntas.every((p) => this.esCorrecta(p) === true);
  }

  marcarLeccionCompleta(idx: number, stepper: any) {
    const { leccion } = this.leccionesLineales[idx];

    // 1) Validar preguntas
    if (!this.puedeMarcarCompletada(leccion)) return;

    // 2) Marcar done=true en este paso (para el stepper)
    this.stepForms[idx].get('done')?.setValue(true);

    // 3) Activar validación en el siguiente paso
    if (this.stepForms[idx + 1]) {
      this.stepForms[idx + 1]
        .get('done')
        ?.setValidators(Validators.requiredTrue);
      this.stepForms[idx + 1]
        .get('done')
        ?.updateValueAndValidity({ emitEvent: false });
    }

    // 4) Avanzar stepper
    if (stepper && stepper.selectedIndex < this.leccionesLineales.length - 1) {
      stepper.next();
    }

    // 5) 🔹 Notificar al backend que la lección se completó
    if (this.curso && this.usuarioActual?.id) {
      const payload = {
        usuarioId: this.usuarioActual.id,
        cursoId: this.curso.id,
        leccionId: leccion.id,
      };

      this.progresoService.marcarLeccionCompletada(payload).subscribe({
        next: (progreso) => {
          this.progresoCurso = progreso;
          this.progresoService.actualizarProgresoLocal(progreso);
          // opcional: console.log('Progreso actualizado', progreso);
        },
        error: (err) => {
          console.error('Error marcando lección completada', err);
        },
      });
    }
  }

  getProgresoCurso(): number {
    if (!this.stepForms.length) return 0;

    const completados = this.stepForms.filter(
      (fg) => fg.get('done')?.value === true
    ).length;
    return Math.round((completados / this.stepForms.length) * 100);
  }
}
