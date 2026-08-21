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
| 3 | 🔴 Dizayn tizimi | 22 → 36 | 10 |
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

### 0.2. 🔴 Bloklovchi qarorlar — bularsiz kod boshlanmaydi

| # | Savol | Nega bloklovchi | Qayerda hal bo'ladi |
|---|---|---|---|
| 1 | **Auth: Django session vs JWT httpOnly cookie?** | `httpClient` ning `afterResponse` refresh mantiqi butunlay shunga bog'liq | `ADR-003` yopilsin |
| 2 | **4-til qaysi?** (`uz-Latn`, `ru`, `en` + `uz-Cyrl` yoki `kaa`) | i18n papka strukturasi va ICU sozlamalari | Biznes qarori |
| 3 | **Real-time: Django Channels yoki 30s polling?** | Polling bilan boshlash mumkin, lekin backend rejasiga ta'sir qiladi | `cachePolicy.live` dan boshlash tavsiya |
| 4 | **Klinika vaqt zonasi bittami?** | `CLINIC_TZ` konstantami yoki klinika sozlamasidanmi | Hozircha `Asia/Tashkent` konstanta |
| 5 | **Biometrik ma'lumot (rentgen) qayerda saqlanadi?** | §13.9 huquqiy talab, media strategiyasi | Yurist bilan |

### 0.3. Backend kontrakti (frontend uchun old shart)
- [ ] `drf-spectacular` ishlaydi, `/api/schema/` valid OpenAPI 3 qaytaradi
- [ ] Barcha ID — `UUID`
- [ ] Sana/vaqt — UTC ISO-8601
- [ ] Katta ro'yxatlar — `CursorPagination`
- [ ] Har javobda `X-Request-Id`
- [ ] `/api/me/` → user + `permissions[]` + `clinics[]`
- [ ] Xato matnida PHI yo'q

**Chiqish mezoni:** `curl localhost:8000/api/schema/` valid schema beradi · hook'lar `.claude/hooks/` da va ishlayapti · 5 ta qaror yozib qo'yilgan.

---

## Faza 1 — Skelet va CI (4 → 14%)

Bironta biznes kodisiz, lekin butun sifat mashinasi ishlab turadi.

### 1.1. Loyiha yaratish
```bash
pnpm create vite@latest salomatos-web -- --template react-ts
```
- [ ] `ARCHITECTURE.md` Ilova A dagi barcha paketlar o'rnatiladi
- [ ] `pnpm config set ignore-scripts true` (§13.8 supply chain)

### 1.2. TypeScript strict
- [ ] §17.4 dagi **barcha** flaglar: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- [ ] `@/*` → `src/*` path alias (tsconfig + vite)

### 1.3. Papka strukturasi
- [ ] §3.1 dagi 6 qatlam bo'sh holda yaratiladi, har birida `index.ts`
- [ ] `eslint-plugin-boundaries` sozlanadi (§3.3 dagi konfiguratsiya aynan)
- [ ] Biome sozlanadi: lint + format
- [ ] **Tekshiruv:** `entities` dan `features` ga import yozib ko'r → lint qizil bo'lishi shart

### 1.4. Skriptlar
- [ ] `verify`, `api:generate`, `api:check`, `i18n:check`, `test`, `test:e2e`, `build:analyze`, `size-limit`

### 1.5. CI (§17.3) va pre-commit (§17.2)
- [ ] GitHub Actions: install → biome → tsc → api:check → i18n:check → test → build → size-limit → audit → secret grep
- [ ] Husky + lint-staged
- [ ] `main` branch himoyalanadi: PR + 1 approve + yashil CI

**Chiqish mezoni:** `pnpm verify` yashil · qasddan yozilgan qatlam buzilishi CI'ni qizil qiladi · bo'sh `dist/` build bo'ladi.

---

## Faza 2 — API qatlami (14 → 22%)

### 2.1. Orval
- [ ] `orval.config.ts` (§5.1 aynan) · `pnpm api:generate` ishlaydi
- [ ] `src/shared/api/generated/` git'ga kiradi, lekin **qo'lda tahrirlanmaydi** (hook himoyalaydi)
- [ ] MSW mock generatsiyasi yoqiladi (`mock: { type: 'msw', useExamples: true }`)

### 2.2. HTTP klient (§5.2)
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

## Faza 3 — 🔴 Dizayn tizimi (22 → 36%)

> **Bu fazani o'tkazib yubormang yoki qisqartirmang.** Modullardan keyin qurilsa, har modulda tugmalar boshqacha bo'ladi va "Apple-style" hech qachon chiqmaydi. Refaktoring narxi = butun UI'ni qayta yozish.

### 3.1. Tokenlar
- [ ] `app/styles/theme.css` — Tailwind v4 `@theme` bloki (§11)
- [ ] Rang, spacing (`4, 8, 12, 16, 24, 32, 48, 64`), radius, typography, `--ease-out-apple`
- [ ] Light/dark rejim
- [ ] `@tailwindcss/vite` plugin (PostCSS emas)

### 3.2. Asosiy komponentlar (`shared/ui/`)
shadcn/ui dan nusxalanadi va tokenlarга moslanadi:

| Guruh | Komponentlar |
|---|---|
| Forma | `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `DatePicker`, `PhoneInput` |
| Layout | `Card`, `Separator`, `Tabs`, `Sheet`, `Dialog`, `Popover`, `DropdownMenu`, `Tooltip` |
| Ma'lumot | `Table`, `Badge`, `Avatar`, `Skeleton`, `Pagination` |
| Fikr-mulohaza | `Toast` (sonner), `Alert`, `EmptyState`, `ErrorState` |
| Navigatsiya | `Breadcrumb`, `CommandPalette` (cmdk) |

- [ ] **Har birida `size="sm"` (dense) varianti** — §13 ma'lumot zichligi talabi
- [ ] Har birida: klaviatura navigatsiyasi, `:focus-visible`, ≥44px bosish maydoni

### 3.3. Arxitektura komponentlari
- [ ] `QueryBoundary` (§15) — 4 holatni bitta joyda hal qiladi
- [ ] `ErrorBoundary` 3 darajada: Root / Route / Widget
- [ ] `Can` (§9.2) — ruxsat gate
- [ ] `AppShell`: sidebar + header + content

### 3.4. Animatsiya
- [ ] `motion` sozlanadi: `spring({ stiffness: 400, damping: 32 })`
- [ ] `useReducedMotion()` — har bir animatsiyada majburiy
- [ ] ⛔ `transition: all` yo'q

### 3.5. `/dev/ui` etalon sahifasi
- [ ] Barcha komponentlar barcha variantlarda ko'rinadigan route (faqat dev build'da)

**Chiqish mezoni:** `/dev/ui` da har bir komponent bor · hech qayerda hardcode `#hex` yo'q · 360px da buzilmaydi · klaviatura bilan butun sahifani aylanib chiqish mumkin · kontrast AA.

---

## Faza 4 — Auth, sessiya, RBAC (36 → 46%)

### 4.1. Session entity
- [ ] `entities/session/`: `sessionQueries.me()`, `Permission` tipi, `useCan()`
- [ ] `useSessionStore` (Zustand) — **faqat xotirada**, persist yo'q
- [ ] Ruxsatlar `Set<Permission>` sifatida `/api/me/` dan. ⛔ rol→ruxsat xaritasi hardcode qilinmaydi

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
