# إعداد ميزة الأجهزة والجلسات

1. انشر firestore.rules الجديد.
2. لا تحتاج إلى Firebase Admin SDK لهذه النسخة؛ تسجيل الخروج الإداري يتم عبر sessionVersion وتستجيب الأجهزة المفتوحة فورًا.
3. الأجهزة تُحفظ تحت users/{uid}/devices/{deviceId}.
4. الجهاز يُعتبر نشطًا إذا أرسل heartbeat خلال آخر 3 دقائق.
5. إزالة الجهاز تعني وضع revoked=true، وعندها تسجل الصفحة خروج الجهاز تلقائيًا.
6. إذا أردت إبطال Refresh Tokens على مستوى Firebase Authentication نفسه، فهذا يحتاج Cloud Functions/Admin SDK؛ النسخة الحالية تنفذ إبطال جلسة التطبيق بشكل فوري وآمن من جهة Firestore.
7. سجّل الدخول من login.html وإنشاء الحساب من register.html.
