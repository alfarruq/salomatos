import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/shared/lib/cn'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  /** Full name. Used for the initials and as the image's alt text. */
  name: string
  /**
   * ⛔ A patient photograph is likely biometric data under §13.9 and must come
   * from a permission-checked media URL (§13.7), never a public /media/ path.
   */
  src?: string
  size?: AvatarSize
  className?: string
}

const sizes: Record<AvatarSize, string> = {
  sm: 'size-6 text-caption',
  md: 'size-8 text-callout',
  lg: 'size-12 text-body',
}

/**
 * Takes the first letter of the first two words. Works for "Vali Aliyev" and
 * degrades sensibly for a single name, rather than assuming a Western
 * first/last split.
 */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-sunken font-medium text-text-secondary select-none',
        sizes[size],
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image alt={name} className="size-full object-cover" src={src} />
      ) : null}

      {/*
       * The delay avoids a flash of initials over a photo that loads fine — but
       * only when there is a photo. Radix treats any `delayMs`, including 0, as
       * "start hidden", so passing it with no image would leave the avatar
       * blank for a tick.
       */}
      <AvatarPrimitive.Fallback {...(src === undefined ? {} : { delayMs: 300 })}>
        {initialsOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
