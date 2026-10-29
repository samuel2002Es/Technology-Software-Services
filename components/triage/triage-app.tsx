'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  ListFilter,
  TriangleAlert,
  X,
} from 'lucide-react'
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

type NewTicketDraft = {
  subject: string
  customer: string
  company: string
  severity: 'High' | 'Medium' | 'Low'
  channel: 'Email' | 'Portal' | 'Chat'
  description: string
  screenshot: string
  screenshotName: string
}

const INCOMING_INTERVAL_MS = 30000

const EMPTY_DRAFT: NewTicketDraft = {
  subject: '',
  customer: '',
  company: '',
  severity: 'Medium',
  channel: 'Portal',
  description: '',
  screenshot: '',
  screenshotName: '',
}

function AIImpactDashboard({ tickets, onClose }: { tickets: QueueTicket[]; onClose: () => void }) {
  function handleDownloadPdf() {
    if (typeof window === 'undefined') return

    const title = 'AI Time Saved and Ticket Trends'
    const totalTickets = tickets.length
    const highPriority = tickets.filter((ticket) => ticket.severity === 'High').length
    const avgResolution = Math.max(12, Math.round(totalTickets * 2.4))

    const daySeries = Array.from({ length: 7 }, (_, index) => {
      const today = new Date()
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = tickets.filter((ticket) => {
        const created = new Date(ticket.createdAt)
        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth() &&
          created.getDate() === date.getDate()
        )
      }).length

      return { label, count }
    })

    const maxCount = Math.max(...daySeries.map((day) => day.count), 1)
    const chartPoints = daySeries
      .map((day, index) => {
        const x = 40 + index * 58
        const y = 180 - (day.count / maxCount) * 110
        return `${x},${y}`
      })
      .join(' ')

    const chartArea = `40,180 ${chartPoints} 420,180`
    const reportRows = tickets.slice(0, 8).map((ticket) => {
      return `
        <tr>
          <td>${ticket.id}</td>
          <td>${ticket.customer.company}</td>
          <td>${ticket.customer.name}</td>
          <td>${ticket.severity}</td>
          <td>${ticket.routing.destination}</td>
        </tr>
      `
    }).join('')

    const reportHtml = `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #f5f7fb;
              color: #1f2937;
            }
            .report {
              max-width: 980px;
              margin: 32px auto;
              background: white;
              padding: 32px;
              box-sizing: border-box;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: end;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .eyebrow {
              margin: 0 0 8px;
              font-size: 11px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #6b7280;
            }
            h1 {
              margin: 0;
              font-size: 30px;
              line-height: 1.2;
            }
            .meta {
              font-size: 12px;
              color: #6b7280;
              text-align: right;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 14px;
              margin-bottom: 28px;
            }
            .stat {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 18px 18px 14px;
            }
            .stat-label {
              margin: 0 0 10px;
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #6b7280;
            }
            .stat-value {
              font-size: 34px;
              font-weight: 700;
              margin: 0;
            }
            .stat-badge {
              display: inline-block;
              font-size: 11px;
              padding: 6px 10px;
              border-radius: 999px;
              background: #edf2ff;
              color: #4338ca;
              margin-top: 10px;
            }
            .panel-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 18px;
              margin-bottom: 24px;
            }
            .panel {
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 18px;
              background: white;
            }
            .panel h2 {
              margin: 0 0 12px;
              font-size: 16px;
            }
            .chart-wrap {
              background: #f9fafb;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              padding: 12px;
            }
            svg { width: 100%; height: 220px; display: block; }
            .legend {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #6b7280;
              margin-top: 8px;
            }
            .breakdown {
              display: grid;
              gap: 12px;
            }
            .row {
              display: grid;
              grid-template-columns: 1fr auto;
              gap: 10px;
              align-items: center;
              font-size: 12px;
            }
            .bar {
              height: 10px;
              background: #eef2ff;
              border-radius: 999px;
              overflow: hidden;
              margin-top: 4px;
            }
            .bar > span {
              display: block;
              height: 100%;
              border-radius: 999px;
              background: linear-gradient(90deg, #5b4bc9 0%, #8b5cf6 100%);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 12px;
            }
            th, td {
              text-align: left;
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              font-size: 11px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #6b7280;
              background: #f9fafb;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 700;
            }
            .high { background: #fef2f2; color: #b91c1c; }
            .medium { background: #fff7ed; color: #b45309; }
            .low { background: #ecfdf5; color: #047857; }
            @media print {
              body { background: white; }
              .report { box-shadow: none; border: none; margin: 0; max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <div>
                <p class="eyebrow">AI Operations dashboard</p>
                <h1>${title}</h1>
              </div>
              <div class="meta">
                <div>Generated: ${new Date().toLocaleString()}</div>
                <div>Coverage: ${tickets.length} tickets</div>
              </div>
            </div>

            <div class="stats">
              <div class="stat">
                <p class="stat-label">Tickets received</p>
                <p class="stat-value">${totalTickets}</p>
                <div class="stat-badge">+18%</div>
              </div>
              <div class="stat">
                <p class="stat-label">High priority</p>
                <p class="stat-value">${highPriority}</p>
                <div class="stat-badge">3 escalations</div>
              </div>
              <div class="stat">
                <p class="stat-label">AI time saved</p>
                <p class="stat-value">12h</p>
                <div class="stat-badge">+6.4h / week</div>
              </div>
            </div>

            <div class="panel-grid">
              <section class="panel">
                <h2>Tickets received this month</h2>
                <div class="chart-wrap">
                  <svg viewBox="0 0 420 220" preserveAspectRatio="none" aria-label="Ticket trend chart">
                    <g>
                      <path d="M 40 180 L 40 30 L 420 30" fill="none" stroke="#e5e7eb" stroke-width="1"/>
                      <path d="M 40 180 L 420 180" fill="none" stroke="#e5e7eb" stroke-width="1"/>
                    </g>
                    <polyline fill="none" stroke="#5b4bc9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${chartPoints}"/>
                    <polygon points="${chartArea}" fill="rgba(91,75,201,0.12)" stroke="none"/>
                    ${daySeries.map((day, index) => {
                      const x = 40 + index * 58
                      const y = 180 - (day.count / maxCount) * 110
                      return `<g><circle cx="${x}" cy="${y}" r="5" fill="#5b4bc9" /><text x="${x}" y="206" text-anchor="middle" font-size="9" fill="#6b7280">${day.label.split(' ')[0]}</text></g>`
                    }).join('')}
                  </svg>
                  <div class="legend">
                    ${daySeries.map((day) => `<span>${day.label}</span>`).join('')}
                  </div>
                </div>
              </section>

              <section class="panel">
                <h2>Ticket breakdown</h2>
                <div class="breakdown">
                  ${[
                    { label: 'Billing', value: 40 },
                    { label: 'Platform', value: 32 },
                    { label: 'Identity', value: 18 },
                    { label: 'Integrations', value: 10 },
                  ].map((segment) => `
                    <div>
                      <div class="row">
                        <span>${segment.label}</span>
                        <strong>${segment.value}%</strong>
                      </div>
                      <div class="bar"><span style="width:${segment.value}%"></span></div>
                    </div>
                  `).join('')}
                </div>
                <div class="stat" style="margin-top: 18px; background:#f9fafb; border-radius: 12px;">
                  <p class="stat-label">Average resolution</p>
                  <p class="stat-value" style="font-size: 28px;">${avgResolution} min</p>
                </div>
              </section>
            </div>

            <section class="panel">
              <h2>Recent ticket detail</h2>
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Severity</th>
                    <th>Team</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportRows}
                </tbody>
              </table>
            </section>
          </div>
        </body>
      </html>`

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      window.alert('Please allow pop-ups to generate the PDF.')
      return
    }

    printWindow.document.write(reportHtml)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  const daySeries = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const count = tickets.filter((ticket) => {
        const created = new Date(ticket.createdAt)
        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth() &&
          created.getDate() === date.getDate()
        )
      }).length

      return { label, count }
    })
  }, [tickets])

  const linePoints = useMemo(() => {
    const max = Math.max(...daySeries.map((day) => day.count), 1)
    return daySeries
      .map((day, index) => {
        const x = 28 + index * 54
        const y = 116 - (day.count / max) * 72
        return `${x},${y}`
      })
      .join(' ')
  }, [daySeries])

  const totalTickets = tickets.length
  const highPriority = tickets.filter((ticket) => ticket.severity === 'High').length
  const avgResolution = Math.max(12, Math.round(totalTickets * 2.4))
  const topIssues = [...tickets].slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/65 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10">
        <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
              AI Operations dashboard
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">AI time saved and ticket trends</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label="Close dashboard"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="app-scrollbar max-h-[calc(90vh-80px)] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tickets received</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{totalTickets}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-severity-low/10 px-2 py-1 text-[11px] font-medium text-severity-low">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  +18%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">High priority</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{highPriority}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-severity-high/10 px-2 py-1 text-[11px] font-medium text-severity-high">
                  <TriangleAlert className="size-3" aria-hidden="true" />
                  3 escalations
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI time saved</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">12h</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  <BarChart3 className="size-3" aria-hidden="true" />
                  +6.4h / wk
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.8fr_1fr]">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Tickets received this month</h3>
                  <p className="text-xs text-muted-foreground">Volume by day</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  Download PDF
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/15 p-3">
                <svg viewBox="0 0 420 150" className="h-44 w-full" role="img" aria-label="Tickets received chart">
                  <defs>
                    <linearGradient id="fillTrend" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[0, 1, 2, 3].map((line) => (
                    <line
                      key={line}
                      x1="0"
                      x2="420"
                      y1={24 + line * 30}
                      y2={24 + line * 30}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                  ))}

                  <polyline
                    points={`28,116 ${linePoints} 390,116`}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  <polygon
                    points={`28,116 ${linePoints} 390,116`}
                    fill="url(#fillTrend)"
                    opacity="1"
                  />

                  {daySeries.map((day, index) => {
                    const x = 28 + index * 54
                    const y = 116 - (day.count / Math.max(...daySeries.map((d) => d.count), 1)) * 72
                    return (
                      <g key={day.label}>
                        <circle cx={x} cy={y} r="4.5" fill="var(--primary)" />
                        <text x={x} y="138" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                          {day.label.split(' ')[0]}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Ticket breakdown</h3>
                <ListFilter className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { label: 'Billing', value: 40, color: 'var(--chart-1)' },
                  { label: 'Platform', value: 32, color: 'var(--chart-2)' },
                  { label: 'Identity', value: 18, color: 'var(--chart-3)' },
                  { label: 'Integrations', value: 10, color: 'var(--chart-4)' },
                ].map((segment) => (
                  <div key={segment.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{segment.label}</span>
                      <span className="font-medium text-foreground">{segment.value}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${segment.value}%`, backgroundColor: segment.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-muted/35 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average resolution</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{avgResolution} min</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Recent ticket detail</h3>
              <span className="text-[11px] text-muted-foreground">Top issues this cycle</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Ticket</th>
                    <th className="px-3 py-2.5 font-medium">Customer</th>
                    <th className="px-3 py-2.5 font-medium">Severity</th>
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-3 py-2.5 font-medium">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {topIssues.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-border align-middle">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{ticket.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{ticket.customer.company}</div>
                        <div className="text-xs text-muted-foreground">{ticket.customer.name}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <SeverityBadge severity={ticket.severity} size="sm" />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ticket.channel}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ticket.routing.destination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewTicketComposer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (draft: NewTicketDraft) => void
}) {
  const [draft, setDraft] = useState<NewTicketDraft>(EMPTY_DRAFT)

  useEffect(() => {
    if (open) {
      setDraft(EMPTY_DRAFT)
    }
  }, [open])

  if (!open) return null

  function updateField<K extends keyof NewTicketDraft>(key: K, value: NewTicketDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      updateField('screenshot', typeof reader.result === 'string' ? reader.result : '')
      updateField('screenshotName', file.name)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
              New ticket
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Create support issue</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Close new ticket form"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto app-scrollbar px-5 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Subject
              </span>
              <input
                value={draft.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                placeholder="Example: Login loop after SSO update"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Severity
              </span>
              <select
                value={draft.severity}
                onChange={(e) => updateField('severity', e.target.value as NewTicketDraft['severity'])}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Customer name
              </span>
              <input
                value={draft.customer}
                onChange={(e) => updateField('customer', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                placeholder="Jane Doe"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Company
              </span>
              <input
                value={draft.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                placeholder="Contoso"
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Channel
              </span>
              <select
                value={draft.channel}
                onChange={(e) => updateField('channel', e.target.value as NewTicketDraft['channel'])}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <option value="Email">Email</option>
                <option value="Portal">Portal</option>
                <option value="Chat">Chat</option>
              </select>
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Issue details
              </span>
              <textarea
                value={draft.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                placeholder="Describe the issue, expected behavior, timestamps, users affected, error message, etc."
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Screenshot / error image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-dashed border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {draft.screenshotName && (
                <span className="mt-2 block text-xs text-muted-foreground">Attached: {draft.screenshotName}</span>
              )}
            </label>
          </div>

          {draft.screenshot && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <img
                src={draft.screenshot}
                alt="Error preview"
                className="max-h-60 w-full rounded-lg border border-border object-contain bg-card"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCreate(draft)}
            disabled={!draft.subject || !draft.customer || !draft.company || !draft.description}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create ticket
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [createTicketOpen, setCreateTicketOpen] = useState(false)
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

  function handleCreateTicket(draft: NewTicketDraft) {
    const newId = `TCK-${Math.floor(10000 + Math.random() * 90000)}`
    const summary = draft.description.trim()
    const createdTicket: QueueTicket = {
      id: newId,
      subject: draft.subject,
      body: `Customer: ${draft.customer}\nCompany: ${draft.company}\n\nIssue: ${summary}${draft.screenshot ? `\n\nScreenshot attached: ${draft.screenshotName || 'error.png'}` : ''}`,
      minutesAgo: 0,
      severity: draft.severity,
      channel: draft.channel,
      screenshot: draft.screenshot,
      errorSummary: summary,
      customer: { name: draft.customer, company: draft.company, plan: 'Standard' },
      classification: {
        product: { value: 'New ticket', confidence: 0.7 },
        module: { value: 'General support', confidence: 0.69 },
        severity: { value: draft.severity, confidence: 0.76 },
      },
      kb: [],
      draft: `Hi ${draft.customer},\n\nThanks for reaching out. We've created a case for this issue and are reviewing the details now.\n\nError summary:\n${summary}\n${draft.screenshot ? `\nAttached screenshot: ${draft.screenshotName || 'error.png'}` : ''}\n\nWe will continue to update this ticket with the next steps.`,
      routing: {
        destination: 'Tier 1 – General Support',
        reason: 'Newly created support ticket requiring triage and investigation.',
        confidence: 0.72,
      },
      createdAt: Date.now(),
      status: 'open',
    }

    setTickets((prev) => [createdTicket, ...prev])
    setSelectedId(newId)
    setMobileView('detail')
    setCreateTicketOpen(false)
    showToast(`${newId} created and added to the queue`, 'success')
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
          onOpenInsights={() => setInsightsOpen(true)}
          onCreateTicket={() => setCreateTicketOpen(true)}
        />
      </div>

      {insightsOpen && <AIImpactDashboard tickets={tickets} onClose={() => setInsightsOpen(false)} />}
      <NewTicketComposer open={createTicketOpen} onClose={() => setCreateTicketOpen(false)} onCreate={handleCreateTicket} />

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
