import {
  BookOpen,
  CalendarClock,
  ChartBar,
  Cog,
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

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

export function adminNavFor(jenjang: Jenjang): NavGroup[] {
  if (jenjang === "SMA" || jenjang === "SMK") return ADMIN_NAV;

  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.onlyForJurusan),
  })).filter((group) => group.items.length > 0);
}

export function findNavItem(pathname: string): NavItem | undefined {
  return (
    ALL_ITEMS.find((item) => item.href === pathname) ??
    ALL_ITEMS.filter((item) => item.href !== "/admin").find((item) =>
      pathname.startsWith(`${item.href}/`),
    )
  );
}
