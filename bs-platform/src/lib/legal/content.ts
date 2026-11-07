// Legal content for the Terms of Service and Privacy Policy pages.
// Kept as structured content (not i18n message keys) because legal documents are
// long-form prose maintained as whole documents per locale.

export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalDocument {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

const LAST_UPDATED_AR = 'آخر تحديث: تموز 2026'
const LAST_UPDATED_EN = 'Last updated: July 2026'

export const TERMS: Record<'ar' | 'en', LegalDocument> = {
  ar: {
    title: 'شروط الاستخدام',
    updated: LAST_UPDATED_AR,
    intro:
      'مرحبًا بك في منصة Business Skills. باستخدامك للمنصة فإنك توافق على هذه الشروط. يُرجى قراءتها بعناية.',
    sections: [
      {
        heading: '1. قبول الشروط',
        body: [
          'باستخدامك للمنصة أو إنشائك حسابًا عليها، فإنك تُقرّ بأنك قرأت هذه الشروط وفهمتها ووافقت على الالتزام بها. إذا كنت لا توافق، فلا يجوز لك استخدام المنصة.',
          'يجب ألا يقل عمرك عن 16 عامًا لاستخدام المنصة، أو أن يكون لديك موافقة وليّ الأمر.',
        ],
      },
      {
        heading: '2. الحسابات والأدوار',
        body: [
          'أنت مسؤول عن الحفاظ على سرية بيانات دخولك وعن جميع الأنشطة التي تتم عبر حسابك.',
          'تشمل الأدوار: طالب، مدرب، شركة، مستقل، وإدارة. تتطلب بعض الأدوار (مثل المدرب والشركة والمستقل) موافقة الإدارة قبل التفعيل.',
          'يُحظر انتحال شخصية الغير أو تقديم معلومات كاذبة عند التسجيل.',
        ],
      },
      {
        heading: '3. المحتوى التعليمي والكورسات',
        body: [
          'يحتفظ المدربون بملكية المحتوى الذي ينشرونه، ويمنحون المنصة ترخيصًا لعرضه وتوزيعه للطلاب المسجّلين.',
          'يُمنح الطالب حق وصول شخصي غير قابل للتحويل إلى الكورسات التي يشتريها. يُحظر إعادة بيع أو مشاركة أو تسجيل المحتوى دون إذن.',
          'تحتفظ المنصة بحق مراجعة أو إزالة أي محتوى يخالف هذه الشروط أو القوانين المعمول بها.',
        ],
      },
      {
        heading: '4. الوظائف والخدمات',
        body: [
          'المنصة توفّر مساحة لعرض الوظائف والخدمات والتواصل بين الأطراف؛ وهي ليست طرفًا في أي عقد عمل أو اتفاق خدمة يُبرم بين المستخدمين.',
          'أنت مسؤول عن التحقق من صحة العروض والطلبات قبل التعامل، والمنصة غير مسؤولة عن أي نزاع مباشر بين المستخدمين.',
        ],
      },
      {
        heading: '5. المدفوعات والرسوم',
        body: [
          'قد تخضع بعض الميزات لرسوم يتم عرضها بوضوح قبل الشراء. تُعالَج المدفوعات عبر مزوّدين خارجيين.',
          'تُطبَّق سياسة الاسترجاع الموضّحة داخل المنصة على المشتريات المؤهّلة.',
        ],
      },
      {
        heading: '6. السلوك المقبول',
        body: [
          'يُحظر استخدام المنصة لأي غرض غير قانوني أو لنشر محتوى مسيء أو مضلّل أو ينتهك حقوق الآخرين.',
          'يُحظر محاولة اختراق المنصة أو تعطيلها أو الوصول غير المصرّح به إلى بيانات المستخدمين.',
        ],
      },
      {
        heading: '7. إنهاء الحساب',
        body: [
          'يحق للمنصة تعليق أو إنهاء أي حساب يخالف هذه الشروط، مع إشعار المستخدم متى أمكن.',
          'يمكنك حذف حسابك في أي وقت عبر إعدادات الحساب أو بالتواصل مع الدعم.',
        ],
      },
      {
        heading: '8. إخلاء المسؤولية',
        body: [
          'تُقدَّم المنصة «كما هي» دون ضمانات صريحة أو ضمنية. لا تضمن المنصة خلوّها من الأخطاء أو انقطاع الخدمة.',
        ],
      },
      {
        heading: '9. تعديل الشروط',
        body: [
          'قد نُحدّث هذه الشروط من وقت لآخر. استمرارك في استخدام المنصة بعد التحديث يعني موافقتك على الشروط المُعدّلة.',
        ],
      },
      {
        heading: '10. التواصل',
        body: ['لأي استفسار حول هذه الشروط، يمكنك التواصل مع فريق الدعم عبر المنصة.'],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    updated: LAST_UPDATED_EN,
    intro:
      'Welcome to Business Skills. By using the platform you agree to these Terms. Please read them carefully.',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: [
          'By using the platform or creating an account, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree, you may not use the platform.',
          'You must be at least 16 years old to use the platform, or have parental consent.',
        ],
      },
      {
        heading: '2. Accounts and Roles',
        body: [
          'You are responsible for keeping your credentials confidential and for all activity under your account.',
          'Roles include student, instructor, company, freelancer, and admin. Some roles (instructor, company, freelancer) require admin approval before activation.',
          'Impersonation or providing false information at registration is prohibited.',
        ],
      },
      {
        heading: '3. Educational Content and Courses',
        body: [
          'Instructors retain ownership of the content they publish and grant the platform a license to display and distribute it to enrolled students.',
          'Students receive a personal, non-transferable right to access purchased courses. Reselling, sharing, or recording content without permission is prohibited.',
          'The platform reserves the right to review or remove any content that violates these Terms or applicable law.',
        ],
      },
      {
        heading: '4. Jobs and Services',
        body: [
          'The platform provides a space to list jobs and services and connect parties; it is not a party to any employment contract or service agreement between users.',
          'You are responsible for verifying offers and requests before transacting. The platform is not liable for disputes directly between users.',
        ],
      },
      {
        heading: '5. Payments and Fees',
        body: [
          'Some features may be subject to fees shown clearly before purchase. Payments are processed by third-party providers.',
          'The refund policy shown within the platform applies to eligible purchases.',
        ],
      },
      {
        heading: '6. Acceptable Use',
        body: [
          'You may not use the platform for any unlawful purpose or to post abusive, misleading, or infringing content.',
          'Attempting to hack, disrupt, or gain unauthorized access to user data is prohibited.',
        ],
      },
      {
        heading: '7. Termination',
        body: [
          'The platform may suspend or terminate any account that violates these Terms, with notice where possible.',
          'You may delete your account at any time via account settings or by contacting support.',
        ],
      },
      {
        heading: '8. Disclaimer',
        body: [
          'The platform is provided "as is" without warranties of any kind. We do not guarantee it is error-free or uninterrupted.',
        ],
      },
      {
        heading: '9. Changes to Terms',
        body: [
          'We may update these Terms from time to time. Continued use after an update constitutes acceptance of the revised Terms.',
        ],
      },
      {
        heading: '10. Contact',
        body: ['For any question about these Terms, you can contact the support team via the platform.'],
      },
    ],
  },
}

export const PRIVACY: Record<'ar' | 'en', LegalDocument> = {
  ar: {
    title: 'سياسة الخصوصية',
    updated: LAST_UPDATED_AR,
    intro:
      'نحترم خصوصيتك في Business Skills. توضّح هذه السياسة البيانات التي نجمعها وكيف نستخدمها ونحميها.',
    sections: [
      {
        heading: '1. البيانات التي نجمعها',
        body: [
          'بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف (اختياري)، والدور.',
          'بيانات الملف الشخصي: السيرة الذاتية، المهارات، الخبرات، والروابط التي تختار إضافتها.',
          'بيانات الاستخدام: تقدّم الكورسات، الطلبات، والتفاعلات داخل المنصة.',
          'البيانات التقنية: نوع الجهاز والمتصفح لأغراض التشغيل والأمان.',
        ],
      },
      {
        heading: '2. كيف نستخدم بياناتك',
        body: [
          'لتقديم خدمات المنصة وتخصيص تجربتك (مثل التوصيات ومتابعة التقدّم).',
          'للتواصل معك بإشعارات مهمة تتعلق بحسابك أو مشترياتك.',
          'لتحسين المنصة وضمان أمانها ومنع إساءة الاستخدام.',
        ],
      },
      {
        heading: '3. حماية بياناتك',
        body: [
          'نطبّق أمانًا على مستوى الصفوف (RLS) على قاعدة البيانات، ونقيّد الوصول إلى بيانات التواصل الحساسة (البريد والهاتف).',
          'لا نبيع بياناتك الشخصية لأي طرف ثالث.',
        ],
      },
      {
        heading: '4. مشاركة البيانات',
        body: [
          'نشارك الحد الأدنى الضروري من البيانات مع مزوّدي خدمات موثوقين (مثل الاستضافة، ومعالجة المدفوعات، وإرسال البريد والإشعارات) لتشغيل المنصة فقط.',
          'قد نكشف بياناتك إذا اقتضى القانون ذلك أو لحماية حقوق المستخدمين والمنصة.',
        ],
      },
      {
        heading: '5. حقوقك',
        body: [
          'يمكنك الوصول إلى بياناتك وتعديلها عبر إعدادات الحساب.',
          'يمكنك طلب حذف حسابك وبياناتك المرتبطة به.',
          'يمكنك التحكم في تفضيلات الإشعارات.',
        ],
      },
      {
        heading: '6. ملفات تعريف الارتباط (Cookies)',
        body: [
          'نستخدم ملفات ضرورية للحفاظ على جلسة الدخول وتشغيل المنصة. لا نستخدم تتبّعًا إعلانيًا خارجيًا.',
        ],
      },
      {
        heading: '7. الاحتفاظ بالبيانات',
        body: [
          'نحتفظ ببياناتك طالما كان حسابك نشطًا أو حسب ما يقتضيه القانون. عند الحذف، تُزال بياناتك الشخصية وفق سياساتنا.',
        ],
      },
      {
        heading: '8. تحديث السياسة',
        body: ['قد نُحدّث هذه السياسة، وسنُشعرك بالتغييرات الجوهرية عبر المنصة.'],
      },
      {
        heading: '9. التواصل',
        body: ['لأي استفسار حول خصوصيتك، تواصل مع فريق الدعم عبر المنصة.'],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: LAST_UPDATED_EN,
    intro:
      'At Business Skills we respect your privacy. This policy explains what data we collect and how we use and protect it.',
    sections: [
      {
        heading: '1. Data We Collect',
        body: [
          'Account data: name, email, phone (optional), and role.',
          'Profile data: bio, skills, experience, and links you choose to add.',
          'Usage data: course progress, orders, and interactions within the platform.',
          'Technical data: device and browser type for operation and security.',
        ],
      },
      {
        heading: '2. How We Use Your Data',
        body: [
          'To provide platform services and personalize your experience (e.g. recommendations and progress tracking).',
          'To communicate important notifications related to your account or purchases.',
          'To improve the platform, ensure its security, and prevent abuse.',
        ],
      },
      {
        heading: '3. Protecting Your Data',
        body: [
          'We apply Row Level Security (RLS) on the database and restrict access to sensitive contact data (email and phone).',
          'We do not sell your personal data to any third party.',
        ],
      },
      {
        heading: '4. Data Sharing',
        body: [
          'We share the minimum necessary data with trusted service providers (hosting, payment processing, email and notifications) solely to operate the platform.',
          'We may disclose data if required by law or to protect the rights of users and the platform.',
        ],
      },
      {
        heading: '5. Your Rights',
        body: [
          'You can access and edit your data via account settings.',
          'You can request deletion of your account and associated data.',
          'You can control your notification preferences.',
        ],
      },
      {
        heading: '6. Cookies',
        body: [
          'We use essential cookies to maintain your login session and operate the platform. We do not use external advertising trackers.',
        ],
      },
      {
        heading: '7. Data Retention',
        body: [
          'We retain your data while your account is active or as required by law. Upon deletion, your personal data is removed per our policies.',
        ],
      },
      {
        heading: '8. Policy Updates',
        body: ['We may update this policy and will notify you of material changes via the platform.'],
      },
      {
        heading: '9. Contact',
        body: ['For any privacy question, contact the support team via the platform.'],
      },
    ],
  },
}
