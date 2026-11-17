# Contexto del proyecto: Seguimiento de Retos

Documento de estado de la práctica de instalación (guía `02-instalacion-windows.md`). Fecha: 11 de noviembre de 2026.

Este archivo no contiene contraseñas. Las credenciales están en `backend/.env`, que Git ignora.

## Ubicaciones

| Elemento | Ruta |
| --- | --- |
| Proyecto (monorepo) | `C:\Users\usuario\proyectos\SeguimientoRetos` |
| Repositorio público | https://github.com/jhordycamacas/seguimiento_retos |
| Guía original | `C:\xampp\htdocs\seguimiento_retos\documentation\02-instalacion-windows.md` |
| APK de depuración | `frontend\android\app\build\outputs\apk\debug\app-debug.apk` |

## Estado por sección de la guía

| Sección | Estado | Detalle |
| --- | --- | --- |
| 0. Terminal | Hecho | PowerShell y winget 1.29 |
| 1. MySQL | Hecho | MySQL 8.4.13, servicio `MySQL84`, puerto 3307 |
| 2. Python | Hecho | Python 3.12.10 de 64 bits |
| 3. Git y VS Code | Hecho | Git 2.47, VS Code 1.145, 6 extensiones de la guía |
| 4. Carpeta y entorno | Hecho | `backend/.venv` y `.vscode/settings.json` con el intérprete |
| 5. Django y dependencias | Hecho | Django 5.2.19, mysqlclient 2.3.0, `pip check` sin conflictos |
| 6. Node | Hecho | Node 22.23.4, npm 10.9.9 |
| 7. Angular e Ionic CLI | Hecho | Angular CLI 22.2.4, Ionic CLI 7.2.1 |
| 8. Plantilla Angular + Ionic | Hecho | Angular 22.2.5, Ionic 9.0.10; el botón se ve en `localhost:8100` |
| 9. Android Studio | Parcial | SDK y Java 21 instalados; emulador `Pixel7_API34` creado (la guía pide API 36) |
| 10. Capacitor y Android | Hecho | Capacitor 8.6.0, `cap doctor` correcto, APK generada |
| Evidencia 4 | Pendiente | Abrir la app en el emulador y capturar la pantalla |

## Base de datos

- Base: `seguimiento_retos` (utf8mb4), vacía. Las tablas se crearán con las migraciones de Django.
- Usuario de la aplicación: `retos_app`, con `ALL PRIVILEGES` solo sobre `seguimiento_retos`.
- Existe para `127.0.0.1` y para `localhost`, porque MySQL resuelve las conexiones locales como `localhost`.
- Conexión desde Python: host `127.0.0.1`, puerto `3307`.

## Comandos de uso habitual

Frontend en el navegador:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
ng.cmd serve --port=8100
```

Entorno virtual del backend:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\backend"
.\.venv\Scripts\Activate.ps1
```

Reconstruir la app Android tras cambiar el frontend:

```powershell
Set-Location "$env:USERPROFILE\proyectos\SeguimientoRetos\frontend"
npm.cmd run build
npx.cmd cap sync android
Set-Location android
.\gradlew.bat assembleDebug
```

Abrir el proyecto en Android Studio: `npx.cmd cap open android` desde `frontend`.

## Diferencias respecto a la guía

1. **Import de Ionic:** en Ionic 9 se importa desde `@ionic/angular`. La ruta `@ionic/angular/standalone` ya no existe.
2. **`ionic serve` falla con Angular 22:** ejecuta `ng run app:serve --host --port`, y Angular 22 rechaza esos argumentos; además el proyecto se llama `frontend`, no `app`. Se usa `ng.cmd serve --port=8100`.
3. **`ionic init`:** `ionic.config.json` ya existe, así que el error "Existing Ionic project file found" es inofensivo.
4. **`ng new frontend`:** no se repite si `frontend` existe; hacerlo produce "A merge conflicted on path /frontend/package.json".
5. **Plantilla de Angular:** `app.html` conserva la página de bienvenida de Angular con el botón de Ionic encima.
6. **Emulador:** `Pixel7_API34` en lugar de una imagen API 36.

## Lecciones técnicas

- En Windows, `python -c "print(...)"` añade `\r` al final. Si se captura en una variable de Bash y se escribe en un archivo, la clave queda con un carácter invisible y falla el login. Se resolvió quitando el `\r` y reasignando la clave.
- `mysql -p` no funciona en terminales no interactivas, porque espera la clave por teclado.

## Pendiente

- [ ] Abrir la app en el emulador desde Android Studio y capturar la pantalla (Evidencia 4).
- [ ] Redactar el informe: versiones, verificaciones y dificultades resueltas.
- [ ] Responder las 6 preguntas de la sección 14 de la guía.
- [ ] Siguiente práctica: `03-backend-paso-a-paso.md`.

## Evidencias para el ingeniero

1. **MySQL:** versión 8.4.13, puerto 3307 y acceso con `retos_app`.
2. **Python:** versiones, entorno virtual y conexión Python–MySQL (devolvió `seguimiento_retos`).
3. **Ionic:** versiones y botón en `localhost:8100`.
4. **Android:** app en el emulador y ruta de la APK.
