from datetime import date, timedelta
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .estadisticas import calcular_estadisticas
from .models import Reto, TareaSemanal

INICIO_PERIODO = date(2026, 10, 5)  # lunes de la semana 1
HOY = date(2026, 11, 25)  # miércoles de la semana 8


def crear_semana(reto, numero, porcentaje):
    inicio = INICIO_PERIODO + timedelta(weeks=numero - 1)
    return TareaSemanal.objects.create(
        reto=reto, semana=numero, fecha_inicio=inicio,
        fecha_fin=inicio + timedelta(days=6), porcentaje=porcentaje,
    )


class CalcularEstadisticasTests(APITestCase):
    def setUp(self):
        self.reto = Reto.objects.create(titulo='Leer', fecha_inicio=INICIO_PERIODO)

    def test_sin_semanas_cerradas_no_hay_promedio_ni_racha(self):
        crear_semana(self.reto, 8, 30)
        datos = calcular_estadisticas(self.reto.tareas.all(), HOY)
        self.assertEqual(datos['cerradas'], 0)
        self.assertIsNone(datos['cumplimiento_promedio'])
        self.assertEqual(datos['racha_actual'], 0)
        self.assertEqual(datos['mejor_racha'], 0)

    def test_cuenta_colores_promedio_y_rachas(self):
        # Semanas 1 a 7 cerradas: 100, 100, 100, 5 (rojo), 50 (amarillo), 100, 100.
        for numero, porcentaje in enumerate([100, 100, 100, 5, 50, 100, 100], start=1):
            crear_semana(self.reto, numero, porcentaje)
        datos = calcular_estadisticas(self.reto.tareas.all(), HOY)
        self.assertEqual(datos['cerradas'], 7)
        self.assertEqual((datos['verdes'], datos['amarillas'], datos['rojas']), (5, 1, 1))
        self.assertEqual(datos['cumplimiento_promedio'], 79.3)
        self.assertEqual(datos['racha_actual'], 2)
        self.assertEqual(datos['mejor_racha'], 3)

    def test_ritmo_diario_necesario_para_la_semana_en_curso(self):
        # Hoy es miércoles; la semana 8 termina el domingo: quedan 5 días contando hoy.
        crear_semana(self.reto, 8, 30)
        actual = calcular_estadisticas(self.reto.tareas.all(), HOY)['semana_actual']
        self.assertEqual(actual['semana'], 8)
        self.assertEqual(actual['faltante'], 70)
        self.assertEqual(actual['dias_restantes'], 5)
        self.assertEqual(actual['ritmo_diario'], 14)

    def test_semana_cumplida_no_exige_ritmo(self):
        crear_semana(self.reto, 8, 100)
        actual = calcular_estadisticas(self.reto.tareas.all(), HOY)['semana_actual']
        self.assertEqual(actual['faltante'], 0)
        self.assertEqual(actual['ritmo_diario'], 0)

    def test_sin_semana_en_curso_devuelve_none(self):
        crear_semana(self.reto, 7, 100)
        self.assertIsNone(calcular_estadisticas(self.reto.tareas.all(), HOY)['semana_actual'])


class EstadisticasApiTests(APITestCase):
    def test_endpoint_devuelve_estadisticas_del_reto(self):
        reto = Reto.objects.create(titulo='Correr', fecha_inicio=INICIO_PERIODO)
        crear_semana(reto, 7, 100)
        crear_semana(reto, 8, 40)
        url = reverse('reto-estadisticas', args=[reto.id])
        with patch('django.utils.timezone.localdate', return_value=HOY):
            respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['racha_actual'], 1)
        self.assertEqual(respuesta.data['semana_actual']['ritmo_diario'], 12)

    def test_reto_inexistente_devuelve_404(self):
        respuesta = self.client.get(reverse('reto-estadisticas', args=[9999]))
        self.assertEqual(respuesta.status_code, status.HTTP_404_NOT_FOUND)
