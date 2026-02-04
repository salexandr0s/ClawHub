'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DailyNoteInfo {
  date: string // YYYY-MM-DD
  exists: boolean
  eventCount?: number
  sizeBytes?: number
}

interface MemoryCalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  dailyNotes: Map<string, DailyNoteInfo>
  onDayClick: (date: string) => void
  selectedDate?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MemoryCalendar({
  month,
  onMonthChange,
  dailyNotes,
  onDayClick,
  selectedDate,
}: MemoryCalendarProps) {
  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()

    // First day of month
    const firstDay = new Date(year, monthIndex, 1)
    const startDayOfWeek = firstDay.getDay()

    // Last day of month
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Build calendar grid (6 rows max)
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean } | null> = []

    // Previous month padding
    const prevMonth = new Date(year, monthIndex, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const prevMonthYear = monthIndex === 0 ? year - 1 : year
      const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1
      const date = formatDate(prevMonthYear, prevMonthIndex, day)
      days.push({ date, day, isCurrentMonth: false })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(year, monthIndex, day)
      days.push({ date, day, isCurrentMonth: true })
    }

    // Next month padding to fill grid
    const remainingCells = 42 - days.length // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonthYear = monthIndex === 11 ? year + 1 : year
      const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1
      const date = formatDate(nextMonthYear, nextMonthIndex, day)
      days.push({ date, day, isCurrentMonth: false })
    }

    return days
  }, [month])

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(month)
    newMonth.setMonth(newMonth.getMonth() - 1)
    onMonthChange(newMonth)
  }

  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(month)
    newMonth.setMonth(newMonth.getMonth() + 1)
    onMonthChange(newMonth)
  }

  // Go to current month
  const goToToday = () => {
    onMonthChange(new Date())
  }

  const today = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  return (
    <div className="bg-bg-2 rounded-[var(--radius-lg)] border border-bd-0 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-[var(--radius-md)] text-fg-2 hover:text-fg-0 hover:bg-bg-3 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-fg-0">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs rounded bg-bg-3 text-fg-2 hover:text-fg-0 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded-[var(--radius-md)] text-fg-2 hover:text-fg-0 hover:bg-bg-3 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-fg-3 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          if (!dayInfo) return <div key={index} />

          const noteInfo = dailyNotes.get(dayInfo.date)
          const hasNote = noteInfo?.exists
          const isToday = dayInfo.date === today
          const isSelected = dayInfo.date === selectedDate

          return (
            <button
              key={dayInfo.date}
              onClick={() => onDayClick(dayInfo.date)}
              className={cn(
                'relative aspect-square flex flex-col items-center justify-center rounded-[var(--radius-md)] transition-colors',
                dayInfo.isCurrentMonth ? 'text-fg-0' : 'text-fg-3',
                hasNote && 'font-medium',
                isToday && !isSelected && 'ring-1 ring-accent-primary',
                isSelected && 'bg-accent-primary text-white',
                !isSelected && hasNote && 'bg-status-info/10 hover:bg-status-info/20',
                !isSelected && !hasNote && 'hover:bg-bg-3'
              )}
            >
              <span className="text-sm">{dayInfo.day}</span>
              {hasNote && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-status-info" />
              )}
              {noteInfo?.eventCount !== undefined && noteInfo.eventCount > 0 && (
                <span className={cn(
                  'absolute top-0.5 right-0.5 text-[9px] font-medium',
                  isSelected ? 'text-white/80' : 'text-status-info'
                )}>
                  {noteInfo.eventCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-bd-0">
        <div className="flex items-center gap-2 text-xs text-fg-3">
          <span className="w-2 h-2 rounded-full bg-status-info" />
          Has daily note
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-3">
          <span className="w-4 h-4 rounded ring-1 ring-accent-primary" />
          Today
        </div>
      </div>
    </div>
  )
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}
