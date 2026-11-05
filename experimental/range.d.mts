/**
 * Experimental, opt-in directional deformation for a native Slidebox range.
 * Does not replace native values or emit synthetic input/change events.
 * Call after mounting; call the returned cleanup function before unmounting.
 * Importing during server rendering is safe.
 */
export interface SlideboxRangeOptions {
  /** Keep the existing two-span visual mounted so skins can decorate its thumb and fill pseudos. */
  layers?: boolean;
}
export interface SlideboxRangeCleanup {
  (): void;
  /** Refresh after programmatic style/theme or position-only layout changes. */
  refresh(): void;
}
export declare function enhanceSlideboxRange(input: HTMLInputElement, options?: SlideboxRangeOptions): SlideboxRangeCleanup;

/**
 * Experimental progress fill, independent of directional motion.
 * Updates on native input/change and form reset. Call cleanup before unmounting.
 * After programmatic value changes, dispatch an input event to update the fill.
 */
export declare function enhanceSlideboxRangeFill(input: HTMLInputElement): () => void;
