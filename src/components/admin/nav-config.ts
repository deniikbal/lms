import {
  BookOpen,
  CalendarClock,
  CalendarRange,
  ChartBar,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  School,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Jenjang } from "@/lib/kelas-shared";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Only meaningful for SMA/SMK — hidden for SD/SMP, where majors do not exist. */
  onlyForJurusan?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Admin menu. Mirrors the admin areas in ANALISIS_LMS_PJJ.md §5.6 so the
 * navigation and the blueprint stay in sync as sections get built out.
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Utama",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Data Master",
    items: [
      { title: "Tahun Ajaran", href: "/admin/tahun-ajaran", icon: CalendarRange },
      { title: "Jurusan", href: "/admin/jurusan", icon: GraduationCap, onlyForJurusan: true },
      { title: "Kelas", href: "/admin/kelas", icon: School },
      { title: "Mapel", href: "/admin/mapel", icon: BookOpen },
    ],
  },
  {
    label: "Manajemen",
    items: [
      { title: "Data Siswa", href: "/admin/siswa", icon: Users },
      { title: "Data Guru", href: "/admin/guru", icon: UserRound },
      { title: "Pengguna", href: "/admin/pengguna", icon: UserCog },
      { title: "Pembagian Mengajar", href: "/admin/ruang", icon: DoorOpen },
      { title: "Jadwal", href: "/admin/jadwal", icon: CalendarClock },
    ],
  },
  {
    label: "Laporan & Info",
    items: [
      { title: "Rekap", href: "/admin/rekap", icon: ChartBar },
      { title: "Pengumuman", href: "/admin/pengumuman", icon: Megaphone },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/**
 * The menu for one school level.
 *
 * Majors only exist for SMA/SMK; for SD/SMP the entry is dropped (and with it
 * any group that would be left empty). The rows stay in the database — they are
 * simply not reachable from the menu.
 */
export function adminNavFor(jenjang: Jenjang): NavGroup[] {
  if (jenjang === "SMA" || jenjang === "SMK") return ADMIN_NAV;

  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.onlyForJurusan),
  })).filter((group) => group.items.length > 0);
}

/** Nav entry that owns the given path — exact match first, then prefix. */
export function findNavItem(pathname: string): NavItem | undefined {
  return (
    ALL_ITEMS.find((item) => item.href === pathname) ??
    ALL_ITEMS.filter((item) => item.href !== "/admin").find((item) =>
      pathname.startsWith(`${item.href}/`),
    )
  );
}
