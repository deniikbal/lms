# Analisis Aplikasi LMS Pembelajaran Jarak Jauh (PJJ)

> Framework: Laravel 12 (PHP 8.2+) | Database: SQLite / MySQL | Type: LMS SD, SMP, SMA, SMK
> Dibuat untuk keperluan porting ke framework lain (Django / Rails / Express / Flask).

---

## 1. Ringkasan Aplikasi

Aplikasi LMS PJJ adalah sistem manajemen proses belajar mengajar jarak jauh yang menangani kelas, mapel, ruang belajar virtual, pertemuan daring, tugas rumah, kuis online, diskusi kelas, presensi daring, dan pengumuman. Ada tiga role utama:

| Role | Tanggung jawab |
|------|---------------|
| **Admin** | Manajemen sekolah, jurusan, kelas, mapel, pengguna (guru/siswa), ruang, rekap nilai/presensi/keaktifan |
| **Guru** | Buat ruang belajar, kelola pertemuan/tugas/kuis, input nilai, posting pengumuman |
| **Siswa** | Lihat ruang, hadir/menyelesaikan pertemuan, kumpul tugas, kerjakan kuis, lihat nilai |

---

## 2. Arsitektur & Pola Desain

- **MVC** — Model-View-Controller dengan Laravel
- **Middleware** — `auth` (otentikasi), `role` (RBAC), `can:akses,ruang` (per-ruang hak akses)
- **Views** di `resources/views/`
- **Storage** — lokal (`storage/app/`), dapat dialihkan ke S3
- **Database** — relational via migrasi Laravel
- **Struktur "Ruang Belajar"** — satu `ruang` = satu `mapel` + satu `kelas` + satu `tahun_ajaran`, diampu oleh satu `guru`. Konten (pertemuan/tugas/kuis/diskusi) diaplikasikan secara kolektif pada setiap ruang.

---

## 3. Konfigurasi Singkat

```php
// composer.json (required)
"require": {
    "php": "^8.2",
    "laravel/framework": "^12.0",
    "laravel/tinker": "^2.10.1"
}
```

### Env singkat (sebagian):

```ini
APP_ENV=production        # atau local
DB_CONNECTION=sqlite      # pilihan: mysql
QUEUE_CONNECTION=database # default sleep/sync
STORAGE_DISK=local
CACHE_STORE=database
SESSION_DRIVER=file
LOG_CHANNEL=stack
```

---

## 4. Schema Database Lengkap

### 4.1 Tabel master

| Tabel | Kolom penting | Deskripsi |
|------|--------------|-----------|
| `pengaturan` | `kunci`, `nilai` (text) | Key-value pengaturan aplikasi |
| `tahun_ajaran` | `id`, `nama` (2026/2027), `semester` (enum), `aktif`, `timestamps` | Tahun ajaran aktif |
| `jurusan` | `id`, `kode` (unique), `nama` | Jurusan/sekolah |
| `kelas` | `id`, `tingkat` (1-12), `jurusan_id` (nullable), `wali_id` (nullable → users), `nama` (unique: VII A, X TKJ 1) | Kelas |
| `users` | `id`, `name`, `email`, `password`, `kelas_id` (nullable, cascade delete) | Pengguna (all roles) |
| `mapel` | `id`, `kode` (unique), `nama`, `kelompok` (enum: Umum/Kejuruan/Muatan Lokal, default Umum) | Mapel |
| `ruang` | `id`, `tahun_ajaran_id`, `kelas_id`, `mapel_id`, `guru_id` (nullable), `deskripsi` (text), `kkm` (int, default 75), `bobot_tugas` (default 40), `bobot_kuis` (default 40), `bobot_kehadiran` (default 20) | Ruang belajar virtual |
| `jadwal` | `id`, `ruang_id`, `hari` (1=Sen sampai 6=Sabtu), `jam_mulai`, `jam_selesai`, `link_meet` (nullable) | Jadwal per ruang |

### 4.2 Tabel transaksional

