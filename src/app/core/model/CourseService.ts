// src/app/core/model/course.model.ts
export interface Opcion {
  id: number;
  texto: string;
  correcta: boolean;
  numeroOrden: number;
}

export interface Pregunta {
  id: number;
  enunciado: string;
  explicacion: string;
  numeroOrden: number;
  opciones: Opcion[];
}

export interface Leccion {
  id: number;
  titulo: string;
  contenido: string;
  videoUrl: string;
  intro1: string | null;
  intro2: string | null;
  intro3: string | null;
  numeroOrden: number;
  preguntas: Pregunta[];
}

export interface Modulo {
  id: number;
  titulo: string;
  numeroOrden: number;
  lecciones: Leccion[];
}

export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  modulos: Modulo[];
}
