import type { ReactNode } from 'react'
import { useCan } from '../model/store'
import type { Permission } from '../model/types'

export interface CanProps {
  permission: Permission
  /** Shown instead. Usually nothing — an explanation of a missing button rarely helps. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Hides a control the user has no permission to use.
 *
 * ⚠️ This is UX, not security (§9.1). Anyone can delete the element in DevTools;
 * what stops them is `permission_classes` on the ViewSet and the
 * `filter(clinic=...)` at the start of every queryset. Adding a `<Can>` around a
 * button is never a substitute for checking that the endpoint refuses.
 *
 * §9.2 places this in `shared/ui`, but it reads the session store in
 * `entities/session`, and `shared` may not import upwards (§3.3). It lives with
 * the data it depends on instead — the boundaries linter enforces that.
 */
export function Can({ permission, fallback = null, children }: CanProps) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>
}
