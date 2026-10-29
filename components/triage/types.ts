import type { Ticket, TicketStatus } from '@/lib/tickets'

export type QueueTicket = Ticket & {
  createdAt: number
  status: TicketStatus
}
