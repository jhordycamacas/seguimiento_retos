# Cierre del entorno: Seguimiento de Retos

Fecha: 17 de noviembre de 2026. Basado en `guia.md`. Ejecuta los bloques en PowerShell, uno por uno.

## Estado verificado

| Elemento | Estado |
| --- | --- |
| Python 3.12.10, Git 2.47, Node 22.23.4, npm 10.9.9 | Correcto |
| Angular CLI 22.2.6, Ionic CLI 7.2.1 | Correcto |
| Django 5.2.19 y `pip check` | Correcto |
| Servicio `MySQL84` en el puerto 3307 | En ejecución |
| Capacitor, `webDir`, build web y `app-debug.apk` | Correcto |
| Conexión `retos_app` a `seguimiento_retos` | Sin verificar |
| `JAVA_HOME` de usuario | Apunta a JDK 17 (debe ser JDK 21) |
| PATH de usuario | Contiene `Java\jdk-23\bin` |
| Emulador | Solo `Pixel7_API34`; falta imagen API 36 |
| Evidencia 4 | Pendiente |
| Cambios sin commit | `app.html`, `.vscode/`, `contexto.md` |

XAMPP trae MariaDB 10.4 en el puerto 3306. Es incompatible con Django 5.2, por eso se usa MySQL 8.4 en el 3307. No hay que tocarlo.

## 1. Verificar MySQL y la cuenta de la aplicación

Usa el cliente de MySQL 8.4, no el de XAMPP (no carga `caching_sha2_password`). Te pedirá la clave de `root`.

```powershell
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
& $mysql -h 127.0.0.1 -P 3307 -u root -p -e "SELECT VERSION(), @@port; SHOW DATABASES LIKE 'seguimiento_retos'; SELECT user, host FROM mysql.user WHERE user='retos_app';"
```

Esperado: versión 8.4.x, puerto 3307, la base existe y `retos_app` aparece para `127.0.0.1` y `localhost`.

Prueba de Python contra MySQL, con la clave de `retos_app` (la de `backend\.env`):

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\backend"
.\.venv\Scripts\python.exe -c "import MySQLdb, getpass; c = MySQLdb.connect(host='127.0.0.1', port=3307, user='retos_app', passwd=getpass.getpass('Clave retos_app: '), db='seguimiento_retos', charset='utf8mb4'); cur = c.cursor(); cur.execute('SELECT VERSION(), DATABASE()'); print(cur.fetchone())"
```

Si da error 1045, la clave de `.env` no coincide. Restablécela como `root`:

```sql
ALTER USER 'retos_app'@'127.0.0.1' IDENTIFIED BY 'NUEVA_CLAVE';
ALTER USER 'retos_app'@'localhost' IDENTIFIED BY 'NUEVA_CLAVE';
```

Actualiza `DB_PASSWORD` en `backend\.env` con la misma clave. No la compartas ni la subas a Git.

## 2. Corregir JAVA_HOME y PATH (guía 9.2)

```powershell
$jdk21 = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1).FullName
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk21, 'User')
$rutas = [Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ -and $_ -notlike '*Android Studio\jbr*' -and $_ -notlike '*Eclipse Adoptium*' -and $_ -notlike '*platform-tools*' -and $_ -notlike '*Java\jdk-23*' }
$rutas += "$sdk\platform-tools", "$jdk21\bin"
[Environment]::SetEnvironmentVariable('Path', ($rutas -join ';'), 'User')
```

Cierra todas las terminales y abre una nueva (en VS Code, con el icono de papelera). Comprueba:

```powershell
java -version
adb version
```

Esperado: `openjdk version "21.0.x"`.

## 3. Emulador con API 36 (guía 9, pasos 3 y 6)

```powershell
$sdkm = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin"
& "$sdkm\sdkmanager.bat" "system-images;android-36;google_apis;x86_64"
& "$sdkm\avdmanager.bat" create avd -n Pixel7_API36 -k "system-images;android-36;google_apis;x86_64" -d pixel_7
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel7_API36
```

Si falla por la ruta de `cmdline-tools`, usa **Android Studio > Device Manager > Create Virtual Device** con una imagen API 36. Si el emulador pide virtualización, activa VT-x/AMD-V en la BIOS.

## 4. Evidencia 4: app en el emulador

Con el emulador iniciado:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd run build
npx.cmd cap sync android
adb devices
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
adb shell monkey -p edu.ejemplo.seguimientoretos 1
```

Toma una captura del emulador con la app abierta. Esa es la Evidencia 4. La ruta de la APK es `frontend\android\app\build\outputs\apk\debug\app-debug.apk`.

Si quieres regenerar la APK con Java 21 (terminal nueva):

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend\android"
.\gradlew.bat --stop
.\gradlew.bat assembleDebug
```

## 5. Guardar el trabajo en Git

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos"
git status --short
git check-ignore backend/.env
git add .gitignore frontend contexto.md documentacion
git commit -m "docs: add environment closing guide"
```

No agregues `backend\.env`. `.vscode/` es opcional.

## Lista final

- [ ] MySQL 8.4 responde en 3307 y `retos_app` conecta.
- [ ] Python 3.12 usa `backend\.venv` y `pip check` está limpio.
- [ ] `java -version` muestra 21 en una terminal nueva.
- [ ] Emulador API 36 creado y detectado por `adb devices`.
- [ ] La app abre en el emulador (Evidencia 4).
- [ ] `app-debug.apk` existe y `.env` queda fuera de Git.
