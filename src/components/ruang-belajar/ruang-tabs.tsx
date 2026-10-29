import Link from "next/link";
import {
  BookOpenIcon,
  ClipboardListIcon,
  ListChecksIcon,
  UserCheckIcon,
  MessagesSquareIcon,
  SettingsIcon,
  TableIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { tabsFor, type PeranRuang, type TabKey } from "@/lib/ruang-belajar-shared";

/**
 * One icon per tab, keyed by the tab itself.
 *
 * Kept here, not in `ruang-belajar-shared`, because that file is imported by
 * server queries and should not drag a React component library along.
 */
const IKON: Record<TabKey, LucideIcon> = {
  materi: BookOpenIcon,
  tugas: ClipboardListIcon,
  kuis: ListChecksIcon,
  presensi: UserCheckIcon,
  nilai: TableIcon,
  diskusi: MessagesSquareIcon,
  anggota: UsersRoundIcon,
  pengaturan: SettingsIcon,
};

/**
 * Tab bar for the room.
 *
 * Links, not client state: every tab is a URL, so a teacher can send a colleague
 * straight to the grade table and the browser's back button behaves.
 */
export function RuangTabs({
  base,
  aktif,
  peran,
  batas = true,
}: {
  base: string;
  aktif: TabKey;
  peran: PeranRuang;
  /**
   * Draws the bar's own bottom rule. Turned off when the bar sits in a card
   * footer, where the card's edge already is the line — two rules one pixel
   * apart read as a mistake.
   */
  batas?: boolean;
}) {
  return (
    <nav
      aria-label="Bagian ruang belajar"
      className={cn(
        "flex gap-1 overflow-x-auto",
        batas && "-mb-px border-b border-border/70",
      )}
    >
      {tabsFor(peran).map((tab) => {
        const current = tab.key === aktif;
        const Ikon = IKON[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.key === "materi" ? base : `${base}?tab=${tab.key}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm transition-colors",
              "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
              current
                ? "font-medium text-indigo-700 after:bg-indigo-600 dark:text-indigo-300 dark:after:bg-indigo-400"
                : "text-muted-foreground after:bg-transparent hover:text-foreground",
            )}
          >
            <Ikon
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-colors",
                current
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-muted-foreground/70 group-hover:text-foreground",
              )}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
