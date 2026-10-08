# SalomatOS Frontend — Ish rejasi (0 → 100%)

> **Manba:** `ARCHITECTURE.md` §21 "Qurilish tartibi" kengaytirilgan holda.
> **Holat:** 2026-08-01 — loyihada kod yo'q, faqat hujjatlar bor. Boshlang'ich nuqta = 0%.
> **Baholash:** 1 ta full-time frontend dasturchi uchun ish kunlarida. 2 kishi bo'lsa Faza 7 dan keyin parallellashadi.

---

## Umumiy manzara

| Faza | Nima | % | Kun |
|---|---|---|---|
| 0 | Fundament va bloklovchi qarorlar | 0 → 4 | 2 |
| 1 | Skelet va CI | 4 → 14 | 5 |
| 2 | API qatlami | 14 → 22 | 4 |
| 3 | 🔴 Dizayn tizimi ✅ | 22 → 36 | 10 |
| 4 | Auth, sessiya, RBAC ✅ | 36 → 46 | 6 |
| 5 | i18n karkasi ✅ | 46 → 52 | 3 |
| 5.5 | Backend kontraktiga moslashish ✅ | 52 → 54 | 1 |
| 6 | 🔴 Bemorlar moduli (etalon) | 54 → 66 | 9 |
| 7 | Qolgan biznes modullari | 66 → 86 | 30 |
| 8 | SuperAdmin panel (bemor portali bekor qilindi) | 86 → 90 | 6 |
| 9 | Production hardening | 90 → 100 | 8 |
|  | **Jami** |  | **~84 kun (≈4.2 oy)** |

**Ketma-ketlikni buzmang.** Har bir faza oldingisining chiqish mezoniga tayanadi. Ayniqsa Faza 3 — uni modullardan keyinga surish qaytarib bo'lmaydigan xato (`ARCHITECTURE.md` §21).

---

## Faza 0 — Fundament va bloklovchi qarorlar (0 → 4%)

Kod yozishdan oldin hal qilinishi shart bo'lgan narsalar.

