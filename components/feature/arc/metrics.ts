// Memory Book geometry, on the 8-point grid. The spine (the thread of the
// book) runs down the centre of the chapter covers, and every node's text
// starts on the same line as a plate's text, so the page reads as one column.
import { space } from "@/constants/theme";

/** Chapter cover width inside a plate. */
export const COVER_W = 88;
/** Chapter plate height (cover height). */
export const PLATE_H = 128;
/** x of the spine, from the content's left edge: the centre of the covers. */
export const SPINE_X = COVER_W / 2;
/** x where a node's text starts: in line with a plate's text. */
export const TEXT_X = COVER_W + space.base;
/** Node marker disc. */
export const MARKER = 28;
/** Vertical padding of a bridge, proof or course row. */
export const NODE_PAD = space.base;
/** Marker top within its row: centred on the eyebrow line (13/18 caption, so 9 below the row padding). */
export const MARKER_TOP = NODE_PAD + 9 - MARKER / 2;
