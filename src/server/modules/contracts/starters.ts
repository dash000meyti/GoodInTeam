import type { contractKinds } from "@/server/db/schema/contracts";

/**
 * Built-in starter templates. They are NOT seeded: the panel offers them when
 * the owner has no templates yet, and creates them on demand
 * (`installStarterTemplates`) or applies one directly in the editor.
 */
export interface StarterTemplate {
  key: string;
  locale: "fa" | "en";
  title: string;
  kind: (typeof contractKinds)[number];
  requireSignature: boolean;
  summary: string;
  bodyMd: string;
}

const faDevelopment = `# قرارداد طراحی و توسعه نرم‌افزار

این قرارداد در تاریخ {{today}} میان **{{brand.name}}** به نمایندگی {{owner.name}} که از این پس «مجری» نامیده می‌شود، و **{{client.name}}** که از این پس «کارفرما» نامیده می‌شود، با شرایط زیر منعقد می‌گردد و برای طرفین لازم‌الاجراست.

## ماده ۱ — موضوع قرارداد

طراحی، توسعه، آزمون و تحویل نرم‌افزار «{{project.name}}» مطابق با شرح خدمات و نیازمندی‌هایی که پیش از آغاز کار به تأیید طرفین رسیده است.

## ماده ۲ — مدت قرارداد

مدت اجرای قرارداد از تاریخ امضای آن آغاز می‌شود و تاریخ تحویل نهایی **{{project.dueDate}}** است. هرگونه تأخیر ناشی از تأخیر کارفرما در ارائه اطلاعات، محتوا، دسترسی‌ها یا بازخورد، به همان میزان به مدت قرارداد افزوده می‌شود.

## ماده ۳ — مبلغ قرارداد و نحوه پرداخت

1. مبلغ کل قرارداد **{{project.budget}}** است.
2. پرداخت در سه قسط انجام می‌شود: ۴۰ درصد پیش‌پرداخت هم‌زمان با امضای قرارداد، ۳۰ درصد پس از تأیید نسخه آزمایشی و ۳۰ درصد پس از تحویل نهایی.
3. هر قسط حداکثر ظرف ۷ روز کاری پس از صدور صورتحساب پرداخت می‌شود. در صورت تأخیر در پرداخت، مجری می‌تواند تا زمان تسویه، ادامه کار را متوقف کند و مدت قرارداد به همان میزان تمدید می‌شود.

## ماده ۴ — تعهدات مجری

- اجرای کار با کیفیت حرفه‌ای و مطابق با استانداردهای رایج صنعت نرم‌افزار؛
- ارائه منظم گزارش پیشرفت از طریق پرتال مشتری؛
- حفظ محرمانگی اطلاعات و داده‌های کارفرما؛
- رفع ایرادهای فنی گزارش‌شده تا ۳۰ روز پس از تحویل نهایی، بدون دریافت هزینه اضافه.

## ماده ۵ — تعهدات کارفرما

- ارائه به‌موقع اطلاعات، محتوا، دسترسی‌ها و مستندات لازم برای اجرای کار؛
- اعلام بازخورد یا تأیید هر مرحله حداکثر ظرف ۵ روز کاری پس از تحویل آن؛ در غیر این صورت، آن مرحله تأییدشده تلقی می‌شود؛
- پرداخت به‌موقع اقساط مطابق ماده ۳.

## ماده ۶ — تغییر در دامنه کار

هرگونه تغییر یا افزودن به دامنه کار، تنها از طریق «درخواست تغییر» مکتوب و پس از توافق طرفین درباره هزینه و زمان‌بندی آن انجام می‌شود.

## ماده ۷ — مالکیت فکری

مالکیت کد منبع، طرح‌ها و مستندات اختصاصی تولیدشده در این پروژه، پس از تسویه کامل مبلغ قرارداد به کارفرما منتقل می‌شود. کتابخانه‌ها و ابزارهای متن‌باز یا عمومی تابع مجوز خود هستند. مجری می‌تواند پروژه را با ذکر نام کارفرما در نمونه‌کارهای خود معرفی کند، مگر آنکه کارفرما به‌صورت مکتوب مخالفت کند.

## ماده ۸ — محرمانگی

طرفین متعهد می‌شوند اطلاعات محرمانه‌ای را که در جریان اجرای این قرارداد از یکدیگر به دست می‌آورند، در مدت قرارداد و پس از پایان آن نزد خود محفوظ نگه دارند و جز برای اجرای این قرارداد از آن استفاده نکنند.

## ماده ۹ — فسخ قرارداد

هر یک از طرفین می‌تواند در صورت تخلف طرف دیگر از تعهدات این قرارداد و رفع‌نشدن آن ظرف ۱۰ روز پس از اخطار کتبی، قرارداد را فسخ کند. در این صورت، هزینه کارهای انجام‌شده تا تاریخ فسخ بر اساس میزان پیشرفت کار محاسبه و تسویه می‌شود.

## ماده ۱۰ — حل اختلاف

طرفین تلاش می‌کنند هرگونه اختلاف ناشی از این قرارداد را از راه مذاکره و به‌صورت دوستانه حل‌وفصل کنند. در صورت عدم توافق، موضوع از طریق مراجع ذی‌صلاح قانونی پیگیری خواهد شد.

## ماده ۱۱ — امضای الکترونیکی

این قرارداد در ۱۱ ماده تنظیم شده است. طرفین توافق می‌کنند که امضای الکترونیکی این سند، همراه با سوابق ثبت‌شده آن (زمان امضا، نشانی IP و اثر انگشت دیجیتال متن)، برای اثبات انعقاد و مفاد این قرارداد میان آن‌ها معتبر و قابل استناد است.
`;