| Tabel | Kolom penting | Deskripsi |
|------|--------------|-----------|
| `pertemuan` | `id`, `ruang_id`, `urutan`, `judul`, `isi` (longtext), `video_url`, `lampiran_path`, `lampiran_nama`, `tanggal`, `presensi_buka`, `presensi_tutup` (datetime), `terbit` (bool) | Sesi pembelajaran daring |
| `materi_selesai` | `pertemuan_id`, `siswa_id`, `selesai_at` (timestamp) | Buku materi selesai |
| `presensi` | `id`, `pertemuan_id`, `siswa_id`, `status` (enum: hadir/izin/sakit/alpa), `waktu`, `keterangan`, `oleh_guru` (bool) | Presensi daring |
| `tugas` | `id`, `ruang_id`, `pertemuan_id` (nullable), `judul`, `instruksi`, `lampiran_path`, `lampiran_nama`, `tenggat` (datetime), `jenis_kumpul` (enum: file/teks/keduanya), `boleh_terlambat` (bool) | Tugas rumah |
| `pengumpulan` | `id`, `tugas_id`, `siswa_id`, `teks`, `file_path`, `file_nama`, `dikumpulkan_at`, `terlambat` (bool), `nilai` (int), `komentar`, `dinilai_at` (nullable), `timestamps` | Catatan pengumpulan tugas |
| `kuis` | `id`, `ruang_id`, `judul`, `petunjuk` (text), `mulai`, `selesai` (datetime), `durasi_menit` (default 60), `acak_soal` (bool), `acak_opsi` (bool), `tampilkan_nilai` (bool), `terbit` (bool) | Kuis daring |
| `soal` | `id`, `kuis_id`, `urutan`, `jenis` (enum: pg/esai, default pg), `pertanyaan`, `opsi` (json), `kunci` (string 1), `bobot` (int, default 1) | Soal kuis |
| `percobaan` | `id`, `kuis_id`, `siswa_id`, `mulai_at`, `batas_at`, `selesai_at` (nullable), `urutan_soal` (json), `jawaban` (json), `nilai_esai` (json), `nilai` (decimal 5,2, nullable) | Percobaan / tryout siswa |
| `diskusi` | `id`, `ruang_id`, `user_id`, `parent_id` (nullable → diskusi), `isi` (text) | Diskusi threaded |
| `pengumuman` | `id`, `user_id`, `judul`, `isi`, `sasaran` (enum: semua/guru/siswa, default semua), `kelas_id` (nullable), `disematkan` (bool) | Pengumuman |

### Kunci & relasi utama

- `users.kelas_id → kelas.id` (nullable, cascade delete)
- `ruang.unique(['tahun_ajaran_id', 'kelas_id', 'mapel_id'])`
- Semua tabel FK ke `ruang` menggunakan `cascadeOnDelete()`
- `users.diskusi_id`, `users.pengumuman_id` (implicit via FK di tabel masing-masing)

---

## 5. Endpoint Routes (dari `routes/web.php`)

### 5.1 Akun umum

```
GET  /login              (guest)           -> AuthController::form
POST /login              (throttle:10,1)   -> AuthController::login
POST /logout            (auth)             -> AuthController::logout
```

### 5.2 Dashboard (auth, role)

```
GET  /                  -> DashboardController::index
GET  /jadwal            -> DashboardController::jadwal
GET  /profil            -> AuthController::profil
POST /profil            -> AuthController::gantiPassword
```

### 5.3 Pengumuman

```
GET  /pengumuman                -> PengumumanController::index
POST /pengumuman                (role:admin,guru) -> PengumumanController::store
DELETE /pengumuman/{id}         (role:admin,guru) -> PengumumanController::destroy
```

### 5.4 Ruang Belajar (`Route::prefix('ruang/{ruang}')` + middleware `can:akses,ruang`)

- `GET     /`            -> RuangController::index
- `GET /anggota`         -> RuangController::anggota
- `GET /presensi`        -> RuangController::presensi
- `GET /nilai`           -> RuangController::nilai
- `GET /nilai/csv`       (role:admin,guru) -> RuangController::nilaiCsv
- `GET /diskusi`         -> DiskusiController::index
- `POST  /diskusi`        -> DiskusiController::store
- `DELETE /diskusi/{id}`  -> DiskusiController::destroy

#### Admin/Guru (rol:admin,guru) di dalam ruang

