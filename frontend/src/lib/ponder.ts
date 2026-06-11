import { createClient } from "@ponder/client";

import * as schema from "../../../indexer/ponder.schema";

// Default to Ponder's local dev port so an unset env doesn't silently build an
// `undefined/sql` URL. Trailing slashes are trimmed to avoid `//sql`.
const ponderUrl = (
  process.env.NEXT_PUBLIC_PONDER_URL ?? "http://localhost:42069"
).replace(/\/+$/, "");

export const ponderClient = createClient(`${ponderUrl}/sql`, { schema });

export { schema };

declare module "@ponder/react" {
  interface Register {
    schema: typeof schema;
  }
}
