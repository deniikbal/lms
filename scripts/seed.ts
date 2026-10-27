/**
 * Seeds demo accounts, one per role.
 *
 *   pnpm seed
 *
 * Roles are assigned with SQL *after* sign-up, because `user.role` is declared
 * with `input: false` — it can never come from a request body. That is exactly
 * the property that stops someone registering themselves as an admin.
 */
import { Pool } from "pg";

type SeedAccount = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "guru" | "siswa";
};

async function main() {
  // Load .env before importing the auth instance, which reads process.env at
  // module scope (it opens the Postgres pool on import).
  process.loadEnvFile(".env");

  const { auth } = await import("../src/lib/auth");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const accounts: SeedAccount[] = [
    {
      name: "Admin Sekolah",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@lms.test",
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!",
      role: "admin",
    },
    {
      name: "Sari Wulandari",
      email: "guru@lms.test",
      password: "Guru12345!",
      role: "guru",
    },
    {
      name: "Budi Santoso",
      email: "siswa@lms.test",
      password: "Siswa12345!",
      role: "siswa",
    },
  ];

  async function findByEmail(email: string) {
    const { rows } = await pool.query<{ id: string }>(
      `select id from "user" where email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  console.log("Seeding demo accounts…");

  for (const account of accounts) {
    let existing = await findByEmail(account.email);

    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: {
            name: account.name,
            email: account.email,
            password: account.password,
          },
        });
        existing = await findByEmail(account.email);
        console.log(`  created  ${account.email}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  skipped  ${account.email} (${message})`);
      }
    } else {
      console.log(`  exists   ${account.email}`);
    }

    if (!existing) {
      console.log(`  FAILED   ${account.email} — user row not found`);
      continue;
    }

    await pool.query(
      `update "user" set role = $1, "emailVerified" = true where id = $2`,
      [account.role, existing.id],
    );
    console.log(`  role     ${account.email} -> ${account.role}`);
  }

  await pool.end();
  console.log("\nDone. Log in at http://localhost:3000/login");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