| Method | Path | Controller | Action |
|--------|------|------------|--------|
| GET     | /pertemuan/baru  | PertemuanController | create |
| POST    | /pertemuan       | PertemuanController | store |
| GET     | /pertemuan/{id}/ubah | PertemuanController | edit |
| PUT     | /pertemuan/{id}  | PertemuanController | update |
| DELETE  | /pertemuan/{id}  | PertemuanController | destroy |
| POST    | /pertemuan/{id}/presensi | PertemuanController | aturPresensi |
| GET     | /tugas/baru      | TugasController | create |
| POST    | /tugas           | TugasController | store |
| GET     | /tugas/{id}/ubah | TugasController | edit |
| PUT     | /tugas/{id}      | TugasController | update |
| DELETE  | /tugas/{id}      | TugasController | destroy |
| POST    | /tugas/{id}/nilai/{pengumpulan} | TugasController | nilai |
| GET     | /kuis/baru       | KuisController | create |
| POST    | /kuis            | KuisController | store |
| GET     | /kuis/{id}/ubah  | KuisController | edit |
| PUT     | /kuis/{id}       | KuisController | update |
| DELETE  | /kuis/{id}       | KuisController | destroy |
| POST    | /kuis/{id}/soal  | KuisController | simpanSoal |
| POST    | /kuis/{id}/impor | KuisController | imporSoal |
| DELETE  | /kuis/{id}/soal/{soal} | KuisController | hapusSoal |
| GET     | /kuis/{id}/koreksi/{percobaan} | KuisController | koreksi |
| POST    | /kuis/{id}/koreksi/{percobaan} | KuisController | simpanKoreksi |
| DELETE  | /kuis/{id}/percobaan/{percobaan} | KuisController | resetPercobaan |

#### Siswa (role:siswa) di dalam ruang

| Method | Path | Controller | Action |
|--------|------|------------|--------|
| POST    | /pertemuan/{id}/hadir  | PertemuanController | hadir |
| POST    | /pertemuan/{id}/selesai | PertemuanController | selesai |
| POST    | /tugas/{id}/kumpul     | TugasController | kumpul |
| POST    | /kuis/{id}/mulai       | KuisController | mulai |
| GET     | /kuis/{id}/kerjakan    | KuisController | kerjakan |
| POST    | /kuis/{id}/jawab       | KuisController | jawab |
| POST    | /kuis/{id}/kumpul      | KuisController | kumpul |

### 5.5 Berkas

```
GET  /berkas/pertemuan/{pertemuan}  -> BerkasController::pertemuan
GET  /berkas/tugas/{tugas}          -> BerkasController::tugas
GET  /berkas/kumpulan/{pengumpulan} -> BerkasController::pengumpulan
```

### 5.6 Admin prefix (rol:admin)

| Area | Method | Path | Controller |
|------|--------|------|------------|
| Sekolah | GET/POST | /sekolah | Admin\SekolahController |
| Tahun | POST | /tahun-ajaran | Admin\SekolahController |
| Tahun | POST | /tahun-ajaran/{id}/aktif | Admin\SekolahController |
| Jurusan | GET/POST/DELETE | /jurusan | Admin\MasterController |
| Mapel | GET/POST/DELETE | /mapel | Admin\MasterController |
| Kelas | GET/POST/DELETE | /kelas | Admin\MasterController |
| Pengguna | GET/POST | /pengguna/{role} | Admin\PenggunaController |
| Pengguna | POST | /pengguna/{role}/impor | Admin\PenggunaController |
| Pengguna | GET | /pengguna/{role}/contoh-csv | Admin\PenggunaController |
| Pengguna | POST | /pengguna/{user}/reset | Admin\PenggunaController |
| Pengguna | DELETE | /pengguna/{user} | Admin\PenggunaController |
| Ruang | GET/POST | /ruang | Admin\RuangController |
| Ruang | POST | /ruang/{id}/jadwal | Admin\RuangController |
| Ruang | DELETE | /jadwal/{id} | Admin\RuangController |
| Rekap | GET | /rekap/presensi | Admin\RekapController |
| Rekap | GET | /rekap/nilai | Admin\RekapController |
| Rekap | GET | /rekap/keaktifan | Admin\RekapController |

---

## 6. Models & Hubungan

### 6.1 User
- `kelas_id` (nullable → kelas)
- `tanggungan kelas`, `tanggungan pengumuman`, `tanggungan diskusi`
- Password hashed (bcrypt default Laravel)

### 6.2 TahunAjaran
- `tanggungan ruang`, `tanggungan pengumunan`
- Semester: `Ganjil` / `Genap`

### 6.3 Jurusan
- `tanggungan kelas`

