# موقع خريطة العائلة — دليل التشغيل

## الملفات
index (القائمة) · add_edit_person · family_tree · profile · events · statistics · export_data · **login (جديد)** · **admin (جديد)**
+ `firebase-config.js` (إعداد مركزي) · `auth-guard.js` (حارس الصلاحيات) · قواعد الأمان: `firestore.rules` `storage.rules` `database.rules.json`

## خطوات التشغيل (مرة واحدة)
1. Firebase Console ← Authentication ← Sign-in method ← فعّل **Email/Password**.
2. Authentication ← Settings ← Authorized domains ← أضف نطاق الاستضافة (مثل `username.github.io`).
3. Firestore Database ← أنشئ قاعدة بيانات (الوضع Production).
4. انشر القواعد: `firebase deploy --only firestore:rules,storage,database` (أو الصقها يدوياً في الـ Console).
5. افتح `login.html` وأنشئ حسابك ← ثم في Firestore افتح `users/{uid الخاص بك}` وغيّر `role` إلى `admin` (مرة واحدة فقط؛ بعدها تدير الباقين من `admin.html`).

## الجداول (Collections)
| المجموعة | الاستخدام | قراءة | كتابة |
|---|---|---|---|
| `familyMembers/{id}` | بيانات الأشخاص (firstName, fatherName, grandFatherName, familyName, fullName, fatherId, motherId, gender, birthDate, isAlive, deathDate, maritalStatus, spouseIds[], manualSpouseNames[], childrenIds[], manualChildNames[], idNumber, phoneNumber, روابط, notes) | مشاهد+ | محرر+ (الحذف: مدير) |
| `events/{id}` | الأحداث المخصصة (title, date, type, relatedPersonId, relatedPersonName) | مشاهد+ | محرر+ (الحذف: مدير) |
| `users/{uid}` | الأدوار (email, displayName, role, createdAt) | صاحبه/المدير | إنشاء ذاتي بدور pending؛ التعديل للمدير فقط |
| `settings/{id}` | إعدادات الموقع (جاهزة في القواعد، لم تُربط بصفحة بعد) | مشاهد+ | مدير |
| `auditLogs/{id}` | سجل التعديلات (جاهز في القواعد، لم يُربط بصفحة بعد) | مدير | محرر+ (إضافة فقط) |

الأدوار: `pending` (لا يرى شيئاً) < `viewer` < `editor` < `admin`.

## ما أُصلح في ملفاتك
- **مسار البيانات**: كان `artifacts/default-app-id/familyMembers` (بقايا بيئة تجريبية) ← صار `familyMembers` و`events`.
- **التصدير كان فارغاً دائماً**: يقرأ من `users/{userId}/familyMembers` بينما بقية الصفحات تكتب في مسار آخر ← وُحِّد.
- **الملف الشخصي**: كان يقرأ `spouseId/spouseName` والنموذج يكتب `spouseIds/manualSpouseNames` ← لن تظهر الزوجة؛ أُصلح.
- **صفحة الإضافة/التعديل (2.html)**: مستمع `isAlive` مكرر ومفتوح ابتلع كود التهيئة فلم يكن `?id=` يُقرأ ولا تُحمَّل البيانات؛ أُصلح.
- **روابط مكسورة**: `family_tree.html` غير موجود (الملف كان `family.html`) ← أُعيدت تسميته. `1.html` و`index (1).html` نسختان متطابقتان ← صارا `index.html`.
- **شريط التنقل** في القائمة والإضافة كان ناقصاً (الإحصائيات/التصدير) ← أُضيف.
- إعداد Firebase المكرر في 7 ملفات ← ملف واحد `firebase-config.js`.

## تنبيهات
- بيانات الهوية والهاتف حساسة: القواعد تمنع القراءة بدون تسجيل دخول وموافقة. (مفتاح apiKey عام بطبيعته للويب، الحماية هي القواعد.)
- Realtime Database غير مستخدمة (التطبيق يعمل على Firestore) فأُغلقت بالكامل.
- رفع الصور: قاعدة Storage جاهزة (`persons/{id}/`) لكن زر رفع الصورة في النموذج لم يُربط بالتخزين بعد.
