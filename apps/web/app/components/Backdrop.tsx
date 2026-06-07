/**
 * BRIGADE ambient halo — fixed, non-interactive decorative layer behind all content.
 * Three drifting brand auras (ember / matcha / indigo) over an adaptive dot-grid. Geometry +
 * animation live in globals.css (`.brigade-backdrop`, `.aura-*`); intensity adapts per theme.
 *
 * Contract: the parent (`.app-shell`) forms a stacking context and owns the opaque background,
 * so this `z-index:-10` layer paints above the canvas but beneath the header + page content.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="brigade-backdrop">
      <div className="brigade-dotgrid" />
      <div className="aura aura-ember" />
      <div className="aura aura-matcha" />
      <div className="aura aura-indigo" />
    </div>
  );
}
