import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, FileText, Plus, Save, X } from 'lucide-react'
import type { KbArticle } from '@/lib/tickets'
import { Panel } from './panel'

const FULL_KB_LIBRARY: KbArticle[] = [
  {
    id: 'KB-1001',
    title: 'SSO redirect loop after certificate rotation',
    snippet:
      'Troubleshooting guide for SAML and OAuth login loops caused by stale IdP metadata, expired certificates, or missing validation after rotation.',
    relevance: 0.96,
    recommendation:
      'Re-validate IdP metadata, confirm the new certificate is active, and verify the logout/login redirect chain before escalating to identity engineering.',
    relatedTicket: 'TCK-48209',
  },
  {
    id: 'KB-1002',
    title: 'Read replica lag after maintenance windows',
    snippet:
      'Checklist for diagnosing WAL spikes, replica apply delays, and stale customer-facing data after maintenance or background jobs.',
    relevance: 0.95,
    recommendation:
      'Check WAL growth, temporary route reads to the primary, and verify replica apply workers before restarting maintenance jobs.',
    relatedTicket: 'TCK-48213',
  },
  {
    id: 'KB-1003',
    title: 'Intermittent 401 Unauthorized webhook failures',
    snippet:
      'Guide to resolving OAuth token refresh races and integration authorization errors in external webhook pipelines.',
    relevance: 0.93,
    recommendation:
      'Review token refresh timing, ensure the app is reusing valid credentials, and inspect webhook retry telemetry for repeated 401 responses.',
    relatedTicket: 'TCK-48201',
  },
  {
    id: 'KB-1004',
    title: 'Billing invoice adjustments and duplicate seat charges',
    snippet:
      'Workflow for validating billing entries, correcting extra charges, and issuing credits for invoice disputes.',
    relevance: 0.87,
    recommendation:
      'Confirm seat count changes, validate invoice adjustments, and issue a credit when duplicate charges are confirmed in billing history.',
    relatedTicket: 'TCK-48196',
  },
  {
    id: 'KB-1005',
    title: 'CSV export row limits and report generation failures',
    snippet:
      'How to detect file-size constraints, pagination issues, and analytics export failures for large customer reports.',
    relevance: 0.82,
    recommendation:
      'Validate export row limits, increase the page size safely, and confirm the file is not exceeding platform export thresholds.',
    relatedTicket: 'TCK-48188',
  },
  {
    id: 'KB-1006',
    title: 'API rate limiting and 429 retry handling',
    snippet:
      'Operational guidance for quota checks, request throttling, and safe retry patterns when third-party APIs reject traffic.',
    relevance: 0.8,
    recommendation:
      'Review quota usage, apply exponential backoff, and verify whether the integration must request a higher rate limit after 429 spikes.',
    relatedTicket: 'TCK-48217',
  },
  {
    id: 'KB-1007',
    title: 'Schema migration rollback and stability review',
    snippet:
      'Best practices for validating migrations, detecting data drift, and recovering safely from failed schema changes.',
    relevance: 0.79,
    recommendation:
      'Validate migration prechecks, confirm rollback readiness, and review data drift or row count changes before a production rollout.',
    relatedTicket: 'TCK-48219',
  },
  {
    id: 'KB-1008',
    title: 'Query planner regressions and slow table scans',
    snippet:
      'Troubleshooting steps for index performance issues, planner regressions, and latency spikes in customer-facing queries.',
    relevance: 0.77,
    recommendation:
      'Review query plans, validate the relevant index coverage, and compare execution timings before applying a planner workaround.',
    relatedTicket: 'TCK-48175',
  },
  {
    id: 'KB-1009',
    title: 'Workspace rename and permission propagation',
    snippet:
      'Instructions for handling renamed workspaces, stale references, and permission sync issues that block access.',
    relevance: 0.72,
    recommendation:
      'Confirm permission propagation after the rename, verify stale workspace references, and re-sync the access policy if needed.',
    relatedTicket: 'TCK-48162',
  },
  {
    id: 'KB-1010',
    title: 'General issue intake for UI and product bug reports',
    snippet:
      'Standard intake checklist for bug reports, error screenshots, user impact details, and rapid triage steps for support teams.',
    relevance: 0.7,
    recommendation:
      'Capture the UI steps, attach the screenshot, and log the user impact and affected environment before routing to the product team.',
    relatedTicket: 'TCK-48209',
  },
]

