# Práctica: instalación del entorno de Seguimiento de Retos

Fecha de revisión: 4 de noviembre de 2026. Plataforma: Windows 10/11 de 64 bits y PowerShell.

## Propósito y entrega

Al terminar tendrás MySQL, Python, Django, Angular, Ionic y las herramientas Android preparados. Ejecutarás una plantilla web y generarás una APK de depuración. Las pantallas del sistema y sus modelos Django se desarrollarán en las siguientes etapas.

Trabaja en orden. Ejecuta los bloques uno por uno y comprueba el resultado antes de continuar. Los comandos de instalación de esta guía se ejecutan en el equipo de cada estudiante; no se han ejecutado automáticamente en el equipo del docente.

Entrega un informe con versiones, verificaciones y dificultades resueltas. No incluyas contraseñas ni el contenido de `.env`.

## 0. Preparar la terminal

Abre **Windows PowerShell**. No copies símbolos como `PS>` o `mysql>` cuando aparezcan en una consola. Los bloques `powershell` se ejecutan en PowerShell y los bloques `sql`, dentro del cliente MySQL.

```powershell
$PSVersionTable.PSVersion
winget --version
```

Si no existe `winget`, instala o actualiza **Instalador de aplicación**, de Microsoft, desde Microsoft Store. Los instaladores oficiales indicados en cada sección son una alternativa.

Usa una cuenta con permiso para instalar programas. Acepta la elevación de Windows cuando el instalador la solicite. Cierra y abre PowerShell después de instalar herramientas para actualizar el PATH.

## 1. Instalar y comprobar MySQL

### 1.1. Comprobar si hay un servidor previo

Si tienes XAMPP, su botón MySQL puede iniciar MariaDB. Comprueba la versión real:

```powershell
Test-Path C:\xampp\mysql\bin\mysql.exe
```

Solo si el resultado es `True` y el servicio de XAMPP está iniciado:

```powershell
& C:\xampp\mysql\bin\mysql.exe -u root -p -e "SELECT VERSION();"
```

Introduce la contraseña correspondiente; si esa instalación no tiene contraseña, pulsa Enter. No asumas que esto es apropiado para el servidor nuevo.

Django 5.2 requiere MySQL 8.0.11+ o MariaDB 10.5+. MariaDB 10.4 de algunas instalaciones XAMPP es incompatible. Para esta práctica usaremos **MySQL Community Server 8.4 LTS**, perteneciente a la familia MySQL 8. No reemplaces manualmente los archivos de datos de XAMPP.

### 1.2. Descargar e instalar

1. Abre [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).
2. Selecciona la rama **8.4 LTS**, Windows y el instalador MSI de 64 bits.
3. Ejecuta el instalador y después **MySQL Configurator**. Si solicita Visual C++ Redistributable, instala el prerrequisito oficial que indique.
4. Selecciona una configuración de desarrollo.
5. Configura TCP/IP en el puerto **3307**. Lo usaremos incluso sin XAMPP para que toda la clase tenga la misma configuración.
6. Conserva la autenticación moderna predeterminada.
7. Define y guarda una contraseña propia para `root`.
8. Registra el servicio con el nombre **MySQL84**, con inicio automático, y aplica la configuración.

No necesitas abrir el puerto MySQL a otros equipos: Django se conectará localmente. Workbench es opcional; los ejercicios usan el cliente de consola.

### 1.3. Verificar servicio y cliente

```powershell
Get-Service MySQL84
Test-NetConnection 127.0.0.1 -Port 3307
$env:Path = "C:\Program Files\MySQL\MySQL Server 8.4\bin;" + $env:Path
mysql --version
mysql -h 127.0.0.1 -P 3307 -u root -p
```

Si elegiste otra carpeta, adapta la ruta. El cambio de PATH anterior solo dura esta sesión; puedes añadir esa carpeta desde **Editar las variables de entorno de la cuenta > Path > Nuevo**.

Resultado esperado: servicio `Running`, `TcpTestSucceeded: True` y acceso al cliente. `mysql --version` comprueba el cliente; la siguiente consulta comprueba el servidor.

Dentro de MySQL:

```sql
SELECT VERSION() AS version_servidor, @@port AS puerto;
CREATE DATABASE seguimiento_retos
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'retos_app'@'127.0.0.1'
    IDENTIFIED BY 'REEMPLAZAR_POR_TU_CLAVE';
GRANT ALL PRIVILEGES ON seguimiento_retos.*
    TO 'retos_app'@'127.0.0.1';
SHOW DATABASES LIKE 'seguimiento_retos';
EXIT;
```

