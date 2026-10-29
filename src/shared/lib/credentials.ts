import * as v from 'valibot'

/**
 * Login rules for the staff accounts the clinic creates (doctors, admins).
 *
 * Shared because both entities write to the same `User.username` column and
 * an entity may not import another (§4).
 */

/** Django's own username alphabet, so a login typed here is one the server can match. */
const USERNAME = /^[\w.@+-]+$/

/**
 * The server has no password rules of its own (`set_password` without
 * `validate_password`), so this floor is the only one there is.
 */
const minPasswordLength = 8

export const usernameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(3, 'validation.tooShort'),
  v.regex(USERNAME, 'validation.username'),
)

/** Required: a new account cannot sign in without one. */
export const passwordSchema = v.pipe(
  v.string(),
  v.minLength(minPasswordLength, 'validation.passwordTooShort'),
)

/** For edits, where empty means "keep the current password". */
export const optionalPasswordSchema = v.pipe(
  v.string(),
  v.check(
    (value) => value === '' || value.length >= minPasswordLength,
    'validation.passwordTooShort',
  ),
)
