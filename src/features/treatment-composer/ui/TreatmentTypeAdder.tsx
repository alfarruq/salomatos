import { useTranslation } from 'react-i18next'
import type { TreatmentType } from '@/entities/treatment-type'
import { Field, Select } from '@/shared/ui'

export interface TreatmentTypeAdderProps {
  treatmentTypes: TreatmentType[]
  onAdd: (treatmentType: TreatmentType) => void
}

/**
 * `ToothPicker`'s counterpart for a non-dental doctor: no chart, only that
 * doctor's own treatment types. Pinned to its placeholder (`value=""`), so
 * picking the same type twice adds a second row instead of reading as a no-op.
 */
export function TreatmentTypeAdder({ treatmentTypes, onAdd }: TreatmentTypeAdderProps) {
  const { t } = useTranslation('treatments')

  return (
    <Field label={t('composer.addTreatmentLabel')}>
      <Select
        onValueChange={(value) => {
          const type = treatmentTypes.find((candidate) => String(candidate.id) === value)
          if (type !== undefined) onAdd(type)
        }}
        options={treatmentTypes.map((type) => ({ value: String(type.id), label: type.name }))}
        placeholder={t('composer.treatmentTypePlaceholder')}
        value=""
      />
    </Field>
  )
}
