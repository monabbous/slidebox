export interface SlideboxDragOptions {
  /** Horizontal movement in CSS pixels before a drag starts. Default: 5. */
  threshold?: number;
}

/**
 * Experimental opt-in pointer dragging for a native checkbox styled by Slidebox.
 * Call after mounting the input. Returns an idempotent cleanup function.
 * Calling again for the same input returns its existing cleanup function;
 * destroy it first to change options. Safe to import during server rendering.
 */
export declare function enhanceSlidebox(
  input: HTMLInputElement,
  options?: SlideboxDragOptions,
): () => void;
