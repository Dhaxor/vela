import { useId } from "react";

/**
 * A DOM-safe id for SVG <defs>. Ids must be unique per instance: on web an
 * inactive screen is display:none, and a gradient defined inside a hidden
 * <svg> paints nothing for every other element that references the same id.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
}
