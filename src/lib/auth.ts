import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";

import { pool } from "@/lib/db";
import { DEFAULT_ROLE } from "@/lib/roles";

export const auth = betterAuth({
  appName: "LMS",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // Better Auth uses the built-in Kysely adapter for a raw `pg` pool.
  database: pool,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  /**
   * Students sign in with their NISN, staff with their email — both land in the
   * same `user` table, so both plugins stay enabled.
   */
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 50,
    }),
  ],

  user: {
    additionalFields: {
      /**
       * `input: false` is the important bit: the role is never accepted from the
       * sign-up request body. A user cannot register themselves as admin — the
       * value is written by the server only (seed script or admin action).
       */
      role: {
        type: "string",
        required: false,
        defaultValue: DEFAULT_ROLE,
        input: false,
      },
      /** "L" | "P" — student gender. */
      jk: {
        type: "string",
        required: false,
        input: false,
      },
      /** Student's class; null for staff. */
      kelas_id: {
        type: "number",
        required: false,
        input: false,
      },
      /** Inactive accounts are refused a session — see the hook below. */
      aktif: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      terakhir_aktif_at: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const { rows } = await pool.query<{ aktif: boolean | null }>(
            `select aktif from "user" where id = $1`,
            [session.userId],
          );

          // A deactivated account keeps its data but cannot sign in.
          if (rows[0]?.aktif === false) {
            throw new APIError("FORBIDDEN", {
              message: "Akun ini dinonaktifkan. Hubungi administrator.",
            });
          }

          return { data: session };
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
});

export type Auth = typeof auth;
