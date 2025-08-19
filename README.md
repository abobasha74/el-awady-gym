# El-Awady Gym (Static HTML/CSS/JS + Firebase)

> نسخة طبق الأصل من النصوص والعناوين الظاهرة في الملف، بدون إضافة عناصر غير مذكورة.

## التشغيل محليًا
1. افتح `index.html` مباشرة في المتصفح (يفضل عبر خادم محلي).
2. قبل الاستخدام، **استبدل مفاتيح Firebase** داخل `app.js` في كائن `firebaseConfig`.

## ربط Firebase
- أنشئ مشروعًا من [console.firebase.google.com].
- فعّل **Authentication → Email/Password**.
- فعّل **Firestore Database** (وضع الإنتاج).
- أنشئ مجموعة باسم `members` (سيتم إنشاء المستندات تلقائيًا عند أول إضافة).
- أنشئ مستخدم (Email/Password) لتسجيل الدخول.

داخل `app.js` غيّر:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## ملاحظات
- تسجيل الدخول يفتح لوحة الإدارة.
- تبويب **إضافة مشترك جديد** يحفظ: الاسم، رقم العضو، تاريخ بداية، تاريخ نهاية، وقيمة الاشتراك.
- تبويب **الأعضاء النشطون** يعرض غير منتهين حسب تاريخ النهاية.
- تبويب **الاشتراكات المنتهية** يعرض المنتهي اشتراكهم.
- يوجد **بحث**، **تجزئة صفحات**، ونموذج **تعديل** (الاسم، القيمة المدفوعة، وتاريخ الدفع/النهاية الجديد).
