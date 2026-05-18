/**
 * UIScale — escalado de la interfaz de usuario.
 *
 * Dos mecanismos:
 *  1. Auto-escala por resolución (default): detecta el ancho de ventana y
 *     aplica un factor proporcional.
 *  2. Override manual: el jugador elige una escala fija desde un selector
 *     discreto (botón ⚙) que persiste en localStorage.
 *
 * La escala se aplica como CSS variable --ui-scale en :root.
 * #ui-corner escala HUD (transform-origin: top left).
 * #ui-center escala modales (transform-origin: center).
 * #ui-scale-root y botones cheat tienen transform individual con su propio origin de esquina.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mettlebound.uiScale';

/** Tabla de auto-escala según ancho de ventana. */
const AUTO_BREAKPOINTS: Array<{ minWidth: number; scale: number }> = [
  { minWidth: 3440, scale: 2.0 },
  { minWidth: 2560, scale: 1.5 },
  { minWidth: 1920, scale: 1.25 },
  { minWidth: 0,    scale: 1.0 },
];

/** Opciones que aparecen en el selector manual. */
const MANUAL_OPTIONS: Array<{ label: string; value: 'auto' | number }> = [
  { label: 'AUTO',  value: 'auto' },
  { label: '100%',  value: 1.0 },
  { label: '125%',  value: 1.25 },
  { label: '150%',  value: 1.5 },
  { label: '175%',  value: 1.75 },
  { label: '200%',  value: 2.0 },
];

// ─── Lógica de escala ─────────────────────────────────────────────────────────

/** Calcula la escala automática según el ancho actual de la ventana. */
export function computeAutoScale(): number {
  const w = window.innerWidth;
  for (const bp of AUTO_BREAKPOINTS) {
    if (w >= bp.minWidth) return bp.scale;
  }
  return 1.0;
}

/** Lee la preferencia guardada en localStorage. */
export function getUserScale(): 'auto' | number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored || stored === 'auto') return 'auto';
  const n = parseFloat(stored);
  return isNaN(n) ? 'auto' : n;
}

/** Guarda la preferencia en localStorage. */
function setUserScale(value: 'auto' | number): void {
  localStorage.setItem(STORAGE_KEY, String(value));
}

/** Aplica --ui-scale al :root según preferencia del usuario (o auto si no hay). */
export function applyScale(): void {
  const userScale = getUserScale();
  const scale = userScale === 'auto' ? computeAutoScale() : userScale;
  document.documentElement.style.setProperty('--ui-scale', String(scale));
}

// ─── Selector visual ──────────────────────────────────────────────────────────

let panelVisible = false;

/**
 * Crea el botón ⚙ y el panel de opciones y los monta en el DOM.
 * Llama a esta función UNA sola vez, después de que el DOM esté listo.
 */
export function mountScaleSelector(): void {
  // Contenedor raíz del selector
  const root = document.createElement('div');
  root.id = 'ui-scale-root';

  // Botón de engranaje
  const btn = document.createElement('button');
  btn.id = 'ui-scale-btn';
  btn.textContent = '⚙';
  btn.title = 'Escala de interfaz';

  // Panel de opciones (oculto por defecto)
  const panel = document.createElement('div');
  panel.id = 'ui-scale-panel';
  panel.classList.add('hidden');

  // Etiqueta de cabecera
  const label = document.createElement('p');
  label.id = 'ui-scale-label';
  label.textContent = 'Escala UI';
  panel.appendChild(label);

  // Opciones
  const current = getUserScale();
  MANUAL_OPTIONS.forEach(opt => {
    const btn2 = document.createElement('button');
    btn2.className = 'ui-scale-option';
    btn2.textContent = opt.label;
    btn2.dataset['scale'] = String(opt.value);

    const isActive =
      opt.value === 'auto'
        ? current === 'auto'
        : current !== 'auto' && Math.abs((current as number) - (opt.value as number)) < 0.01;
    if (isActive) btn2.classList.add('active');

    btn2.addEventListener('click', () => {
      setUserScale(opt.value);
      applyScale();
      // Actualizar estado visual de las opciones
      panel.querySelectorAll('.ui-scale-option').forEach(el => el.classList.remove('active'));
      btn2.classList.add('active');
      // Cerrar panel
      panel.classList.add('hidden');
      panelVisible = false;
    });

    panel.appendChild(btn2);
  });

  // Toggle del panel al hacer click en el engranaje
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelVisible = !panelVisible;
    panel.classList.toggle('hidden', !panelVisible);
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', () => {
    if (panelVisible) {
      panelVisible = false;
      panel.classList.add('hidden');
    }
  });

  root.appendChild(btn);
  root.appendChild(panel);
  document.body.appendChild(root);

  // Recalcular en resize si estamos en modo AUTO
  window.addEventListener('resize', () => {
    if (getUserScale() === 'auto') applyScale();
  });
}
