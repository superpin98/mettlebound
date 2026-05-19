/**
 * PanelManager -- gestor centralizado de paneles UI.
 *
 * Solo puede estar abierto un panel a la vez (MOCHILA o PERSONAJE).
 * ActionBar gestiona los atajos de teclado y llama a este manager.
 * InventoryUI y CharacterSheet no necesitan sus propios listeners.
 *
 * Uso:
 *   const pm = new PanelManager();
 *   pm.register('inventory', inventoryUI);
 *   pm.register('character', charSheet);
 *   pm.toggle('inventory');  // abre inventory, cierra cualquier otro
 *   pm.closeAll();            // cierra todo
 */

export type PanelId = 'inventory' | 'character';

/** Interfaz minima que deben cumplir los paneles registrados. */
export interface PanelHandle {
  show(): void;
  hide(): void;
  isOpen(): boolean;
}

export class PanelManager {
  private panels: Map<PanelId, PanelHandle> = new Map();
  private active: PanelId | null = null;
  private changeCallback: ((active: PanelId | null) => void) | null = null;

  /** Registra un panel. Llamar antes de usar toggle(). */
  register(id: PanelId, handle: PanelHandle): void {
    this.panels.set(id, handle);
  }

  /**
   * Suscribe un callback que se invoca cada vez que cambia el panel activo.
   * Usado por ActionBar para actualizar el resaltado de botones.
   */
  onActiveChange(cb: (active: PanelId | null) => void): void {
    this.changeCallback = cb;
  }

  /**
   * Alterna un panel:
   * - Si el panel ya estaba abierto   -> lo cierra.
   * - Si otro panel estaba abierto    -> lo cierra y abre el nuevo.
   * - Si ninguno estaba abierto       -> abre el solicitado.
   */
  toggle(id: PanelId): void {
    if (this.active === id) {
      this.closeAll();
      return;
    }
    if (this.active !== null) {
      this.panels.get(this.active)?.hide();
    }
    this.active = id;
    this.panels.get(id)?.show();
    this.changeCallback?.(this.active);
  }

  /** Cierra el panel activo si lo hay. */
  closeAll(): void {
    if (this.active === null) return;
    this.panels.get(this.active)?.hide();
    this.active = null;
    this.changeCallback?.(null);
  }

  getActive(): PanelId | null {
    return this.active;
  }
}
