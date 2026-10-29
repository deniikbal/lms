import {
  BookOpen,
  CalendarClock,
  ChartBar,
  Cog,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
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

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Utama",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Manajemen",
    items: [
      { title: "Data Siswa", href: "/admin/siswa", icon: Users },
      { title: "Data Guru", href: "/admin/guru", icon: UserRound },
      { title: "Kelas", href: "/admin/kelas", icon: School },
      { title: "Jurusan", href: "/admin/jurusan", icon: GraduationCap, onlyForJurusan: true },
      { title: "Mapel", href: "/admin/mapel", icon: BookOpen },
      { title: "Pembagian Mengajar", href: "/admin/ruang", icon: DoorOpen },
      { title: "Jadwal", href: "/admin/jadwal", icon: CalendarClock },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Pengguna", href: "/admin/pengguna", icon: UserCog },
      { title: "Pengaturan Sekolah", href: "/admin/pengaturan", icon: Cog },
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

/**
 * Teacher navigation.
 *
 * Only routes the guru role can actually open. The old version linked to
 * `/admin/ruang`, `/admin/jadwal`, `/admin/pengguna` and `/admin/pengaturan`,
 * all of which redirect a teacher straight back to `/guru` — a menu that
 * bounces you is worse than no menu.
 */
export const GURU_NAV: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { title: "Dashboard", href: "/guru", icon: LayoutDashboard },
      { title: "Ruang Belajar", href: "/guru/ruang", icon: DoorOpen },
      { title: "Bank Soal", href: "/guru/bank-soal", icon: LibraryBig },
    ],
  },
];

/**
 * Student navigation.
 *
 * Two entries, because two pages exist. The teacher menu used to link to admin
 * routes that bounced them back; the fix for that is not to invent links here
 * either. When a cross-room "Tugas" or "Nilai" page is built, it belongs in this
 * list and nowhere else.
 */
export const SISWA_NAV: NavGroup[] = [
  {
    label: "Utama",
    items: [{ title: "Dashboard", href: "/siswa", icon: LayoutDashboard }],
  },
  {
    label: "Belajar",
    items: [{ title: "Ruang Belajar", href: "/siswa/ruang", icon: DoorOpen }],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

export function adminNavFor(jenjang: Jenjang): NavGroup[] {
  if (jenjang === "SMA" || jenjang === "SMK") return ADMIN_NAV;

  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.onlyForJurusan),
  })).filter((group) => group.items.length > 0);
}

export function guruNav(): NavGroup[] {
  return GURU_NAV;
}

export function findAdminNavItem(pathname: string): NavItem | undefined {
  return (
    ALL_ITEMS.find((item) => item.href === pathname) ??
    ALL_ITEMS.filter((item) => item.href !== "/admin").find((item) =>
      pathname.startsWith(`${item.href}/`),
    )
  );
}

export function findNavItem(pathname: string): NavItem | undefined {
  return findAdminNavItem(pathname);
}

export function findGuruNavItem(pathname: string): NavItem | undefined {
  const guruItems = GURU_NAV.flatMap((group) => group.items);
  return (
    guruItems.find((item) => item.href === pathname) ??
    guruItems.filter((item) => item.href !== "/guru").find((item) =>
      pathname.startsWith(`${item.href}/`),
    )
  );
}

export function siswaNav(): NavGroup[] {
  return SISWA_NAV;
}

export function findSiswaNavItem(pathname: string): NavItem | undefined {
  const siswaItems = SISWA_NAV.flatMap((group) => group.items);
  return (
    siswaItems.find((item) => item.href === pathname) ??
    siswaItems.filter((item) => item.href !== "/siswa").find((item) =>
      pathname.startsWith(`${item.href}/`),
    )
  );
}