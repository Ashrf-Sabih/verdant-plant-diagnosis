# 🌿 مشروع تشخيص أمراض النبات (Full Stack)

## هيكل المشروع
```
plant-disease-app/
├── backend/
│   ├── main.py              ← السيرفر الرئيسي (FastAPI)
│   ├── model_utils.py       ← تحميل الموديل والتنبؤ
│   ├── llm_utils.py         ← التواصل مع الـ LLM لشرح العلاج
│   ├── requirements.txt     ← مكتبات Python المطلوبة
│   ├── class_names.json     ← 🔧 لازم تحدّثه بأسماء الكلاسات بتاعتك
│   ├── .env.example         ← 🔧 انسخه لـ .env واملأ الـ API Key
│   └── model/                ← 🔧 حط ملف الموديل هنا
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## ✅ الخطوات المطلوبة منك بالترتيب (قبل التشغيل)

### 1. حط ملف الموديل
من النوت بوك بتاعك، بعد ما يخلص التدريب:
```python
model.save("plant_disease_model.keras")
```
انسخ الملف الناتج لمسار: `backend/model/plant_disease_model.keras`

### 2. حدّث أسماء الكلاسات
في النوت بوك، شغّل السطر ده واحفظ الناتج:
```python
import json
with open("class_names.json", "w", encoding="utf-8") as f:
    json.dump(class_names, f, ensure_ascii=False, indent=2)
```
استبدل بيه ملف `backend/class_names.json` — **لازم يكون بنفس الترتيب** اللي اتدرب بيه الموديل بالظبط.

### 3. جيب مفتاح الـ LLM API (مجاني)
- روح لـ https://aistudio.google.com/app/apikey
- سجل دخول بحساب Google واعمل API Key
- انسخ `backend/.env.example` وسمّيه `backend/.env`
- حط المفتاح جوه: `LLM_API_KEY=المفتاح_بتاعك`

### 4. استخرج إحصائيات الموديل لصفحة الـ Dashboard (لما تخلص تدريب)
شغّل الكود ده في آخر النوت بوك (بعد ما يكون عندك `y_test`, `y_pred_cnn`, `class_names`, وأداء SVM محسوب):
```python
import json
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, accuracy_score

precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred_cnn, labels=range(len(class_names)))

stats = {
    "is_placeholder": False,
    "dataset": {
        "num_classes": len(class_names),
        "train_size": len(y_train),
        "val_size": len(y_val),
        "test_size": len(y_test),
    },
    "models": {
        "svm": {"accuracy": float(accuracy_score(y_test, y_pred_svm))},  # لو عندك y_pred_svm
        "cnn": {"accuracy": float(accuracy_score(y_test, y_pred_cnn))},
    },
    "per_class_metrics": [
        {
            "class_name": class_names[i],
            "precision": float(precision[i]),
            "recall": float(recall[i]),
            "f1_score": float(f1[i]),
            "support": int(support[i]),
        }
        for i in range(len(class_names))
    ],
    "confusion_matrix": {
        "labels": class_names,
        "matrix": confusion_matrix(y_test, y_pred_cnn).tolist(),
    },
}

with open("model_stats.json", "w", encoding="utf-8") as f:
    json.dump(stats, f, ensure_ascii=False, indent=2)
```
استبدل بيه ملف `backend/model_stats.json`، وصفحة `/dashboard.html` هتعرض الأرقام الحقيقية تلقائيًا.



### تشغيل الباكاند
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # على ويندوز
# source venv/bin/activate     # على ماك/لينكس

pip install -r requirements.txt
uvicorn main:app --reload
```
السيرفر هيشتغل على: `http://127.0.0.1:8000`
جرب `http://127.0.0.1:8000/docs` هتلاقي توثيق تفاعلي تلقائي لكل الـ endpoints.

### تشغيل الفرونت إند
افتح `frontend/index.html` مباشرة في المتصفح (دبل كليك عليه)، أو استخدم إضافة
Live Server في VS Code لتجربة أسهل.

**مهم:** خلي الباكاند شغال في نافذة Terminal منفصلة قبل ما تفتح الفرونت إند.

---

## ☁️ الـ Deploy (رفع المشروع أونلاين)

### الباكاند → Render.com
1. ارفع الفولدر `backend/` على GitHub repo
2. من Render Dashboard: New → Web Service → اختار الـ repo
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. في تبويب Environment ضيف: `LLM_API_KEY` بقيمة مفتاحك
6. هياخد شوية دقايق ويطلعلك رابط زي: `https://your-app.onrender.com`

### الفرونت إند → Vercel
1. عدّل `API_BASE_URL` في `script.js` لرابط الباكاند اللي طلع من Render
2. ارفع فولدر `frontend/` على GitHub repo منفصل (أو نفس الـ repo)
3. من Vercel: Add New → Project → اختار الـ repo → Deploy
4. هيديك رابط نهائي تقدر تشاركه مع أي حد

---

## 🔍 هتواجه أي مشاكل؟
- **CORS Error في الكونسول**: تأكد إن الباكاند شغال فعلاً على نفس الرابط المكتوب في `API_BASE_URL`
- **"مفيش موديل في المسار ده"**: تأكد إنك حطيت الملف بنفس الاسم بالظبط `plant_disease_model.keras`
- **نتيجة تصنيف غلط دايمًا لنفس الكلاس**: راجع إن `class_names.json` بنفس ترتيب التدريب
