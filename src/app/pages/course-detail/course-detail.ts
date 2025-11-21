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
import { Curso, Modulo, Leccion, Pregunta } from '../../core/model/course.model';

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

  // leccionId -> si ya se cargó el iframe del video
  videoCargadoPorLeccion: { [leccionId: number]: boolean } = {};

  // leccionId -> mostrar feedback (correcciones) de esa lección
  mostrarFeedbackPorLeccion: { [leccionId: number]: boolean } = {};

  // leccionId -> si el quiz está bloqueado (no se puede cambiar la respuesta)
  quizBloqueadoPorLeccion: { [leccionId: number]: boolean } = {};

  // Mensajes globales (toast)
  tipoMensaje: 'success' | 'error' | null = null;
  mensajeGlobal: string = '';

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
      const returnUrl = this.router.url || `/courses/${this.route.snapshot.paramMap.get('id')}`;
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
  // UTIL: MENSAJES & SCROLL
  // ==============================

  private mostrarToast(tipo: 'success' | 'error', texto: string): void {
    this.tipoMensaje = tipo;
    this.mensajeGlobal = texto;

    // Ocultar automáticamente después de 3 segundos
    setTimeout(() => {
      if (this.tipoMensaje === tipo && this.mensajeGlobal === texto) {
        this.tipoMensaje = null;
        this.mensajeGlobal = '';
      }
    }, 3000);
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }

  // ==============================
  // GETTER LECCIÓN ACTUAL
  // ==============================

  get leccionActual(): LeccionLinea | null {
    if (!this.leccionesLineales.length) return null;
    return this.leccionesLineales[this.indiceStepper] ?? null;
  }

  // ==============================
  // PROGRESO DEL CURSO
  // ==============================

  private cargarProgresoCurso() {
    if (!this.curso || !this.usuarioActual?.id) return;

    this.progresoService.getProgresoCurso(this.curso.id, this.usuarioActual.id).subscribe({
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
      const foundLast = this.leccionesLineales.find((ll) => ll.leccion.id === lastCompletedId);
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

    this.progresoService.getRespuestasLeccion(this.usuarioActual.id, leccionId).subscribe({
      next: (respuestas: RespuestaPreguntaDTO[]) => {
        // limpiamos primero las respuestas de esa lección
        const leccion = this.leccionesLineales.find((ll) => ll.leccion.id === leccionId)?.leccion;

        if (leccion?.preguntas) {
          leccion.preguntas.forEach((p) => {
            delete this.respuestasUsuario[p.id];
          });
        }

        // aplicamos lo que vino del backend (solo respuestas, sin feedback aún)
        respuestas.forEach((r) => {
          this.respuestasUsuario[r.preguntaId] = r.opcionSeleccionadaId;
        });

        // al entrar a la lección NO mostramos feedback todavía
        this.mostrarFeedbackPorLeccion[leccionId] = false;
        // y permitimos responder
        this.quizBloqueadoPorLeccion[leccionId] = false;
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

    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}`);
  }

  cargarVideoLeccion(leccion: Leccion): void {
    this.videoCargadoPorLeccion[leccion.id] = true;
  }

  // ==============================
  // QUIZ LÓGICA
  // ==============================

  // versión interna: no mira si se debe mostrar feedback o no
  private esCorrectaInterna(pregunta: Pregunta): boolean | null {
    const seleccionadaId = this.respuestasUsuario[pregunta.id];
    if (!seleccionadaId) return null;

    const correcta = pregunta.opciones.find((o) => o.correcta);
    if (!correcta) return null;

    return correcta.id === seleccionadaId;
  }

  // versión usada por la plantilla: solo muestra algo si ya se pidió feedback
  esCorrecta(pregunta: Pregunta, leccionId: number): boolean | null {
    if (!this.mostrarFeedbackPorLeccion[leccionId]) {
      return null; // todavía no se muestran correcciones
    }
    return this.esCorrectaInterna(pregunta);
  }

  // ahora solo valida que TODAS las preguntas estén contestadas (no necesariamente bien)
  puedeMarcarCompletada(leccion: Leccion): boolean {
    const tienePreguntas = leccion.preguntas && leccion.preguntas.length > 0;
    if (!tienePreguntas) return true;

    return leccion.preguntas.every((p) => !!this.respuestasUsuario[p.id]);
  }

  // ¿La lección tiene al menos una respuesta incorrecta?
  tieneRespuestasIncorrectas(leccion: Leccion): boolean {
    if (!leccion.preguntas || leccion.preguntas.length === 0) {
      return false;
    }

    // usamos la versión interna que no depende del flag de feedback
    return leccion.preguntas.some((p) => this.esCorrectaInterna(p) === false);
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
      this.irALeccion(this.indiceStepper - 1);
      this.scrollToTop();
    }
  }

  irSiguiente(): void {
    if (
      this.indiceStepper < this.leccionesLineales.length - 1 &&
      this.stepForms[this.indiceStepper]?.valid
    ) {
      this.irALeccion(this.indiceStepper + 1);
      this.scrollToTop();
    }
  }

  // ==============================
  // REINTENTAR LECCIÓN
  // ==============================

  reintentarLeccion(idx: number): void {
    if (idx < 0 || idx >= this.leccionesLineales.length) return;

    const leccion = this.leccionesLineales[idx]?.leccion;
    if (!leccion) return;

    // limpiar respuestas de esa lección
    if (leccion.preguntas) {
      leccion.preguntas.forEach((p) => {
        delete this.respuestasUsuario[p.id];
      });
    }

    // ocultar feedback
    this.mostrarFeedbackPorLeccion[leccion.id] = false;

    // DESBLOQUEAR quiz para que pueda cambiar respuestas
    this.quizBloqueadoPorLeccion[leccion.id] = false;

    // desmarcar el form localmente (para obligar a rehacerla correctamente)
    this.stepForms[idx]?.get('done')?.setValue(false);

    // limpiar mensaje de error al reintentar
    if (this.tipoMensaje === 'error') {
      this.tipoMensaje = null;
      this.mensajeGlobal = '';
    }
  }

  // ==============================
  // MARCAR LECCIÓN COMPLETA
  // ==============================

  marcarLeccionCompleta(idx: number) {
    if (idx < 0 || idx >= this.leccionesLineales.length) return;

    const { leccion } = this.leccionesLineales[idx];

    // siempre que presiona el botón, mostramos correcciones de ESA lección
    this.mostrarFeedbackPorLeccion[leccion.id] = true;
    // Bloqueamos las opciones al corregir
    this.quizBloqueadoPorLeccion[leccion.id] = true;

    const tienePreguntas = leccion.preguntas && leccion.preguntas.length > 0;

    let todasCorrectas = true;
    if (tienePreguntas) {
      todasCorrectas = leccion.preguntas.every((p) => this.esCorrectaInterna(p) === true);
    }

    // Si hay preguntas y NO todas son correctas:
    // solo mostramos correcciones y mensaje de error, NO marcamos como completada ni llamamos backend
    if (tienePreguntas && !todasCorrectas) {
      this.mostrarToast('error', 'Hay respuestas incorrectas. Mal, vuelve a intentar.');
      return;
    }

    // Desde aquí: o no hay preguntas, o TODAS son correctas

    // marcar localmente la lección como completada
    this.stepForms[idx].get('done')?.setValue(true);

    // aseguramos que la siguiente lección requiera validación
    if (this.stepForms[idx + 1]) {
      this.stepForms[idx + 1].get('done')?.setValidators(Validators.requiredTrue);
      this.stepForms[idx + 1].get('done')?.updateValueAndValidity({ emitEvent: false });
    }

    // Mostrar mensaje de felicitación
    this.mostrarToast(
      'success',
      '¡Felicitaciones! Has completado la lección, pasando a la siguiente.'
    );

    // avanzar automáticamente si no es la última
    if (this.indiceStepper < this.leccionesLineales.length - 1) {
      this.irALeccion(this.indiceStepper + 1);
    }

    // subir al inicio de la ventana (nueva lección)
    this.scrollToTop();

    if (this.curso && this.usuarioActual?.id) {
      // construir las respuestas para esta lección
      const respuestas = (leccion.preguntas || [])
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
    const completados = this.stepForms.filter((fg) => fg.get('done')?.value === true).length;
    return Math.round((completados / this.stepForms.length) * 100);
  }

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
