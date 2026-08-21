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
| 4 | Auth, sessiya, RBAC | 36 → 46 | 6 |
| 5 | i18n karkasi | 46 → 52 | 3 |
| 6 | 🔴 Bemorlar moduli (etalon) | 52 → 66 | 9 |
| 7 | Qolgan biznes modullari | 66 → 86 | 30 |
| 8 | Bemor portali + SuperAdmin | 86 → 94 | 12 |
| 9 | Production hardening | 94 → 100 | 8 |
|  | **Jami** |  | **~89 kun (≈4.5 oy)** |

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

### 2.1. Orval
- [ ] `orval.config.ts` (§5.1 aynan) · `pnpm api:generate` ishlaydi
- [ ] `src/shared/api/generated/` git'ga kiradi, lekin **qo'lda tahrirlanmaydi** (hook himoyalaydi)
- [ ] MSW mock generatsiyasi yoqiladi (`mock: { type: 'msw', useExamples: true }`)

> ✅ **2.2–2.5 bajarildi (2026-08-21), 2.1 backend'ni kutmoqda.** Schema faqat
> **tiplar** generatsiyasi uchun kerak — `httpClient`, xato normalizatsiyasi va kesh
> siyosati unga bog'liq emas, shuning uchun ular yozib qo'yildi va MSW mock backend'i
> bilan sinaldi. Backend tayyor bo'lganda `orval.config.ts` qo'shiladi va
> `src/shared/api/mocks/` o'chiriladi — boshqa hech qayerga tegilmaydi.

### 2.2. HTTP klient (§5.2) ✅
- [ ] `ky` instance: `prefixUrl: '/api'`, `credentials: 'same-origin'`, timeout 20s
- [ ] Retry: faqat GET, `[408, 429, 500, 502, 503, 504]`
- [ ] `beforeRequest`: CSRF token + `X-Clinic-Id` header
- [ ] `afterResponse`: 401 → **bitta** refresh promise (parallel 401'lar uchun) → retry yoki `hardLogout()`

### 2.3. Xato normalizatsiyasi (§5.3)
- [ ] `ApiError` klassi: `kind`, `fieldErrors`, `detail`, `requestId`
- [ ] `normalizeDrfError()` — DRF ning 4 xil xato shakli
- [ ] **Unit test:** har 4 shakl to'g'ri parse bo'ladi
- [ ] ⛔ `ApiError` ichida PHI bo'lmasligi tekshiriladi

### 2.4. Kesh siyosati (§6.3)
- [ ] `shared/config/cache.ts`: `static` / `standard` / `live` / `never`
- [ ] **`financial` policy qo'shilsin** — `CLAUDE.md` §10 uni tilga oladi, `ARCHITECTURE.md` §6.3 da yo'q. Nomuvofiqlikni yoping.
- [ ] `queryClient` (§6.4): retry mantiqi, `throwOnError`, `mutations.retry: false`
- [ ] ⛔ `persistQueryClient` ishlatilmaydi

### 2.5. Vite proxy
- [ ] Dev'da `/api` → `localhost:8000` proxy (prod'da nginx qiladi)

**Chiqish mezoni:** `pnpm api:generate` tiplar chiqaradi · `api:check` CI'da ishlaydi · 401 refresh oqimi test bilan qoplangan.

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

## Faza 4 — Auth, sessiya, RBAC (36 → 46%)

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

### 4.2. Routing
- [ ] TanStack Router file-based sozlash, `@tanstack/router-plugin`
- [ ] `pages/__root.tsx`, `pages/login.tsx`
- [ ] `pages/_auth.tsx` — guard **bitta joyda** (§8.2): sessiya yo'q → `/login`, klinika yo'q → `/onboarding`
- [ ] `manualChunks` (§8.3)

### 4.3. Auth feature'lari
- [ ] `features/auth-login/` — forma + server xatosi maydonga qaytadi
- [ ] `features/auth-logout/` — server blacklist + **`queryClient.clear()`**
- [ ] `features/clinic-switch/` — 🔴 `qc.clear()` majburiy (§6.2), aks holda ma'lumot sizadi

