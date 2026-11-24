export type EstadoReto = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO';

export const ETIQUETA_ESTADO: Record<EstadoReto, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  COMPLETADO: 'Completado',
};

export interface Reto {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: string; // 'AAAA-MM-DD'
  fecha_fin: string | null;
  estado: EstadoReto;
  total_avances: number;
  creado: string;
  actualizado: string;
}

export interface NuevoReto {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoReto;
}

export interface Avance {
  id: number;
  reto: number;
  fecha: string;
  descripcion: string;
  porcentaje: number;
  creado: string;
}

export type NuevoAvance = Omit<Avance, 'id' | 'creado'>;

export interface TareaSemanal {
  id: number;
  reto: number;
  reto_titulo: string;
  semana: number;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string;
  porcentaje: number;
  actualizado: string;
}

/** Semana que contiene el día de hoy, con el ritmo diario para llegar al 100 %. */
export interface SemanaEnCurso {
  semana: number;
  porcentaje: number;
  faltante: number;
  dias_restantes: number;
  ritmo_diario: number;
}

/** Respuesta de GET /api/retos/{id}/estadisticas/. */
export interface EstadisticasReto {
  semanas_total: number;
  cerradas: number;
  verdes: number;
  amarillas: number;
  rojas: number;
  cumplimiento_promedio: number | null;
  racha_actual: number;
  mejor_racha: number;
  semana_actual: SemanaEnCurso | null;
}

/** Respuesta paginada de Django REST Framework. */
export interface Pagina<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}