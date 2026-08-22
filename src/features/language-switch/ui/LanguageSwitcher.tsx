import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isLocale, LOCALE_LABELS, LOCALES } from '@/shared/i18n'
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '@/shared/ui'

/**
 * Each language is written in itself — someone looking for Русский is not
 * helped by seeing "Rus tili" in a language they cannot read.
 *
 * The choice lasts for the session only. Remembering it belongs on the user's
 * record: §3 rules out browser storage, and a shared reception desk is exactly
 * where a per-machine preference would be wrong anyway.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common')
  const current = isLocale(i18n.language) ? i18n.language : null

  return (
    <DropdownMenu
      trigger={
        <Button
          aria-label={t('language.change')}
          iconLeft={<Languages aria-hidden="true" className="size-4" />}
          size="sm"
          variant="ghost"
        >
          {current === null ? t('language.label') : LOCALE_LABELS[current]}
        </Button>
      }
    >
      <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
      {LOCALES.map((locale) => (
        <DropdownMenuItem key={locale} onSelect={() => void i18n.changeLanguage(locale)}>
          {LOCALE_LABELS[locale]}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  )
}
