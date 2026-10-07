import { useTranslation } from 'react-i18next'
import { formatDate } from '@/shared/lib/datetime'
import { Dialog, EmptyState } from '@/shared/ui'
import type { PatientGalleryImage } from '../model/types'

export interface PatientGalleryProps {
  images: readonly PatientGalleryImage[]
}

/**
 * Read-only — there is no upload endpoint yet, only `GalleryList` on the
 * patient detail response. A thumbnail grid rather than a carousel: staff are
 * scanning for one photo among many, not paging through a sequence.
 */
export function PatientGallery({ images }: PatientGalleryProps) {
  const { t, i18n } = useTranslation('patients')

  if (images.length === 0) {
    return (
      <EmptyState
        description={t('detail.galleryEmptyDescription')}
        title={t('detail.galleryEmpty')}
      />
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((image) =>
        image.imageUrl === null ? null : (
          <li key={image.id}>
            <Dialog
              title={
                image.createdAt === null
                  ? t('detail.galleryImage')
                  : formatDate(image.createdAt, { locale: i18n.language })
              }
              trigger={
                <button
                  className="block aspect-square w-full overflow-hidden rounded-card border border-border transition-opacity duration-150 ease-out-apple hover:opacity-90"
                  type="button"
                >
                  <img
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    src={image.imageUrl}
                  />
                </button>
              }
            >
              <img
                alt=""
                className="max-h-[70vh] w-full rounded-control object-contain"
                src={image.imageUrl}
              />
            </Dialog>
          </li>
        ),
      )}
    </ul>
  )
}
