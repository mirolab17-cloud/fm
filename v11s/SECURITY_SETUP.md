# إعداد الأمان بعد الإصلاح

## 1) المدير الأول
لا يوجد Bootstrap من المتصفح.

أنشئ المستخدم الأول من Firebase Authentication، ثم أنشئ/عدّل وثيقته يدويًا في Firestore:
`users/{UID}`
واجعل:
`role: "admin"`

يمكن إضافة:
`email`, `displayName`, `permissions`, `branchPermissions`, `disabled: false` حسب الحاجة.

## 2) انشر القواعد
Firebase Console → Firestore Database → Rules → استبدل القواعد بمحتوى `firestore.rules` ثم Publish.

Firebase Console → Storage → Rules → استبدل القواعد بمحتوى `storage.rules` ثم Publish.

## 3) ملاحظات مهمة
- `settings/bootstrap` مغلق نهائيًا من Client SDK.
- لا يمكن للمستخدم رفع دوره إلى admin/editor.
- `familyPrivate` (رقم الهوية والجوال) متاح للمدير فقط.
- محررو الفروع مقيدون بالفرع عند إنشاء/تعديل أفراد العائلة.
- `loginIndex` يبقى قابلًا للقراءة فقط لأن تسجيل الدخول برقم الهوية في النسخة الحالية يحتاج إلى تحويل الرقم إلى البريد. لا يحتوي الفهرس على رقم الهوية الخام.
- رفع الملفات مقيد بالحجم والأنواع المسموح بها.

## 4) اختبار سريع قبل النشر
جرّب بحساب Viewer وEditor:
- إنشاء/تعديل users.role → يجب أن يفشل.
- إنشاء settings/bootstrap → يجب أن يفشل.
- قراءة familyPrivate → يجب أن تفشل.
- تعديل شخص خارج الفروع المسموحة → يجب أن يفشل.
- إضافة phoneNumber/idNumber إلى familyMembers → يجب أن تفشل.
- رفع HTML/SVG/ملف تنفيذي إلى Storage → يجب أن يفشل.
