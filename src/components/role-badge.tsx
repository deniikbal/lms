import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, type Role } from "@/lib/roles";

/** Distinct badge variant per role, drawn from the theme tokens. */
const VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  guru: "secondary",
  siswa: "outline",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
