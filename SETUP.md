# خطوات التشغيل (5 دقائق)

1. Firebase Console ← Authentication ← Sign-in method: فعّل **Email/Password** و**Anonymous**.
2. Firestore Database ← Rules: الصق محتوى `firestore.rules` كاملاً ثم **Publish**.
3. ارفع كل الملفات في مجلد واحد على استضافة **https** (GitHub Pages / Firebase Hosting). لا تفتحها بنقر الملف.
4. افتح `login.html` وأنشئ حسابك ← أول حساب يصبح **مديراً تلقائياً**.
5. إن كانت بياناتك القديمة لا تظهر: `admin.html` ← **استيراد الآن**.

إن ظهرت رسالة حمراء فهي تذكر السبب (غالباً: القواعد غير منشورة).
