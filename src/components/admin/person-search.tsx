"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Search box for the people screens that have no other filter. */
export function PersonSearch({
  basePath,
  q,
  placeholder,
}: {
  basePath: string;
  q: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(q);

  function apply(next: string) {
    const value = next.trim();
    router.push(value ? `${basePath}?q=${encodeURIComponent(value)}` : basePath);
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply(term);
      }}
    >
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full sm:w-64"
      />
      <Button type="submit" variant="outline">
        Cari
      </Button>
      {q ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTerm("");
            router.push(basePath);
          }}
        >
          Reset
        </Button>
      ) : null}
    </form>
  );
}
