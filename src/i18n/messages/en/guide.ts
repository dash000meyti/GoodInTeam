import type { guide as fa } from "../fa/guide";

export const guide: Record<keyof typeof fa, string> = {
  name: "GoodInBot",
  toggle: "GoodInBot",
  show: "Show GoodInBot",
  hide: "Hide GoodInBot",
  explain: "What's this part?",
  tour: "Tour this page",
  next: "Next ({i} of {n})",
  endTour: "End tour",
  tourDone: "That's all! Call me from the menu bar any time.",
  tipsAuto: "Show tips automatically",

  greeting:
    "Hi, I'm GoodInBot, {owner}'s pixel assistant. As you reach each part of the site, I'll tell you briefly what it's about.",
  greetingNoName:
    "Hi, I'm GoodInBot. As you reach each part of the site, I'll tell you briefly what it's about.",
  greetingCompact:
    "Hi, I'm GoodInBot, {owner}'s pixel assistant. When you see my \"!\", tap or click me and I'll explain that part.",
  greetingCompactNoName:
    "Hi, I'm GoodInBot. When you see my \"!\", tap or click me and I'll explain that part.",
  idle: "Still here? The dock at the bottom takes you to any part of the site.",

  // ── Home ──
  home_hero:
    "That's what we do, in one line. The diagram beside it shows every project's path: idea, design, build, deploy.",
  spot_diagram:
    "Every project follows this path, and clients watch its progress live in their own portal.",
  home_brands:
    '"Good In" is our family name: Team builds whole products, Studio designs, Code engineers.',
  home_trust: "A few of the teams and businesses we've built with.",
  home_work:
    "Products we've shipped, each with a real problem, a considered solution and a measurable outcome. Open one for the full case study.",
  home_services:
    "From design to AI, under one roof. The chip on each service shows which Good In brand runs it.",
  home_process:
    "Full transparency: your own portal with live progress, contracts, invoices and time reports. No surprises.",
  home_process_portal:
    "Every client gets a private portal: status, milestones, updates and files on one page.",
  home_process_progress:
    "Progress comes from milestones and finished tasks, and every working hour is tracked.",
  home_process_contracts:
    "Scope, timeline and price are written down from day one, and you sign the contract online.",
  home_process_invoices: "Every invoice is tied to real hours and milestones.",
  home_stats:
    "Our numbers so far: projects delivered, hours tracked, clients and partner teams, articles and tutorials.",
  home_latest:
    "We write down what we learn: real-world lessons on building products, architecture, AI and business.",
  home_testimonials: "Don't take my word for it. Hear it from our clients.",
  home_cta:
    "Shall we build your next project together? Book a consultation: we reply within one business day, no commitment.",

  // ── Shell + shared boxes ──
  footer: "Down here: links to every section, the RSS feed, the sitemap, and API & MCP.",
  cta: "Let's build your next project together. We reply within one business day: no commitment, just a good conversation.",

  // ── Site pages ──
  work_index:
    "Case studies of products we designed and built, each with the challenge, the solution, the stack and the results.",
  work_grid:
    "Each card opens a case study. The chips above the cards filter them by stack or year.",
  work_detail:
    "This case study at a glance: the title, a short summary and the cover. The full story follows below.",
  work_story: "The story is here, with the client, year, role and stack beside it.",
  services_index:
    "Product design and engineering, mobile apps, automation and AI agents, and technical consulting, all with a transparent process.",
  services_brand_team: "Good In Team builds whole products, from idea to launch.",
  services_brand_studio: "Good In Studio designs interfaces, brands and experiences.",
  services_brand_code: "Good In Code does the engineering: web, mobile and AI agents.",
  brand_studio:
    "Good In Studio is our design side: product design, UX and UI, brand and motion. Start a project right here.",
  brand_code:
    "Good In Code is our engineering side: web apps, mobile apps and AI agents. Start a project right here.",
  brand_services_studio:
    "Good In Studio's services. Each has its own page, with the full description and a consultation button.",
  brand_services_code:
    "Good In Code's services. Each has its own page, with the full description and a consultation button.",
  brand_family:
    '"Good In" stays; the second word says what we\'re good in. The other two members of the family are right here.',
  services_process:
    "We work together in four steps: a discovery call, design and plan, building with live reports, then launch and support.",
  services_faq:
    "Common questions answered: cost, timing, following the progress, support after launch, and who owns the code.",
  service_detail:
    "This service at a glance. The chip above the title shows which Good In brand runs it.",
  service_body:
    "The full description is here. Beside it: what you get, and a button to book a consultation.",
  service_faq: "Common questions about this service, answered.",
  blog_index:
    "Articles, vlogs and short notes from behind the scenes of building products. The search box finds any post.",
  blog_grid: "Each card is a post. The chips above filter them by type or tag.",
  post_detail: "The TL;DR comes first; the full text follows.",
  post_body: 'The "On this page" list beside the text jumps to any part.',
  post_share: "Share this post from here, or read about the author.",
  learn_index:
    "Project-based courses and short tutorials: the same things we use on real projects.",
  learn_grid: "Each card is a course, with its level and number of lessons.",
  course: "This course at a glance: how many lessons it has, the total time and its level.",
  course_lessons: "The course contents, in order. Start with the first lesson.",
  lesson: "The top of the page shows where this lesson sits in the course: lesson n of the total.",
  lesson_body: "The lesson is here, and the list beside it jumps to any part.",
  lesson_nav: "The previous and next lessons are right here.",
  about:
    "The story behind the studio, with a card beside it: who I am, where we're based and where to find us.",
  about_values: "Four things we value: transparency, quality, learning and speed.",
  about_stats: "By the numbers: projects delivered, hours tracked, clients and articles.",
  contact:
    "Tell us about your project in the form; we reply within one business day. Ways to reach us directly are beside it.",
  not_found: "This page is lost, but I'm still here. Head back with the Home button or the dock.",

  // ── Panel (quiet guide, one line per module) ──
  panel_dashboard: "Today at a glance: timers, due tasks and the latest changes.",
  panel_portalHome: "Your projects live here; progress, invoices and contracts are one click away.",
  panel_clientProjects: "Here are your projects, and where each one stands.",
  panel_clientInvoices: "Your invoices are here, and whether each one is paid.",
  panel_clientContracts: "Every contract and approval we've sent you, in one place.",
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
