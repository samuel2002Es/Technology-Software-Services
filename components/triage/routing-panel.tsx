import { ChevronDown, GitBranch, RotateCcw, Sparkles } from 'lucide-react'
import { ROUTING_OPTIONS, type Ticket } from '@/lib/tickets'
import { Panel } from './panel'

export function RoutingPanel({
  routing,
  value,
  onChange,
  disabled,
}: {
  routing: Ticket['routing']
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const overridden = value !== routing.destination

  return (
    <Panel
      id="routing"
      title="Routing Recommendation"
      icon={GitBranch}
      dense
      action={
        <span className="font-mono text-[11px] text-primary/80 tabular-nums">
          {Math.round(routing.confidence * 100)}% conf.
        </span>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-medium tracking-wide text-primary uppercase">
          <Sparkles className="size-3" aria-hidden="true" />
          AI Suggested
        </div>
        {overridden && (
          <button
            type="button"
            onClick={() => onChange(routing.destination)}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded text-[11px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Use suggestion
          </button>
        )}
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/[0.03] px-3 py-2.5 ring-1 ring-primary/15 ring-inset">
        <p className="text-[13px] font-semibold tracking-tight">{routing.destination}</p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {routing.reason}
        </p>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="routing-override" className="text-xs font-medium">
            Route to
          </label>
        </div>
        <div className="relative mt-1.5">
          <select
            id="routing-override"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-[13px] shadow-xs transition-shadow outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
          >
            {ROUTING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
                {opt === routing.destination ? '  (AI suggested)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {overridden && (
          <p className="mt-1.5 text-[11px] text-severity-medium">
            Overridden by agent — feedback will be logged to improve routing.
          </p>
        )}
      </div>
    </Panel>
  )
}