Antes de ejecutar `CREATE USER`, sustituye el texto de contraseña por una propia y guárdala. La cuenta tiene permisos sobre la base de la práctica para poder ejecutar migraciones. No usaremos `root` desde Django. No hace falta `FLUSH PRIVILEGES` al usar `CREATE USER` y `GRANT`.

Prueba la cuenta:

```powershell
mysql -h 127.0.0.1 -P 3307 -u retos_app -p seguimiento_retos
```

```sql
SELECT DATABASE(), CURRENT_USER();
SHOW TABLES;
EXIT;
```

La base debe estar vacía. Las tablas se crearán después con migraciones; no ejecutes el esquema SQL de referencia de la etapa 1 sobre esta base.

**Evidencia 1:** versión del servidor, puerto y acceso con `retos_app`.

## 2. Instalar Python 3.12

```powershell
winget install --exact --id Python.Python.3.12 --source winget
```

Alternativa: instalador oficial de [Python para Windows](https://www.python.org/downloads/windows/), rama 3.12, incluyendo Python Launcher. Si usas el instalador clásico, activa **Add python.exe to PATH**.

Abre otra terminal:

```powershell
py -3.12 --version
py -3.12 -m pip --version
py -3.12 -c "import struct; print('Arquitectura:', struct.calcsize('P') * 8, 'bits')"
```

Resultado esperado: Python 3.12.x, pip disponible y 64 bits. Usamos `py -3.12` para evitar seleccionar accidentalmente otra versión.

## 3. Instalar Git y Visual Studio Code

```powershell
winget install --exact --id Git.Git --source winget
winget install --exact --id Microsoft.VisualStudioCode --source winget
```

Abre otra terminal y verifica:

```powershell
git --version
code --version
```

Configura tu identidad, sustituyendo los ejemplos por tus datos:

```powershell
git config --global user.name "Jorge Landacay"
git config --global user.email "jllandacay@gmai.com"
git config --global --get user.name
git config --global --get user.email
```

Instala extensiones:

```powershell
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension Angular.ng-template
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-ceintl.vscode-language-pack-es
code --list-extensions
```

Python y Pylance ayudan con el backend; Angular Language Service con las plantillas; Prettier con el formato y ESLint cuando configuremos sus reglas. CSS y Git ya tienen soporte integrado en VS Code.

## 4. Crear la carpeta y el entorno virtual

No se necesita Apache para ejecutar Django o Angular. En esta práctica usaremos una carpeta dentro de tu perfil, evitando depender de que exista XAMPP.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\proyectos\SeguimientoRetos"
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos"
New-Item -ItemType Directory -Force backend, documentacion
git init
code .
Set-Location backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
python -c "import sys; print(sys.executable)"
```

El intérprete debe estar dentro de `backend\.venv`. Si PowerShell bloquea la activación, permite scripts **solo para esta sesión** y repite la activación:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Si una política institucional impide el cambio, usa directamente `.\.venv\Scripts\python.exe` en lugar de `python` en todos los comandos del backend. No es necesario cambiar la política de todo el equipo.

En VS Code: `Ctrl+Shift+P` > **Python: Select Interpreter** > selecciona `backend\.venv\Scripts\python.exe`.

**Validación para pasar al paso 5**, desde `backend`:

```powershell
python -c "import sys; from pathlib import Path; assert Path(sys.prefix).resolve() == Path('.venv').resolve(), 'Activa backend/.venv o usa su python.exe'; assert sys.version_info[:2] == (3, 12), 'Se requiere Python 3.12'; print('OK: Python 3.12 del entorno virtual'); print(sys.executable)"
```

Continúa solo si aparece `OK`. Si falta `.venv`, ejecuta `py -3.12 -m venv .venv` desde `backend` y activa el entorno con `.\.venv\Scripts\Activate.ps1`.

## 5. Instalar Django y las dependencias del backend

Ubicación: carpeta `backend`, entorno virtual activo.

```powershell
python -m pip install --upgrade pip
python -m pip install "Django>=5.2,<5.3" djangorestframework django-filter drf-spectacular django-cors-headers python-dotenv
python -m pip install --only-binary=:all: "mysqlclient>=2.2.1,<3"
python -m django --version
python -m pip check
python -c "import MySQLdb, rest_framework, django_filters, drf_spectacular, corsheaders, dotenv; print('Dependencias disponibles')"
```

Resultado esperado: Django 5.2.x, `No broken requirements found` y `Dependencias disponibles`.

**Validación para pasar al paso 5.1:** los tres resultados anteriores deben completarse sin errores. Ejecuta los comandos uno por uno y espera a que cada instalación termine. Si aparece `KeyboardInterrupt`, el proceso fue interrumpido: repite el comando sin pulsar `Ctrl+C`.

Si aparece `No module named django`, instala con el ejecutable explícito del entorno y comprueba:

```powershell
.\.venv\Scripts\python.exe -m pip install "Django>=5.2,<5.3" djangorestframework django-filter drf-spectacular django-cors-headers python-dotenv
.\.venv\Scripts\python.exe -m pip install --only-binary=:all: "mysqlclient>=2.2.1,<3"
.\.venv\Scripts\python.exe -m django --version
.\.venv\Scripts\python.exe -m pip check
```

Si no activas el entorno, sigue usando `.\.venv\Scripts\python.exe` en lugar de `python` en los comandos posteriores. `manage.py` se creará en el apartado 3 de la guía del backend; no ejecutes `startapp` antes de `startproject`.

Usamos `--only-binary` para instalar una rueda precompilada de mysqlclient y evitar compilación nativa en el laboratorio. Si no hay una compatible, comprueba primero que estás usando CPython 3.12 de 64 bits. Para compilar desde código fuente, el proyecto mysqlclient documenta MariaDB Connector/C y las herramientas de compilación de Visual Studio; eso requiere una preparación adicional del equipo.

### 5.1. Probar Python contra MySQL

```powershell
python -c "import MySQLdb, getpass; conexion = MySQLdb.connect(host='127.0.0.1', port=330, user='retos_app', passwd=getpass.getpass('Clave de MySQL: '), db='seguimiento_retos', charset='utf8mb4'); cursor = conexion.cursor(); cursor.execute('SELECT VERSION(), DATABASE()'); print(cursor.fetchone()); cursor.close(); conexion.close()"
```

Resultado esperado: versión de MySQL y `seguimiento_retos`. La contraseña se pide de forma oculta y no queda dentro del comando.

### 5.2. Alternativa PyMySQL en Windows

Si mysqlclient no puede instalarse, PyMySQL permite probar una conexión sin compilar extensiones:

```powershell
python -m pip install "PyMySQL[rsa]"
python -c "import pymysql, getpass; conexion = pymysql.connect(host='127.0.0.1', port=3307, user='retos_app', password=getpass.getpass('Clave de MySQL: '), database='seguimiento_retos', charset='utf8mb4'); cursor = conexion.cursor(); cursor.execute('SELECT VERSION(), DATABASE()'); print(cursor.fetchone()); cursor.close(); conexion.close()"
```

El extra `rsa` permite autenticación con `caching_sha2_password`. Esta prueba valida PyMySQL, pero no demuestra compatibilidad con Django. El backend oficial de Django recomienda mysqlclient y verifica su versión. La sustitución mediante `pymysql.install_as_MySQLdb()` puede ser rechazada por esa comprobación; no falsees `version_info` ni edites Django para eludirla. Para completar esta práctica con Django 5.2, la ruta de referencia es mysqlclient; una integración alternativa exige validar expresamente el adaptador y sus versiones con el docente.

### 5.3. Preparar variables y registrar versiones

Crea `backend/.env` en VS Code con tus valores:

```dotenv
DB_NAME=seguimiento_retos
DB_USER=retos_app
DB_PASSWORD=REEMPLAZAR_POR_TU_CLAVE
DB_HOST=127.0.0.1
DB_PORT=3307
SECRET_KEY=REEMPLAZAR_POR_LA_CLAVE_GENERADA
DEBUG=True
```

Genera el valor de `SECRET_KEY`:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Pega el resultado entre comillas simples en `.env`, para conservar caracteres como `#`. Si tu contraseña contiene `#` o espacios, también debe ir entre comillas. El archivo `.env` no se carga automáticamente: en la etapa del backend usaremos `python-dotenv` y lo conectaremos con `DATABASES` en `settings.py`.

Guarda las versiones resueltas:

```powershell
python -m pip freeze | Set-Content -Encoding utf8 requirements.txt
```

En la raíz del monorepo, crea `.gitignore`. Ejecuta desde cualquier carpeta:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos"
@'
backend/.venv/
**/__pycache__/
*.pyc
**/.env
frontend/node_modules/
frontend/.angular/
frontend/www/
frontend/dist/
frontend/android/.gradle/
frontend/android/local.properties
**/build/
'@ | Set-Content -Encoding utf8 .gitignore
Get-Content .gitignore
git check-ignore backend/.env backend/.venv/pyvenv.cfg
```

Resultado esperado: se muestra el contenido del archivo y después `backend/.env` y `backend/.venv/pyvenv.cfg` (rutas ignoradas). La línea de cierre `'@` debe quedar al inicio de la línea, sin espacios delante.

No excluyas `package-lock.json` ni las migraciones Django. Crea posteriormente `.env.example` con nombres de variables y valores de ejemplo sin credenciales reales.

**Evidencia 2:** versiones, entorno virtual y conexión Python–MySQL. No hay todavía `manage.py`; no ejecutes migraciones en esta etapa.

## 6. Instalar Node.js LTS y npm

Instala la versión LTS actual:

```powershell
winget install --exact --id OpenJS.NodeJS.LTS --source winget
```

También puedes usar el MSI LTS de [Node.js](https://nodejs.org/en/download). A la fecha de revisión, Node 26 está en LTS; Node 24 sigue siendo una alternativa LTS compatible si es al menos 24.15.0. Angular 22 admite Node `^22.22.3`, `^24.15.0` o `^26.0.0`.

Cierra y abre la terminal:

```powershell
node --version
npm.cmd --version
where.exe node
```

Se usa `npm.cmd` para evitar bloqueos de los lanzadores `.ps1` por las políticas de PowerShell. Las versiones exactas instaladas se anotarán en el informe.

## 7. Instalar Angular CLI e Ionic CLI

```powershell
npm.cmd install --global @angular/cli@22 @ionic/cli
ng.cmd version
ionic.cmd --version
npm.cmd view @ionic/angular@latest version peerDependencies --json
```

Angular 22 es la rama estable indicada por la documentación consultada. Verifica que las dependencias pares de Ionic admitan esa versión antes de continuar. No uses `--force` ni `--legacy-peer-deps` para ocultar incompatibilidades.

### 7.1. Conservar el acceso a Ionic al abrir nuevas terminales

Si `ionic.cmd --version` funciona en una terminal pero no en otra, comprueba la carpeta global de npm:

```powershell
npm.cmd prefix --global
```

Copia la ruta que devuelve y guárdala en el PATH de usuario:

1. Busca en Windows **Editar las variables de entorno de la cuenta**.
2. En **Variables de usuario**, selecciona **Path > Editar > Nuevo**.
3. Pega la ruta obtenida como una entrada nueva, sin reemplazar las existentes. No crees una variable independiente llamada `ionic`.
4. Acepta todas las ventanas.
5. Cierra completamente todas las ventanas de VS Code y vuelve a abrirlo. Abrir únicamente otra terminal dentro del mismo VS Code puede conservar el PATH anterior.

En una terminal nueva verifica:

```powershell
where.exe ionic.cmd
ionic.cmd --version
ng.cmd version
```

Resultado esperado: Windows encuentra `ionic.cmd` en la carpeta global de npm y muestra las versiones de las herramientas.

Si necesitas habilitar la ruta solo en la terminal actual, ejecuta:

```powershell
$rutaNpmGlobal = npm.cmd prefix --global
$env:Path = "$rutaNpmGlobal;$env:Path"
ionic.cmd --version
```

Este último cambio es temporal: no sustituye la configuración persistente del PATH. El entorno virtual `.venv` pertenece a Python y no es necesario activarlo para ejecutar Ionic.

Si Ionic tampoco funciona en la terminal original, comprueba su instalación con `npm.cmd list --global @ionic/cli`; si aparece `(empty)`, ejecuta `npm.cmd install --global @ionic/cli` y repite la verificación.

## 8. Crear una plantilla Angular standalone con Ionic

Partimos de Angular CLI para elegir explícitamente Angular 22. Ubicación: raíz del monorepo. Si ya existe `frontend`, no ejecutes el generador encima: usa el proyecto entregado por el docente y ejecuta `npm.cmd ci` dentro de él.

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos"
ng.cmd new frontend --standalone --routing --style=scss --skip-git --ssr=false --package-manager=npm --defaults
Set-Location frontend
npm.cmd install @ionic/angular@latest ionicons
ionic.cmd init "Seguimiento de Retos" --type=angular
npx.cmd ng version
npm.cmd ls @angular/core @ionic/angular
```

Si Ionic pregunta si deseas vincular una cuenta, no es necesario hacerlo para esta práctica.

En `src/app/app.config.ts`, conserva los proveedores existentes y añade:

```typescript
import { provideIonicAngular } from '@ionic/angular';
```

> Desde Ionic 9 los componentes standalone se importan desde `@ionic/angular`. La ruta `@ionic/angular/standalone` era de Ionic 7 y 8 y en Ionic 9 provoca el error `Cannot find module '@ionic/angular/standalone'`.

Dentro del arreglo `providers` añade `provideIonicAngular()`. No reemplaces los proveedores de rutas ni otros generados por Angular.

Al principio de `src/styles.scss` añade:

```scss
/* Estilos globales: infraestructura visual de Ionic. */
@import '@ionic/angular/css/core.css';
@import '@ionic/angular/css/normalize.css';
@import '@ionic/angular/css/structure.css';
@import '@ionic/angular/css/typography.css';
```

Para comprobar un componente Ionic, añade `IonButton` desde `@ionic/angular` al arreglo `imports` del componente raíz generado en `src/app/`. Según la convención del generador, el archivo puede llamarse `app.ts` o `app.component.ts`. Añade a su plantilla:

```html
<ion-button>Entorno de Seguimiento de Retos preparado</ion-button>
```

Ejecuta desde la carpeta `frontend`, que es donde está `ionic.config.json`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
ionic.cmd serve --project=frontend --port=8100
```

`--project=frontend` es obligatorio: Ionic busca por defecto un proyecto Angular llamado `app`, pero en `angular.json` el proyecto se llama `frontend`. Sin esa opción aparece el error `Unknown arguments: host, port`.

Si lo ejecutas desde otra carpeta (por ejemplo, la raíz `SeguimientoRetos`), Ionic responde `ionic serve can only be run in an Ionic project directory`. No ejecutes `ionic init` para resolverlo: basta con situarte en `frontend`.

Abre `http://localhost:8100`. Debe verse el botón con el estilo de Ionic. Detén el servidor con `Ctrl+C`. La página generada puede incluir textos del framework en inglés: es una plantilla de comprobación que sustituiremos por la interfaz en español en la etapa del frontend.

**Evidencia 3:** versiones y botón Ionic funcionando en el navegador.

## 9. Instalar Android Studio y preparar el emulador

```powershell
winget install --exact --id Google.AndroidStudio --source winget
```

Alternativa: [descarga oficial de Android Studio](https://developer.android.com/studio).

1. Abre Android Studio y termina el asistente de instalación estándar.
2. Capacitor 8 requiere Android Studio **Otter 2025.2.1 o posterior**. Usa una versión estable que cumpla ese mínimo.
3. En **More Actions > SDK Manager**, instala **Android SDK Platform 36**.
4. En **SDK Tools**, instala Android SDK Build-Tools 36.x, Android SDK Platform-Tools, Android SDK Command-line Tools y Android Emulator. Acepta las licencias.
5. Anota la ruta del SDK. Habitualmente es `%LOCALAPPDATA%\Android\Sdk`.
6. En **Device Manager > Create Virtual Device**, selecciona un teléfono, descarga una imagen de sistema API 36 compatible con tu procesador y crea el dispositivo.
7. Inicia el emulador. Si solicita virtualización, activa VT-x/AMD-V en BIOS/UEFI y configura el hipervisor siguiendo el diagnóstico de Android Studio; puede requerir reinicio.

### 9.1. Instalar el JDK 21

Capacitor 8 genera un proyecto Android con **Gradle 8.14**, que se ejecuta con Java 21 y no admite Java 25. Las versiones recientes de Android Studio incluyen un JDK 25 (`Android Studio\jbr`); **no lo uses para compilar**: con él, `gradlew` falla con `Unsupported class file major version 69`. Instala el JDK 21 de Eclipse Temurin (puede pedir permiso de administrador; acéptalo):

```powershell
winget install --exact --id EclipseAdoptium.Temurin.21.JDK --source winget
Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory
```

Debe aparecer una carpeta `jdk-21...`. No continúes si no aparece.

Si `winget` falla o no tienes permisos, instálalo manualmente:

1. Abre [adoptium.net/temurin/releases](https://adoptium.net/temurin/releases/?version=21&os=windows&arch=x64&package=jdk).
2. Descarga el instalador **.msi** de **JDK 21**, Windows x64.
3. Ejecútalo con las opciones por defecto (se instala en `C:\Program Files\Eclipse Adoptium\jdk-21...`).
4. Repite `Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory` para confirmar la carpeta.

Instalar el JDK 21 **no basta**: Gradle sigue usando Java 25 hasta que completes 9.2 y 9.3.

### 9.2. Configurar `ANDROID_HOME`, `JAVA_HOME` y PATH de forma permanente

Ejecuta una sola vez. Guarda las variables en tu usuario de Windows (no requiere administrador) y sustituye cualquier ruta anterior a `Android Studio\jbr\bin`:

```powershell
$jdk21 = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1).FullName
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk21, 'User')
$rutas = [Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ -and $_ -notlike '*Android Studio\jbr*' -and $_ -notlike '*Eclipse Adoptium*' -and $_ -notlike '*platform-tools*' }
$rutas += "$sdk\platform-tools", "$jdk21\bin"
[Environment]::SetEnvironmentVariable('Path', ($rutas -join ';'), 'User')
```

### 9.3. Cargar las variables y comprobar

Las terminales ya abiertas no ven las variables nuevas. Recárgalas en la terminal actual (o cierra todas las terminales con el icono de papelera y abre una nueva):

```powershell
$env:ANDROID_HOME = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
java -version
adb version
adb devices
```

Resultado esperado: `openjdk version "21.0.x"`, la versión de Android Debug Bridge y una entrada como `emulator-5554 device`. Una lista vacía indica que todavía no hay un dispositivo conectado. En un teléfono real, activa opciones de desarrollador y depuración USB, conecta el cable y acepta la autorización.

- Si `java` o `adb` "no se reconoce como nombre de un cmdlet", la terminal no tiene el PATH nuevo: repite el bloque anterior en esa misma terminal. Si reabres VS Code y sigue igual, cierra las terminales con la papelera (VS Code puede restaurar terminales antiguas con el entorno anterior).
- Si `java -version` muestra 25, `JAVA_HOME` o el PATH todavía apuntan a `Android Studio\jbr`: repite 9.2 y 9.3.

En Android Studio, configura también **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** y selecciona el **JDK 21 de Temurin**, no el JDK integrado.

## 10. Instalar Capacitor y generar Android

Ubicación: `frontend`. Capacitor se instala localmente en el proyecto, no globalmente. **Todos los comandos `npx.cmd cap ...` de esta sección se ejecutan desde `frontend`**; desde la raíz `SeguimientoRetos` aparece `npm error could not determine executable to run`, porque allí no existe `node_modules\@capacitor`.

### 10.1. Instalar Capacitor e inicializar

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd install @capacitor/core@8 @capacitor/android@8
npm.cmd install --save-dev @capacitor/cli@8
if (Test-Path .\capacitor.config.ts) {
    'capacitor.config.ts ya existe: cap init ya se ejecutó, continúa con 10.2.'
} else {
    npx.cmd cap init "Seguimiento de Retos" "edu.ejemplo.seguimientoretos" --web-dir=dist/frontend/browser
}
```

`cap init` se ejecuta **una sola vez** y crea `capacitor.config.ts`; el bloque anterior lo omite si el archivo ya existe. Si ejecutas `npx.cmd cap init` directamente por segunda vez aparece `Cannot run init for a project using a non-JSON configuration file. Delete capacitor.config.ts and try again.`: no borres el archivo, el paso ya está hecho; continúa con 10.2.

### 10.2. Comprobar `webDir` en `capacitor.config.ts`

Abre `frontend/capacitor.config.ts` y verifica que `webDir` apunte a la compilación de Angular:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.ejemplo.seguimientoretos',
  appName: 'Seguimiento de Retos',
  webDir: 'dist/frontend/browser'
};

export default config;
```

Si aparece `webDir: 'www'` (valor por defecto de Capacitor), cámbialo a `'dist/frontend/browser'` y guarda. Con `www`, `cap add android` y `cap sync android` fallan porque esa carpeta no existe.

### 10.3. Compilar la aplicación web

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd run build
Test-Path .\dist\frontend\browser\index.html
```

Si aparece `npm error enoent Could not read package.json`, la terminal está en la raíz `SeguimientoRetos`: el `package.json` solo existe en `frontend`.

El resultado debe ser `True`. Esta es la salida habitual del generador Angular con el constructor de aplicación. Si devuelve `False`, revisa la ruta que muestra la compilación y `outputPath` en `angular.json`; configura `webDir` en `capacitor.config.ts` con la carpeta que contiene el `index.html` compilado. No uses `src` como `webDir`.

### 10.4. Añadir la plataforma Android

Solo después de confirmar la carpeta y `webDir`, desde `frontend`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npx.cmd cap add android
npx.cmd cap sync android
npx.cmd cap doctor
npx.cmd cap open android
```

`cap add android` se ejecuta una sola vez. `cap sync android` se repite después de compilar cambios o instalar plugins.

En Android Studio comprueba primero que **Gradle JDK** sea el JDK 21 (final del apartado 9.3); después espera la sincronización de Gradle, selecciona el emulador y pulsa **Run**. La primera compilación descarga dependencias y puede tardar varios minutos.

### 10.5. Generar la APK de depuración

También puedes generar una APK de depuración desde PowerShell. Antes comprueba que `java -version` muestra **21** (apartado 9.3):

```powershell
java -version
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend\android"
.\gradlew.bat --stop
.\gradlew.bat assembleDebug
Test-Path .\app\build\outputs\apk\debug\app-debug.apk
Set-Location ..
```

`--stop` detiene un proceso de Gradle que haya quedado en segundo plano con otra versión de Java.

Resultado esperado: `BUILD SUCCESSFUL` y `True`. Esta APK sirve para pruebas, no es una compilación firmada para publicar en una tienda.

Si aparece `Unsupported class file major version 69`, Gradle se está ejecutando con Java 25 (el JDK de Android Studio). Completa los apartados 9.1 a 9.3 para usar el JDK 21 y repite este bloque.

**Evidencia 4:** aplicación abierta en el emulador y ruta de la APK generada.

## 11. Guardar y reproducir el entorno

Antes de continuar, comprueba que existe el `.gitignore` de la raíz creado en el apartado 5.3. Si `git add` responde `fatal: pathspec '.gitignore' did not match any files`, ese archivo falta: créalo en la raíz `SeguimientoRetos` con el contenido del apartado 5.3 y repite esta sección.

```powershell
Test-Path "$env:USERPROFILE\proyectos\SeguimientoRetos\.gitignore"
```

Debe mostrar `True`. Después, desde `frontend`:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd ls --depth=0
Set-Location ..
git status --short
git check-ignore backend/.env
git check-ignore backend/.venv/pyvenv.cfg
```

Los dos últimos comandos deben mostrar las rutas ignoradas. Revisa los archivos antes de registrar el trabajo:

```powershell
git add .gitignore backend/requirements.txt frontend
git status --short
git commit -m "Prepara el entorno de desarrollo web y Android"
```

No agregues `.env`. El docente debe conservar `requirements.txt` y `package-lock.json` como referencia común del curso: los comandos iniciales resuelven versiones al momento de ejecutarse, mientras esos archivos registran las versiones concretas.

En una copia posterior del proyecto, las instalaciones se reproducen con `python -m pip install -r requirements.txt` dentro del entorno virtual del backend y `npm.cmd ci` dentro del frontend. No se vuelve a ejecutar `ng new` ni `cap add android` si esas carpetas ya existen.

## 12. Direcciones que usaremos cuando exista la API

> **Esta sección es solo de referencia: no hay nada que ejecutar ni abrir todavía.** El backend Django se crea en la siguiente etapa; hasta que exista `manage.py` y se inicie `runserver`, nadie escucha en el puerto 8000. Si abres estas direcciones ahora, el navegador mostrará `ERR_CONNECTION_REFUSED`: es el resultado esperado en esta etapa, no un error de instalación.

| Cliente | Dirección del backend de desarrollo |
| --- | --- |
| Navegador de la misma PC | `http://localhost:8000/api/` |
| Emulador Android estándar | `http://10.0.2.2:8000/api/` |
| Teléfono real en la misma red | `http://IP_LOCAL_DE_LA_PC:8000/api/` |

En el teléfono, `localhost` apunta al propio teléfono. Para localizar la IP de tu PC, ejecuta `ipconfig` y revisa la IPv4 del adaptador conectado. Cuando implementemos Django, se configurarán `ALLOWED_HOSTS`, los orígenes CORS exactos y, para pruebas con HTTP en Android, la configuración de tráfico sin cifrar exclusiva de desarrollo. Capacitor Android suele usar el origen `https://localhost`; comprueba el esquema configurado antes de fijar CORS.

Para acceso desde emulador o teléfono, el servidor Django se iniciará con `python manage.py runserver 0.0.0.0:8000`. Este comando se ejecutará en la siguiente etapa, cuando exista `manage.py`. Si Windows bloquea el acceso, permite el puerto del backend solo en la red privada del laboratorio; no abras MySQL para resolver un problema HTTP.

## 13. Errores frecuentes

| Problema | Comprobación y solución |
| --- | --- |
| `mysql` no se reconoce | Añade al PATH la carpeta `bin` de MySQL 8.4 o usa la ruta completa con `&`. |
| Error MySQL 2003 / conexión rechazada | Revisa `Get-Service MySQL84`, el puerto 3307 y `Test-NetConnection`. |
| Error MySQL 1045 / acceso denegado | Comprueba contraseña, usuario y host; usa siempre `127.0.0.1` con la cuenta creada. |
| La base o el usuario ya existe | Comprueba `SHOW DATABASES` y la cuenta existente; no borres bases para repetir la práctica. |
| Django informa versión MariaDB incompatible | Comprueba `SELECT VERSION()` y que `.env` apunte a MySQL 8.4 en 3307. |
| `python` apunta a otra instalación | Comprueba `sys.executable`; activa `.venv` o usa su ejecutable completo. |
| No hay rueda de mysqlclient | Revisa Python 3.12 de 64 bits y pip actualizado; consulta los prerrequisitos oficiales de compilación. |
| `npm.ps1` o `ng.ps1` bloqueado | Usa `npm.cmd`, `npx.cmd`, `ng.cmd` e `ionic.cmd`. |
| `ERESOLVE` | Revisa `peerDependencies`; alinea las versiones, sin forzar la instalación. |
| No se reconoce una herramienta recién instalada | Abre una terminal nueva y comprueba el PATH. |
| Capacitor no encuentra recursos web | Ejecuta build y comprueba que `webDir` contenga `index.html`. |
| Gradle no encuentra Java o el SDK | Revisa `JAVA_HOME`, `ANDROID_HOME`, el SDK Manager y el Gradle JDK. |
| Fallan descargas por proxy institucional | Configura el proxy autorizado en npm/Android Studio con ayuda del laboratorio; no desactives la verificación TLS. |

## 14. Lista de entrega y preguntas

- [ ] MySQL 8.4 responde en 3307 y la cuenta de aplicación funciona.
- [ ] Python 3.12 de 64 bits usa el entorno virtual del proyecto.
- [ ] Django 5.2 y mysqlclient están instalados; `pip check` no informa conflictos.
- [ ] La prueba de conexión Python–MySQL devuelve la base correcta.
- [ ] Git, VS Code, Node LTS, Angular CLI e Ionic CLI están disponibles.
- [ ] La plantilla standalone muestra el botón Ionic en el navegador.
- [ ] Android Studio detecta el emulador y compila la plantilla.
- [ ] Se genera `app-debug.apk` y los secretos quedan fuera de Git.
- [ ] Se registran las versiones y las dificultades resueltas.

Responde: ¿qué diferencia existe entre servidor y cliente MySQL? ¿Por qué usamos un entorno virtual? ¿Qué diferencia hay entre npm global y local? ¿Qué conserva un archivo de bloqueo? ¿Por qué el teléfono no puede usar el `localhost` de la PC? ¿Qué tarea realiza Capacitor que no realiza Angular?

## Fuentes oficiales

Siguiente práctica: [construcción del backend paso a paso](03-backend-paso-a-paso.md).

- [Instalación de MySQL 8.4 en Windows](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html): instalador, configuración y servicio.
- [Bases de datos en Django 5.2](https://docs.djangoproject.com/en/5.2/ref/databases/): versiones mínimas y driver mysqlclient.
- [mysqlclient](https://github.com/PyMySQL/mysqlclient): instalación y prerrequisitos de compilación en Windows.
- [Instalación de PyMySQL](https://pymysql.readthedocs.io/en/latest/user/installation.html): extra RSA para autenticación.
- [Compatibilidad de Angular](https://angular.dev/reference/versions): Angular 22 y versiones compatibles de Node.
- [Versiones de Node.js](https://nodejs.org/en/about/previous-releases): estado LTS de las ramas.
- [Ionic Angular](https://ionicframework.com/docs/angular/overview): integración con Angular.
- [Entorno de Capacitor 8](https://capacitorjs.com/docs/getting-started/environment-setup): herramientas Node y Android.
- [Instalación de Capacitor](https://capacitorjs.com/docs/getting-started): inicialización y plataformas.
- [Android Studio](https://developer.android.com/studio): instalación y herramientas Android.
