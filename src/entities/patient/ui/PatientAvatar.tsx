import { Avatar, type AvatarSize } from '@/shared/ui'

export interface PatientAvatarProps {
  name: string
  /**
   * Relative media path from the serializer (`/media/images/...`), not an
   * absolute URL. Same-origin (§1.2), so the browser resolves it as-is.
   */
  imageUrl?: string | null
  size?: AvatarSize
}

/**
 * A patient's avatar, falling back to their initials.
 *
 * Thin on purpose. It exists so that when patient photos need a different
 * treatment — a signed URL, a placeholder for minors, a privacy setting — there
 * is one place to change rather than every table and card that shows a face.
 */
export function PatientAvatar({ name, imageUrl, size = 'md' }: PatientAvatarProps) {
  return <Avatar name={name} size={size} {...(imageUrl ? { src: imageUrl } : {})} />
}
