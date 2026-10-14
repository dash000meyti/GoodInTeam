/** In-app notifications (header bell) + texts of background-job notifications. */
export const notifications = {
  title: "اعلان‌ها",
  open: "اعلان‌ها ({n} خوانده‌نشده)",
  empty: "اعلان تازه‌ای ندارید",
  emptyHint: "یادآوری کارها، رویدادها و اتفاق‌های مهم اینجا می‌آیند.",
  markAllRead: "همه را خواندم",
  unread: "{n} خوانده‌نشده",
  desktop: "اعلان دسکتاپ",
  desktopHint: "تا وقتی پنل باز است، یادآورها را به شکل اعلان سیستم هم ببینید.",
  desktopEnable: "فعال‌سازی",
  desktopOn: "فعال است",
  desktopBlocked: "مرورگر اجازه نمایش اعلان را نداده است.",
  taskReminder: "یادآوری کار",
  taskReminderDue: "یادآوری کار · سررسید {due}",
  eventReminder: "شروع {when}",
  longRunningTitle: "تایمر هنوز روشن است",
  longRunningBody: "«{name}» بیش از ۱۰ ساعت است که روشن مانده. یادتان رفته خاموشش کنید؟",
} as const satisfies Record<string, string>;
