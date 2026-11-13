# Pomodoro Time · Bitácora del proceso

**Autor: Gabriel Paspuel.** Práctica 3 · Desarrollo de Interfaces.

Página web con la transcripción literal de los cinco prompts de trabajo de esta conversación y los dos primeros prototipos funcionales de la app. La última evolución de la app (calendario, temas, notificaciones, audio y minijuegos) queda excluida como prototipo; su prompt se conserva en la cronología.

## Abrir

Abre `POMODORO/index.html` o sirve la carpeta con un servidor estático:

```sh
python3 -m http.server 8080 --directory POMODORO
```

Después visita http://localhost:8080. No requiere dependencias ni un proceso de compilación.

## Funciones

- Dos prototipos interactivos dentro de la bitácora, con apertura en otra pestaña.
- Selector entre escritorio y móvil.
- Prompts originales junto al prototipo correspondiente, copia al portapapeles y lista de aportaciones.
- Cronología de los cinco prompts con desplegables y copia individual.
- Descarga de código de cada prototipo y de la bitácora completa.
- Diseño adaptable, navegación por teclado y movimiento reducido.

## Procedencia

- Prototipo 01, Calma: revisión `a5301bd` del historial del proyecto.
- Prototipo 02, Pomodoro Time con autoría de Gabriel Paspuel: revisión `0f84a9b`.
- La revisión final `bca3be2` no se incluye como prototipo.

Los prototipos se recuperan de los archivos originales de esas revisiones. La única adaptación de su lógica es un identificador de almacenamiento distinto para cada demo y la desactivación del registro del service worker dentro del archivo histórico. Esto permite conservar el progreso de cada versión por separado y evita conflictos de caché entre demos. Sus temporizadores de 20/5 minutos, paisajes, sonidos y avatares mantienen el comportamiento original.

Los prompts conservan su redacción original, incluidas las faltas ortográficas. Se recogen los mensajes de trabajo escritos por el usuario; no se incluyen mensajes automáticos de la interfaz ni instrucciones del sistema.

## Archivos

- `POMODORO/index.html`, `style.css`, `app.js`: bitácora y navegación.
- `POMODORO/prompts.js`: textos originales y correspondencia con las versiones.
- `POMODORO/prototipos/v1/`: primer prototipo.
- `POMODORO/prototipos/v2/`: segundo prototipo.

Las imágenes, las ilustraciones y las tipografías son las de los prototipos originales. Se incluyen las licencias SIL Open Font License de DM Sans y Lora. Las fotografías proceden de Unsplash; sus referencias están en la documentación del proyecto original.

## Repositorio

https://github.com/Gabiiixx04/Prototipos-Pomodoro

La entrada principal de la bitácora está en `POMODORO/index.html`. El `index.html` de la raíz dirige a esta carpeta. Las imágenes que ya había en `POMODORO/images/` se conservan.
