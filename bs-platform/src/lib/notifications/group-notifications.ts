export type NotificationTimeGroup = 'today' | 'yesterday' | 'this_week' | 'earlier'

export interface GroupedNotifications<T> {
  key: NotificationTimeGroup
  labelKey: string
  items: T[]
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function groupNotificationsByDate<T extends { created_at: string }>(
  items: T[]
): GroupedNotifications<T>[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const groups: Record<NotificationTimeGroup, T[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    earlier: [],
  }

  for (const item of items) {
    const date = new Date(item.created_at)
    if (date >= todayStart) {
      groups.today.push(item)
    } else if (date >= yesterdayStart) {
      groups.yesterday.push(item)
    } else if (date >= weekStart) {
      groups.this_week.push(item)
    } else {
      groups.earlier.push(item)
    }
  }

  const order: NotificationTimeGroup[] = ['today', 'yesterday', 'this_week', 'earlier']
  return order
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      key,
      labelKey: `group_${key}`,
      items: groups[key],
    }))
}
