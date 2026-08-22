import * as SwitchPrimitive from '@radix-ui/react-switch'
import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, useId, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { springs, useTransition } from '@/shared/lib/motion'

export interface SwitchProps
  extends Omit<
    ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    'className' | 'children' | 'asChild'
  > {
  label: string
  className?: string
}

/** Track 48px wide, 2px inset, 24px thumb — so the thumb travels 20px. */
const THUMB_TRAVEL = 20

export function Switch({
  label,
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  /*
   * Mirrored internally even when the caller controls it: the thumb animation
   * needs the boolean, and reading it from a data attribute would mean
   * animating a frame behind the state.
   */
  const [uncontrolled, setUncontrolled] = useState(defaultChecked ?? false)
  const isChecked = checked ?? uncontrolled

  // §11.5 — physical movement is a spring, never a duration.
  const transition = useTransition(springs.control)

  const handleChange = (next: boolean) => {
    setUncontrolled(next)
    onCheckedChange?.(next)
  }

  return (
    <div className={cn('flex items-center gap-3 pointer-coarse:min-h-11', className)}>
      <SwitchPrimitive.Root
        id={controlId}
        checked={isChecked}
        onCheckedChange={handleChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5',
          'transition-colors duration-150 ease-out-apple',
          isChecked ? 'bg-accent' : 'bg-border-strong',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb asChild>
          <motion.span
            animate={{ x: isChecked ? THUMB_TRAVEL : 0 }}
            transition={transition}
            className="block size-6 rounded-full bg-control-knob shadow-card"
          />
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>

      <label
        className={cn('text-body text-text select-none', disabled === true && 'opacity-40')}
        htmlFor={controlId}
      >
        {label}
      </label>
    </div>
  )
}
