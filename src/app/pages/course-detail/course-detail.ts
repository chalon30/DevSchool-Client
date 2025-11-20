// ... imports que ya tienes ...
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

import { AuthService } from '../../core/services/auth.service';
import {
  ProgresoService,
  ProgresoCurso,
  MarcarLeccionCompletadaRequest,
  RespuestaPreguntaDTO,
} from '../../core/services/progreso.service';

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
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
})
export class CourseDetail implements OnInit {
  curso: Curso | null = null;

  cargando = true;
  error = '';

  indiceStepper: number = 0;

  leccionesLineales: LeccionLinea[] = [];
  stepForms: FormGroup[] = [];

  // idPregunta -> idOpcionSeleccionada
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

  // ==============================
  // PROGRESO DEL CURSO
  // ==============================

  private cargarProgresoCurso() {
    if (!this.curso || !this.usuarioActual?.id) return;

    this.progresoService
      .getProgresoCurso(this.curso.id, this.usuarioActual.id)
      .subscribe({
        next: (progreso) => {
          this.progresoCurso = progreso;
          this.progresoService.actualizarProgresoLocal(progreso);
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

    // primera lección sin validación requerida
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

    // marcar como completadas en los forms
    this.leccionesLineales.forEach((ll, idx) => {
      const ctrl = this.stepForms[idx]?.get('done');
      if (!ctrl) return;

      if (idsCompletadas.includes(ll.leccion.id)) {
        ctrl.setValue(true, { emitEvent: false });
      }
    });

    // calcular índice inicial
    let initialIndex = 0;

    if (this.progresoCurso.ultimaLeccionId) {
      const found = this.leccionesLineales.find(
        (ll) => ll.leccion.id === this.progresoCurso!.ultimaLeccionId
      );
      if (found) {
        initialIndex = found.index;
      }
    } else if (idsCompletadas.length > 0) {
      // fallback: si no hay ultimaLeccionId, usar la última lección completada
      const lastCompletedId = idsCompletadas[idsCompletadas.length - 1];
      const foundLast = this.leccionesLineales.find(
        (ll) => ll.leccion.id === lastCompletedId
      );
      if (foundLast) {
        initialIndex = foundLast.index;
      }
    }

    this.indiceStepper = initialIndex;

    // cargar respuestas guardadas para la lección actual
    const leccionActual = this.leccionesLineales[this.indiceStepper]?.leccion;
    if (leccionActual) {
      this.cargarRespuestasLeccion(leccionActual.id);
    }
  }

  // ==============================
  // RESPUESTAS GUARDADAS
  // ==============================

  private cargarRespuestasLeccion(leccionId: number) {
    if (!this.usuarioActual?.id) return;

    this.progresoService
      .getRespuestasLeccion(this.usuarioActual.id, leccionId)
      .subscribe({
        next: (respuestas: RespuestaPreguntaDTO[]) => {
          // limpiamos primero las respuestas de esa lección
          const leccion = this.leccionesLineales.find(
            (ll) => ll.leccion.id === leccionId
          )?.leccion;

          if (leccion?.preguntas) {
            leccion.preguntas.forEach((p) => {
              delete this.respuestasUsuario[p.id];
            });
          }

          // aplicamos lo que vino del backend
          respuestas.forEach((r) => {
            this.respuestasUsuario[r.preguntaId] = r.opcionSeleccionadaId;
          });
        },
        error: (err) => {
          console.error('Error cargando respuestas de la lección', err);
        },
      });
  }

  // ==============================
  // VIDEO
  // ==============================

  getVideoUrl(leccion: Leccion): SafeResourceUrl | null {
    if (!leccion.videoUrl) return null;

    const url = leccion.videoUrl;
    const match = url.match(/v=([^&]+)/);
    const id = match ? match[1] : url;

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}`
    );
  }

  // ==============================
  // QUIZ LÓGICA
  // ==============================

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

  // ==============================
  // NAVEGACIÓN ENTRE LECCIONES
  // ==============================

  isStepCompletado(idx: number): boolean {
    return this.stepForms[idx]?.get('done')?.value === true;
  }

  irALeccion(idx: number): void {
    if (idx < 0 || idx >= this.leccionesLineales.length) return;
    this.indiceStepper = idx;

    const leccion = this.leccionesLineales[idx]?.leccion;
    if (leccion) {
      this.cargarRespuestasLeccion(leccion.id);
    }
  }

  irAnterior(): void {
    if (this.indiceStepper > 0) {
      this.indiceStepper--;
      const leccion = this.leccionesLineales[this.indiceStepper]?.leccion;
      if (leccion) {
        this.cargarRespuestasLeccion(leccion.id);
      }
    }
  }

  irSiguiente(): void {
    if (
      this.indiceStepper < this.leccionesLineales.length - 1 &&
      this.stepForms[this.indiceStepper]?.valid
    ) {
      this.indiceStepper++;
      const leccion = this.leccionesLineales[this.indiceStepper]?.leccion;
      if (leccion) {
        this.cargarRespuestasLeccion(leccion.id);
      }
    }
  }

  // ==============================
  // MARCAR LECCIÓN COMPLETA
  // ==============================

  marcarLeccionCompleta(idx: number) {
    const { leccion } = this.leccionesLineales[idx];

    if (!this.puedeMarcarCompletada(leccion)) return;

    // marcar localmente la lección como completada
    this.stepForms[idx].get('done')?.setValue(true);

    if (this.stepForms[idx + 1]) {
      this.stepForms[idx + 1]
        .get('done')
        ?.setValidators(Validators.requiredTrue);
      this.stepForms[idx + 1]
        .get('done')
        ?.updateValueAndValidity({ emitEvent: false });
    }

    // avanzar automáticamente si no es la última
    if (this.indiceStepper < this.leccionesLineales.length - 1) {
      this.indiceStepper++;
      const leccionSiguiente =
        this.leccionesLineales[this.indiceStepper]?.leccion;
      if (leccionSiguiente) {
        this.cargarRespuestasLeccion(leccionSiguiente.id);
      }
    }

    if (this.curso && this.usuarioActual?.id) {
      // construir las respuestas para esta lección
      const respuestas =
        (leccion.preguntas || [])
          .map((p) => ({
            preguntaId: p.id,
            opcionSeleccionadaId: this.respuestasUsuario[p.id],
          }))
          .filter((r) => !!r.opcionSeleccionadaId) as {
          preguntaId: number;
          opcionSeleccionadaId: number;
        }[];

      const payload: MarcarLeccionCompletadaRequest = {
        usuarioId: this.usuarioActual.id,
        cursoId: this.curso.id,
        leccionId: leccion.id,
        respuestas,
      };

      this.progresoService.marcarLeccionCompletada(payload).subscribe({
        next: (progreso) => {
          this.progresoCurso = progreso;
          this.progresoService.actualizarProgresoLocal(progreso);
        },
        error: (err) => {
          console.error('Error marcando lección completada', err);
        },
      });
    }
  }

  // ==============================
  // PROGRESO & FINALIZAR
  // ==============================

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

  cursoCompletado(): boolean {
    if (this.progresoCurso) {
      return (
        this.progresoCurso.cursoCompletado ||
        this.progresoCurso.porcentaje >= 100
      );
    }
    return this.getProgresoCurso() >= 100;
  }

  finalizarCurso(): void {
    this.router.navigate(['/courses']);
  }
}
