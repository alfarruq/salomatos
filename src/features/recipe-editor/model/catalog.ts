import type { DoseForm, DurationUnit, Frequency, MealRelation } from '@/entities/recipe'

/**
 * Frontend-only reference data: the medicines a dental clinic prescribes most,
 * each with defaults that fill a whole row on pick, so the common case needs
 * no further typing. Not a formulary — the doctor can override every field,
 * and can write a name that is not listed here at all.
 *
 * Names are trade names and stay untranslated; only categories are labelled
 * through i18n (`recipes:category.*`).
 */
export const MEDICATION_CATEGORIES = ['antibiotic', 'analgesic', 'topical', 'other'] as const
export type MedicationCategory = (typeof MEDICATION_CATEGORIES)[number]

export interface CatalogMedicine {
  name: string
  category: MedicationCategory
  form: DoseForm
  dose: number
  frequency: Frequency
  durationAmount: number
  durationUnit: DurationUnit
  meal: MealRelation
  /** Ignored unless `meal` is before/after. */
  minutes: number
}

type Defaults = Omit<CatalogMedicine, 'name' | 'category'>

function entries(category: MedicationCategory, list: [string, Defaults][]): CatalogMedicine[] {
  return list.map(([name, defaults]) => ({ name, category, ...defaults }))
}

const days = (durationAmount: number) => ({ durationAmount, durationUnit: 'days' as const })
const weeks = (durationAmount: number) => ({ durationAmount, durationUnit: 'weeks' as const })

export const MEDICATION_CATALOG: readonly CatalogMedicine[] = [
  ...entries('antibiotic', [
    [
      'Amoksiklav 625 mg',
      { form: 'tablet', dose: 1, frequency: 'bid', ...days(5), meal: 'after', minutes: 30 },
    ],
    [
      'Amoksitsillin 500 mg',
      { form: 'capsule', dose: 1, frequency: 'tid', ...days(7), meal: 'after', minutes: 0 },
    ],
    [
      'Azitromitsin 500 mg',
      { form: 'tablet', dose: 1, frequency: 'od', ...days(3), meal: 'before', minutes: 60 },
    ],
    [
      'Metronidazol 250 mg',
      { form: 'tablet', dose: 1, frequency: 'tid', ...days(7), meal: 'after', minutes: 0 },
    ],
    [
      'Tsiprofloksatsin 500 mg',
      { form: 'tablet', dose: 1, frequency: 'bid', ...days(5), meal: 'none', minutes: 0 },
    ],
    [
      'Doksitsiklin 100 mg',
      { form: 'capsule', dose: 1, frequency: 'bid', ...days(7), meal: 'after', minutes: 0 },
    ],
    [
      'Linkomitsin 250 mg',
      { form: 'capsule', dose: 2, frequency: 'tid', ...days(7), meal: 'before', minutes: 60 },
    ],
  ]),
  ...entries('analgesic', [
    [
      'Nimesil 100 mg',
      { form: 'sachet', dose: 1, frequency: 'bid', ...days(5), meal: 'after', minutes: 0 },
    ],
    [
      'Ibuprofen 400 mg',
      { form: 'tablet', dose: 1, frequency: 'tid', ...days(3), meal: 'after', minutes: 0 },
    ],
    [
      'Ketorol 10 mg',
      { form: 'tablet', dose: 1, frequency: 'prn', ...days(3), meal: 'after', minutes: 0 },
    ],
    [
      'Deksalgin 25 mg',
      { form: 'tablet', dose: 1, frequency: 'tid', ...days(3), meal: 'before', minutes: 30 },
    ],
    [
      'Ketonal 100 mg',
      { form: 'capsule', dose: 1, frequency: 'bid', ...days(3), meal: 'after', minutes: 0 },
    ],
    [
      'Paratsetamol 500 mg',
      { form: 'tablet', dose: 1, frequency: 'prn', ...days(3), meal: 'after', minutes: 0 },
    ],
    [
      'Diklofenak 50 mg',
      { form: 'tablet', dose: 1, frequency: 'bid', ...days(5), meal: 'after', minutes: 0 },
    ],
    [
      'Analgin 500 mg',
      { form: 'tablet', dose: 1, frequency: 'prn', ...days(3), meal: 'after', minutes: 0 },
    ],
  ]),
  ...entries('topical', [
    [
      'Xlorgeksidin 0,05%',
      { form: 'rinse', dose: 1, frequency: 'tid', ...days(7), meal: 'after', minutes: 30 },
    ],
    [
      'Miramistin 0,01%',
      { form: 'rinse', dose: 1, frequency: 'tid', ...days(7), meal: 'after', minutes: 30 },
    ],
    [
      'Xolisal gel',
      { form: 'gel', dose: 1, frequency: 'tid', ...days(7), meal: 'none', minutes: 0 },
    ],
    [
      'Metrogil Denta',
      { form: 'gel', dose: 1, frequency: 'bid', ...days(7), meal: 'after', minutes: 0 },
    ],
    [
      'Kamistad gel',
      { form: 'gel', dose: 1, frequency: 'tid', ...days(7), meal: 'none', minutes: 0 },
    ],
    [
      'Solkoseril dental pasta',
      { form: 'gel', dose: 1, frequency: 'tid', ...days(7), meal: 'none', minutes: 0 },
    ],
    [
      'Tantum Verde',
      { form: 'spray', dose: 4, frequency: 'tid', ...days(7), meal: 'none', minutes: 0 },
    ],
    [
      'Stomatidin',
      { form: 'rinse', dose: 1, frequency: 'bid', ...days(5), meal: 'after', minutes: 30 },
    ],
    [
      'Furatsilin',
      { form: 'rinse', dose: 1, frequency: 'tid', ...days(5), meal: 'after', minutes: 30 },
    ],
    [
      'Rotokan',
      { form: 'rinse', dose: 1, frequency: 'tid', ...days(7), meal: 'after', minutes: 30 },
    ],
  ]),
  ...entries('other', [
    [
      'Suprastin 25 mg',
      { form: 'tablet', dose: 1, frequency: 'bid', ...days(5), meal: 'with', minutes: 0 },
    ],
    [
      'Loratadin 10 mg',
      { form: 'tablet', dose: 1, frequency: 'od', ...days(5), meal: 'none', minutes: 0 },
    ],
    [
      'Setirizin 10 mg',
      { form: 'tablet', dose: 1, frequency: 'od', ...days(5), meal: 'none', minutes: 0 },
    ],
    [
      'Deksametazon 4 mg',
      { form: 'injection', dose: 1, frequency: 'od', ...days(3), meal: 'none', minutes: 0 },
    ],
    [
      'Askorutin',
      { form: 'tablet', dose: 1, frequency: 'tid', ...weeks(2), meal: 'after', minutes: 0 },
    ],
    [
      'Kaltsiy D3',
      { form: 'tablet', dose: 1, frequency: 'bid', ...weeks(4), meal: 'with', minutes: 0 },
    ],
  ]),
]