### 6.4 Kelas
- `tanggungan users`, `tanggungan jurusan`
- `tingkat` (1-12), `wali_id` (nullable → users)

### 6.5 Mapel
- `tanggungan ruang`
- Kelompok: `Umum` / `Kejuruan` / `Muatan Lokal`

### 6.6 Ruang
- `tanggungan tahun_ajaran`, `kelas`, `mapel`, `guru` (nullable)
- `kkm`, `bobot_tugas`, `bobot_kuis`, `bobot_kehadiran`
- `hasMany Jadwal / Pertemuan / Tugas / Kuis / Diskusi`

### 6.7 Jadwal
- `belongsTo Ruang`

### 6.8 Pertemuan
- `belongsTo Ruang`
- `hasMany Presensi / MateriSelesai`

### 6.9 Presensi
- `belongsTo Pertemuan / Siswa`
- Status: `hadir / izin / sakit / alpa`

### 6.10 Tugas
- `belongsTo Ruang / Pertemuan`
- `hasMany Pengumpulan`

### 6.11 Pengumpulan
- `belongsTo Tugas / Siswa`
- Nilai / komentar dinilai guru

### 6.12 Kuis
- `belongsTo Ruang`
- `hasMany Soal / Percobaan`

### 6.13 Soal
- `belongsTo Kuis`
- Jenis: `pg` (pilihan gaya) / `esai` (essai)
- `opsi` JSON: `{"A":"...","B":"..."}`
- `kunci` string 1

### 6.14 Percobaan
- `belongsTo Kuis / Siswa`
- `urutan_soal` JSON (array soal_id + urutan opsi)
- `jawaban` JSON: `{soal_id: "A"|"teks"}`
- `nilai_esai` JSON: `{soal_id: skor 0..bobot}`
- `nilai` decimal 5,2 (null bila belum dikoreksi esai)

### 6.15 Diskusi
- `belongsTo Ruang / User / Parent diskusi`
- Threaded

### 6.16 Pengumuman
- `belongsTo User / Kelas`
- Sasaran: `semua / guru / siswa`
- `disematkan` boolean (ditampilkan di halaman awal)

---

## 7. Fitur Utama

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | Otentikasi & RBAC | Login/logout + middleware role (admin/guru/siswa) |
| 2 | Manajemen Kurikulum | Tahun ajaran, jurusan, kelas, mapel CRUD |
| 3 | Ruang Belajar Virtual | Kombinasi kelas+mapel+tahun mendapat ruang sendiri |
| 4 | Sesi Pertemuan | Materi, video, lampiran, jadwal, presensi daring wajib |
| 5 | Tugas Rumah | Pengumpulan file/teks, tenggat, nilai, boleh terlambat |
| 6 | Kuis Online | Soal pilihan gaya/essai, acak soal & opsi, durasi, koreksi manual |
| 7 | Diskusi | Threaded per ruang |
| 8 | Pengumuman | Targeting semua/guru/siswa, disematkan |
| 9 | Presensi Daring | Status hadir/izin/sakit/alpa, waktu rekam, oleh_guru |
| 10 | Rekapitulasi Admin | Per-ruang: presensi, nilai, keaktifan |
| 11 | CSV Export | Nilai ruang (CSV) |
| 12 | Sistem Bobot | KKM + bobot tugas/kuis/kehadiran per ruang |

---

## 8. Poin Porting ke Framework Lain

### 8.1 Opsi

| Framework | Alasan dipilih | Tantangan |
|-----------|----------------|----------|
| **Django (Python)** | Admin auto, ORM kuat, auth built-in | Middleware role custom, JSON field handling |
| **Ruby on Rails** | ActiveRecord konvensi | Polymorphic relations, i18n views |
| **Node + Express** | Ecosystem fleksibel | Sequelize/Knex ORM, passport auth, multer upload |
| **Flask (Python)** | Ringan minimalis | Ekstensi: flask-login, flask-sqlalchemy, flask-admin |

### 8.2 Poin khusus porting

