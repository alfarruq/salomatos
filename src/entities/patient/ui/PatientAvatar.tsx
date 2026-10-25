import { Avatar, type AvatarSize, type AvatarTone } from '@/shared/ui'

export interface PatientAvatarProps {
  name: string
  /**
   * Relative media path from the serializer (`/media/images/...`), not an
   * absolute URL. Same-origin (§1.2), so the browser resolves it as-is.
   */
  imageUrl?: string | null
  size?: AvatarSize
  className?: string
}

/**
 * Picks one of the six fills from the name, so a patient keeps the same
 * colour on every screen and every visit rather than a new one per render.
 */
function toneOf(name: string): AvatarTone {
  let hash = 0
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003
  return ((hash % 6) + 1) as AvatarTone
}

/**
 * A patient's avatar, falling back to their initials.
 *
 * Thin on purpose. It exists so that when patient photos need a different
 * treatment — a signed URL, a placeholder for minors, a privacy setting — there
 * is one place to change rather than every table and card that shows a face.
 */
export function PatientAvatar({ name, imageUrl, size = 'md', className }: PatientAvatarProps) {
  return (
    <Avatar
      name={name}
      size={size}
      tone={toneOf(name)}
      {...(imageUrl ? { src: imageUrl } : {})}
      {...(className === undefined ? {} : { className })}
    />
  )
}
