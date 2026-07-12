import * as React from "react";

/** Returns true when the viewport matches the given min-width (in px). SSR-safe. */
export function useMinWidth(minWidth: number): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [minWidth]);

  return matches;
}

/** Desktop = the lg breakpoint (matches the split-pane layout in index.css). */
export function useIsDesktop(): boolean {
  return useMinWidth(1024);
}
