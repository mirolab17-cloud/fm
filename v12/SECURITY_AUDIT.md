# تقرير فحص الأمان — v12
راجع الرد في المحادثة. أهم خطوات النشر:
1. انشر: firebase deploy --only firestore:rules,storage,hosting
2. Firebase Console ← Authentication ← Sign-in method: عطّل Anonymous (غير لازم لبقاء الموقع يعمل).
3. Google Cloud Console ← APIs & Services ← Credentials ← مفتاح الويب: قيّد HTTP referrers بنطاق موقعك فقط.
4. Authentication ← Settings ← فعّل User enumeration protection، وراجع Authorized domains.
5. Realtime Database: تأكد أنها مقفلة (القاعدة المرفقة تمنع كل شيء) أو احذفها إن لم تُستخدم.
6. تأكد أن المستند settings/bootstrap موجود، وأن عدد المدراء 1-2 فقط.
7. نسخة احتياطية دورية من backup.html وصدّرها خارج الموقع.
