import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { THEME_PREFERENCES, type ThemePreference, useThemeStore } from '@/shared/lib/theme'
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '@/shared/ui'

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const satisfies Record<
  ThemePreference,
  unknown
>

export function ThemeSwitcher() {
  const { t } = useTranslation('common')
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const CurrentIcon = ICONS[preference]

  return (
    <DropdownMenu
      trigger={
        <Button
          aria-label={t('theme.change')}
          iconLeft={<CurrentIcon aria-hidden="true" className="size-4" />}
          size="sm"
          variant="ghost"
        />
      }
    >
      <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option]
        return (
          <DropdownMenuItem
            iconLeft={<Icon aria-hidden="true" className="size-4" />}
            key={option}
            onSelect={() => setPreference(option)}
          >
            <span className="flex-1">{t(`theme.${option}`)}</span>
            {/* Not colour alone: the current choice carries a mark. */}
            {option === preference ? (
              <Check aria-label={t('theme.current')} className="size-4 text-accent-text" />
            ) : null}
          </DropdownMenuItem>
        )
      })}
    </DropdownMenu>
  )
}