const faMilestone = `# صورت‌جلسه تحویل و تأیید مرحله

- **پروژه:** {{project.name}}
- **کارفرما:** {{client.name}}
- **مجری:** {{brand.name}}
- **تاریخ:** {{today}}
- **عنوان مرحله:** {{milestone.title}}

## موارد تحویل‌شده

- {{milestone.deliverables}}

## اعلام تأیید

کارفرما با تأیید این صورت‌جلسه اعلام می‌کند که موارد فوق را دریافت و بررسی کرده و تحویل این مرحله را مطابق با شرح خدمات قرارداد می‌پذیرد.

## پیامدهای تأیید

1. با تأیید این صورت‌جلسه، مرحله فوق «تحویل‌شده» تلقی می‌شود و قسط مربوط به آن طبق قرارداد قابل پرداخت است.
2. ایرادهای فنی که پس از این تأیید مشاهده شوند، در چارچوب دوره پشتیبانی قرارداد رفع خواهند شد.
3. درخواست‌های جدید یا تغییر در دامنه کار، مشمول فرایند «درخواست تغییر» است.
`;

const enDevelopment = `# Software Development Agreement

This Agreement is made on {{today}} between **{{brand.name}}**, represented by {{owner.name}} (the "Developer"), and **{{client.name}}** (the "Client").

## 1. Scope of work

The Developer will design, build, test and deliver the software "{{project.name}}" as described in the scope of work and requirements approved by both parties before work begins.

## 2. Timeline

Work starts on the date this Agreement is signed. The target delivery date is **{{project.dueDate}}**. Delays caused by late information, content, access or feedback from the Client extend the timeline by the same amount.

## 3. Fees and payment

1. The total fee is **{{project.budget}}**.
2. Payment is made in three instalments: 40% upon signing, 30% upon approval of the beta version and 30% upon final delivery.
3. Invoices are due within 7 business days. If a payment is late, the Developer may pause work until it is settled and the timeline is extended accordingly.

## 4. Developer obligations

- Perform the work professionally and in line with common industry standards;
- Publish regular progress updates in the client portal;
- Keep the Client's information and data confidential;
- Fix reported defects free of charge for 30 days after final delivery.

## 5. Client obligations

- Provide the information, content, access and documentation needed, on time;
- Review each delivered milestone within 5 business days; a milestone without feedback within that period is deemed accepted;
- Pay instalments on time according to section 3.

## 6. Changes in scope

Any change or addition to the scope is made only through a written change request, once both parties agree on its cost and schedule.

## 7. Intellectual property

Ownership of the source code, designs and documentation created specifically for this project transfers to the Client upon full payment. Open-source and third-party components remain under their own licenses. The Developer may showcase the project in its portfolio unless the Client objects in writing.

## 8. Confidentiality

Both parties will keep confidential any non-public information received from the other party during and after this Agreement, and use it only to perform this Agreement.

## 9. Termination

Either party may terminate this Agreement if the other party breaches it and fails to cure the breach within 10 days of written notice. Work completed up to the termination date will be paid pro rata.

## 10. Disputes

The parties will first try to resolve any dispute amicably through negotiation. If that fails, the dispute will be referred to the competent courts.

## 11. Electronic signature

The parties agree that signing this document electronically, together with its recorded evidence (time of signing, IP address and a fingerprint of the text), is valid and binding proof of this Agreement and its terms.
`;

const enMilestone = `# Milestone Acceptance

- **Project:** {{project.name}}
- **Client:** {{client.name}}
- **Delivered by:** {{brand.name}}
- **Date:** {{today}}
- **Milestone:** {{milestone.title}}

## Deliverables

- {{milestone.deliverables}}

## Acceptance

By approving this document, the Client confirms that the deliverables above have been received and reviewed, and accepts this milestone as delivered according to the agreed scope of work.

## What acceptance means

1. The milestone is considered delivered and its instalment becomes payable under the agreement.
2. Defects found after acceptance will be fixed within the agreement's support period.
3. New requests or changes in scope follow the change-request process.
`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "fa-software-development",
    locale: "fa",
    title: "قرارداد طراحی و توسعه نرم‌افزار",
    kind: "contract",
    requireSignature: true,
    summary: "قرارداد کامل ۱۱ ماده‌ای: موضوع، مدت، پرداخت سه‌قسطی، تعهدات، مالکیت فکری و فسخ.",
    bodyMd: faDevelopment,
  },
  {
    key: "fa-milestone-acceptance",
    locale: "fa",
    title: "تأییدیه تحویل مرحله (مایلستون)",
    kind: "approval",
    requireSignature: false,
    summary: "صورت‌جلسه کوتاه برای تأیید تحویل یک مرحله و آزاد شدن قسط مربوط.",
    bodyMd: faMilestone,
  },
  {
    key: "en-software-development",
    locale: "en",
    title: "Software development agreement",
    kind: "contract",
    requireSignature: true,
    summary:
      "Full 11-section agreement: scope, timeline, 3-instalment payment, IP and termination.",
    bodyMd: enDevelopment,
  },
  {
    key: "en-milestone-acceptance",
    locale: "en",
    title: "Milestone acceptance",
    kind: "approval",
    requireSignature: false,
    summary: "Short sign-off that a milestone was delivered and its instalment is due.",
    bodyMd: enMilestone,
  },
];

export function findStarter(key: string) {
  return STARTER_TEMPLATES.find((s) => s.key === key) ?? null;
}
