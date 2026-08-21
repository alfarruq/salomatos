import { createContext, type ReactNode, useContext, useId } from 'react'
import { cn } from '@/shared/lib/cn'

interface FieldContextValue {
  controlId: string
  describedBy: string | undefined
  isInvalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/**
 * Reads the wiring a surrounding `Field` set up. Returns null when a control is
 * used standalone, which is allowed — the control then carries its own labelling.
 */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext)
}

export interface FieldProps {
  label: string
  /** Hint shown under the control. Never used to carry an error. */
  description?: string
  /**
   * Validation message. Both Zod and the server write here (§10), which is why
   * it is a plain string: the caller has already translated it.
   */
  error?: string
  /** Marks the control required for assistive tech as well as visually. */
  isRequired?: boolean
  children: ReactNode
  className?: string
}

export function Field({
  label,
  description,
  error,
  isRequired = false,
  children,
  className,
}: FieldProps) {
  const controlId = useId()
  const descriptionId = `${controlId}-description`
  const errorId = `${controlId}-error`

  /*
   * The error replaces the description in the accessible name chain rather than
   * appending to it — a screen reader user should hear what is wrong first,
   * not after a hint they have already heard.
   */
  const describedBy = error ? errorId : description ? descriptionId : undefined

  return (
    <FieldContext.Provider value={{ controlId, describedBy, isInvalid: Boolean(error) }}>
      <div className={cn('flex flex-col gap-2', className)}>
        <label className="text-callout font-medium text-text" htmlFor={controlId}>
          {label}
          {isRequired ? (
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
          ) : null}
        </label>

        {children}

        {error ? (
          /*
           * `role="alert"` so a message appearing after submit is announced
           * without the user having to go looking for it.
           */
          <p className="text-caption text-danger" id={errorId} role="alert">
            {error}
          </p>
        ) : description ? (
          <p className="text-caption text-text-secondary" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
