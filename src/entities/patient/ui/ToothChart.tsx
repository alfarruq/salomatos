import { useTranslation } from 'react-i18next'
import type { PatientStatus, PatientTreatment } from '../model/types'

export interface ToothChartProps {
  treatments: readonly PatientTreatment[]
  /**
   * Every treated tooth is shown with this one status — `PatientTreatment`
   * carries no status of its own (§ model/types.ts), so the patient's overall
   * status is the closest honest approximation, not a per-tooth fact.
   */
  status: PatientStatus | null
}

/**
 * FDI (ISO 3950) numbering, walked clockwise from the gap between 11 and 21:
 * upper-right quadrant, lower-right, lower-left, upper-left. Matches how a
 * dental chart is drawn from the clinician's side, not the patient's.
 */
const FDI_CLOCKWISE = [
  21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48,
  18, 17, 16, 15, 14, 13, 12, 11,
] as const

const VIEW_WIDTH = 760
const VIEW_HEIGHT = 460
const CENTER_X = VIEW_WIDTH / 2
const CENTER_Y = VIEW_HEIGHT / 2
const RADIUS_X = 280
const RADIUS_Y = 150
const TOOTH_SIZE = 26
const LABEL_OFFSET = 24

function positionOf(index: number): { x: number; y: number; labelX: number; labelY: number } {
  const angle = ((-90 + (index + 0.5) * (360 / FDI_CLOCKWISE.length)) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: CENTER_X + RADIUS_X * cos,
    y: CENTER_Y + RADIUS_Y * sin,
    labelX: CENTER_X + (RADIUS_X + LABEL_OFFSET) * cos,
    labelY: CENTER_Y + (RADIUS_Y + LABEL_OFFSET) * sin,
  }
}

/**
 * A schematic FDI tooth map — passive, like every other entity UI piece
 * (§3.2): it shows which teeth have a treatment on record and nothing else.
 *
 * Positions are computed from a parametric ellipse rather than laid out with
 * flexbox, because the two arches curve toward each other at the front (11/21,
 * 31/41) and away at the back (18/28, 38/48) — a shape flexbox cannot express.
 */
export function ToothChart({ treatments, status }: ToothChartProps) {
  const { t } = useTranslation('patients')

  const treatmentByTooth = new Map<number, PatientTreatment>()
  for (const treatment of treatments) {
    if (treatment.toothNumber !== null) treatmentByTooth.set(treatment.toothNumber, treatment)
  }

  const toneClass =
    status === 'completed'
      ? 'fill-success/15 stroke-success'
      : // `in_progress` and "treated but no overall status yet" both fall back to
        // the accent tone — the same choice `PatientStatusBadge` makes and for
        // the same reason: this is the common case, not a caution.
        'fill-accent-soft stroke-accent'

  return (
    <div className="flex flex-col gap-4">
      <svg
        aria-label={t('detail.toothChart')}
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        {FDI_CLOCKWISE.map((tooth, index) => {
          const treatment = treatmentByTooth.get(tooth)
          const { x, y, labelX, labelY } = positionOf(index)

          return (
            <g key={tooth}>
              <rect
                className={treatment === undefined ? 'fill-surface stroke-border' : toneClass}
                height={TOOTH_SIZE}
                rx={6}
                strokeWidth={1.5}
                width={TOOTH_SIZE}
                x={x - TOOTH_SIZE / 2}
                y={y - TOOTH_SIZE / 2}
              >
                <title>{treatment === undefined ? tooth : `${tooth} — ${treatment.name}`}</title>
              </rect>
              <text
                className="fill-text-secondary text-[13px]"
                dominantBaseline="middle"
                textAnchor="middle"
                x={labelX}
                y={labelY}
              >
                {tooth}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 text-caption text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-success" />
          {t('status.completed')}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
          {t('status.in_progress')}
        </span>
      </div>
    </div>
  )
}