### 0.1. Repozitoriyni tartibga solish ✅ BAJARILDI (2026-08-21)
- [x] `guard.sh` → `.claude/hooks/guard.sh` ga ko'chirildi
- [x] `settings.json` → `.claude/settings.json` ga ko'chirildi
- [x] `chmod +x .claude/hooks/guard.sh`
- [x] `jq` mavjud (jq-1.7.1)
- [x] Hook'lar 11 ta test bilan tekshirildi — bash/write/scan/stop rejimlari bloklayapti
- [x] `.gitignore`, `.gitattributes` (`generated/** linguist-generated=true`)
- [x] `.nvmrc` → Node **24** (2026 holatiga LTS, mashinada o'rnatilgan v24.14.0)
- [x] `CLAUDE.md`, `ROADMAP.md`, `.claude/` commit qilindi (`chore/faza-0-fundament`)
- [ ] ⚠️ **`pnpm` o'rnatilmagan.** `corepack enable pnpm` EACCES bilan yiqildi (`/usr/local/bin` uchun sudo kerak).
      Foydalanuvchi bajarsin: `sudo corepack enable pnpm`. Faza 1 shusiz boshlanmaydi.
- [ ] `package.json` da `packageManager: pnpm@…` — Faza 1 da, Vite skeleti yaratilgandan keyin
      (hozir yaratilsa `pnpm create vite` bilan to'qnashadi)

### 0.2. 🔴 Bloklovchi qarorlar ✅ HAL QILINDI (2026-08-21)

| # | Savol | Qaror | ADR |
|---|---|---|---|
| 1 | Auth usuli | **Django session authentication.** `httpClient` da refresh oqimi yo'q: 401 → `hardLogout()` → `/login`. §13.1 dagi JWT rotatsiya jadvali kelajakdagi mobil endpoint uchun | `ADR-003` aniqlashtirildi |
| 2 | 4-til | **`uz-Latn`, `uz-Cyrl`, `ru`, `en`.** Ikkita o'zbek lokali alohida, transliteratsiya yo'q. `kaa` kechiktirildi | `ADR-008` yangi |
| 3 | Real-time | **30s polling** (`cachePolicy.live`). Channels keyinroq, migratsiya og'riqsiz | `ADR-009` yangi |
| 4 | Vaqt zonasi | **`CLINIC_TZ = 'Asia/Tashkent'` konstanta**, `shared/lib/datetime.ts` da jamlangan | `ADR-010` yangi |
| 5 | Biometrik ma'lumot (rentgen) | ⏸️ **Ochiq — yurist qarori.** Frontend'ni bloklamaydi: `dist/` da PHI yo'q, faqat media URL strategiyasiga ta'sir qiladi (Faza 9.3) | §13.9 |

> **5-savol nega bloklamaydi:** §13.9 ga ko'ra frontend statik fayllari PHI tashimaydi.
> Qaror faqat media qayerdan beriladi (`X-Accel-Redirect` vs imzolangan URL) degan savolga
> ta'sir qiladi, va u Faza 7.2 (tibbiy yozuvlar) dan oldin kerak bo'ladi — hozir emas.

### 0.3. Backend kontrakti (frontend uchun old shart)

> ⏸️ **Tekshirib bo'lmadi.** `localhost:8000` javob bermadi (backend alohida repozitoriyda va
> hozir ishlamayapti). Bu **Faza 2 ni bloklaydi** — Orval schema'siz tip generatsiya qilolmaydi.
> Faza 1 (skelet) esa bloklanmaydi, unga backend kerak emas.
>
> Backend jamoasi bilan quyidagi ro'yxat tasdiqlansin (`§5.4`):

- [ ] `drf-spectacular` ishlaydi, `/api/schema/` valid OpenAPI 3 qaytaradi
- [ ] Barcha ID — `UUID`
- [ ] Sana/vaqt — UTC ISO-8601
- [ ] Katta ro'yxatlar — `CursorPagination`
- [ ] Har javobda `X-Request-Id`
- [ ] `/api/me/` → user + `permissions[]` + `clinics[]`
- [ ] Xato matnida PHI yo'q

**Chiqish mezoni:**
- [x] Hook'lar `.claude/hooks/` da va ishlayapti (11/11 test)
- [x] Qarorlar ADR sifatida yozilgan (`ADR-003` aniqlashtirildi, `ADR-008/009/010` qo'shildi)
- [x] Repo baseline commit qilingan
- [ ] ⚠️ `pnpm` o'rnatilsin — `sudo corepack enable pnpm`
- [ ] ⏸️ `curl localhost:8000/api/schema/` valid schema beradi — **backend tomonda, Faza 2 ni bloklaydi**

**Holat: 0 → 3.5%.** Faza 1 ni boshlash mumkin (unga backend kerak emas), faqat `pnpm` o'rnatilsin.

---

## Faza 1 — Skelet va CI (4 → 14%) ✅ BAJARILDI (2026-08-21)

Bironta biznes kodisiz, lekin butun sifat mashinasi ishlab turadi.

### 1.1. Loyiha yaratish ✅
- [x] Skelet repo ildizida qo'lda qurildi (`pnpm create vite` o'rniga) — backend alohida repozitoriyda,
      shuning uchun frontend uchun alohida ichki papka kerak emas
- [x] Ilova A dagi barcha paketlar o'rnatildi
- [x] §13.8: postinstall skriptlar bloklangan, `pnpm-workspace.yaml` da aniq allowlist
      (`esbuild: true`, `unrs-resolver: true`, `msw: false`)

### 1.2. TypeScript strict ✅
- [x] §17.4 dagi **barcha 7 flag** yoqilgan
- [x] `@/*` → `src/*` alias (tsconfig + vite)

### 1.3. Papka strukturasi va qatlam himoyasi ✅
- [x] §3.1 dagi 6 qatlam yaratildi
- [x] `eslint-plugin-boundaries` sozlandi
- [x] **Tekshirildi — 4 ta stsenariy:** qonuniy importlar o'tadi · `entities → features`
      bloklandi · `features → features` (cross-slice) bloklandi · `shared → entities` bloklandi

### 1.4. Skriptlar ✅
- [x] `verify`, `lint:boundaries`, `api:generate`, `api:check`, `i18n:check`, `test`,
      `test:e2e`, `build:analyze`, `size-limit`
- [x] `scripts/i18n-check.mjs` yozildi — lokal papka yo'q bo'lsa ogohlantirib o'tadi (Faza 5 gacha)

### 1.5. CI va pre-commit ✅
- [x] `.github/workflows/ci.yml` — §17.3 dagi barcha qadamlar
- [x] `api:check` va E2E **shartli** — mos fayllar paydo bo'lganda avtomatik yoqiladi (Faza 2 / 6)
- [x] Husky + lint-staged (§17.2)
- [ ] ⚠️ `main` branch himoyasi — GitHub sozlamalarida qo'lda yoqilsin (PR + 1 approve + yashil CI)

### 1.6. Hujjatdan chetlanishlar

| Nima | Nega |
|---|---|
| `eslint-import-resolver-typescript` qo'shildi | Ilova A da yo'q, lekin `boundaries` `@/` aliasini shusiz yechа olmaydi |
| `@vitejs/plugin-react` `^5` ga qadaldi | v6 vite 8 ni talab qiladi, biz §2.1 bo'yicha vite `^7` da |
| `vite.config.ts` da bitta `as PluginOption` | `rollup-plugin-visualizer` tiplari `exactOptionalPropertyTypes` bilan mos emas. `any` emas, bitta qatorda izolyatsiya qilingan |
| Biome: `scripts/**` uchun `noConsole` o'chirildi | Taqiq sababi (§13.4) brauzer bundle'i. Node CLI skriptida qo'llanmaydi |

> **Yangi major versiyalar mavjud, lekin §2 bo'yicha ADR'siz o'tilmadi:**
> `@tanstack/react-table` 9 (biz `^8`), `motion` 13 (`^12`), `typescript` 7 (`^5.9`), `vite` 8 (`^7`).
> Ularni ko'tarish alohida qaror — kerak bo'lsa ADR yozilsin.

**Chiqish mezoni — hammasi bajarildi:**
- [x] `pnpm verify` yashil
- [x] Qatlam buzilishi lint'ni qizil qiladi (4 ta stsenariyda isbotlandi)
- [x] `pnpm build` ishlaydi
- [x] `pnpm size-limit`: JS **61.54 kB** / 180 kB · CSS **1.68 kB** / 40 kB
- [x] `pnpm audit --audit-level=high` — zaiflik yo'q
- [x] `dist/` da sir yo'q

---

## Faza 2 — API qatlami (14 → 22%)

### 2.1. Orval ⛔ BEKOR QILINDI (2026-08-25) — `ADR-006` qayta ko'rildi
- [x] ~~`orval.config.ts`~~ — **bo'lmaydi**. Backend `drf-yasg` ni ishlatadi, u Swagger 2.0
      chiqaradi (Orval OpenAPI 3 kutadi), va schema route'i `if settings.DEBUG:` ichida —
      to'g'ri sozlangan production'da umuman mavjud emas
- [x] Tiplar qo'lda, Valibot sxemalari sifatida — **ishga tushirish paytida** tekshiriladi
- [x] MSW mocklari qo'lda yozildi va haqiqiy kontraktni takrorlaydi

> Backend `drf-spectacular` ga o'tsa va `/api/schema/` ni `DEBUG` dan chiqarsa qaytariladi.
> CI'dagi `api:check` qadami `hashFiles('orval.config.ts')` sharti ostida — o'zini
> avtomatik o'chirib turibdi, tegishga hojat yo'q.

### 2.2. HTTP klient (§5.2) ✅ BAJARILDI (2026-08-21, 2026-08-25 da qayta ishlangan)
- [x] `ky` instance: `prefix`, timeout 20s
- [x] Retry: faqat GET, `[408, 429, 500, 502, 503, 504]`
- [x] `beforeRequest`: ~~CSRF + `X-Clinic-Id`~~ → **`Authorization: Bearer`** (`ADR-003` qayta ko'rildi)
- [x] `afterResponse`: 401 → `onUnauthorized()`. Refresh oqimi yo'q — backend'da refresh route'i yo'q

### 2.3. Xato normalizatsiyasi (§5.3) ✅ BAJARILDI
- [x] `ApiError`: `kind`, `fieldErrors`, `detail`, **`messageKey`**, `requestId`
- [x] `normalizeDrfError()` — ~~DRF ning 4 shakli~~ → backend'ning yagona konverti
      (`{message, message_key, errors, exception_class}`)
- [x] Maydon xatolari **kod** sifatida keladi (`"required"`) → `validation.required` kalitiga o'giriladi
- [x] ⛔ Django traceback'i (`DEBUG=True`) `detail` ga chiqarilmaydi — §13.4

### 2.4. Kesh siyosati (§6.3) ✅ BAJARILDI (2026-08-21)
- [x] `shared/config/cache.ts`: `static` / `standard` / `live` / `financial` / `never`
- [x] `financial` qo'shildi — `ARCHITECTURE.md` §6.3 dagi nomuvofiqlik yopildi
- [x] `queryClient` (§6.4): retry mantiqi, `throwOnError`, `mutations.retry: false`
- [x] ⛔ `persistQueryClient` ishlatilmaydi

### 2.5. Vite proxy ✅
- [x] Dev'da `/api` proxy (prod'da nginx, same-origin)

**Chiqish mezoni (qayta ta'riflangan):** ~~`api:generate` tiplar chiqaradi~~ · `ApiError`
haqiqiy backend konvertini parse qiladi (test bilan) · 401 → hard logout (test bilan).

---

## Faza 3 — 🔴 Dizayn tizimi (22 → 36%) ✅ YAKUNLANDI

> **Bu fazani o'tkazib yubormang yoki qisqartirmang.** Modullardan keyin qurilsa, har modulda tugmalar boshqacha bo'ladi va "Apple-style" hech qachon chiqmaydi. Refaktoring narxi = butun UI'ni qayta yozish.

### 3.1. Tokenlar ✅ BAJARILDI (2026-08-21)
- [x] `app/styles/theme.css` — Tailwind v4 `@theme` bloki
- [x] Rang, spacing (`--spacing: 4px` → 8pt grid), radius, typography shkalasi, `--ease-out-apple`
- [x] Light + dark (`prefers-color-scheme` **va** `[data-theme]`)
- [x] `@tailwindcss/vite` plugin
- [x] Inter Variable **o'z serverimizdan** — §13.5 `font-src 'self'` Google Fonts'ni bloklaydi
- [x] `pnpm check:contrast` — 53 juft o'lchanadi, `verify` va CI ichida

> 🔬 **§11.2 palitrasi o'z §11.7 talabidan yiqilardi.** O'lchov ko'rsatdi: `#86868b` oq ustida
> 3.9:1, `#34c759` — 4.0:1, `#0071e3` matn sifatida canvas ustida 4.31:1. Qiymatlar AA ga
> moslandi va **aksent ikki rolga ajratildi** (`accent` = fon, `accent-text` = matn), chunki
> bitta qiymat ikkalasini bajara olmaydi. `ARCHITECTURE.md` §11.2 yangilandi.

### 3.1b. Qo'shimcha tokenlar (hujjatda yo'q edi, kerak bo'ldi)
- [x] `--color-accent-text` — matn/havola roli
- [x] `--color-danger-fill` / `--color-danger-hover` / `--color-on-danger` — destruktiv tugma.
      Dark'da `danger` (#ff6961) oq matn bilan atigi 2.82:1 beradi, shuning uchun fon uchun
      alohida quyuqroq qiymat kerak
- [x] `--color-on-accent`, `--size-touch`

### 3.2. Asosiy komponentlar (`shared/ui/`)
shadcn/ui dan nusxalanadi va tokenlarга moslanadi:

| Guruh | Komponentlar | Holat |
|---|---|---|
| Forma | `Button`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch` | ✅ |
| Forma | `RadioGroup`, `DatePicker`, `PhoneInput` | ✅ |
| Layout | `Card`, `Separator`, `Sheet`, `Dialog`, `Popover`, `DropdownMenu`, `Tooltip` | ✅ |
| Layout | `Tabs` | ✅ |
| Ma'lumot | `Badge`, `Skeleton`, `Table`, `Avatar`, `Pagination` | ✅ |
| Fikr-mulohaza | `Toast` (sonner), `Alert`, `EmptyState`, `ErrorState` | ✅ |
| Navigatsiya | `Breadcrumb`, `CommandPalette` (cmdk) | ✅ |

> 🗓️ **`DatePicker` vaqt zonasiga umuman tegmaydi.** §12.4 dagi eng jiddiy tuzoq shu:
> `new Date('2026-01-01')` UTC yarim tunini beradi va Grinvichdan g'arbda **31-dekabr**
> bo'lib ko'rinadi. Shuning uchun `shared/lib/calendarDate.ts` kiritildi — sana faqat
> `yyyy-MM-dd` matn va lokal kalendar qismlari sifatida yashaydi. Vaqt zonasi faqat
> **instant** (uchrashuv qachon boshlanadi) uchun kerak va u alohida modulda qoladi.
> `2026-02-31` kabi mavjud bo'lmagan kunlar rad etiladi — JavaScript ularni jimgina
> 3-martga aylantirib yuborardi.

> **`Pagination` raqamli sahifalarsiz — bu ataylab.** §5.4 backend'da `CursorPagination`
> ni talab qiladi, u esa kursor qaytaradi va **jami sonni qaytarmaydi** (`OFFSET 50000`
> 1000 klinikaning bemorlar jadvalida PostgreSQL'ni o'ldiradi). Jami son bo'lmasa
> sahifalar soni ham yo'q, "7-sahifa" havolasi esa hech qayerga ishora qilmaydi.
> Shuning uchun faqat oldingi/keyingi. Bu kamchilik emas, o'sha qarorning oqibati.

- [x] Yozilganlarning har birida `size="sm"` (dense) varianti bor (o'lchamli komponentlarda)
- [x] Yozilganlarning har biri klaviatura bilan boshqariladi, `:focus-visible` global
- [x] 34 ta test — jumladan `Dialog` fokus tuzog'i va menyu klaviatura navigatsiyasi

**Overlay animatsiyasi CSS'da, JS'da emas.** Sabab: Radix CSS animatsiyasini o'zi
aniqlaydi va chiqish tugagunicha elementni DOM'da ushlab turadi — aks holda dialog
yopilish animatsiyasi o'rtasida yo'qolib qoladi. Davomiyliklar §11.5 dan olindi.

**Yondashuv:** `shadcn init` ishlatilmadi — u o'z token nomlarini (`--background`,
`--foreground`) `theme.css` ga yozib, bizning §11.2 tizimimiz bilan to'qnashadi.
Komponentlar **Radix primitivlari ustiga** o'z tokenlarimiz bilan yozilyapti. Natija
bir xil (kod bizniki, a11y Radix'dan), lekin token to'qnashuvi yo'q.

> **Dense va 44px ziddiyati qanday yechildi:** §13 jadvalda 32px balandlikni,
> §11.7 esa ≥44px bosish maydonini talab qiladi. `sm` varianti vizual 32px, lekin
> `pointer-coarse:min-h-11` orqali barmoq bilan ishlaganda 44px ga kengayadi.
> Sichqoncha bilan zichlik saqlanadi, sensorli ekranda qoida buzilmaydi.

### 3.3. Arxitektura komponentlari ✅
- [x] `QueryBoundary` (§15) — 4 holatni bitta joyda hal qiladi
- [x] `ErrorBoundary` — bitta komponent, uchta joylashuv (Root / Route / Widget).
      `resetKeys` bilan: boshqa sahifaga o'tilganda fallback yangi sahifada qotib qolmaydi
- [x] `AppShell`: fiksirlangan rail + top bar + siljiydigan kontent. `lg` dan pastda
      rail `Sheet` ga aylanadi — registratura stolidagi planshet haqiqiy qurilma.
      Tab tartibida birinchi element — "asosiy qismga o'tish" havolasi

> **`QueryBoundary` da `error` sloti ixtiyoriy va berilmasa xato qayta otiladi.**
> Uni yutib yuborish §15 dagi butun ErrorBoundary ierarxiyasini ma'nosiz qilardi —
> route va widget darajasidagi chegaralar aynan shuning uchun bor. Yon foydasi:
> `shared/ui` ichida hech qanday tarjima qilinmagan matn hardcode qilinmaydi.

> ⚠️ **Topilgan tuzoq: `import.meta.env.DEV` yolg'iz o'zi yetarli emas.** `sonner`
> modul yuklanganda stil kiritadi, shuning uchun tree-shaking uni o'lik shox ichidan
> ham olib tashlay olmadi va galereya bog'liqliklari production entry chunk'iga
> tushib qoldi (61.5 → 66 kB). Yechim: galereya `lazy()` + ternary orqali chaqiriladi,
> shunda production build'da chunk umuman yaratilmaydi. CI'da grep bilan qulflandi.
- [x] ~~`Can` (§9.2)~~ → **Faza 4 ga ko'chirildi.** `Can` `useCan` orqali
      `entities/session` ga bog'liq, `shared` esa `entities` ni import qila olmaydi
      (§3.3). Faza 1 dagi linter buni bloklaydi. To'g'ri joyi — `entities/session/ui/`

### 3.4. Animatsiya ✅ BAJARILDI
- [x] `shared/lib/motion.ts` — `springs.control` (400/32/0.8, §11.5 aynan), `springs.surface`,
      `durations`, `LIST_STAGGER`, `easeOutApple`
- [x] `useTransition()` — `prefers-reduced-motion` da harakatni nolga tushiradi
- [x] Global CSS floor: reduced-motion'da barcha animatsiya/tranzitsiya to'xtaydi
- [x] ⛔ `transition: all` yo'q — barcha komponentlarda property'lar nomma-nom sanalgan
- [x] `Switch` spring bilan ishlaydi — §11.5 aynan shu komponentni misol qilib keltiradi

### 3.5. `/dev/ui` etalon sahifasi ✅ ISHLAYDI
- [x] Barcha yozilgan komponentlar, barcha variantda, mavzu almashtirgich bilan
- [x] Production bundle'ida **yo'q** (`import.meta.env.DEV` bilan kesiladi — tekshirildi)
- [ ] Faza 4 da haqiqiy route'ga aylanadi (hozircha `pathname` tekshiruvi)

---

## ✅ Faza 3 YAKUNLANDI (2026-08-21)

**Chiqish mezoni — hammasi o'lchandi, aytilmadi:**

| Mezon | Natija |
|---|---|
| `pnpm verify` | yashil · **93 test**, 3 marta ketma-ket barqaror |
| Komponentlar | **32 ta**, 17 ta test fayli |
| Hardcode `#hex` | **0** |
| `transition: all` | **0** |
| `localStorage` / `console.log` / `any` / `@ts-ignore` | **0** |
| Kontrast AA (`check:contrast`) | ikkala mavzuda **barcha juftlar o'tdi** |
| Bundle | **61.54 kB** / 180 kB · CSS **7.12 kB** / 40 kB |
| `/dev/ui` production'da | **yo'q** (CI'da grep bilan qulflangan) |

**Fazadagi asosiy tuzatishlar** (hammasi o'lchov natijasida topilgan, taxmin bilan emas):

1. **§11.2 palitrasi o'z §11.7 talabidan yiqilardi** — 8 ta juft AA dan past edi.
   Aksent ikki rolga ajratildi, `check:contrast` CI'ga ulandi.
2. **`import.meta.env.DEV` yolg'iz o'zi bundle'ni himoya qilmaydi** — `sonner` ning
   import vaqtidagi side-effect'i tufayli dev galereyasi production entry'ga minib
   kelayotgan edi (61.5 → 66 kB). Lazy chunk + CI grep bilan qulflandi.
3. **`DatePicker` beqaror edi** — Radix popover fokusi bilan poyga. `onOpenAutoFocus`
   orqali fokus tortishuv o'rniga ataylab joylashtiriladi.

**Faza 4 uchun ochiq qolgan ikkita ish:**
- `Can` (§9.2) — `entities/session/ui/` da yoziladi, `shared` da emas (qatlam qoidasi)
- `/dev/ui` haqiqiy dev-only route'ga aylanadi, hozircha `pathname` tekshiruvi

---

## Faza 4 — Auth, sessiya, RBAC (36 → 46%) ✅ YAKUNLANDI

### 4.1. Session entity ✅ BAJARILDI (2026-08-21)
- [x] `entities/session/`: `sessionQueries.me()`, `Permission` tipi, `useCan()`, `Can`
- [x] `useSessionStore` (Zustand) — **faqat xotirada**, `persist` yo'q
- [x] Ruxsatlar `Set<Permission>` sifatida `/api/me/` dan. ⛔ rol→ruxsat xaritasi yo'q
- [x] **MSW mock backend** — `/api/me/`, login, logout, klinika almashtirish.
      Testlar haqiqiy `httpClient` orqali o'tadi, stub qilingan `fetch` orqali emas

> 🔌 **Backend ulanish nuqtasi.** Javob Zod bilan **ishga tushirish paytida** tekshiriladi
> (`sessionSchema.ts`). Sabab: generatsiya qilingan tiplar faqat kompilyatsiya vaqtida
> ishlaydi — serializer jimgina `permissions` ni tashlab ketsa, natija bo'sh sidebar
> bo'lardi, ya'ni "bu foydalanuvchiga hech narsa mumkin emas". Endi bu **xato** beradi.
> Test bilan qoplangan: maydon yo'qolishi va ketma-ket ID (`"1"`) rad etiladi.
>
> Tanimagan ruxsat esa **tashlab yuboriladi, rad etilmaydi** — backend yangi ruxsatni
> frontend'dan oldin chiqarishi mumkin, va notanish satr tufayli ilovaning umuman
> yuklanmasligi bilinmagan tugmani yashirishdan yomonroq.

### 4.1b. Nima qilish kerak backend tayyor bo'lganda
1. `pnpm api:generate` (Faza 2.1) — `orval.config.ts` qo'shiladi
2. `sessionSchema.ts` dagi maydon tiplari generatsiya qilinganlariga almashtiriladi,
   **`parse` qoladi**
3. `VITE_USE_MOCKS=false` — `src/shared/api/mocks/` o'chiriladi
4. Boshqa hech narsa: `httpClient`, `queryClient`, store, `Can` o'zgarmaydi

### 4.2. Routing ✅ BAJARILDI (2026-08-21)
- [x] TanStack Router file-based, `autoCodeSplitting` — har route alohida chunk (§8.3)
- [x] `__root.tsx` (route darajasidagi ErrorBoundary), `login.tsx`, `onboarding.tsx`,
      `index.tsx` (→ `/dashboard`), `_auth/dashboard.tsx`
- [x] `_auth.tsx` — guard **bitta joyda** (§8.2)
- [x] `/login?redirect=` faqat **ilova ichidagi yo'l** sifatida validatsiya qilinadi.
      Ixtiyoriy URL qabul qilish ochiq redirect bo'lardi: parol kiritilgan zahoti
      xodimni boshqa saytga uchirib yuborish mumkin edi

### 4.3. Auth feature'lari ✅ BAJARILDI
- [x] `features/auth-login/` — RHF + Zod, server xatosi maydonga qaytadi (§10)
- [x] `features/auth-logout/` — `onSettled` da tozalanadi: so'rov yiqilsa ham
      foydalanuvchi ketishni so'ragan, umumiy stolda keyingi xodim oldingisining
      bemorlarini ko'rmasligi kerak
- [x] `features/clinic-switch/` — 🔴 `qc.clear()`, test bilan isbotlangan

### 4.3b. Uchta haqiqiy nuqson topildi
1. **ky 2 javob tanasini `error.data` ga oldindan o'qiydi** va `response` ni iste'mol
   qiladi, shuning uchun `response.json()` bo'sh qaytardi. Natijada **har qanday server
   validatsiya xatosi jimgina yo'qolardi** va foydalanuvchi "nimadir xato" ko'rardi —
   §10 ning asosiy talabi ishlamas edi.
2. **401 da keshni tozalash o'zini bekor qilardi.** Kesh o'z ichidagi so'rovga javoban
   tozalanganda so'rov `CancelledError` bilan uzilardi, guard esa uni "tizimdan chiqqan"
   deb tanimay xato ekranini ko'rsatardi. Endi 401 da faqat store tozalanadi, kesh esa
   `/login` ga yetib borganda — u yerda hech narsa uchmayapti.
3. **`Field` da majburiylik yulduzchasi ochiq nomga kirib ketardi** ("Parol *").
   Yulduzcha `<label>` dan tashqariga chiqarildi, majburiylik esa `aria-required` bilan.

### 4.4. Idle timer (§13.4) ✅ BAJARILDI (2026-08-22)
- [x] `shared/lib/useIdleTimer` — 12 daq, 1 daq oldin ogohlantirish, passiv listenerlar,
      1s throttle (mousemove sekundiga o'nlab marta ishlaydi)
- [x] `features/session-lock/` — lock store, `LockScreen`, `useUnlock`
- [x] Tugaganda: identifikator saqlanadi → `queryClient.clear()` → qulf ekrani

> **Overlay hech narsani himoya qilmaydi — keshni tozalash himoya qiladi.** Faqat ustiga
> qatlam qo'yilsa, bemor kartochkasi DOM'da qolaveradi: bitta devtools paneli yoki bitta
> skrinshot yetadi. Kesh tozalangach har bir ekran o'z loading holatiga qaytadi va
> ko'radigan narsa qolmaydi. Test aynan shuni tekshiradi.
>
> Qulf ekrani `_auth` layout'idan **oldin** qaytariladi, ustiga qo'yilmaydi — foydalanuvchi
> kira olmaydigan ilovaning klaviatura tuzoqlari yo'lda turmasligi uchun.
>
> `session-lock` `auth-login` dan `useLogin` ni **import qila olmaydi** (cross-slice, §4),
> shuning uchun o'z mutatsiyasi bor. Qayta autentifikatsiya server sessiyasini ham
> yangilaydi — nazoratsiz qolgan ekran uchun bu xavfsizroq.

---

## ✅ Faza 4 YAKUNLANDI (2026-08-22)

| Mezon | Natija |
|---|---|
| `pnpm verify` | yashil · **133 test**, 3 marta ketma-ket barqaror |
| login → dashboard → logout | ✅ integratsiya testi (§16.2 №1) |
| Klinika almashganda eski ma'lumot | ✅ ko'rinmaydi, test bilan isbotlangan (§16.2 №5) |
| Idle timeout | ✅ qulflaydi va keshni tozalaydi (§16.2 №8) |
| Ruxsatsiz rol tugmani ko'rmasligi | ✅ `Can` testlari (§16.2 №6) |
| Bundle | **159.6 kB** / 180 kB |

**Faza 4 da topilgan 4 ta haqiqiy nuqson** (hammasi test yozish jarayonida, taxmin bilan emas):
1. ky 2 `error.data` — har qanday server validatsiya xatosi jimgina yo'qolardi
2. 401 da kesh tozalash o'z so'rovini bekor qilardi → login o'rniga xato ekrani
3. `Field` yulduzchasi ochiq nomga kirardi ("Parol yulduzcha")
4. `EmptyState`/`ErrorState` sarlavhalari `<p>` edi, `<h>` emas

⚠️ **Faza 6 dan oldin `pnpm build:analyze`.** Bironta biznes moduli yozilmasdan turib
159.6/180 kB — atigi **20 kB zaxira**. Entry chunk 144 kB va unda router, zod, motion,
radix bor.

---

## Faza 5 — i18n karkasi (46 → 52%) ✅ YAKUNLANDI (2026-08-22)

- [x] `i18next` + `react-i18next`, 4 lokal (ADR-008), namespace'lar **lazy** (§12.1)
- [x] Har (lokal, namespace) juftligi alohida chunk — build'da 12 ta kichik fayl
- [x] `uz-Latn` va `uz-Cyrl` bir-biriga fallback qilmaydi (`nonExplicitSupportedLngs: false`)
- [x] `shared/lib/datetime.ts` — `Intl` + `CLINIC_TZ`, `clinicDayOf()` bilan
- [x] `pnpm i18n:check` endi haqiqiy ish qilyapti va `verify` ichida
- [x] `features/language-switch/` — har til o'z tilida yozilgan
- [x] Barcha UI matni `t()` orqali; `LoginForm` dagi vaqtinchalik lug'at o'chirildi
- [x] 152 test

> ⚠️ **ICU plagini ishlatilmadi — §12.2 dan ongli chetlanish.**
> §12.2 himoya qilayotgan talab — ruscha ko'plikning uch shakli. i18next'ning o'z
> ko'plik mexanizmi `Intl.PluralRules` ustida ishlaydi va ruschani **to'g'ri** qiladi,
> jumladan odamlar adashadigan holatlarda: 21 = one, 22 = few, 101 = one. Test bilan
> qulflangan.
>
> Plagin yo'li `intl-messageformat` ni talab qiladi — 113 kB ochilgan holda, o'sha
> paytdagi ~20 kB bundle zaxirasiga qarshi. Platforma allaqachon beradigan xatti-harakat
> uchun buni to'lash mantiqsiz. Qaytarish — konfiguratsiya va JSON sintaksisi
> o'zgarishi, qayta yozish emas.

> **`i18n:check` endi ko'plikni til bo'yicha tekshiradi.** Har lokaldan `Intl.PluralRules`
> aytgan shakllar **aynan** talab qilinadi — inglizchada `_few` bo'lishi ham xato, ruschada
> yo'qligi ham. Bu §12.2 dagi haqiqiy xavfni ushlaydi va tekshirib ko'rildi: ruschadan
> `_few` olib tashlansa, skript darhol yiqiladi.

> ⛔ **Til tanlovi brauzerda saqlanmaydi.** §3 brauzer xotirasini taqiqlaydi va
> mexanik guard uni bloklaydi (hatto kommentariyadagi so'zni ham — buni o'z boshimdan
> kechirdim). Til brauzer sozlamasidan o'qiladi va sessiya davomida almashtiriladi;
> xodimning tanlovini eslab qolish uning **user record**iga tegishli — bu backend
> maydoni va aslida to'g'ri joyi ham o'sha.

### 5.2. Bundle: Zod → Valibot (ADR-011)

Faza 5 oxirida o'lchov 174.3/180 kB ni ko'rsatdi — bironta biznes moduli yozilmasdan
turib **5.7 kB zaxira**. Zod initial yo'lda edi, chunki uni ikkita eager modul
ishlatadi: `sessionSchema` va `login.tsx` dagi `validateSearch` (TanStack Router
`autoCodeSplitting` da faqat komponentni ajratadi).

- [x] Valibot'ga o'tildi — API bir xil, `@hookform/resolvers` ikkalasini qo'llaydi
- [x] Uch fayl: `sessionSchema`, `auth-login/model/schema`, `login.tsx`
- [x] `loginSchema` uchun test yozildi — validator almashtirilgani uchun xatti-harakat qulflandi
- [x] `ARCHITECTURE.md` §2.1, §7.3, §10.1, Ilova A va `CLAUDE.md` §10 namunalari yangilandi

| | Initial JS (gzip) | Zaxira |
|---|---|---|
| Zod bilan | 174.3 kB | 5.7 kB |
| Valibot bilan | **160.1 kB** | **19.9 kB** |

> ⚠️ **Men −27 kB deb bashorat qilgandim, haqiqiy yutuq −14.2 kB.** O'sha raqam Zod
> alohida vendor chunk bo'lgan o'lchovdan olingan edi — u yerda har fayl o'z gzip
> lug'ati bilan siqiladi va Zod'ning narxi ikki barobar katta ko'rinadi. Bitta chunk
> ichida marjinal narx ancha kam. Zaxira baribir 3.5 barobar oshdi.

### 5.1. Backend'dan kutiladigan qo'shimcha
- [ ] `/api/me/` da `preferred_language` maydoni — til tanlovini eslab qolish uchun

---

## Faza 5.5 — Backend kontraktiga moslashish ✅ YAKUNLANDI (2026-08-25)

> Rejada yo'q edi. Backend kodi va `https://salomatos.uz` tahlil qilinganda ma'lum bo'ldiki,
> mavjud Django ilovasi hujjatlardagi kontraktdan **arxitektura darajasida** farq qiladi.
> Foydalanuvchi qarori: backend'ni qayta yozmasdan, frontend'ni unga moslashtirish.

### 5.5.1. Nima mos kelmagan

| Hujjat nima deydi | Backend nima qiladi | Yechim |
|---|---|---|
| Session cookie + CSRF | `simplejwt`, token javob tanasida | `ADR-003` qayta ko'rildi |
| Refresh oqimi (mobil uchun) | Refresh route'i **yo'q** | 401 = terminal |
| Logout endpoint | **Yo'q**, token bekor qilinmaydi | Chiqish lokal |
| UUID | `AutoField`, `<int:pk>` | `ADR-013` |
| `/api/me/` → `permissions[]`, `clinics[]`, `id` | 8 ta maydon, ID ham yo'q | `ADR-012` + JWT'dan `user_id` |
| Ko'p klinika + almashtirish | `User.clinic` — bitta FK | `clinic-switch` o'chirildi |
| DRF ning 4 xato shakli | Yagona maxsus konvert | `normalizeDrfError` qayta yozildi |
| `drf-spectacular` / OpenAPI 3 | `drf-yasg` / Swagger 2, `DEBUG` ostida | `ADR-006` qayta ko'rildi |
| `CursorPagination` | `PageNumberPagination`, `PAGE_SIZE=10` | Faza 6 da hisobga olinadi |
| UTC ISO-8601 | Bemor ro'yxatida `"24.08.2026 14:30"` satri | Faza 6 da hisobga olinadi |

### 5.5.2. Bajarilgan ish
- [x] `shared/lib/jwt.ts` — token payload'idan `user_id`. **Tekshirmaydi**, faqat o'qiydi
- [x] `shared/api/tokenStore.ts` — token **faqat RAM'da**. P0 saqlandi
- [x] `httpClient` — `Bearer`, CSRF va `X-Clinic-Id` olib tashlandi
- [x] `errors.ts` — backend konverti; maydon kodlari tarjima kalitiga aylanadi
- [x] `entities/session` — `types`, `sessionSchema`, `permissions.ts`, `store`
- [x] `auth-login` (username), `auth-logout` (lokal), `session-lock` (username bilan unlock)
- [x] `clinic-switch` va `onboarding` route'i o'chirildi — backend'da bunday holat yo'q
- [x] MSW mocklari haqiqiy kontraktni takrorlaydi
- [x] 4 tilda kalitlar: `login.username`, `serverError.*`, 7 ta yangi DRF validatsiya kodi

**Natija:** `pnpm verify` yashil · **160 test** (27 fayl) · bundle **159.87 kB** / 180 kB

### 5.5.3. Ochiq qolgan narsalar

**Frontend tomonda — ikkita ongli narx:**
1. **Sahifa yangilanishi = tizimdan chiqish.** Token xotirada, backend cookie o'rnatmaydi.
   To'g'ri yechim backend tomonda (`httpOnly` cookie).
2. **`?search=` nginx log'iga tushadi.** Backend qidiruvni faqat GET param sifatida
   qabul qiladi. Brauzer URL'iga yozilmaydi (§3 saqlanadi), lekin server log'ida qoladi.
   🔴 **Faza 6.2 dan oldin** nginx `log_format` dan query string olib tashlansin.

**Backend tomonda — frontend hal qila olmaydigan zaifliklar (o'zgarmadi):**
- 🔴 `/api/telegram/*` — `AllowAny`, telefon raqami yoki ketma-ket ID bo'yicha PHI
- 🔴 `DEBUG = True` production'da (`/swagger/` ochiqligi buni isbotlaydi)
- 🔴 IDOR: `get_user`, `get_appointment`, `get_treatment`, `get_recipe`, `get_doctor`,
  `get_galleries` — tenant filtri yo'q
- 🟠 `CORS_ALLOW_ALL_ORIGINS = True` — bir domenga o'tilgach umuman kerak emas
- 🟠 `update_patient` har doim `TypeError` beradi (`get_patient` ga `user` uzatilmagan)

---

## Faza 6 — 🔴 Bemorlar moduli — ETALON (52 → 66%)

> Bu modul **namuna** bo'ladi. Qolgan barcha modullar buni takrorlaydi. Shoshilmang — bu yerdagi har bir qaror 10 marta ko'chiriladi.

> ⚠️ **Faza 5.5 dan keyin o'zgargan shartlar.** Quyidagi punktlar hujjatda yozilganidek
> emas: ID — **butun son**; pagination — **`PageNumberPagination`** (`{count, next,
> previous, results}`), ya'ni `useInfiniteQuery` o'rniga sahifa raqami ham mumkin va
> `count` mavjud; `PatientListSerializer.appointment_date` — **oldindan formatlangan satr**,
> `Intl` bilan qayta formatlab bo'lmaydi (`birth_date` esa normal ISO sana);
> `doctor` — ID'siz **matn**. Yangi endpoint yozishdan oldin `apps/clinic/api/v1/` ga qarang.

### 6.1. `entities/patient/` ✅ BAJARILDI (2026-08-25)
- [x] `model/types.ts` — `PatientListItem` va `Patient` **alohida tiplar**: list va detail
      serializer'lari boshqa shakl, ularni bitta tip qilish "list yubormagan maydonni
      o'qish" degani
- [x] `model/schema.ts` (**Valibot**, `ADR-011`) + mapper
- [x] `api/queries.ts` — `patientKeys` factory + `patientQueries` (§6.1 aynan)
- [x] 🔴 Har bir key ichida `clinicId` — test bilan qulflangan, ikki klinika bir xil
      bemor ID uchun turli key oladi
- [x] `ui/PatientStatusBadge`, `ui/PatientAvatar` — passiv, mutation yo'q
- [x] `index.ts` public API
- [x] `shared/api/pagination.ts` — DRF `PageNumberPagination` konverti (umumiy)
- [x] MSW: `GET /api/patients/`, `GET /api/patients/<id>/` — filtr va pagination bilan
- [x] `patients` i18n namespace × 4 til

> 🗓️ **`appointment_date` oldindan formatlangan satr keladi** (`"24.08.2026 14:30"`).
> Uni shundayligicha ko'rsatish inglizcha yoki ruscha interfeysga `dd.MM.yyyy` sanani
> chiqarardi — §12.4 aynan shuning oldini oladi. Shuning uchun `parseFormattedAppointment`
> qismlarni qayta ajratib oladi va formatlashni UI'ga qoldiradi. Mavjud bo'lmagan kun
> (`31.02.2026`) va vaqt rad etiladi — JavaScript ularni jimgina 3-martga surib yuborardi.

**Natija:** 181 test (30 fayl) · bundle o'zgarmadi (**159.87 kB**) — entity hali bironta
route'ga ulanmagan, shuning uchun initial chunk'ga tushmaydi.

### 6.2. `features/` ✅ BAJARILDI (2026-08-25), bittasidan tashqari
- [x] `patient-create/` — Valibot + RHF + `mode: 'onBlur'` + server xatosi maydonga
- [x] `patient-edit/` — yozildi, lekin **server tomonda yiqiladi** (quyida)
- [ ] ⛔ `patient-archive/` — **backend'da endpoint yo'q.** Yozilmadi (quyida)
- [x] `patient-search/` — 🔴 `useState` + `useDebounce(300)`, **URL'ga yozilmaydi** (PHI)
- [x] `shared/lib/useDebounce.ts` — hujjatda yo'q edi, 6.2 uchun kerak bo'ldi

**Cross-slice muammosi qanday yechildi.** `patient-create` va `patient-edit` bir xil
maydonlarni bir xil serializer'ga yuboradi, lekin §4 bo'yicha ular bir-birini import qila
olmaydi. Takrorlash o'rniga **entity** ga ko'chirildi: `model/formSchema.ts` (yoziladigan
shakl, `toPatientPayload`, `patientFormFieldOf`) va `ui/PatientFormFields.tsx` (mutatsiyasiz,
faqat maydonlar). Har feature faqat o'z mutatsiyasiga egalik qiladi.

> ⛔ **`patient-archive` yozilmadi, chunki chaqiradigan narsa yo'q.**
> `PatientDetailUpdateDeleteView` da faqat `get` va `patch` bor — `delete` metodi yozilmagan
> (view nomida "Delete" bo'lsa ham). `User` modelida arxiv/soft-delete maydoni ham yo'q.
> Ya'ni `patient:archive` ruxsati frontend'da mavjud, lekin uning ortida hech narsa yo'q.
> Endpoint paydo bo'lganda feature ~30 qator bo'ladi: `<Can permission="patient:archive">`
> ostidagi tugma + mutatsiya + `patientKeys.scope` invalidatsiyasi.

> ⚠️ **`patient-edit` haqiqiy serverda 500 beradi.** `update_patient` →
> `get_patient(user_id=...)`, lekin metod `(user_id, user)` talab qiladi → `TypeError`.
> Mijoz tomoni to'g'ri yozilgan va mock ustida test bilan qoplangan; mock kontraktni
> **mo'ljallanganidek** takrorlaydi, chunki nuqsonga qarab kod yozish uni muzlatib qo'yardi.
> Bir qatorlik backend tuzatishi — va aynan o'sha qator yo'qolgan tenant tekshiruvini ham
> tiklaydi.

> 🗓️ **`todayCalendarDate()`, `toISOString().slice(0,10)` emas.** Tug'ilgan sana uchun
> `max` qiymati UTC kunidan olinsa, Toshkentda ertalab soat 5 gacha "kecha" bo'ladi va
> bugun tug'ilgan chaqaloqni rad etardi. §12.4 ning aynan o'zi.

**Natija:** 192 test (33 fayl) · 4 tilda 67 kalit · bundle **159.87 kB** (o'zgarmadi)

### 6.3. `widgets/patient-table/` ✅ BAJARILDI (2026-08-25)
- [x] TanStack Table (headless) + `density="compact"`
- [x] PHI bo'lmagan filtrlar (status, shifokor, sahifa) → URL, **`nuqs` emas** (quyida)
- [x] ~~`useInfiniteQuery` + cursor~~ → `PageNumberPagination` + `placeholderData: keepPreviousData`
- [x] ⛔ `@tanstack/react-virtual` **ishlatilmadi** (quyida)
- [x] Qatorga hover va fokus → `prefetchQuery(detail)`
- [x] 4 holat `QueryBoundary` orqali; bo'sh holat ikki xil — hech bemor yo'q va
      qidiruv hech narsa topmadi. Ikkovi turli harakat taklif qiladi

> **`nuqs` o'rniga router'ning `validateSearch`i.** `ARCHITECTURE.md` §7.3 aynan shu naqshni
> ko'rsatadi va u `login.tsx` da allaqachon ishlaydi — ya'ni bu chetlanish emas, mavjud
> arxitekturaga rioya. ROADMAP 6.3 dagi `nuqs` eslatmasi hujjatlar orasidagi nomuvofiqlik
> edi. Qo'shimcha paket ham, `NuqsAdapter` ham kerak bo'lmadi.

> ⛔ **Virtualizatsiya qilinmadi va "100+ qator" sharti yuzaga kelmaydi.** Server sahifani
> **10 tadan** beradi (`PAGE_SIZE`), ya'ni DOM'ga yuz qator hech qachon tushmaydi.
> `@tanstack/react-virtual` ni qo'shish sodir bo'lmaydigan holat uchun bundle to'lash
> bo'lardi. Sahifa hajmi sozlanadigan qilinsa qayta ko'riladi.

### 6.4. `pages/_auth/patients/` ✅ BAJARILDI (2026-08-25)
- [x] `index.tsx` — ro'yxat, `validateSearch` bilan URL holati
- [x] `$patientId.tsx` — kartochka (butun son param, `ADR-013`)
- [x] Sidebar'dagi "Bemorlar" o'lik `<span>` dan haqiqiy `<Link>` ga aylandi

> 🔴 **URL sxemasida `search` maydoni yo'q va bu qasddan.** Hamkasbga "to'lanmagan
> bemorlar, 2-sahifa" havolasini yuborish mumkin; bemor **ismini** manzil qatoriga
> yozib bo'lmaydi. Test buni qulflaydi: qidiruvdan keyin `window.location.href`
> o'zgarmaganini tekshiradi.

### 6.5. Testlar — qisman
- [x] Unit: sxema, mapper, sana ajratish, telefon formatlash, `useDebounce`
- [x] Komponent (RTL + MSW): forma yuborish, server xatosi maydonga, `Can` gate,
      qidiruv, hover prefetch, bo'sh/xato/yuklanish holatlari
- [ ] ⏸️ E2E: **bloklangan** — Playwright `pnpm build && pnpm preview` ustida ishlaydi,
      production build'da esa MSW yo'q va backend endpointlari hali ishonchsiz (Faza 5.5.3)

---

## 📏 Bundle budjeti o'lchovidagi xato tuzatildi (2026-08-25)

`.size-limit.json` dagi `dist/assets/index-*.js` glob'i **route chunk'larini ham** ushlab
turgan ekan. `pages/_auth/patients/index.tsx` → `assets/index-<hash>.js`, va budjet uni
"initial JS" deb hisobladi: haqiqiy 161 kB o'rniga **177 kB** ko'rsatdi.

Keyingi route qo'shilganda budjet hech kim oshirmagan chegarada "yiqilardi" va sabab
topilmasdi. Tuzatish: `entryFileNames: 'assets/entry-[hash].js'` va budjet endi aynan
entry'ga ishora qiladi.

| | Initial JS (gzip) |
|---|---|
| Faza 6 dan oldin | 159.87 kB |
| Butun bemorlar moduli bilan | **160.56 kB** |

Ya'ni modul boshlang'ich yo'lga **0.69 kB** qo'shdi — qolgani route chunk'larida
(`patients` 16.75 kB, `_auth` 11.83 kB), va bu `autoCodeSplitting` to'g'ri ishlayotganini
ko'rsatadi.

**Natija:** 200 test (34 fayl) · 4 tilda 91 kalit · initial JS **160.56 kB** / 180 kB

### 6.5. Testlar
- [ ] Unit: Zod schema, mapper, telefon formatlash
- [ ] Komponent (RTL + MSW): forma yuborish, server xatosi, `Can` gate
- [ ] E2E: bemor yaratish → ro'yxatda ko'rinishi → tahrirlash

**Chiqish mezoni:** §19 Definition of Done ning **hamma** punkti bajarilgan · URL'da PHI yo'q (qo'lda tekshirilgan) · bu modul boshqa modullar uchun ko'chirma namuna sifatida hujjatlashtirilgan.

---

## Faza 7 — Qolgan biznes modullari (66 → 86%)

Har biri Faza 6 namunasini takrorlaydi: entity → feature → widget → page → test.

| # | Modul | Kun | Alohida e'tibor |
|---|---|---|---|
| 7.1 | **Uchrashuvlar / Kalendar** | 8 | `cachePolicy.live` · optimistic reschedule + rollback (§6.5) · 409 conflict "vaqt band" · vaqt zonasi |
| 7.2 | **Tibbiy yozuvlar + tish sxemasi** | 7 | Eng sezgir PHI · optimistic ⛔ · `useBlocker` saqlanmagan o'zgarishlar |
| 7.3 | **To'lovlar / Billing** | 5 | `cachePolicy.financial` · optimistic ⛔ · pul hisobida float ishlatilmaydi |
| 7.4 | **Xizmatlar va narxlar** | 3 | `cachePolicy.static` · dinamik nom tarjimasi backend'dan (§12.3) |
| 7.5 | **Xodimlar** | 4 | `staff:manage` ruxsati · rol tayinlash |
| 7.6 | **Hisobotlar / Analitika** | 5 | `recharts` **lazy** (§14.2) · ⛔ analytics'ga PHI yubormaslik |
| 7.7 | **Klinika sozlamalari** | 3 | Ish vaqti, kabinetlar, vaqt zonasi |

**Har modul uchun chiqish mezoni:** `pnpm verify` yashil + §19 DoD to'liq + 4 tilda kalitlar + bundle budjeti oshmagan.

---

## Faza 8 — SuperAdmin paneli (86 → 90%)

### 8.1. ~~Bemor portali (`/portal/*`)~~ ⛔ BEKOR QILINDI (2026-08-25)

> **Mahsulot qarori: bemor uchun veb-interfeys bo'lmaydi.** Bemor o'z navbatlari,
> retseptlari va tarixiga **faqat Telegram bot** orqali kiradi. Bu ilova butunlay
> klinika xodimlari uchun.

Bu qaror ishni kamaytiribgina qolmay, **hujum yuzasini ham qisqartiradi**. Bekor qilingan
reja "alohida route daraxti, butunlay boshqa layout" talab qilardi va o'z ogohlantirishi
bilan kelardi: *"xato ruxsat = bemor boshqa bemorni ko'radi"*. Backend'da esa hozir per-view
avtorizatsiya umuman yo'q (§A3), ya'ni o'sha xavf nazariy emas edi. Endi u yo'q.

**Frontend'da bajarildi (2026-08-25):**
- [x] `_auth` guard `role: 'patient'` ni rad etadi, tokenni va keshni tozalab `/login` ga
      qaytaradi va botga yo'naltiruvchi izoh ko'rsatadi
- [x] Ikkita test buni qulflaydi — jumladan "rad etilgan bemor tizimda qolmasligi"
- [x] `permissionsForRole('patient')` bo'sh to'plam — ikkinchi qator himoya

> ⚠️ **Nega guard kerak:** bemor `User` jadvalidagi oddiy qator va **o'sha login
> endpoint'iga** autentifikatsiya qiladi. Backend "bemor kira olmaydi" degan qoidani
> majburlamaydi — `DEFAULT_PERMISSION_CLASSES` faqat `IsAuthenticated`. Ya'ni bu yerda
> frontend guard'i haqiqiy eshikni yopyapti, garchi §9.1 bo'yicha u hamon xavfsizlik
> emas: paroli bor bemor token oladi va API'ga to'g'ridan-to'g'ri murojaat qila oladi.
> **Buni yopish backend ishi.**

### 8.2. SuperAdmin panel — 6 kun
- [ ] Klinikalar ro'yxati, tarif/obuna, platforma sozlamalari
- [ ] ⛔ SuperAdmin ham bemor PHI'siga sukut bo'yicha kira olmaydi — audit log bilan

> ⚠️ Hozirgi backend'da `superadmin` roli **klinika hisobining o'zi** (`User.clinic`
> shunga ishora qiladi), ya'ni "platforma egasi" degan alohida daraja yo'q. Bu panelni
> qurishdan oldin backend'da yangi rol yoki alohida model kerak bo'ladi.

**Chiqish mezoni:** SuperAdmin paneli ishlaydi · bemor roli veb-ilovaga kira olmasligi
test bilan isbotlangan.

---

## Faza 9 — Production hardening (90 → 100%)

### 9.1. Performance (§14.1)
- [ ] Boshlang'ich JS ≤ 180 KB gzip · route chunk ≤ 90 KB · CSS ≤ 40 KB
- [ ] LCP ≤ 2.0s (4G, o'rta Android) · INP ≤ 200ms
- [ ] 1000 qatorli jadval bilan interaksiya ≤ 100ms
- [ ] `size-limit` CI'da bloklaydi

### 9.2. E2E to'liq to'plami (§16.2) — 9 ta stsenariy
1. Login → dashboard → logout
2. Bemor yaratish → ro'yxat → tahrirlash
3. Uchrashuv belgilash → konflikt → xato
4. Uchrashuvni ko'chirish (optimistic + rollback)
5. 🔴 **Klinika almashtirish → eski ma'lumot ko'rinmasligi**
6. Ruxsatsiz rol tugmani ko'rmasligi
7. Til almashtirish
8. Idle timeout → qulflash
9. Tarmoq uzilishi → qayta ulanish

### 9.3. Xavfsizlik auditi
- [ ] Sentry `beforeSend` scrubber (§13.4) — query string, cookie, breadcrumb tozalanadi
- [ ] nginx header'lari (§13.5): CSP, HSTS, `Referrer-Policy: no-referrer`
- [ ] ⛔ CSP'da `unsafe-inline`/`unsafe-eval` script uchun yo'q
- [ ] Media: `X-Accel-Redirect` yoki qisqa muddatli imzolangan URL (§13.7)
- [ ] `dist/` ichida sir yo'qligi CI'da grep bilan
- [ ] `pnpm audit --audit-level=high` toza
- [ ] Butun kod bo'ylab: `localStorage`, `console.log`, `any`, `@ts-ignore` — nol natija

### 9.4. Kirish imkoniyati (a11y)
- [ ] Klaviatura bilan to'liq navigatsiya · screen reader · kontrast AA · 360px

### 9.5. Deploy
- [ ] nginx same-origin konfiguratsiyasi (§1.2)
- [ ] `index.html` hech qachon keshlanmaydi, `/assets/` — 1 yil immutable
- [ ] Staging → smoke test → production
- [ ] Rollback rejasi

**Chiqish mezoni:** barcha budjetlar ichida · 9 ta E2E yashil · xavfsizlik ro'yxati to'liq · production'da ishlayapti.

---

## Doimiy qoidalar (har bir fazada)

1. **`pnpm verify` — bajariladigan buyruq.** Natijasini ko'rmasdan "tekshirdim" deyilmaydi.
2. **Minimal diff.** Tegilmagan kod qayta formatlanmaydi.
3. **Izchillik yangilikdan muhimroq.** Yangi kod yozishdan oldin eng yaqin mavjud namuna o'qiladi.
4. **Har PR §19 Definition of Done bo'yicha tekshiriladi.**
5. **Arxitektura qoidasini buzish kerak bo'lsa** — avval ADR yoziladi, keyin kod.
6. **Yangi dependency** — PR'da sabab yozilishi shart.

---

## Xavflar

| Xavf | Ta'sir | Yumshatish |
|---|---|---|
| Backend schema kechikadi | Faza 2 bloklanadi | MSW mocklari bilan parallel ishlash, `useExamples: true` |
| Faza 3 qisqartiriladi | UI izchilligi yo'qoladi, qayta yozish kerak | Faza 3 chiqish mezonini qattiq ushlash |
| Backend `clinic` bo'yicha filtrlashni unutadi | 🔴 Ma'lumot sizishi | Har endpoint uchun backend'da tekshiruv tasdiqlansin |
| Bundle budjeti oshadi | Sekin ilova, PR bloklanadi | `size-limit` CI'da har PR'da |
| Tarjimalar kechikadi | Modul yakunlanmaydi | `i18n:check` CI'da majburlaydi |
| Vaqt zonasi xatosi | Uchrashuv 1 soatga suriladi | Faqat `Intl.DateTimeFormat` + `CLINIC_TZ`, unit test |

---

## Keyingi qadam

**Faza 0.1** — hook yo'llarini tuzatish va untracked fayllarni commit qilish. Bu 15 daqiqalik ish va butun sifat mashinasini yoqadi.

Undan keyin **Faza 0.2** dagi 5 ta bloklovchi savolga javob kerak — ayniqsa auth strategiyasi (`ADR-003`), chunki `httpClient` butunlay shunga bog'liq.
