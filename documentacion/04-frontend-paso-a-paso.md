# Práctica: frontend Ionic/Angular y app Android paso a paso

Fecha de revisión: 18 de noviembre de 2026 (semana 7 del periodo). Plataforma: Windows 10/11 de 64 bits y PowerShell.

## Propósito y entrega

Al terminar tendrás una aplicación **Ionic + Angular** que funciona **en el navegador y como app Android** con el mismo código. La aplicación permite:

- Crear retos y ver la lista con un resumen de color de cada uno.
- Ver el **seguimiento semanal** de cada reto, de la semana 7 a la 15, y registrar el avance de la semana en curso.
- Registrar y consultar la bitácora de avances del reto.
- Cerrar automáticamente cada semana al terminar y pintarla con un **semáforo**: verde si llegó al 100 %, amarillo si quedó incompleta y rojo si no llegó al 10 %.
- **Alertar** cuando una semana se cierra en rojo y avisar con antelación de las semanas en riesgo.

El objetivo didáctico central es la **programación reactiva con RxJS**: primero se identifican los flujos de datos de la aplicación (sección 2) y después se programan.

Trabaja en orden. Ejecuta los bloques uno por uno y comprueba el **resultado esperado** antes de continuar. Si un comando falla, revisa la sección [13. Errores frecuentes](#13-errores-frecuentes).

**Esta guía sirve para otros proyectos con la misma arquitectura.** La sección [14](#14-adaptar-la-guía-a-otro-proyecto) indica qué cambiar.

## 0. Antes de empezar

### 0.1. Requisitos

- Guía `02-instalacion-windows.md` completa: Node, Angular CLI, Ionic CLI, proyecto `frontend` con Ionic y Capacitor, Android Studio con JDK 21 y emulador.
- Guía `03-backend-paso-a-paso.md` completa: backend Django con la aplicación `retos`, los modelos `Reto` y `Avance` y la API en `http://127.0.0.1:8000/api/`.

### 0.2. Arquitectura

```text
                ┌─────────────────────────── frontend (un solo código) ───────────────────────────┐
 Navegador ───► │  ionic serve  (http://localhost:8100)                                             │
                │                                                                                   │
 Android   ───► │  Capacitor (app instalada en el emulador)                                         │
                │                                                                                   │
                │  Páginas ──► SeguimientoService (flujos RxJS) ──► RetosApi (HttpClient)          │
                └──────────────────────────────────────────────┬────────────────────────────────────┘
                                                               │ HTTP + JSON
                       Navegador: http://127.0.0.1:8000/api    │    Emulador: http://10.0.2.2:8000/api
                                                               ▼
                                         backend Django REST ──► MySQL
```

La web y la app Android ejecutan **exactamente el mismo código**. Lo único que cambia es la dirección del backend, y la aplicación la elige sola según la plataforma (apartado 4.3).

### 0.3. Reglas del seguimiento semanal

**Calendario.** El periodo empieza el **lunes 5 de octubre de 2026** (semana 1). Cada semana va de lunes a domingo. Las tareas semanales se crean desde la semana actual, como mínimo la 7, hasta la **semana 15**:

| Semana | Desde | Hasta (cierre al terminar el día) |
| --- | --- | --- |
| 7 | lunes 16/11/2026 | domingo 22/11/2026 |
| 8 | 23/11/2026 | 29/11/2026 |
| 9 | 30/11/2026 | 06/12/2026 |
| 10 | 07/12/2026 | 13/12/2026 |
| 11 | 14/12/2026 | 20/12/2026 |
| 12 | 21/12/2026 | 27/12/2026 |
| 13 | 28/12/2026 | 03/01/2027 |
| 14 | 04/01/2027 | 10/01/2027 |
| 15 | 11/01/2027 | 17/01/2027 |

**Cierre.** Cada semana debe llegar al **100 %**. Al terminar su último día se **cierra**: ya no admite cambios y recibe su color definitivo.

**Semáforo:**

| Estado | Condición | Color |
| --- | --- | --- |
| Por iniciar | La semana todavía no empieza | Gris |
| En curso | Semana actual; se puede registrar avance | Azul |
| Cumplida | Cerrada con **100 %** | **Verde** |
| Incompleta | Cerrada con **10 % a 99 %** | **Amarillo** |
| No cumplida | Cerrada con **menos del 10 %** | **Rojo** |

**Alertas:**

- **Alerta roja:** cuando una semana se cierra en rojo, la app muestra un aviso y la añade a la página de alertas.
- **Alerta de riesgo:** si a la semana en curso le quedan **2 días o menos** y su avance es menor al 10 %, se avisa de que se cerrará en rojo.

Los umbrales (10 %, 100 % y 2 días) están en constantes de un único archivo (apartado 5.2), de modo que cambiarlos no exige tocar el resto del código.

## 1. Ampliar el backend con las tareas semanales

El backend de la guía 03 no tiene semanas. En esta sección se añade el modelo `TareaSemanal` y se garantiza en el servidor que una semana cerrada no pueda modificarse.

Abre una terminal en `backend` con el entorno virtual activo:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\backend"
.\.venv\Scripts\Activate.ps1
```

### 1.1. Variables del calendario en `.env`

Abre `backend\.env` y **añade al final** estas tres líneas:

```dotenv
SEMESTRE_INICIO=2026-10-05
SEMANA_DESDE=7
SEMANA_HASTA=15
```

En la misma línea `CORS_ALLOWED_ORIGINS`, añade `http://localhost` al final, que es el origen de la app Android (apartado 4.4). Debe quedar así:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:8100,http://localhost:4200,https://localhost,http://localhost
```

Añade las mismas tres variables del calendario y el mismo cambio de CORS en `backend\.env.example`. Guarda ambos archivos.

### 1.2. Leer el calendario en `config\settings.py`

En `backend\config\settings.py`:

1. Debajo de `import os`, añade:

   ```python
   from datetime import date
   ```

2. Al **final** del archivo, añade:

   ```python
   # --- Calendario del periodo académico ---------------------------------------
   SEMESTRE_INICIO = date.fromisoformat(os.getenv('SEMESTRE_INICIO', '2026-10-05'))
   SEMANA_DESDE = int(os.getenv('SEMANA_DESDE', '7'))
   SEMANA_HASTA = int(os.getenv('SEMANA_HASTA', '15'))
   ```

Guarda el archivo.

### 1.3. Modelo `TareaSemanal`

Abre `backend\retos\models.py` y **añade al final**, debajo de la clase `Avance`:

```python


class TareaSemanal(models.Model):
    reto = models.ForeignKey(Reto, on_delete=models.CASCADE, related_name='tareas')
    semana = models.PositiveSmallIntegerField()
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    descripcion = models.CharField(max_length=255, blank=True)
    porcentaje = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reto', 'semana']
        verbose_name = 'tarea semanal'
        verbose_name_plural = 'tareas semanales'
        constraints = [
            models.UniqueConstraint(
                fields=['reto', 'semana'], name='tarea_unica_por_reto_y_semana'
            )
        ]

    def __str__(self):
        return f'{self.reto} - semana {self.semana}'
```

`UniqueConstraint` impide que un reto tenga dos tareas de la misma semana.

### 1.4. Lógica del calendario: `retos\semanas.py`

Crea en VS Code el archivo nuevo `backend\retos\semanas.py`:

```python
"""Calendario del periodo y creación de tareas semanales."""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import TareaSemanal


def rango_semana(numero):
    """Devuelve (lunes, domingo) de la semana indicada."""
    inicio = settings.SEMESTRE_INICIO + timedelta(weeks=numero - 1)
    return inicio, inicio + timedelta(days=6)


def semana_actual(hoy=None):
    """Número de semana del periodo que corresponde a hoy."""
    hoy = hoy or timezone.localdate()
    return (hoy - settings.SEMESTRE_INICIO).days // 7 + 1


def crear_tareas_semanales(reto):
    """Crea las tareas que falten desde la semana actual hasta SEMANA_HASTA.

    Devuelve cuántas tareas se crearon.
    """
    existentes = set(reto.tareas.values_list('semana', flat=True))
    desde = max(settings.SEMANA_DESDE, semana_actual())
    nuevas = []
    for numero in range(desde, settings.SEMANA_HASTA + 1):
        if numero in existentes:
            continue
        inicio, fin = rango_semana(numero)
        nuevas.append(TareaSemanal(
            reto=reto,
            semana=numero,
            fecha_inicio=inicio,
            fecha_fin=fin,
            descripcion=f'Meta de la semana {numero}',
        ))
    TareaSemanal.objects.bulk_create(nuevas)
    return len(nuevas)
```

- Las semanas empiezan en la actual: si un reto se crea en la semana 9, no se le crean las semanas 7 y 8 ya pasadas, que saldrían en rojo injustamente.
- La función se puede ejecutar varias veces sin duplicar semanas.

### 1.5. Serializadores: `retos\serializers.py`

Reemplaza todo el contenido de `backend\retos\serializers.py` por:

```python
from django.utils import timezone
from rest_framework import serializers

from .models import Avance, Reto, TareaSemanal


class AvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avance
        fields = ['id', 'reto', 'fecha', 'descripcion', 'porcentaje', 'creado']
        read_only_fields = ['creado']


class RetoSerializer(serializers.ModelSerializer):
    total_avances = serializers.IntegerField(source='avances.count', read_only=True)

    class Meta:
        model = Reto
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_inicio', 'fecha_fin',
            'estado', 'total_avances', 'creado', 'actualizado',
        ]
        read_only_fields = ['creado', 'actualizado']

    def validate(self, datos):
        inicio = datos.get('fecha_inicio', getattr(self.instance, 'fecha_inicio', None))
        fin = datos.get('fecha_fin', getattr(self.instance, 'fecha_fin', None))
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'La fecha de fin no puede ser anterior a la fecha de inicio.'}
            )
        return datos


