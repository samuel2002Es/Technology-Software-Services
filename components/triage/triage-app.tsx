'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INCOMING_TICKETS, SEED_TICKETS } from '@/lib/tickets'
import { formatElapsed } from '@/lib/time'
import { TicketQueue } from './ticket-queue'
import { OriginalRequest } from './original-request'
import { ClassificationPanel } from './classification-panel'
import { KbReferences } from './kb-references'
import { DraftEditor } from './draft-editor'
import { RoutingPanel } from './routing-panel'
import { ActionBar } from './action-bar'
import { SeverityBadge } from './severity-badge'
import type { QueueTicket } from './types'

type Toast = { id: number; message: string; tone: 'success' | 'warning' }

const INCOMING_INTERVAL_MS = 30000

export function TriageApp() {
  const [now, setNow] = useState(() => Date.now())
  const [tickets, setTickets] = useState<QueueTicket[]>(() =>
    SEED_TICKETS.map((t) => ({ ...t, createdAt: now - t.minutesAgo * 60000, status: 'open' })),
  )
  const [selectedId, setSelectedId] = useState(SEED_TICKETS[0].id)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [routes, setRoutes] = useState<Record<string, string>>({})
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState(false)
  const [mobileView, setMobileView] = useState<'queue' | 'detail'>('queue')
  const [toast, setToast] = useState<Toast | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const incomingIndex = useRef(0)

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15000)
    const feed = setInterval(() => {
      const next = INCOMING_TICKETS[incomingIndex.current]
      if (!next) return
      incomingIndex.current += 1
      setTickets((prev) => [{ ...next, createdAt: Date.now(), status: 'open' }, ...prev])
      setNewIds((prev) => new Set(prev).add(next.id))
    }, INCOMING_INTERVAL_MS)
    return () => {
      clearInterval(clock)
      clearInterval(feed)
      clearTimeout(toastTimer.current)
    }
  }, [])

  const ticket = tickets.find((t) => t.id === selectedId) ?? tickets[0]
  const draft = drafts[ticket.id] ?? ticket.draft
  const route = routes[ticket.id] ?? ticket.routing.destination
  const isReviewed = reviewed[ticket.id] ?? false
  const closed = ticket.status !== 'open'

  function showToast(message: string, tone: Toast['tone']) {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, tone })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  function selectTicket(id: string) {
    setSelectedId(id)
    setEditing(false)
    setMobileView('detail')
    setNewIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function advanceFrom(id: string, updated: QueueTicket[]) {
    const nextOpen = updated.find((t) => t.id !== id && t.status === 'open')
    if (nextOpen) {
      setSelectedId(nextOpen.id)
      setEditing(false)
    }
  }

  function updateStatus(status: QueueTicket['status']) {
    const updated = tickets.map((t) => (t.id === ticket.id ? { ...t, status } : t))
    setTickets(updated)
    setEditing(false)
    return updated
  }

  function handleApprove() {
    const updated = updateStatus('routed')
    showToast(`${ticket.id} approved and routed to ${route}`, 'success')
    advanceFrom(ticket.id, updated)
  }

  function handleEscalate() {
    const updated = updateStatus('escalated')
    showToast(`${ticket.id} escalated to the on-call support lead`, 'warning')
    advanceFrom(ticket.id, updated)
  }

  function handleEdit() {
    setEditing((prev) => {
      if (!prev) requestAnimationFrame(() => textareaRef.current?.focus())
      return !prev
    })
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <div
        className={cn(
          'h-full w-full shrink-0 desk:block desk:w-[264px] xl:w-[320px]',
          mobileView === 'queue' ? 'block' : 'hidden',
        )}
      >
        <TicketQueue
          tickets={tickets}
          selectedId={ticket.id}
          newIds={newIds}
          now={now}
          onSelect={selectTicket}
        />
      </div>

      <main
        className={cn(
          'min-w-0 flex-1 flex-col desk:flex',
          mobileView === 'detail' ? 'flex' : 'hidden',
        )}
      >
        <header className="shrink-0 border-b border-border/80 bg-card/70 px-4 py-3 backdrop-blur-md sm:px-5">
          <button
            type="button"
            onClick={() => setMobileView('queue')}
            className="mb-2 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 desk:hidden"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to queue
          </button>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
                Ticket Triage &amp; Analysis
              </p>
              <h1 className="mt-0.5 truncate text-base font-semibold tracking-tight sm:text-lg">
                {ticket.subject}
              </h1>
            </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono">{ticket.id}</span>
                <SeverityBadge severity={ticket.severity} size="md" />
                <span className="inline-flex items-center gap-1" suppressHydrationWarning>
                  <Clock className="size-3.5" aria-hidden="true" />
                  {formatElapsed(ticket.createdAt, now)}
                </span>
              </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto desk:overflow-hidden">
          <div
            key={ticket.id}
            className="flex animate-in flex-col gap-4 p-4 duration-300 fade-in slide-in-from-bottom-1 desk:h-full desk:flex-row desk:gap-3.5 desk:p-3.5 xl:gap-4 xl:p-4"
          >
            <div className="flex min-w-0 flex-col gap-4 desk:-mr-1 desk:min-h-0 desk:flex-1 desk:gap-3.5 desk:overflow-y-auto desk:pr-1 xl:gap-4">
              <OriginalRequest ticket={ticket} className="shrink-0" />
              <DraftEditor
                className="shrink-0"
                value={draft}
                original={ticket.draft}
                editing={editing && !closed}
                reviewed={isReviewed}
                disabled={closed}
                textareaRef={textareaRef}
                onChange={(v) => setDrafts((d) => ({ ...d, [ticket.id]: v }))}
                onReviewedChange={(v) => setReviewed((r) => ({ ...r, [ticket.id]: v }))}
                onToggleEdit={handleEdit}
              />
            </div>
            <aside
              aria-label="AI context"
              className="flex min-w-0 flex-col gap-4 desk:-mr-1 desk:min-h-0 desk:w-[300px] desk:shrink-0 desk:gap-3.5 desk:overflow-y-auto desk:pr-1 xl:w-[360px] xl:gap-4"
            >
              <ClassificationPanel classification={ticket.classification} />
              <RoutingPanel
                routing={ticket.routing}
                value={route}
                disabled={closed}
                onChange={(v) => setRoutes((r) => ({ ...r, [ticket.id]: v }))}
              />
              <KbReferences articles={ticket.kb} />
            </aside>
          </div>
        </div>

        <ActionBar
          status={ticket.status}
          editing={editing && !closed}
          reviewed={isReviewed}
          destination={route}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onEscalate={handleEscalate}
        />
      </main>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-28 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-24"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-sm animate-in items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl shadow-foreground/10 duration-300 fade-in slide-in-from-bottom-2"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-severity-low" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-4 shrink-0 text-severity-high" aria-hidden="true" />
            )}
            <span className="text-pretty">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
              className="ml-1 rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
