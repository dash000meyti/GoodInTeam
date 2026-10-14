import type { notifications as fa } from "../fa/notifications";

export const notifications: Record<keyof typeof fa, string> = {
  title: "Notifications",
  open: "Notifications ({n} unread)",
  empty: "You're all caught up",
  emptyHint: "Task and event reminders and important updates show up here.",
  markAllRead: "Mark all as read",
  unread: "{n} unread",
  desktop: "Desktop notifications",
  desktopHint: "While the panel is open, also show reminders as system notifications.",
  desktopEnable: "Enable",
  desktopOn: "On",
  desktopBlocked: "Your browser has blocked notifications for this site.",
  taskReminder: "Task reminder",
  taskReminderDue: "Task reminder · due {due}",
  eventReminder: "Starts {when}",
  longRunningTitle: "A timer is still running",
  longRunningBody: "“{name}” has been running for more than 10 hours. Forgot to stop it?",
};
