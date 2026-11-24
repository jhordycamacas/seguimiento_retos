import { SemanaEnCurso } from './modelos';

export interface NivelRitmo {
  color: 'success' | 'primary' | 'warning' | 'danger';
  etiqueta: string;
}

/** Porcentaje diario máximo para considerar cada nivel (editable en un solo lugar). */
const LIMITE_BUEN_RITMO = 15;
const LIMITE_ACELERAR = 30;

/** Clasifica qué tan exigente es el ritmo diario que falta para llegar al 100 %. */
export function nivelRitmo(ritmoDiario: number): NivelRitmo {
  if (ritmoDiario <= 0) {
    return { color: 'success', etiqueta: 'Cumplida' };
  }
  if (ritmoDiario <= LIMITE_BUEN_RITMO) {
    return { color: 'primary', etiqueta: 'Buen ritmo' };
  }
  if (ritmoDiario <= LIMITE_ACELERAR) {
    return { color: 'warning', etiqueta: 'Acelera' };
  }
  return { color: 'danger', etiqueta: 'Urgente' };
}

/** Frase que explica cuánto hay que avanzar cada día esta semana. */
export function describirRitmo(semana: SemanaEnCurso): string {
  if (semana.faltante === 0) {
    return 'Meta de la semana cumplida.';
  }
  const dias = semana.dias_restantes === 1 ? '1 día' : `${semana.dias_restantes} días`;
  return `Necesitas ${semana.ritmo_diario} % por día durante ${dias}.`;
}