1. **Struktur "Ruang"** — Di Laravel `ruang` menghubungkan kelas+mapel+tahun. Di Django/Rails buat entitas terpisah mirip model `RuangBelajar`.
2. **Bobot & KKM** — Simpan sebagai konfigurasi per-ruang (model `Ruang` menyimpan `bobot_*`, `kkm`).
3. **Middleware Role** — Laravel gunakan package Spatie Permission kalau mau; di Django gunakan GroupPermission / django-guardian custom middleware; di Express gunakan `passport` strategy kustom.
4. **File Upload** — Storage lokal → framework lain bisa pindah ke S3 atau volume OS.
5. **CSV Export** — Django: `pandas`; Rails: `activerecord` + excel gem; Node: `csv-writer`.
6. **Acak Soal/Opsi** — Ganti index deterministik (hash terhadap soal_id) — tidak perlu random di database.
7. **Percobaan/Tryout** — Tabel `percobaan` dengan JSON columns; kalau mau simpan urutan per siswa gunakan reserved field serial integer kalau ORM tidak support json granular.
8. **Threaded Diskusi** — `parent_id` self-referential — mudah direpresentasikan dengan relations self-referencing.
9. **Sasaran Pengumuman** — gunakan kolom enum di `pengumuman.sasaran` + relasi `kelas_id`.

---

## 9. Contoh Model (Django simplified)

```python
# models.py
from django.db import models
from django.contrib.auth.models import User

class TahunAjaran(models.Model):
    nama = models.CharField(max_length=20)       # 2026/2027
    semester = models.CharField(max_length=10, choices=[('GANJIL','GANJIL'),('GENAP','GENAP')])
    aktif = models.BooleanField(default=False)

    def __str__(self): return self.nama

class Jurusan(models.Model):
    kode = models.CharField(max_length=15, unique=True)
    nama = models.CharField(max_length=120)

    def __str__(self): return self.nama

class Kelas(models.Model):
    TINGKAT_CHOICES = [(i, f'Tingkat {i}') for i in range(1,13)]
    TINGKAT = models.PositiveSmallIntegerField(choices=TINGKAT_CHOICES)
    jurusan = models.ForeignKey(Jurusan, on_delete=models.SET_NULL, null=True, blank=True)
    wali = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='wali_kelas')
    nama = models.CharField(max_length=40, unique=True)

    def __str__(self): return self.nama

class Mapel(models.Model):
    KLUMPOK = [('UMUM','Umum'),('KEJURUAN','Kejuruan'),('MUATAN_LOKAL','Muatan Lokal')]
    kode = models.CharField(max_length=15, unique=True)
    nama = models.CharField(max_length=120)
    kelompok = models.CharField(max_length=20, default='UMUM', choices=KLUMPOK)

    def __str__(self): return self.nama

class Ruang(models.Model):
    TANGGUNG = ['tahun_ajaran','kelas','mapel']
    tahun_ajaran = models.ForeignKey(TahunAjaran, on_delete=models.CASCADE)
    kelas = models.ForeignKey(Kelas, on_delete=models.CASCADE)
    mapel = models.ForeignKey(Mapel, on_delete=models.CASCADE)
    guru = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    deskripsi = models.TextField(blank=True)
    kkm = models.PositiveSmallIntegerField(default=75)
    bobot_tugas = models.PositiveSmallIntegerField(default=40)
    bobot_kuis = models.PositiveSmallIntegerField(default=40)
    bobot_kehadiran = models.PositiveSmallIntegerField(default=20)

    class Meta:
        unique_together = ('tahun_ajaran','kelas','mapel')

    def __str__(self): return f'{self.kelas.nama} - {self.mapel.nama}'
```

*(Model lain: Jadwal, Pertemuan, Presensi, MateriSelesai, Tugas, Pengumpulan, Kuis, Soal, Percobaan, Diskusi, Pengumuman — sama seperti Laravel, cukup sesuaikan nama dan tipe field sesuai ORM target)*

---

## 10. Catatan Porting Akhir

- Dokumen ini berbasis kode sumber di `C:/laragon/www/lms-pjj-sekolah-laravel/lms-pjj`.
- Struktur otentikasi role menggunakan middleware kustom `role` (biasanya dari Spatie Laravel Permission). Untuk framework lain, implementasi own RBAC middleware atau gunakan paket serupa.
- Database schema lengkap sudah diekstrak dari migration `2026_10_27_000001_create_lms_tables.php`.
- Library yang digunakan: Laravel v12, phpunit 11, faker, sail (docker), pint, pail, collision.
- Jika ingin porting tanpa ubah tampilan, gunakan Django admin untuk CRUD master dan custom views untuk fitur lanjutan.
