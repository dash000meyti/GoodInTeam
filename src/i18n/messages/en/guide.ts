import type { guide as fa } from "../fa/guide";

export const guide: Record<keyof typeof fa, string> = {
  name: "Virtual me",
  toggle: "Pixel guide",
  show: "Show the guide",
  hide: "Hide the guide",
  explain: "What's this part?",
  tour: "Tour this page",
  next: "Next ({i} of {n})",
  endTour: "End tour",
  tourDone: "That's all! Call me from the menu bar any time.",
  tipsAuto: "Show tips automatically",

  greeting:
    "Hi! I'm {owner}'s pixel twin. As you reach each part, I'll tell you briefly what it's about.",
  greetingNoName: "Hi! I'm Good In Team's pixel twin. I'll explain each part as you reach it.",
  greetingCompact:
    "Hi! I'm {owner}'s pixel twin. When you see my \"!\", tap or click me and I'll explain that part.",
  greetingCompactNoName:
    "Hi! I'm Good In Team's pixel twin. When you see my \"!\", tap or click me and I'll explain that part.",
  idle: "Still here? The dock at the bottom takes you to any part of the site.",

  // ── Home ──
  home_hero:
    "That's what we do, in one line. The diagram beside it shows every project's path: idea, design, code, launch.",
  spot_diagram:
    "This is every project's path, and you can follow all of it live in your client portal.",
  home_brands:
    '"Good In" is our family name: Team builds whole products, Studio designs, Code engineers.',
  home_trust: "A few of the people who trusted us with their product.",
  home_work: "Real projects with real numbers. Open one to see the decisions behind it.",
  home_services: "Every service belongs to a Good In brand, so you know exactly who works on it.",
  home_process:
    "No black boxes: your own portal, live progress, signed contracts and clear invoices.",
  home_process_portal: "Every client gets their own portal: projects and updates in one place.",
  home_process_progress: "Progress and hours update live.",
  home_process_contracts: "Read the contract online and sign it right there.",
  home_process_invoices: "Every invoice line maps to real work.",
  home_stats: "Our own work OS counted these. Hours are tracked, not guessed.",
  home_latest: "I write and film what I learn. New here? Start with the course.",
  home_testimonials: "Don't take my word for it. Hear it from clients.",
  home_cta: "Ready? Tell me your idea. I usually reply within a working day.",

  // ── Shell + shared boxes ──
  footer: "Links, the RSS feed and API docs are at the end of the page.",
  cta: "Shall we build your next project together? Write to us; we reply within one business day.",

  // ── Site pages ──
  work_index: "All our work is here. Filter by stack or year.",
  work_grid: "Each card is a case study: the challenge, the solution, the stack and the results.",
  work_detail: "The full story of this project: the problem, the decisions, the result.",
  work_story: "The story is here, with the client, year, role and stack beside it.",
  services_index:
    "Product design and engineering, mobile apps, AI agents and consulting, all with a transparent process.",
  services_brand_team: "Good In Team builds whole products, from idea to launch.",
  services_brand_studio: "Good In Studio designs interfaces, brands and experiences.",
  services_brand_code: "Good In Code engineers web, mobile and AI agents.",
  services_process:
    "We work together in four steps: discovery, design and plan, build with live reports, launch and support.",
  services_faq:
    "Common questions answered: cost, timing, tracking progress, support and who owns the code.",
  service_detail: "What this service includes and what you'll get. Questions? Just ask.",
  service_body:
    "Ready for this service? The box beside the text takes your project details; we reply within one business day.",
  service_faq: "Common questions about this service, answered.",
  blog_index: "Articles, videos and short notes. Search works too.",
  blog_grid: "The newest posts come first; the chips above filter by type or tag.",
  post_detail: "The summary comes first; the full text follows.",
  post_body: 'The "On this page" list beside the text jumps to any part.',
  post_share: "Share this post here, or read about the author.",
  learn_index: "Step-by-step courses, from the basics to launch.",
  learn_grid: "Each card is a course, with its level and number of lessons.",
  course: "Lessons run in order; each is short and hands-on.",
  course_lessons: "The course contents, in order. Start with the first lesson.",
  lesson: "This lesson's place in the course is at the top: lesson n of the total.",
  lesson_body: "The lesson is here, and the list beside it jumps to any part.",
  lesson_nav: "The previous and next lessons are right here.",
  about: "This is me, and what we care about.",
  about_values: "Four things we value: transparency, quality, learning and speed.",
  about_stats: "By the numbers: projects delivered, hours tracked, clients and articles.",
  contact: "The form is short. The more you tell me, the better my reply.",
  not_found: "This page is lost, but I'm still here. Head back with the Home button or the dock.",

  // ── Panel (quiet guide, one line per module) ──
  panel_dashboard: "Today at a glance: timers, due tasks and the latest changes.",
  panel_portalHome: "Your projects live here; progress, invoices and contracts are one click away.",
  panel_time:
    "Run timers in parallel; every logged hour flows into reports and invoices. You can start one from the menu bar too.",
  panel_calendar: "Press T to jump to today and N to create an event.",
  panel_tasks: "Press N for a new task; reminders notify you on time.",
  panel_projects: "Each project has its own tabs, and you decide what the client sees.",
  panel_clients: "Manage clients and their portal access here.",
  panel_finance: "Accounts, transactions and balances, in several currencies.",
  panel_invoices: "Invoices get a public link, and their payment status is tracked.",
  panel_contracts: "Write a contract, send it and collect an online signature.",
  panel_docs: "The team knowledge base; ⌘S or Ctrl+S saves.",
  panel_vault: "Secrets are encrypted in your browser; the server never sees plaintext.",
  panel_content: "Posts, work and services for the site; pick a Good In brand for each service.",
  panel_inbox: "Messages from the site's contact form land here.",
  panel_media: "Images and files for the site and the panel.",
  panel_settings: "Account, security, appearance and the dock.",
  panel_designSystem: "The living catalog of UI parts; check here before building something new.",
};