### 4.4. Idle timer (§13.4)
- [ ] `useIdleTimer`: 12 daq timeout, 1 daq oldin ogohlantirish
- [ ] Tugaganda: ekran qulflanadi → ma'lumot yashiriladi → parol so'raladi → `queryClient.clear()`

**Chiqish mezoni:** login→dashboard→logout ishlaydi · klinika almashganda eski ma'lumot ko'rinmaydi (test bilan isbotlangan) · idle timeout ishlaydi.

---

## Faza 5 — i18n karkasi (46 → 52%)

- [ ] `i18next` + `react-i18next` + `i18next-icu`
- [ ] 4 til, namespace'lar modul bo'yicha, **lazy** yuklanadi (§12.1)
- [ ] Rus ko'pligi ICU orqali — `{count, plural, one{} few{} other{}}`
- [ ] `uz-Latn` va `uz-Cyrl` — ikkita alohida lokal, avtomatik transliteratsiya emas
- [ ] `shared/lib/datetime.ts` — `Intl.DateTimeFormat` + `timeZone: CLINIC_TZ`
- [ ] `pnpm i18n:check` skripti + CI'ga ulanadi
- [ ] Til almashtirgich komponenti
- [ ] Tolgee/Crowdin ulanishi (ixtiyoriy, keyinroq)

**Chiqish mezoni:** `i18n:check` yashil · til almashganda sana formati ham o'zgaradi · rus ko'pligi 1/3/7 da to'g'ri.

---

## Faza 6 — 🔴 Bemorlar moduli — ETALON (52 → 66%)

> Bu modul **namuna** bo'ladi. Qolgan barcha modullar buni takrorlaydi. Shoshilmang — bu yerdagi har bir qaror 10 marta ko'chiriladi.

### 6.1. `entities/patient/`
- [ ] `model/types.ts`, `model/schema.ts` (Zod)
- [ ] `api/queries.ts` — `patientKeys` factory + `patientQueries` (§6.1 aynan)
- [ ] 🔴 Har bir key ichida `clinicId`
- [ ] `ui/PatientStatusBadge`, `ui/PatientAvatar` — passiv, mutation yo'q
- [ ] `index.ts` public API

### 6.2. `features/`
- [ ] `patient-create/` — Zod schema + RHF + `mode: 'onBlur'` + server xatosi maydonga
- [ ] `patient-edit/`
- [ ] `patient-archive/` — `<Can permission="patient:archive">` ostida
- [ ] `patient-search/` — 🔴 `useState` + `useDebounce(300)`, **URL'ga yozilmaydi** (PHI)

### 6.3. `widgets/patient-table/`
- [ ] TanStack Table (headless) + `size="sm"` dense
- [ ] PHI bo'lmagan filtrlar (sana, status, sahifa, sort) → URL (`nuqs`)
- [ ] `useInfiniteQuery` + cursor pagination
- [ ] 100+ qator → `@tanstack/react-virtual`
- [ ] Qatorga hover → `prefetchQuery(detail)`

### 6.4. `pages/_auth/patients/`
- [ ] `index.tsx` — ro'yxat, `QueryBoundary` bilan 4 holat
- [ ] `$patientId.tsx` — kartochka (UUID param)

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

## Faza 8 — Bemor portali va SuperAdmin (86 → 94%)

### 8.1. Bemor portali (`/portal/*`) — 6 kun
> 🔴 **Alohida route daraxti, butunlay boshqa layout.** Admin panel bilan aralashtirmaslik — xato ruxsat = bemor boshqa bemorni ko'radi (§9.3).
- [ ] O'z navbatlari, tarixi, hujjatlari
- [ ] Online yozilish
- [ ] Mobil-birinchi dizayn

### 8.2. SuperAdmin panel — 6 kun
- [ ] Klinikalar ro'yxati, tarif/obuna, platforma sozlamalari
- [ ] ⛔ SuperAdmin ham bemor PHI'siga sukut bo'yicha kira olmaydi — audit log bilan

**Chiqish mezoni:** bemor boshqa bemorning ma'lumotini ko'ra olmasligi E2E test bilan isbotlangan.

---

## Faza 9 — Production hardening (94 → 100%)

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
