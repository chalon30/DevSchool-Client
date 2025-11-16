export interface ProgresoCurso {
  cursoId: number;
  usuarioId: number;

  porcentaje: number;
  leccionesCompletadas: number;
  totalLecciones: number;

  ultimaLeccionId: number | null;
  ultimaLeccionTitulo: string | null;

  cursoCompletado: boolean;

  leccionesCompletadasIds: number[]; // ids de lecciones ya completadas
}
