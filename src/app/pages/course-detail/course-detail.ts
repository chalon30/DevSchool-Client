// ... imports que ya tienes ...
import { Component, OnInit, ViewChild } from '@angular/core';
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

import { AuthService } from '../../core/services/auth.service';
import {
  ProgresoService,
  ProgresoCurso,
} from '../../core/services/progreso.service';

import {
  MatStepperModule,
  MatStepper,
} from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
  @ViewChild(MatStepper) stepper!: MatStepper;

  curso: Curso | null = null;

  cargando = true;
  error = '';

  indiceStepper: number = 0;

  leccionesLineales: LeccionLinea[] = [];
  stepForms: FormGroup[] = [];

  respuestasUsuario: { [preguntaId: number]: number } = {};

  usuarioActual: any = null;
  progresoCurso: ProgresoCurso | null = null;

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
    this.usuarioActual = this.authService.getUsuarioActual();
    if (!this.usuarioActual) {
      const returnUrl =
        this.router.url || `/courses/${this.route.snapshot.paramMap.get('id')}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Curso no encontrado.';
      this.cargando = false;
      return;
    }

    this.courseService.getCurso(id).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.inicializarLeccionesLineales();
        this.cargando = false;
        this.cargarProgresoCurso();
      },
      error: () => {
        this.error = 'No se pudo cargar el curso.';
        this.cargando = false;
      },
    });
  }

  private cargarProgresoCurso() {
    if (!this.curso || !this.usuarioActual?.id) return;

    this.progresoService
      .getProgresoCurso(this.curso.id, this.usuarioActual.id)
      .subscribe({
        next: (progreso) => {
          this.progresoCurso = progreso;
          this.aplicarProgresoEnStepper();
        },
        error: () => {
          // sin progreso inicial, no pasa nada
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

    this.stepForms = this.leccionesLineales.map(() =>
      this.fb.group({
        done: [false, Validators.requiredTrue],
      })
    );

    if (this.stepForms[0]) {
      this.stepForms[0].get('done')?.clearValidators();
      this.stepForms[0].get('done')?.updateValueAndValidity({
        emitEvent: false,
      });
    }
  }

  private aplicarProgresoEnStepper() {
    if (!this.progresoCurso || !this.leccionesLineales.length) return;

    const idsCompletadas = this.progresoCurso.leccionesCompletadasIds || [];

    this.leccionesLineales.forEach((ll, idx) => {
      const ctrl = this.stepForms[idx]?.get('done');
      if (!ctrl) return;

      if (idsCompletadas.includes(ll.leccion.id)) {
        ctrl.setValue(true, { emitEvent: false });
      }
    });

    let initialIndex = 0;
    if (this.progresoCurso.ultimaLeccionId) {
      const found = this.leccionesLineales.find(
        (ll) => ll.leccion.id === this.progresoCurso!.ultimaLeccionId
      );
      if (found) {
        initialIndex = found.index;
      }
    }

    setTimeout(() => {
      if (this.stepper) {
        this.stepper.selectedIndex = initialIndex;
      }
    }, 0);
  }

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

    return leccion.preguntas.every((p) => this.esCorrecta(p) === true);
  }

  marcarLeccionCompleta(idx: number, stepper: MatStepper) {
    const { leccion } = this.leccionesLineales[idx];

    if (!this.puedeMarcarCompletada(leccion)) return;

    this.stepForms[idx].get('done')?.setValue(true);

    if (this.stepForms[idx + 1]) {
      this.stepForms[idx + 1]
        .get('done')
        ?.setValidators(Validators.requiredTrue);
      this.stepForms[idx + 1]
        .get('done')
        ?.updateValueAndValidity({ emitEvent: false });
    }

    if (stepper && stepper.selectedIndex < this.leccionesLineales.length - 1) {
      stepper.next();
    }

    if (this.curso && this.usuarioActual?.id) {
      const payload = {
        usuarioId: this.usuarioActual.id,
        cursoId: this.curso.id,
        leccionId: leccion.id,
      };

      this.progresoService.marcarLeccionCompletada(payload).subscribe({
        next: (progreso) => {
          this.progresoCurso = progreso;
        },
        error: (err) => {
          console.error('Error marcando lección completada', err);
        },
      });
    }
  }

  getProgresoCurso(): number {
    if (this.progresoCurso) {
      return this.progresoCurso.porcentaje;
    }

    if (!this.stepForms.length) return 0;
    const completados = this.stepForms.filter(
      (fg) => fg.get('done')?.value === true
    ).length;
    return Math.round((completados / this.stepForms.length) * 100);
  }

  // 🔥 NUEVO: saber si el curso está completado
  cursoCompletado(): boolean {
  if (this.progresoCurso) {
    return this.progresoCurso.cursoCompletado || this.progresoCurso.porcentaje >= 100;
  }
  return this.getProgresoCurso() >= 100;
}

finalizarCurso(): void {
  this.router.navigate(['/courses']);
}


}
