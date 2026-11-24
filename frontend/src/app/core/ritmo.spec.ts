import { describirRitmo, nivelRitmo } from './ritmo';
import { SemanaEnCurso } from './modelos';

const semana = (faltante: number, dias: number): SemanaEnCurso => ({
  semana: 8,
  porcentaje: 100 - faltante,
  faltante,
  dias_restantes: dias,
  ritmo_diario: Math.ceil(faltante / dias),
});

describe('nivelRitmo', () => {
  it('semana cumplida es success', () => {
    expect(nivelRitmo(0)).toEqual({ color: 'success', etiqueta: 'Cumplida' });
  });

  it('hasta 15 % por día es un buen ritmo', () => {
    expect(nivelRitmo(14).color).toBe('primary');
    expect(nivelRitmo(15).color).toBe('primary');
  });

  it('entre 16 % y 30 % por día pide acelerar', () => {
    expect(nivelRitmo(16).color).toBe('warning');
    expect(nivelRitmo(30).color).toBe('warning');
  });

  it('más de 30 % por día es urgente', () => {
    expect(nivelRitmo(31)).toEqual({ color: 'danger', etiqueta: 'Urgente' });
  });
});

describe('describirRitmo', () => {
  it('explica cuánto avanzar por día', () => {
    expect(describirRitmo(semana(70, 5))).toBe('Necesitas 14 % por día durante 5 días.');
  });

  it('usa singular cuando queda un solo día', () => {
    expect(describirRitmo(semana(40, 1))).toBe('Necesitas 40 % por día durante 1 día.');
  });

  it('felicita si la semana ya está cumplida', () => {
    expect(describirRitmo(semana(0, 3))).toBe('Meta de la semana cumplida.');
  });
});
