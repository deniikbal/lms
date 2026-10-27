"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={pending}
    >
      {pending ? "Keluar…" : "Keluar"}
    </Button>
  );
}