export function KbReferences({ articles, ticketId }: { articles: KbArticle[]; ticketId?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewAll, setViewAll] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [customArticles, setCustomArticles] = useState<KbArticle[]>([])
  const [draft, setDraft] = useState({
    title: '',
    snippet: '',
    recommendation: '',
    relatedTicket: ticketId ?? 'TKT-NEW',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('support-kb-library')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as KbArticle[]
      if (Array.isArray(parsed)) setCustomArticles(parsed)
    } catch {
      // ignore malformed saved data
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('support-kb-library', JSON.stringify(customArticles))
  }, [customArticles])

  const mergedArticles = useMemo(() => {
    const unique = new Map<string, KbArticle>()

    customArticles.forEach((article) => unique.set(article.id, article))
    articles.forEach((article) => unique.set(article.id, article))
    FULL_KB_LIBRARY.forEach((article) => {
      if (!unique.has(article.id)) unique.set(article.id, article)
    })

    return Array.from(unique.values()).sort((a, b) => b.relevance - a.relevance)
  }, [articles, customArticles])

  const libraryItems = viewAll ? mergedArticles : articles.length > 0 ? articles : mergedArticles.slice(0, 5)
  const selectedArticle = libraryItems.find((article) => article.id === selectedId) ?? null
  const selectedRecommendation =
    selectedArticle?.recommendation ??
    'Review the guidance in this KB article and apply the step-by-step troubleshooting flow before escalating to engineering.'
  const relatedTicket = selectedArticle?.relatedTicket ?? 'Related ticket assist'

  const openKbLibrary = () => {
    setViewAll(true)
    setSelectedId(null)
    setIsOpen(true)
  }

  const openArticle = (article: KbArticle) => {
    setViewAll(false)
    setSelectedId(article.id)
    setIsOpen(true)
  }

  const closeKbLibrary = () => {
    setIsOpen(false)
    setSelectedId(null)
    setViewAll(false)
  }

  const handlePublishKb = () => {
    const title = draft.title.trim()
    const snippet = draft.snippet.trim()
    const recommendation = draft.recommendation.trim()

    if (!title || !snippet || !recommendation) return

    const newArticle: KbArticle = {
      id: `KB-${Date.now()}`,
      title,
      snippet,
      relevance: 0.93,
      recommendation,
      relatedTicket: draft.relatedTicket || ticketId || 'TKT-NEW',
    }

    setCustomArticles((prev) => [newArticle, ...prev])
    setDraft({
      title: '',
      snippet: '',
      recommendation: '',
      relatedTicket: ticketId ?? 'TKT-NEW',
    })
    setPublishOpen(false)
    setSelectedId(newArticle.id)
    setViewAll(false)
    setIsOpen(true)
  }

  return (
    <>
      <div onClick={openKbLibrary} className="cursor-pointer">
        <Panel
          id="kb"
          title="Similar Knowledge Content"
          icon={BookOpen}
          dense
          action={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setPublishOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[10.5px] font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="size-3" aria-hidden="true" />
                Publish new KB
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  openKbLibrary()
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10.5px] font-medium text-foreground hover:border-primary/40 hover:text-primary"
              >
                View all
              </button>
            </div>
          }
        >
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    openArticle(a)
                  }}
                  className="group flex w-full gap-2.5 rounded-xl border border-border/70 px-3 py-2.5 text-left transition-all duration-200 outline-none hover:-translate-y-px hover:border-primary/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-[12.5px] leading-snug font-medium text-foreground group-hover:text-primary">
                        {a.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="font-mono text-[10.5px] font-medium text-primary tabular-nums">
                          {Math.round(a.relevance * 100)}%
                        </span>
                        <ArrowUpRight
                          className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground text-pretty">
                      {a.snippet}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {publishOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-slate-900/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Knowledge base</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Publish new KB</h3>
              </div>
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close KB form"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">KB title</label>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Example: SAML redirect loop after certificate rotation"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Summary</label>
                <textarea
                  value={draft.snippet}
                  onChange={(event) => setDraft((prev) => ({ ...prev, snippet: event.target.value }))}
                  rows={4}
                  placeholder="Describe the troubleshooting guidance or common resolution path."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recommended action</label>
                <textarea
                  value={draft.recommendation}
                  onChange={(event) => setDraft((prev) => ({ ...prev, recommendation: event.target.value }))}
                  rows={4}
                  placeholder="What should an agent do when this issue appears?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Related ticket</label>
                <input
                  value={draft.relatedTicket}
                  onChange={(event) => setDraft((prev) => ({ ...prev, relatedTicket: event.target.value }))}
                  placeholder={ticketId ?? 'TKT-NEW'}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishKb}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                <Save className="size-3.5" aria-hidden="true" />
                Publish KB
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-slate-900/20">
            <div className="flex w-full max-w-[320px] flex-col border-r border-border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {viewAll ? 'All Knowledge Base' : 'Similar KB Matches'}
                </h3>
                <button
                  type="button"
                  onClick={closeKbLibrary}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close knowledge base"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                {libraryItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                    No KB matches for this ticket.
                  </div>
                ) : (
                  libraryItems.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setSelectedId(article.id)}
                      className={[
                        'w-full rounded-xl border p-3 text-left transition-colors',
                        selectedId === article.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background hover:border-primary/30 hover:bg-muted/40',
                      ].join(' ')}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {article.id}
                        </span>
                        <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                          {Math.round(article.relevance * 100)}%
                        </span>
                      </div>
                      <div className="text-sm font-medium text-foreground">{article.title}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-background p-5">
              {selectedArticle ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {selectedArticle.id}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {Math.round(selectedArticle.relevance * 100)}% match
                    </span>
                  </div>

                  <h4 className="text-2xl font-semibold tracking-tight text-foreground">{selectedArticle.title}</h4>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{selectedArticle.snippet}</p>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Recommended action
                      </p>
                      <p className="text-sm leading-7 text-foreground/90">{selectedRecommendation}</p>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Similar ticket assist
                      </p>
                      <p className="text-sm leading-7 text-foreground/90">
                        This KB matches <span className="font-semibold text-foreground">{relatedTicket}</span> and helps confirm the likely cause, next troubleshooting step, and the right escalation path.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                  <div>
                    <p className="text-base font-medium text-foreground">Knowledge Base library</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select any KB article from the list to open the full recommendation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