class TareaSemanalSerializer(serializers.ModelSerializer):
    reto_titulo = serializers.CharField(source='reto.titulo', read_only=True)

    class Meta:
        model = TareaSemanal
        fields = [
            'id', 'reto', 'reto_titulo', 'semana', 'fecha_inicio', 'fecha_fin',
            'descripcion', 'porcentaje', 'actualizado',
        ]
        read_only_fields = ['reto', 'semana', 'fecha_inicio', 'fecha_fin', 'actualizado']

    def validate(self, datos):
        tarea = self.instance
        hoy = timezone.localdate()
        if tarea is not None:
            if hoy > tarea.fecha_fin:
                raise serializers.ValidationError(
                    f'La semana {tarea.semana} ya está cerrada; no se puede modificar.'
                )
            if hoy < tarea.fecha_inicio:
                raise serializers.ValidationError(
                    f'La semana {tarea.semana} todavía no ha comenzado.'
                )
        return datos
```

La regla de cierre vive en el **servidor**. El frontend también la muestra, pero aunque alguien intente modificar una semana pasada desde otra herramienta, el backend la rechaza.

### 1.6. Vistas: `retos\views.py`

Reemplaza todo el contenido de `backend\retos\views.py` por:

```python
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Avance, Reto, TareaSemanal
from .semanas import crear_tareas_semanales
from .serializers import AvanceSerializer, RetoSerializer, TareaSemanalSerializer


class RetoViewSet(viewsets.ModelViewSet):
    """Listar, crear, consultar, modificar y eliminar retos."""

    queryset = Reto.objects.all()
    serializer_class = RetoSerializer
    filterset_fields = ['estado']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['fecha_inicio', 'titulo', 'estado']

    def perform_create(self, serializer):
        reto = serializer.save()
        crear_tareas_semanales(reto)

    @action(detail=True, methods=['post'], url_path='generar-semanas')
    def generar_semanas(self, request, pk=None):
        """Crea las semanas que falten (útil para retos creados antes de esta guía)."""
        creadas = crear_tareas_semanales(self.get_object())
        return Response({'creadas': creadas}, status=status.HTTP_200_OK)


class AvanceViewSet(viewsets.ModelViewSet):
    """Listar, crear, consultar, modificar y eliminar avances."""

    queryset = Avance.objects.select_related('reto')
    serializer_class = AvanceSerializer
    filterset_fields = ['reto']
    ordering_fields = ['fecha', 'porcentaje']


class TareaSemanalViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Consultar y actualizar tareas semanales. Se crean solas; no se borran."""

    queryset = TareaSemanal.objects.select_related('reto')
    serializer_class = TareaSemanalSerializer
    filterset_fields = ['reto', 'semana']
    ordering_fields = ['semana']
    pagination_class = None
```

- `perform_create` crea las semanas automáticamente al crear un reto.
- `TareaSemanalViewSet` solo permite **listar, consultar y actualizar**: las tareas no se crean ni se borran a mano.
- `pagination_class = None` devuelve todas las tareas en una lista, porque la app necesita verlas todas para calcular las alertas.

### 1.7. Rutas: `retos\urls.py`

Reemplaza todo el contenido de `backend\retos\urls.py` por:

```python
from rest_framework.routers import DefaultRouter

from .views import AvanceViewSet, RetoViewSet, TareaSemanalViewSet

router = DefaultRouter()
router.register('retos', RetoViewSet)
router.register('avances', AvanceViewSet)
router.register('tareas', TareaSemanalViewSet)

urlpatterns = router.urls
```

### 1.8. Administrador: `retos\admin.py`

Reemplaza todo el contenido de `backend\retos\admin.py` por:

```python
from django.contrib import admin

from .models import Avance, Reto, TareaSemanal


class AvanceInline(admin.TabularInline):
    model = Avance
    extra = 0


class TareaSemanalInline(admin.TabularInline):
    model = TareaSemanal
    extra = 0
    fields = ('semana', 'fecha_inicio', 'fecha_fin', 'descripcion', 'porcentaje')


@admin.register(Reto)
class RetoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'estado', 'fecha_inicio', 'fecha_fin')
    list_filter = ('estado',)
    search_fields = ('titulo', 'descripcion')
    inlines = [TareaSemanalInline, AvanceInline]


@admin.register(Avance)
class AvanceAdmin(admin.ModelAdmin):
    list_display = ('reto', 'fecha', 'porcentaje')
    list_filter = ('reto',)


@admin.register(TareaSemanal)
class TareaSemanalAdmin(admin.ModelAdmin):
    list_display = ('reto', 'semana', 'fecha_inicio', 'fecha_fin', 'porcentaje')
    list_filter = ('semana', 'reto')
```

El administrador permite editar cualquier tarea, incluidas las cerradas. Es la herramienta del docente y la usaremos para simular cierres en el apartado 11.

### 1.9. Migrar y crear las semanas de los retos existentes

```powershell
python manage.py makemigrations retos
python manage.py migrate
python manage.py shell -c "from retos.models import Reto; from retos.semanas import crear_tareas_semanales; print('Tareas creadas:', sum(crear_tareas_semanales(r) for r in Reto.objects.all()))"
```

Resultado esperado:

- `makemigrations` crea `retos\migrations\0002_tareasemanal.py` con `Create model TareaSemanal`.
- `migrate` termina con `Applying retos.0002_tareasemanal... OK`.
- El tercer comando crea las semanas de los retos que ya existían: muestra `Tareas creadas:` con un número igual a 9 por cada reto si estás en la semana 7.

### 1.10. Pruebas del backend

Reemplaza todo el contenido de `backend\retos\tests.py` por el siguiente. Conserva las tres pruebas de la guía 03 y añade dos nuevas:

```python
from datetime import date, timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Reto, TareaSemanal

HOY = timezone.localdate()


class RetoApiTests(APITestCase):
    def test_crear_y_listar_reto(self):
        url = reverse('reto-list')
        datos = {'titulo': 'Leer 10 libros', 'fecha_inicio': '2026-11-18'}

        respuesta = self.client.post(url, datos, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reto.objects.count(), 1)

        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['count'], 1)

    def test_rechaza_fecha_fin_anterior_a_inicio(self):
        datos = {'titulo': 'Fechas', 'fecha_inicio': '2026-11-18', 'fecha_fin': '2026-11-01'}
        respuesta = self.client.post(reverse('reto-list'), datos, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_fin', respuesta.data)

    def test_rechaza_porcentaje_mayor_a_100(self):
        reto = Reto.objects.create(titulo='Correr', fecha_inicio=date(2026, 11, 18))
        datos = {'reto': reto.id, 'fecha': '2026-11-18', 'descripcion': 'Prueba', 'porcentaje': 150}
        respuesta = self.client.post(reverse('avance-list'), datos, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('porcentaje', respuesta.data)


# Hoy se simula como semana 7, sea cual sea la fecha real en que se ejecute la prueba.
@override_settings(SEMESTRE_INICIO=HOY - timedelta(weeks=6), SEMANA_DESDE=7, SEMANA_HASTA=15)
class TareaSemanalTests(APITestCase):
    def test_crear_reto_genera_semanas_7_a_15(self):
        datos = {'titulo': 'Reto semanal', 'fecha_inicio': str(HOY)}
        respuesta = self.client.post(reverse('reto-list'), datos, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        semanas = list(
            TareaSemanal.objects.filter(reto_id=respuesta.data['id'])
            .values_list('semana', flat=True)
        )
        self.assertEqual(semanas, list(range(7, 16)))

    def test_semana_cerrada_no_se_puede_modificar(self):
        reto = Reto.objects.create(titulo='Cerrado', fecha_inicio=HOY)
        tarea = TareaSemanal.objects.create(
            reto=reto, semana=6,
            fecha_inicio=HOY - timedelta(days=13), fecha_fin=HOY - timedelta(days=7),
        )
        url = reverse('tareasemanal-detail', args=[tarea.id])
        respuesta = self.client.patch(url, {'porcentaje': 100}, format='json')
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
```

```powershell
python manage.py test retos
```

Resultado esperado: `Ran 5 tests` y `OK`.

### 1.11. Probar la API de tareas

```powershell
python manage.py runserver 0.0.0.0:8000
```

Abre en el navegador de la PC:

- `http://127.0.0.1:8000/api/tareas/`: lista de tareas, sin paginación. Cada una incluye `reto_titulo`, `semana`, `fecha_inicio`, `fecha_fin` y `porcentaje`.
- `http://127.0.0.1:8000/api/tareas/?reto=1`: solo las tareas del reto 1.
- `http://127.0.0.1:8000/api/docs/`: aparece el grupo `tareas` y la operación `POST /api/retos/{id}/generar-semanas/`.

**Deja este servidor en ejecución** durante toda la práctica, en su propia terminal. Usa `0.0.0.0:8000` para que también lo alcance el emulador.

**Evidencia 1:** `python manage.py test retos` con 5 pruebas en `OK` y `/api/tareas/` en el navegador.

## 2. Identificar los flujos reactivos

En programación reactiva, los datos se modelan como **flujos** (`Observable`) que emiten valores a lo largo del tiempo. La interfaz se suscribe a ellos y se actualiza sola cuando emiten. Antes de programar, se identifican qué flujos tiene la aplicación, de dónde nacen y cómo se combinan.

### 2.1. Flujos de esta aplicación

| Id | Flujo | Origen (evento) | Operadores RxJS | Resultado |
| --- | --- | --- | --- | --- |
| F1 | Carga de datos | `recargar()`: al abrir la app, deslizar para refrescar o guardar | `BehaviorSubject` → `switchMap` → `catchError` → `shareReplay` | `retos$`, `tareas$` |
| F2 | Búsqueda | El usuario escribe en el buscador | `debounceTime(300)` → `distinctUntilChanged` → `combineLatest` | Lista filtrada |
| F3 | Reloj del periodo | El tiempo: cada minuto | `timer(0, 60000)` → `map(hoy)` → `distinctUntilChanged` | `hoy$`, que emite solo cuando cambia el día |
| F4 | Evaluación de semanas | F1 + F3 | `combineLatest` → `map(evaluarSemana)` | `semanas$` con semáforo, cierre y riesgo |
| F5 | Detección de alertas | F4 | `map(filter)` → `combineLatest` | `rojas$`, `enRiesgo$`, `totalAlertas$` |
| F6 | Aviso de rojos nuevos | F5 | `scan` (recuerda las ya avisadas) → `filter` | `nuevasRojas$`: toast una sola vez por semana |
| F7 | Guardado automático | El usuario mueve el control de porcentaje | `Subject` → `debounceTime(400)` → `switchMap(PATCH)` → `tap(recargar)` | `guardado$`: mensaje de éxito o error |

### 2.2. Diagrama

```text
 F1 recargar() ──► retos$ ──────────────────────────────┬──► F2 (+ búsqueda) ──► Lista de retos
                └─► tareas$ ─┐                          │
                             ├─ combineLatest ─► F4 semanas$ ──► Detalle (semáforo por semana)
 F3 timer(cada min) ► hoy$ ──┘                     │
                                                   ├─► F5 rojas$ / enRiesgo$ ──► Página de alertas
                                                   │                        └─► Insignia (total)
                                                   └─► F6 nuevasRojas$ (scan) ──► Toast "semana en rojo"

 F7 control de porcentaje ─► debounce ─► PATCH /tareas/{id}/ ─► recargar() ─► vuelve a F1
```

### 2.3. Por qué es reactivo el cierre de semana

Nadie pulsa un botón para cerrar una semana. El flujo **F3** emite una nueva fecha cuando cambia el día; **F4** vuelve a evaluar todas las semanas con esa fecha; la semana que terminó pasa de *En curso* a *Cumplida*, *Incompleta* o *No cumplida*; **F5** y **F6** detectan el rojo y muestran la alerta. Todo ocurre **sin recargar la app**, en la web y en Android.

## 3. Preparar el proyecto frontend

### 3.1. Estructura final

```text
frontend/src/app/
├── app.config.ts              (se reemplaza)
├── app.routes.ts              (se reemplaza)
├── app.ts                     (se reemplaza: raíz con ion-app y alertas)
├── core/
│   ├── api.config.ts          dirección del backend según la plataforma
│   ├── modelos.ts             interfaces de los datos de la API
│   ├── semaforo.ts            reglas del semáforo (funciones puras)
│   ├── semaforo.spec.ts       pruebas unitarias de las reglas
│   ├── retos-api.service.ts   llamadas HTTP
│   └── seguimiento.service.ts flujos reactivos F1 y F3-F7
└── paginas/
    ├── retos-lista.page.ts    lista, búsqueda (F2) y resumen
    ├── reto-form.page.ts      crear reto
    ├── reto-detalle.page.ts   seguimiento semanal y avances
    └── alertas.page.ts        semanas en rojo y en riesgo
```

### 3.2. Crear carpetas y archivos vacíos

En una **segunda terminal** (el backend sigue en la primera):

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend\src\app"
New-Item -ItemType Directory -Force core, paginas | Out-Null
'core\api.config.ts', 'core\modelos.ts', 'core\semaforo.ts', 'core\semaforo.spec.ts',
'core\retos-api.service.ts', 'core\seguimiento.service.ts',
'paginas\retos-lista.page.ts', 'paginas\reto-form.page.ts',
'paginas\reto-detalle.page.ts', 'paginas\alertas.page.ts' |
  ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType File $_ | Out-Null } }
Remove-Item app.html, app.scss, app.spec.ts -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Name
```

Resultado esperado: aparecen las carpetas `core` y `paginas` con los archivos vacíos, y ya no están `app.html`, `app.scss` ni `app.spec.ts`. Esos tres archivos eran de la plantilla de bienvenida de Angular: la raíz nueva lleva su plantilla dentro de `app.ts`, y la prueba antigua buscaba el texto "Hello, frontend", que deja de existir.

En los apartados siguientes, **abre cada archivo en VS Code, pega el contenido indicado y guarda con `Ctrl+S`**.

## 4. Configuración de la aplicación

### 4.1. `app.config.ts`

Reemplaza todo el contenido de `frontend\src\app\app.config.ts` por:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
};
```

- `provideHttpClient()` permite llamar a la API.
- `IonicRouteStrategy` conserva las páginas anteriores al navegar, como en una app móvil.
- Desde Ionic 9 todo se importa desde `@ionic/angular`, no desde `@ionic/angular/standalone`.

### 4.2. `app.routes.ts`

Reemplaza todo el contenido de `frontend\src\app\app.routes.ts` por:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'retos', pathMatch: 'full' },
  {
    path: 'retos',
    loadComponent: () => import('./paginas/retos-lista.page').then((m) => m.RetosListaPage),
  },
  {
    path: 'retos/nuevo',
    loadComponent: () => import('./paginas/reto-form.page').then((m) => m.RetoFormPage),
  },
  {
    path: 'retos/:id',
    loadComponent: () => import('./paginas/reto-detalle.page').then((m) => m.RetoDetallePage),
  },
  {
    path: 'alertas',
    loadComponent: () => import('./paginas/alertas.page').then((m) => m.AlertasPage),
  },
  { path: '**', redirectTo: 'retos' },
];
```

`retos/nuevo` va antes que `retos/:id`: si no, Angular interpretaría `nuevo` como un `id`. `loadComponent` carga cada página solo cuando se visita.

### 4.3. Dirección del backend: `core\api.config.ts`

```typescript
import { Capacitor } from '@capacitor/core';

const PUERTO = 8000;

/**
 * Para un teléfono real, escribe aquí la IPv4 de tu PC (ipconfig), por ejemplo '192.168.1.50',
 * y añádela también a ALLOWED_HOSTS en backend/.env. Déjalo vacío para el emulador.
 */
const IP_TELEFONO_REAL = '';

/** Dirección base de la API según dónde se ejecute la app. */
export function urlApi(): string {
  if (Capacitor.getPlatform() === 'android') {
    // El emulador llega a la PC con 10.0.2.2; un teléfono real, con la IP de la PC.
    return `http://${IP_TELEFONO_REAL || '10.0.2.2'}:${PUERTO}/api`;
  }
  // Navegador de la PC (ionic serve).
  return `http://127.0.0.1:${PUERTO}/api`;
}
```

Gracias a esta función, el **mismo código** funciona en la web y en Android.

### 4.4. Permitir HTTP en Android: `capacitor.config.ts`

Reemplaza todo el contenido de `frontend\capacitor.config.ts` por:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.ejemplo.seguimientoretos',
  appName: 'Seguimiento de Retos',
  webDir: 'dist/frontend/browser',
  server: {
    // Solo desarrollo: la app se sirve como http://localhost para poder llamar
    // a un backend http (10.0.2.2:8000) sin bloqueo por "contenido mixto".
    androidScheme: 'http',
    // Solo desarrollo: Android bloquea el tráfico http sin cifrar si no se permite.
    cleartext: true,
  },
};

export default config;
```

- Por defecto, la app Android se sirve como `https://localhost`, y el WebView bloquea las llamadas desde `https` a un backend `http`.
- Con `androidScheme: 'http'` el origen pasa a ser `http://localhost`: por eso se añadió a `CORS_ALLOWED_ORIGINS` en el apartado 1.1.
- **Esta configuración es solo para desarrollo.** En producción el backend debe usar `https` y estas dos opciones se eliminan.

## 5. Modelos y reglas del semáforo

### 5.1. `core\modelos.ts`

```typescript
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

/** Respuesta paginada de Django REST Framework. */
export interface Pagina<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

Las interfaces reproducen el JSON que devuelve la API de la guía 03 y del apartado 1. Los nombres de los campos son los mismos que en Django.

### 5.2. `core\semaforo.ts`

```typescript
import { TareaSemanal } from './modelos';

export type Semaforo = 'PENDIENTE' | 'ABIERTA' | 'VERDE' | 'AMARILLO' | 'ROJO';

// ---- Reglas del seguimiento: cámbialas aquí y se aplican en toda la app ----
/** Una semana cerrada con menos de este porcentaje queda en rojo. */
export const UMBRAL_ROJO = 10;
/** Porcentaje que debe alcanzar una semana para quedar en verde. */
export const META = 100;
/** Días antes del cierre en que se avisa del riesgo de cerrar en rojo. */
export const DIAS_AVISO_RIESGO = 2;

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  PENDIENTE: 'Por iniciar',
  ABIERTA: 'En curso',
  VERDE: 'Cumplida',
  AMARILLO: 'Incompleta',
  ROJO: 'No cumplida',
};

/** Colores de Ionic para cada estado. */
export const COLOR_SEMAFORO: Record<Semaforo, string> = {
  PENDIENTE: 'medium',
  ABIERTA: 'primary',
  VERDE: 'success',
  AMARILLO: 'warning',
  ROJO: 'danger',
};

export interface SemanaEvaluada extends TareaSemanal {
  semaforo: Semaforo;
  cerrada: boolean;
  editable: boolean;
  diasRestantes: number;
  enRiesgo: boolean;
}

export interface ResumenReto {
  ROJO: number;
  AMARILLO: number;
  VERDE: number;
  ABIERTA: number;
  PENDIENTE: number;
}

/** Fecha local de hoy en formato 'AAAA-MM-DD'. */
export function hoyIso(fecha = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Días entre dos fechas 'AAAA-MM-DD' (hasta - desde). */
export function diasEntre(desde: string, hasta: string): number {
  const aUtc = (iso: string) => {
    const [anio, mes, dia] = iso.split('-').map(Number);
    return Date.UTC(anio, mes - 1, dia);
  };
  return Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000);
}

/** '2026-11-16' -> '16/11' (sin conversiones de zona horaria). */
export function fechaCorta(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/** Regla del semáforo. Las fechas 'AAAA-MM-DD' se comparan como texto. */
export function calcularSemaforo(
  porcentaje: number,
  fechaInicio: string,
  fechaFin: string,
  hoy: string,
): Semaforo {
  if (hoy < fechaInicio) {
    return 'PENDIENTE';
  }
  if (hoy <= fechaFin) {
    return 'ABIERTA';
  }
  if (porcentaje >= META) {
    return 'VERDE';
  }
  if (porcentaje < UMBRAL_ROJO) {
    return 'ROJO';
  }
  return 'AMARILLO';
}

/** Añade a una tarea su semáforo, si está cerrada, si es editable y si está en riesgo. */
export function evaluarSemana(tarea: TareaSemanal, hoy: string): SemanaEvaluada {
  const semaforo = calcularSemaforo(tarea.porcentaje, tarea.fecha_inicio, tarea.fecha_fin, hoy);
  const diasRestantes = Math.max(diasEntre(hoy, tarea.fecha_fin), 0);
  return {
    ...tarea,
    semaforo,
    cerrada: hoy > tarea.fecha_fin,
    editable: semaforo === 'ABIERTA',
    diasRestantes,
    enRiesgo:
      semaforo === 'ABIERTA' &&
      tarea.porcentaje < UMBRAL_ROJO &&
      diasRestantes <= DIAS_AVISO_RIESGO,
  };
}

/** Cuenta, por reto, cuántas semanas hay de cada color. */
export function resumirPorReto(semanas: SemanaEvaluada[]): Map<number, ResumenReto> {
  const resumen = new Map<number, ResumenReto>();
  for (const semana of semanas) {
    const actual = resumen.get(semana.reto) ?? {
      ROJO: 0, AMARILLO: 0, VERDE: 0, ABIERTA: 0, PENDIENTE: 0,
    };
    actual[semana.semaforo]++;
    resumen.set(semana.reto, actual);
  }
  return resumen;
}
```

Son **funciones puras**: dado el mismo dato de entrada, siempre devuelven el mismo resultado y no llaman a la API. Por eso se pueden probar sin servidor (apartado 5.3) y reutilizar en los flujos reactivos.

### 5.3. Pruebas de las reglas: `core\semaforo.spec.ts`

```typescript
import { calcularSemaforo, diasEntre, evaluarSemana } from './semaforo';
import { TareaSemanal } from './modelos';

const INICIO = '2026-11-16'; // lunes semana 7
const FIN = '2026-11-22'; // domingo semana 7

describe('calcularSemaforo', () => {
  it('una semana futura queda PENDIENTE', () => {
    expect(calcularSemaforo(0, INICIO, FIN, '2026-11-10')).toBe('PENDIENTE');
  });

  it('la semana en curso queda ABIERTA, incluso su último día', () => {
    expect(calcularSemaforo(0, INICIO, FIN, '2026-11-18')).toBe('ABIERTA');
    expect(calcularSemaforo(0, INICIO, FIN, FIN)).toBe('ABIERTA');
  });

  it('cerrada con 100 % queda VERDE', () => {
    expect(calcularSemaforo(100, INICIO, FIN, '2026-11-23')).toBe('VERDE');
  });

  it('cerrada con menos de 10 % queda ROJO', () => {
    expect(calcularSemaforo(0, INICIO, FIN, '2026-11-23')).toBe('ROJO');
    expect(calcularSemaforo(9, INICIO, FIN, '2026-11-23')).toBe('ROJO');
  });

  it('cerrada entre 10 % y 99 % queda AMARILLO', () => {
    for (const porcentaje of [10, 50, 70, 99]) {
      expect(calcularSemaforo(porcentaje, INICIO, FIN, '2026-11-23')).toBe('AMARILLO');
    }
  });
});

describe('evaluarSemana', () => {
  const tarea: TareaSemanal = {
    id: 1, reto: 1, reto_titulo: 'Leer', semana: 7, fecha_inicio: INICIO,
    fecha_fin: FIN, descripcion: '', porcentaje: 5, actualizado: '',
  };

  it('marca en riesgo una semana abierta con poco avance a 2 días del cierre', () => {
    expect(evaluarSemana(tarea, '2026-11-20').enRiesgo).toBe(true);
    expect(evaluarSemana(tarea, '2026-11-17').enRiesgo).toBe(false);
  });

  it('una semana cerrada no es editable', () => {
    expect(evaluarSemana(tarea, '2026-11-23').editable).toBe(false);
  });

  it('calcula los días entre fechas', () => {
    expect(diasEntre('2026-11-20', '2026-11-22')).toBe(2);
  });
});
```

Ejecuta las pruebas desde `frontend`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npx.cmd ng test --watch=false
```

Resultado esperado: el resumen de Vitest con todas las pruebas de `semaforo.spec.ts` superadas (`passed`) y ninguna fallida. Puede tardar un poco la primera vez.

Si en este momento aparecen errores de compilación de **otros** archivos (`retos-api.service.ts`, páginas…), es porque todavía están vacíos: completa los apartados 6 a 8 y vuelve a ejecutar las pruebas al final.

## 6. Servicios: acceso a la API y flujos reactivos

### 6.1. `core\retos-api.service.ts`

```typescript
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from './api.config';
import { Avance, NuevoAvance, NuevoReto, Pagina, Reto, TareaSemanal } from './modelos';

/** Solo habla con el backend. No guarda estado: eso es tarea de SeguimientoService. */
@Injectable({ providedIn: 'root' })
export class RetosApi {
  private readonly http = inject(HttpClient);
  private readonly base = urlApi();

  listarRetos(): Observable<Reto[]> {
    return this.http.get<Pagina<Reto>>(`${this.base}/retos/`).pipe(map((p) => p.results));
  }

  obtenerReto(id: number): Observable<Reto> {
    return this.http.get<Reto>(`${this.base}/retos/${id}/`);
  }

  crearReto(datos: NuevoReto): Observable<Reto> {
    return this.http.post<Reto>(`${this.base}/retos/`, datos);
  }

  generarSemanas(id: number): Observable<{ creadas: number }> {
    return this.http.post<{ creadas: number }>(`${this.base}/retos/${id}/generar-semanas/`, {});
  }

  listarTareas(): Observable<TareaSemanal[]> {
    return this.http.get<TareaSemanal[]>(`${this.base}/tareas/`);
  }

  actualizarTarea(
    id: number,
    cambios: Partial<Pick<TareaSemanal, 'porcentaje' | 'descripcion'>>,
  ): Observable<TareaSemanal> {
    return this.http.patch<TareaSemanal>(`${this.base}/tareas/${id}/`, cambios);
  }

  listarAvances(retoId: number): Observable<Avance[]> {
    const params = new HttpParams().set('reto', retoId);
    return this.http
      .get<Pagina<Avance>>(`${this.base}/avances/`, { params })
      .pipe(map((p) => p.results));
  }

  crearAvance(datos: NuevoAvance): Observable<Avance> {
    return this.http.post<Avance>(`${this.base}/avances/`, datos);
  }
}

/** Convierte un error HTTP en un mensaje legible para el usuario. */
export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Sin conexión con el backend. ¿Está en ejecución "python manage.py runserver 0.0.0.0:8000"?';
    }
    if (error.error && typeof error.error === 'object') {
      // Django REST devuelve {"campo": ["mensaje"]} o {"non_field_errors": ["mensaje"]}.
      return Object.values(error.error as Record<string, unknown>).flat().join(' ');
    }
    return `Error ${error.status} del servidor.`;
  }
  return 'Error inesperado.';
}
```

### 6.2. `core\seguimiento.service.ts` (flujos F1 y F3 a F7)

```typescript
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  scan,
  share,
  shareReplay,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { Reto, TareaSemanal } from './modelos';
import { RetosApi, mensajeError } from './retos-api.service';
import { ResumenReto, SemanaEvaluada, evaluarSemana, hoyIso, resumirPorReto } from './semaforo';

export interface ResultadoGuardado {
  ok: boolean;
  mensaje: string;
}

/** Estado reactivo de la aplicación. Las páginas solo se suscriben a estos flujos. */
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly api = inject(RetosApi);

  /** Disparador de recarga: cada next() vuelve a pedir los datos al backend. */
  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  /** Último error de carga, o null si todo fue bien. */
  readonly error$ = new BehaviorSubject<string | null>(null);

  // F1. Carga de datos -------------------------------------------------------
  readonly retos$: Observable<Reto[]> = this.recargar$.pipe(
    switchMap(() =>
      this.api.listarRetos().pipe(
        tap(() => this.error$.next(null)),
        catchError((e) => {
          this.error$.next(mensajeError(e));
          return of([] as Reto[]);
        }),
      ),
    ),
    shareReplay(1),
  );

  private readonly tareas$: Observable<TareaSemanal[]> = this.recargar$.pipe(
    switchMap(() =>
      this.api.listarTareas().pipe(
        catchError((e) => {
          this.error$.next(mensajeError(e));
          return of([] as TareaSemanal[]);
        }),
      ),
    ),
    shareReplay(1),
  );

  // F3. Reloj del periodo: revisa la fecha cada minuto; emite solo si cambia el día.
  readonly hoy$: Observable<string> = timer(0, 60_000).pipe(
    map(() => hoyIso()),
    distinctUntilChanged(),
    shareReplay(1),
  );

  // F4. Evaluación de semanas: datos + fecha => semáforo, cierre y riesgo.
  readonly semanas$: Observable<SemanaEvaluada[]> = combineLatest([this.tareas$, this.hoy$]).pipe(
    map(([tareas, hoy]) => tareas.map((tarea) => evaluarSemana(tarea, hoy))),
    shareReplay(1),
  );

  readonly resumen$: Observable<Map<number, ResumenReto>> = this.semanas$.pipe(
    map(resumirPorReto),
    shareReplay(1),
  );

  // F5. Detección de alertas -------------------------------------------------
  readonly rojas$: Observable<SemanaEvaluada[]> = this.semanas$.pipe(
    map((semanas) => semanas.filter((s) => s.semaforo === 'ROJO')),
    shareReplay(1),
  );

  readonly enRiesgo$: Observable<SemanaEvaluada[]> = this.semanas$.pipe(
    map((semanas) => semanas.filter((s) => s.enRiesgo)),
    shareReplay(1),
  );

  readonly totalAlertas$: Observable<number> = combineLatest([this.rojas$, this.enRiesgo$]).pipe(
    map(([rojas, riesgo]) => rojas.length + riesgo.length),
    distinctUntilChanged(),
  );

  // F6. Aviso de rojos nuevos: scan recuerda las ya vistas para avisar una sola vez.
  readonly nuevasRojas$: Observable<SemanaEvaluada[]> = this.rojas$.pipe(
    scan(
      (estado, rojas) => ({
        vistas: new Set(rojas.map((r) => r.id)),
        nuevas: rojas.filter((r) => !estado.vistas.has(r.id)),
      }),
      { vistas: new Set<number>(), nuevas: [] as SemanaEvaluada[] },
    ),
    map((estado) => estado.nuevas),
    filter((nuevas) => nuevas.length > 0),
  );

  // F7. Guardado automático del porcentaje de la semana en curso ----------------
  private readonly cambios$ = new Subject<{ tarea: SemanaEvaluada; porcentaje: number }>();

  readonly guardado$: Observable<ResultadoGuardado> = this.cambios$.pipe(
    debounceTime(400),
    switchMap(({ tarea, porcentaje }) =>
      this.api.actualizarTarea(tarea.id, { porcentaje }).pipe(
        map(() => ({ ok: true, mensaje: `Semana ${tarea.semana}: ${porcentaje} % guardado.` })),
        catchError((e) => of({ ok: false, mensaje: mensajeError(e) })),
      ),
    ),
    tap(() => this.recargar()),
    share(),
  );

  semanasDeReto$(retoId: number): Observable<SemanaEvaluada[]> {
    return this.semanas$.pipe(map((semanas) => semanas.filter((s) => s.reto === retoId)));
  }

  recargar(): void {
    this.recargar$.next();
  }

  cambiarPorcentaje(tarea: SemanaEvaluada, porcentaje: number): void {
    this.cambios$.next({ tarea, porcentaje });
  }
}
```

Operadores clave:

| Operador | Para qué se usa aquí |
| --- | --- |
| `BehaviorSubject` / `Subject` | Convertir acciones (recargar, mover el control) en flujos |
| `switchMap` | Lanzar la petición HTTP y descartar la anterior si llega otra |
| `catchError` | Que un error del servidor no rompa el flujo: se muestra el mensaje y sigue funcionando |
| `shareReplay(1)` | Compartir una sola petición entre varias páginas y entregar el último valor a quien llegue después |
| `timer` | Crear el reloj que dispara el cierre automático |
| `combineLatest` | Recalcular cuando cambian los datos **o** la fecha |
| `scan` | Recordar estado entre emisiones (qué rojos ya se avisaron) |
| `debounceTime` | Esperar a que el usuario termine de mover el control o de escribir |

## 7. Componente raíz y alerta de rojos

Reemplaza todo el contenido de `frontend\src\app\app.ts` por:

```typescript
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular';

import { SeguimientoService } from './core/seguimiento.service';
import { SemanaEvaluada } from './core/semaforo';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class App {
  private readonly toast = inject(ToastController);
  private readonly router = inject(Router);

  constructor() {
    // F6: escucha durante toda la vida de la app; avisa cada vez que una semana pasa a rojo.
    inject(SeguimientoService)
      .nuevasRojas$.pipe(takeUntilDestroyed())
      .subscribe((nuevas) => this.avisarRojas(nuevas));
  }

  private async avisarRojas(nuevas: SemanaEvaluada[]): Promise<void> {
    const detalle = nuevas.map((s) => `${s.reto_titulo} (semana ${s.semana})`).join(', ');
    const aviso = await this.toast.create({
      header: `${nuevas.length} semana(s) cerrada(s) en rojo`,
      message: detalle,
      color: 'danger',
      position: 'top',
      duration: 8000,
      buttons: [{ text: 'Ver', handler: () => void this.router.navigate(['/alertas']) }],
    });
    await aviso.present();
  }
}
```

La suscripción está en la raíz, así que el aviso aparece **en cualquier página**. Al abrir la app avisa de los rojos existentes; después, solo de los nuevos.

## 8. Páginas

En cada página, el arreglo `imports` debe incluir **todos** los componentes Ionic usados en la plantilla. Si falta uno, Angular muestra `'ion-…' is not a known element`.

### 8.1. Lista de retos: `paginas\retos-lista.page.ts`

```typescript
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, notifications } from 'ionicons/icons';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, skip, take } from 'rxjs';

import { ETIQUETA_ESTADO } from '../core/modelos';
import { ResumenReto, fechaCorta } from '../core/semaforo';
import { SeguimientoService } from '../core/seguimiento.service';

const RESUMEN_VACIO: ResumenReto = { ROJO: 0, AMARILLO: 0, VERDE: 0, ABIERTA: 0, PENDIENTE: 0 };

@Component({
  selector: 'app-retos-lista',
  imports: [
    AsyncPipe, RouterLink, IonBadge, IonButton, IonButtons, IonChip, IonContent, IonFab,
    IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonRefresher,
    IonRefresherContent, IonSearchbar, IonText, IonTitle, IonToolbar,
  ],
  styles: `.semaforos { display: flex; gap: 4px; }`,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mis retos</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/alertas" aria-label="Ver alertas">
            <ion-icon slot="icon-only" name="notifications"></ion-icon>
            @if (totalAlertas$ | async; as total) {
              <ion-badge color="danger">{{ total }}</ion-badge>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Buscar reto"
          (ionInput)="buscar($any($event).detail.value)"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($any($event))">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (error$ | async; as error) {
        <ion-text color="danger"><p class="ion-padding">{{ error }}</p></ion-text>
      }

      @if (vista$ | async; as vista) {
        @if (vista.length === 0) {
          <p class="ion-padding">No hay retos. Pulsa + para crear el primero.</p>
        }
        <ion-list>
          @for (item of vista; track item.reto.id) {
            <ion-item [routerLink]="['/retos', item.reto.id]" detail>
              <ion-label>
                <h2>{{ item.reto.titulo }}</h2>
                <p>{{ etiquetaEstado[item.reto.estado] }} · inicia {{ fechaCorta(item.reto.fecha_inicio) }}</p>
              </ion-label>
              <div slot="end" class="semaforos">
                @if (item.resumen.ROJO) { <ion-chip color="danger">{{ item.resumen.ROJO }}</ion-chip> }
                @if (item.resumen.AMARILLO) { <ion-chip color="warning">{{ item.resumen.AMARILLO }}</ion-chip> }
                @if (item.resumen.VERDE) { <ion-chip color="success">{{ item.resumen.VERDE }}</ion-chip> }
              </div>
            </ion-item>
          }
        </ion-list>
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button routerLink="/retos/nuevo" aria-label="Nuevo reto">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class RetosListaPage {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly busqueda$ = new BehaviorSubject<string>('');

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly fechaCorta = fechaCorta;
  protected readonly error$ = this.seguimiento.error$;
  protected readonly totalAlertas$ = this.seguimiento.totalAlertas$;

  // F2: búsqueda reactiva combinada con los retos (F1) y el resumen de semáforos (F4).
  protected readonly vista$ = combineLatest([
    this.seguimiento.retos$,
    this.busqueda$.pipe(
      debounceTime(300),
      map((texto) => texto.trim().toLowerCase()),
      distinctUntilChanged(),
    ),
    this.seguimiento.resumen$,
  ]).pipe(
    map(([retos, texto, resumen]) =>
      retos
        .filter((reto) => reto.titulo.toLowerCase().includes(texto))
        .map((reto) => ({ reto, resumen: resumen.get(reto.id) ?? RESUMEN_VACIO })),
    ),
  );

  constructor() {
    addIcons({ add, notifications });
  }

  protected buscar(texto: string | null | undefined): void {
    this.busqueda$.next(texto ?? '');
  }

  protected refrescar(evento: { target: { complete(): void } }): void {
    this.seguimiento.recargar();
    // Cierra el indicador cuando llegan los datos nuevos (skip(1) salta el valor actual).
    this.seguimiento.retos$.pipe(skip(1), take(1)).subscribe(() => evento.target.complete());
  }
}
```

Los chips de la derecha muestran cuántas semanas de cada reto están en rojo, amarillo y verde.

### 8.2. Crear reto: `paginas\reto-form.page.ts`

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { EstadoReto } from '../core/modelos';
import { RetosApi, mensajeError } from '../core/retos-api.service';
import { hoyIso } from '../core/semaforo';
import { SeguimientoService } from '../core/seguimiento.service';

@Component({
  selector: 'app-reto-form',
  imports: [
    ReactiveFormsModule, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput,
    IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/retos"></ion-back-button>
        </ion-buttons>
        <ion-title>Nuevo reto</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list>
          <ion-item>
            <ion-input label="Título" labelPlacement="stacked" formControlName="titulo"
              [maxlength]="150" placeholder="Ej.: Leer 10 libros"></ion-input>
          </ion-item>
          <ion-item>
            <ion-textarea label="Descripción" labelPlacement="stacked"
              formControlName="descripcion" [autoGrow]="true"></ion-textarea>
          </ion-item>
          <ion-item>
            <ion-input label="Fecha de inicio" labelPlacement="stacked" type="date"
              formControlName="fecha_inicio"></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label="Fecha de fin (opcional)" labelPlacement="stacked" type="date"
              formControlName="fecha_fin"></ion-input>
          </ion-item>
          <ion-item>
            <ion-select label="Estado" labelPlacement="stacked" formControlName="estado"
              interface="popover">
              <ion-select-option value="PENDIENTE">Pendiente</ion-select-option>
              <ion-select-option value="EN_CURSO">En curso</ion-select-option>
              <ion-select-option value="COMPLETADO">Completado</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        @if (form.controls.titulo.invalid && form.controls.titulo.touched) {
          <ion-text color="danger"><p>El título es obligatorio.</p></ion-text>
        }

        <ion-note>
          Al guardar se crean automáticamente las tareas semanales desde la semana actual hasta la 15.
        </ion-note>

        <ion-button expand="block" type="submit" [disabled]="form.invalid || guardando()">
          Guardar reto
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class RetoFormPage {
  private readonly api = inject(RetosApi);
  private readonly seguimiento = inject(SeguimientoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  protected readonly guardando = signal(false);

  protected readonly form = new FormGroup({
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    descripcion: new FormControl('', { nonNullable: true }),
    fecha_inicio: new FormControl(hoyIso(), { nonNullable: true, validators: [Validators.required] }),
    fecha_fin: new FormControl('', { nonNullable: true }),
    estado: new FormControl<EstadoReto>('EN_CURSO', { nonNullable: true }),
  });

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    this.guardando.set(true);
    this.api.crearReto({ ...valor, fecha_fin: valor.fecha_fin || null }).subscribe({
      next: (reto) => {
        this.guardando.set(false);
        this.seguimiento.recargar();
        void this.router.navigate(['/retos', reto.id], { replaceUrl: true });
      },
      error: async (e) => {
        this.guardando.set(false);
        const aviso = await this.toast.create({
          message: mensajeError(e), color: 'danger', duration: 4000,
        });
        await aviso.present();
      },
    });
  }
}
```

Si la fecha de fin es anterior a la de inicio, el backend responde con el mensaje de validación de la guía 03 y aquí se muestra en un aviso rojo.

### 8.3. Detalle y seguimiento: `paginas\reto-detalle.page.ts`

```typescript
import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';

import { ETIQUETA_ESTADO } from '../core/modelos';
import { RetosApi, mensajeError } from '../core/retos-api.service';
import {
  COLOR_SEMAFORO,
  ETIQUETA_SEMAFORO,
  SemanaEvaluada,
  fechaCorta,
  hoyIso,
} from '../core/semaforo';
import { SeguimientoService } from '../core/seguimiento.service';

@Component({
  selector: 'app-reto-detalle',
  imports: [
    AsyncPipe, ReactiveFormsModule, IonBackButton, IonBadge, IonButton, IonButtons, IonCard,
    IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,
    IonInput, IonItem, IonLabel, IonList, IonNote, IonProgressBar, IonRange, IonSegment,
    IonSegmentButton, IonText, IonTitle, IonToolbar,
  ],
  styles: `
    .semana-actual { --background: var(--ion-color-primary-tint); }
    ion-progress-bar { margin-top: 6px; }
  `,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/retos"></ion-back-button>
        </ion-buttons>
        <ion-title>Seguimiento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (reto$ | async; as reto) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ reto.titulo }}</ion-card-title>
            <ion-card-subtitle>
              {{ etiquetaEstado[reto.estado] }} · {{ fechaCorta(reto.fecha_inicio) }} al {{ fechaCorta(reto.fecha_fin) }}
            </ion-card-subtitle>
          </ion-card-header>
          @if (reto.descripcion) {
            <ion-card-content>{{ reto.descripcion }}</ion-card-content>
          }
        </ion-card>
      } @else {
        <ion-text color="medium"><p>Cargando reto…</p></ion-text>
      }

      <ion-segment [value]="vista()" (ionChange)="vista.set($any($event).detail.value)">
        <ion-segment-button value="semanas"><ion-label>Semanas</ion-label></ion-segment-button>
        <ion-segment-button value="avances"><ion-label>Avances</ion-label></ion-segment-button>
      </ion-segment>

      @if (vista() === 'semanas') {
        @if (semanas$ | async; as semanas) {
          @if (semanas.length === 0) {
            <p>Este reto todavía no tiene semanas de seguimiento.</p>
            <ion-button expand="block" (click)="generarSemanas()">Generar semanas hasta la 15</ion-button>
          }
          <ion-list>
            @for (s of semanas; track s.id) {
              <ion-item [class.semana-actual]="s.editable" lines="full">
                <ion-label>
                  <h2>
                    Semana {{ s.semana }}
                    <ion-badge [color]="color[s.semaforo]">{{ etiqueta[s.semaforo] }}</ion-badge>
                  </h2>
                  <p>{{ fechaCorta(s.fecha_inicio) }} al {{ fechaCorta(s.fecha_fin) }} · {{ s.porcentaje }} %</p>
                  <ion-progress-bar [value]="s.porcentaje / 100" [color]="color[s.semaforo]"></ion-progress-bar>

                  @if (s.editable) {
                    <ion-range
                      aria-label="Porcentaje de la semana"
                      [value]="s.porcentaje" [min]="0" [max]="100" [step]="10"
                      [snaps]="true" [pin]="true"
                      (ionChange)="cambiarPorcentaje(s, $any($event).detail.value)"
                    ></ion-range>
                    <ion-note>
                      @if (s.diasRestantes === 0) { Se cierra hoy a medianoche. }
                      @else { Se cierra en {{ s.diasRestantes }} día(s). }
                    </ion-note>
                  }
                  @if (s.enRiesgo) {
                    <ion-text color="danger">
                      <p>Riesgo: si no avanzas, esta semana se cerrará en rojo.</p>
                    </ion-text>
                  }
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }
      } @else {
        <form [formGroup]="formAvance" (ngSubmit)="guardarAvance()">
          <ion-list>
            <ion-item>
              <ion-input label="Fecha" labelPlacement="stacked" type="date" formControlName="fecha"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input label="¿Qué avanzaste?" labelPlacement="stacked" formControlName="descripcion"
                [maxlength]="255"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input label="Porcentaje (0 a 100)" labelPlacement="stacked" type="number"
                formControlName="porcentaje" [min]="0" [max]="100"></ion-input>
            </ion-item>
          </ion-list>
          <ion-button expand="block" type="submit" [disabled]="formAvance.invalid">Registrar avance</ion-button>
        </form>

        @if (avances$ | async; as avances) {
          <ion-list>
            @for (a of avances; track a.id) {
              <ion-item>
                <ion-label>
                  <h3>{{ a.descripcion }}</h3>
                  <p>{{ fechaCorta(a.fecha) }} · {{ a.porcentaje }} %</p>
                </ion-label>
              </ion-item>
            } @empty {
              <ion-item><ion-label>Sin avances registrados.</ion-label></ion-item>
            }
          </ion-list>
        }
      }
    </ion-content>
  `,
})
export class RetoDetallePage {
  private readonly api = inject(RetosApi);
  private readonly seguimiento = inject(SeguimientoService);
  private readonly toast = inject(ToastController);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly etiqueta = ETIQUETA_SEMAFORO;
  protected readonly color = COLOR_SEMAFORO;
  protected readonly fechaCorta = fechaCorta;
  protected readonly vista = signal<'semanas' | 'avances'>('semanas');

  protected readonly reto$ = this.api.obtenerReto(this.id).pipe(catchError(() => of(null)));
  protected readonly semanas$ = this.seguimiento.semanasDeReto$(this.id);

  private readonly recargarAvances$ = new BehaviorSubject<void>(undefined);
  protected readonly avances$ = this.recargarAvances$.pipe(
    switchMap(() => this.api.listarAvances(this.id)),
  );

  protected readonly formAvance = new FormGroup({
    fecha: new FormControl(hoyIso(), { nonNullable: true, validators: [Validators.required] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    porcentaje: new FormControl<number | string>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(100)],
    }),
  });

  constructor() {
    // F7: resultado del guardado automático mientras esta página está abierta.
    this.seguimiento.guardado$
      .pipe(takeUntilDestroyed())
      .subscribe((r) => void this.mostrar(r.mensaje, r.ok ? 'success' : 'danger'));
  }

  protected cambiarPorcentaje(semana: SemanaEvaluada, valor: unknown): void {
    this.seguimiento.cambiarPorcentaje(semana, Number(valor));
  }

  protected generarSemanas(): void {
    this.api.generarSemanas(this.id).subscribe({
      next: (r) => {
        void this.mostrar(`${r.creadas} semana(s) creada(s).`, 'success');
        this.seguimiento.recargar();
      },
      error: (e) => void this.mostrar(mensajeError(e), 'danger'),
    });
  }

  protected guardarAvance(): void {
    const valor = this.formAvance.getRawValue();
    this.api
      .crearAvance({ reto: this.id, fecha: valor.fecha, descripcion: valor.descripcion, porcentaje: Number(valor.porcentaje) })
      .subscribe({
        next: () => {
          this.formAvance.reset({ fecha: hoyIso(), descripcion: '', porcentaje: 0 });
          this.recargarAvances$.next();
          void this.mostrar('Avance registrado.', 'success');
        },
        error: (e) => void this.mostrar(mensajeError(e), 'danger'),
      });
  }

  private async mostrar(mensaje: string, color: 'success' | 'danger'): Promise<void> {
    const aviso = await this.toast.create({ message: mensaje, color, duration: 2500 });
    await aviso.present();
  }
}
```

- Solo la semana **en curso** muestra el control de porcentaje (resaltada en azul claro). Las pasadas y las futuras son de solo lectura.
- Al soltar el control, el flujo **F7** espera 400 ms, guarda el valor en el backend y recarga: el resumen de la lista y las alertas se actualizan solos.
- La pestaña **Avances** es la bitácora del reto (modelo `Avance` de la guía 03).

### 8.4. Alertas: `paginas\alertas.page.ts`

```typescript
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, warning } from 'ionicons/icons';

import { fechaCorta } from '../core/semaforo';
import { SeguimientoService } from '../core/seguimiento.service';

@Component({
  selector: 'app-alertas',
  imports: [
    AsyncPipe, RouterLink, IonBackButton, IonBadge, IonButtons, IonContent, IonHeader, IonIcon,
    IonItem, IonLabel, IonList, IonListHeader, IonTitle, IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/retos"></ion-back-button>
        </ion-buttons>
        <ion-title>Alertas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>Semanas cerradas en rojo</ion-label>
        </ion-list-header>
        @for (s of (rojas$ | async) ?? []; track s.id) {
          <ion-item [routerLink]="['/retos', s.reto]" detail>
            <ion-icon slot="start" name="alert-circle" color="danger"></ion-icon>
            <ion-label>
              <h2>{{ s.reto_titulo }} · semana {{ s.semana }}</h2>
              <p>Cerró el {{ fechaCorta(s.fecha_fin) }} con {{ s.porcentaje }} %</p>
            </ion-label>
            <ion-badge slot="end" color="danger">No cumplida</ion-badge>
          </ion-item>
        } @empty {
          <ion-item><ion-label>No hay semanas en rojo.</ion-label></ion-item>
        }

        <ion-list-header>
          <ion-label>Semanas en riesgo</ion-label>
        </ion-list-header>
        @for (s of (enRiesgo$ | async) ?? []; track s.id) {
          <ion-item [routerLink]="['/retos', s.reto]" detail>
            <ion-icon slot="start" name="warning" color="warning"></ion-icon>
            <ion-label>
              <h2>{{ s.reto_titulo }} · semana {{ s.semana }}</h2>
              <p>{{ s.porcentaje }} % y se cierra en {{ s.diasRestantes }} día(s)</p>
            </ion-label>
          </ion-item>
        } @empty {
          <ion-item><ion-label>No hay semanas en riesgo.</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class AlertasPage {
  private readonly seguimiento = inject(SeguimientoService);

  protected readonly rojas$ = this.seguimiento.rojas$;
  protected readonly enRiesgo$ = this.seguimiento.enRiesgo$;
  protected readonly fechaCorta = fechaCorta;

  constructor() {
    addIcons({ alertCircle, warning });
  }
}
```

### 8.5. Compilar y probar

Desde `frontend`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd run build
npx.cmd ng test --watch=false
```

Resultado esperado: `Application bundle generation complete` sin errores (las advertencias `WARNING` de tamaño no impiden continuar) y todas las pruebas de `semaforo.spec.ts` superadas.

**Evidencia 2:** salida de `npm run build` y de `ng test` sin errores.

## 9. Probar en el navegador (web)

Con el backend en ejecución en la primera terminal, en la segunda:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
ionic.cmd serve --project=frontend --port=8100
```

Abre `http://localhost:8100` y comprueba, en orden:

1. **Lista:** aparecen los retos de la guía 03 con sus chips de color. Si hay semanas en rojo, aparece el aviso rojo arriba y un número en la campana.
2. **Crear:** pulsa **+**, rellena el título y guarda. Se abre el detalle con las semanas 7 a 15: la 7 *En curso* (azul) y las demás *Por iniciar* (gris).
3. **Seguimiento:** en la semana 7 mueve el control a 50 % y suéltalo. Aparece `Semana 7: 50 % guardado.` y la barra cambia.
4. **Avances:** en la pestaña *Avances*, registra uno y comprueba que aparece en la lista.
5. **Búsqueda:** vuelve a la lista y escribe parte de un título en el buscador.
6. **Validación:** crea un reto con fecha de fin anterior a la de inicio; debe aparecer el mensaje rojo del backend.

Para ver la app como en un teléfono: `F12` > icono de dispositivo móvil (*Toggle device toolbar*).

Detén `ionic serve` con `Ctrl+C` cuando termines.

**Evidencia 3:** lista de retos, detalle con las semanas 7 a 15 y una semana guardada en el navegador.

## 10. Probar en Android

### 10.1. Compilar y copiar a Android

Con el backend en ejecución (`runserver 0.0.0.0:8000`), desde `frontend`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd run build
npx.cmd cap sync android
```

Resultado esperado: `Sync finished`. **Repite estos dos comandos cada vez que cambies el código del frontend o `capacitor.config.ts`**: Android ejecuta la copia compilada, no los archivos de `src`.

### 10.2. Ejecutar en el emulador

1. Inicia el emulador (guía 03, apartado 10.3, paso 1).
2. Abre el proyecto Android:

   ```powershell
   npx.cmd cap open android
   ```

3. En Android Studio espera a que termine la sincronización de Gradle. Si aparece `Gradle project sync failed`, configura **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** en el JDK 21 (guía 02, apartado 9.3) y pulsa **Try Again**.
4. En la barra superior selecciona el emulador y pulsa **Run** ▶.

La app se instala y se abre en el emulador. Repite las comprobaciones del apartado 9: **deben funcionar exactamente igual que en la web**, porque es el mismo código.

En la terminal de `runserver` deben aparecer las peticiones de la app, por ejemplo `"GET /api/retos/ HTTP/1.1" 200`.

### 10.3. Ver la consola de la app Android

Si la app abre pero no muestra datos, mira su consola: en Chrome **de la PC** abre `chrome://inspect/#devices`, busca *Seguimiento de Retos* bajo el emulador y pulsa **inspect**. Se abren las herramientas de desarrollo de la app; en la pestaña **Console** verás el error (CORS, conexión, etc.). Consulta la sección 13.

**Evidencia 4:** la app en el emulador con el detalle de un reto, sus semanas y una semana guardada.

## 11. Probar el cierre y la alerta de rojos

No hace falta esperar al domingo: se simula con el administrador de Django, donde se pueden editar las fechas de una tarea.

1. Abre `http://127.0.0.1:8000/admin/` > **Tareas semanales** y elige una tarea de un reto de prueba.
2. Para simular una semana **cerrada en rojo**, pon como `Fecha fin` la fecha de **ayer**, como `Fecha inicio` 6 días antes y `Porcentaje` 5. Guarda.
3. En la app (web o Android), desliza hacia abajo en la lista para refrescar.

Resultado esperado:

- Aparece arriba el aviso rojo `1 semana(s) cerrada(s) en rojo` con el nombre del reto. El botón **Ver** abre la página de alertas.
- La campana muestra el número de alertas.
- En el detalle, esa semana aparece como **No cumplida** en rojo y sin control de porcentaje.
- Si intentas cambiarla desde `/api/docs/` (`PATCH /api/tareas/{id}/`), el backend responde `400` con `La semana N ya está cerrada; no se puede modificar.`

Repite con `Porcentaje` 50 (debe quedar **amarillo**) y con 100 (**verde**).

Para probar el **riesgo**, en la tarea de la semana actual deja `Porcentaje` en 5 y pon `Fecha fin` mañana: en la lista de alertas aparece en *Semanas en riesgo*.

**Cierre automático en vivo:** si dejas la app abierta, el reloj (F3) revisa la fecha cada minuto. Al pasar la medianoche del domingo, la semana se cierra y cambia de color sin recargar.

Al terminar, restablece en el administrador las fechas reales de las tareas que modificaste, o borra el reto de prueba.

**Evidencia 5:** aviso de semana en rojo, página de alertas y respuesta `400` al intentar modificar una semana cerrada.

## 12. Guardar el trabajo en Git

Desde la raíz:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos"
git add backend frontend
git status --short
```

Revisa que no aparezcan `backend/.env`, `node_modules`, `dist` ni `.venv`. Después:

```powershell
git commit -m "Agrega seguimiento semanal reactivo con semáforo y alertas en web y Android"
git log --oneline -3
```

## 13. Errores frecuentes

| Mensaje o síntoma | Causa | Solución |
| --- | --- | --- |
| La app muestra `Sin conexión con el backend...` | `runserver` detenido, o iniciado sin `0.0.0.0` (Android) | `python manage.py runserver 0.0.0.0:8000` en `backend` |
| Consola: `blocked by CORS policy` | Falta el origen en `CORS_ALLOWED_ORIGINS` | Apartado 1.1: `http://localhost:8100` (web) y `http://localhost` (Android). Reinicia `runserver` tras editar `.env` |
| Android: `net::ERR_CLEARTEXT_NOT_PERMITTED` o petición bloqueada por *mixed content* | Falta la configuración del apartado 4.4 en la app instalada | Revisa `capacitor.config.ts`, ejecuta `npm run build` y `npx cap sync android` y vuelve a pulsar **Run** |
| `DisallowedHost` en la consola de `runserver` | Falta `10.0.2.2` en `ALLOWED_HOSTS` | Guía 03, apartado 2.2 |
| `'ion-…' is not a known element` | Falta el componente en `imports` de la página | Añade el componente (por ejemplo `IonBadge`) al import de `@ionic/angular` y al arreglo `imports` |
| `Cannot find module '@ionic/angular/standalone'` | Ruta de Ionic 7 y 8 | En Ionic 9 importa desde `@ionic/angular` |
| `NG0201: No provider found for HttpClient` | Falta `provideHttpClient()` | Apartado 4.1 |
| `404` en `/api/tareas/` | Backend sin el apartado 1.7 o servidor sin reiniciar | Revisa `retos\urls.py`; `runserver` se reinicia solo al guardar, pero detenlo y vuelve a iniciarlo si dudas |
| `400 La semana N ya está cerrada` | Se intentó modificar una semana pasada | Es correcto: el cierre funciona |
| El detalle muestra "no tiene semanas" | Reto creado antes de esta guía o fuera del rango de semanas | Pulsa **Generar semanas hasta la 15**. Si responde `0 semana(s)`, la semana actual ya pasó de `SEMANA_HASTA` |
| Android muestra la versión antigua de la app | No se recompiló | `npm run build` + `npx cap sync android` + **Run** |
| `Gradle project sync failed` / `Unsupported class file major version 69` | Gradle con Java 25 | Gradle JDK = JDK 21 (guía 02, apartados 9.1 a 9.3) |
| El aviso rojo no aparece | No hay semanas cerradas en rojo | Simúlalo con el apartado 11 |
| `ng test` falla en `app.spec.ts` buscando "Hello, frontend" | No se borró la prueba de la plantilla | Apartado 3.2: `Remove-Item app.spec.ts` |
| La fecha de las semanas no coincide con tu calendario | `SEMESTRE_INICIO` distinto del lunes de tu semana 1 | Corrige `SEMESTRE_INICIO` en `.env`; las tareas ya creadas conservan sus fechas: bórralas desde el administrador y pulsa **Generar semanas** |

## 14. Adaptar la guía a otro proyecto

| Qué cambiar | Dónde |
| --- | --- |
| Inicio del periodo y rango de semanas | `SEMESTRE_INICIO`, `SEMANA_DESDE`, `SEMANA_HASTA` en `backend\.env` |
| Umbrales del semáforo y aviso de riesgo | Constantes `UMBRAL_ROJO`, `META`, `DIAS_AVISO_RIESGO` en `core\semaforo.ts` |
| Entidad principal (por ejemplo `Proyecto` en lugar de `Reto`) | Modelos de la guía 03, `modelos.ts`, `retos-api.service.ts` y las páginas |
| Entidad de seguimiento (por ejemplo entregas en lugar de semanas) | `TareaSemanal`, `semanas.py`, `semaforo.ts` |
| Puerto o IP del backend | `core\api.config.ts` y `ALLOWED_HOSTS` |
| Nombre e identificador de la app Android | `appName` y `appId` en `capacitor.config.ts` (antes de `cap add android`) |

**Se mantiene igual:** la separación entre `RetosApi` (HTTP) y `SeguimientoService` (estado reactivo), las reglas como funciones puras con pruebas, la configuración de Capacitor para desarrollo y el procedimiento de compilación para Android.

## 15. Lista de entrega

- [ ] `python manage.py test retos` con 5 pruebas en `OK` (Evidencia 1).
- [ ] `npm run build` y `ng test` sin errores (Evidencia 2).
- [ ] Web: crear reto, semanas 7 a 15, guardar avance semanal y registrar avance (Evidencia 3).
- [ ] Android: las mismas funciones en el emulador (Evidencia 4).
- [ ] Cierre simulado: rojo, amarillo y verde; aviso de rojos; `400` al editar una semana cerrada (Evidencia 5).
- [ ] Commit realizado sin `.env`, `node_modules` ni `dist`.

Preguntas de reflexión:

1. ¿Qué flujo (F1 a F7) provoca que una semana pase a rojo sin que el usuario haga nada? ¿Qué operadores intervienen?
2. ¿Por qué la regla de cierre está en el backend **y** en el frontend? ¿Qué pasaría si solo estuviera en el frontend?
3. ¿Qué problema evita `scan` en el flujo F6? ¿Qué pasaría si se usara directamente `rojas$` para mostrar el aviso?
4. ¿Por qué `switchMap` y no `mergeMap` en el guardado automático?
5. ¿Qué hay que cambiar para que la app funcione en un teléfono real en lugar del emulador?

## Fuentes oficiales

- [Ionic Angular: componentes standalone](https://ionicframework.com/docs/angular/build-options).
- [Angular: HttpClient](https://angular.dev/guide/http) y [formularios reactivos](https://angular.dev/guide/forms/reactive-forms).
- [RxJS: operadores](https://rxjs.dev/guide/operators).
- [Angular y RxJS interop (`takeUntilDestroyed`)](https://angular.dev/ecosystem/rxjs-interop).
- [Capacitor: configuración (`server.androidScheme`, `server.cleartext`)](https://capacitorjs.com/docs/config).
- [Django REST Framework: viewsets y acciones extra](https://www.django-rest-framework.org/api-guide/viewsets/).
