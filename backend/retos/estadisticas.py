"""Estadísticas de seguimiento de un reto: racha, promedio y ritmo recomendado."""
from math import ceil

# Deben coincidir con las reglas del semáforo del frontend (core/semaforo.ts).
META = 100
UMBRAL_ROJO = 10


def _color(tarea):
    """Color de una semana ya cerrada."""
    if tarea.porcentaje >= META:
        return 'VERDE'
    if tarea.porcentaje < UMBRAL_ROJO:
        return 'ROJO'
    return 'AMARILLO'


def _rachas(cerradas):
    """Devuelve (racha_actual, mejor_racha) de semanas verdes consecutivas.

    `cerradas` llega ordenada por número de semana. La racha actual cuenta
    las semanas verdes seguidas que terminan en la última semana cerrada.
    """
    mejor = actual = 0
    for tarea in cerradas:
        actual = actual + 1 if _color(tarea) == 'VERDE' else 0
        mejor = max(mejor, actual)
    return actual, mejor


def _semana_en_curso(tareas, hoy):
    """Datos de la semana que contiene `hoy`, con el ritmo diario necesario."""
    for tarea in tareas:
        if tarea.fecha_inicio <= hoy <= tarea.fecha_fin:
            faltante = max(META - tarea.porcentaje, 0)
            # Se cuenta el día de hoy: es el último día en que se puede avanzar.
            dias = (tarea.fecha_fin - hoy).days + 1
            return {
                'semana': tarea.semana,
                'porcentaje': tarea.porcentaje,
                'faltante': faltante,
                'dias_restantes': dias,
                'ritmo_diario': ceil(faltante / dias),
            }
    return None


def calcular_estadisticas(tareas, hoy):
    """Resume el avance de un reto a partir de sus tareas semanales."""
    tareas = sorted(tareas, key=lambda t: t.semana)
    cerradas = [t for t in tareas if hoy > t.fecha_fin]
    colores = [_color(t) for t in cerradas]
    racha_actual, mejor_racha = _rachas(cerradas)
    promedio = (
        round(sum(t.porcentaje for t in cerradas) / len(cerradas), 1) if cerradas else None
    )
    return {
        'semanas_total': len(tareas),
        'cerradas': len(cerradas),
        'verdes': colores.count('VERDE'),
        'amarillas': colores.count('AMARILLO'),
        'rojas': colores.count('ROJO'),
        'cumplimiento_promedio': promedio,
        'racha_actual': racha_actual,
        'mejor_racha': mejor_racha,
        'semana_actual': _semana_en_curso(tareas, hoy),
    }
