import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

/**
 * Typed browser client. `inferAdditionalFields` teaches the client about the
 * custom fields (role, jk, kelas_id, …) so `useSession()` returns them typed,
 * and `usernameClient` adds `signIn.username()` for the NISN login.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), usernameClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
