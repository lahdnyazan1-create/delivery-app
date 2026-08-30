const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// دالة مساعدة لحذف جميع الوثائق في مجموعة معينة لتجنب التكرار
async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`🧹 تم تنظيف مجموعة (${collectionPath}) بنجاح.`);
}

const rawData = [
  {
    store_name: "شاورما العربي",
    cuisine: "شاورما ودجاج",
    cuisineId: "shawarma",
    tagline: "أشهى وجبات الشاورما والبروستد",
    menu: [
      {
        category: "مشروبات",
        items: [
          { name: "كولا لتر وربع", description: "كولا لتر وربع", price: 4 },
          { name: "عصير", description: "عصير", price: 3 },
          { name: "كولا", description: "كولا", price: 3 },
          { name: "كلوب", description: "كلوب", price: 2 }
        ]
      },
      {
        category: "شاورما",
        items: [
          { name: "صحن شاورما 15", description: "صحن شاورما", price: 15 },
          { name: "صحن شاورما 20", description: "صحن شاورما", price: 20 },
          { name: "صحن شاورما 25", description: "صحن شاورما", price: 25 },
          { name: "صحن شاورما 30", description: "صحن شاورما", price: 30 },
          { name: "شاورما عربي", description: "تشمل الوجبه بطاطا وسلطات", price: 17 },
          { name: "لفة شاورما", description: "ساندويش شراك", price: 14 },
          { name: "باجيت شاورما", description: "", price: 17 },
          { name: "باشكا شاورما", description: "تشمل بطاطا وسلطات", price: 22 },
          { name: "شاورما برايز", description: "3 ساندويشات كماج صغيره تشمل بطاطا وسلطات", price: 22 },
          { name: "شاورما عربي دبل", description: "تشمل بطاطا وسلطات", price: 29 }
        ]
      },
      {
        category: "دجاج",
        items: [
          { name: "وجبة مسحب باجيت", description: "تشمل الوجبه سلطات وبطاطا ومشروب", price: 22 },
          { name: "وجبه بروست", description: "وجبه بروست", price: 19 },
          { name: "نص وجبه بروست", description: "نص وجبه بروست", price: 13 },
          { name: "مسحب باشكا", description: "تشمل الوجبه بطاطا وسلطه", price: 22 },
          { name: "مسحب سمون", description: "تشمل الوجبه بطاطا وسلطات ومشروب", price: 16 },
          { name: "وجبه زنجر", description: "تشمل بطاطا وسلطات وخبزة", price: 22 },
          { name: "ساندويش زنجر", description: "ساندويش زنجر", price: 16 }
        ]
      },
      {
        category: "مقبلات وسلطات",
        items: [
          { name: "صحن سلطات كبير", description: "صحن سلطات كبير", price: 8 },
          { name: "صحن سلطات صغير", description: "صحن سلطات صغير", price: 5 },
          { name: "بطاطا صغير", description: "بطاطا صغير", price: 5 },
          { name: "بطاطا حجم كبير", description: "بطاطا حجم كبير", price: 10 }
        ]
      }
    ]
  },
  {
    store_name: "فلورا كوكتيل",
    cuisine: "حلويات ومشروبات",
    cuisineId: "desserts_drinks",
    tagline: "أطيب الكوكتيلات والحلويات الغربية",
    menu: [
      {
        category: "الكيك والحلويات",
        items: [
          { name: "كيكة بلاك فورست", description: "", price: 25 },
          { name: "تراميسو مانجا", description: "", price: 15 },
          { name: "تراميسو سبريسو", description: "", price: 15 },
          { name: "تشيز كيك (بلوبيري، لوتس، بستاشيو)", description: "", price: 15 },
          { name: "ميني كيك دبي", description: "", price: 15 },
          { name: "كيكة دبي", description: "", price: 20 },
          { name: "كيكة ترومب لوي", description: "", price: 15 },
          { name: "تشيز كيك كب", description: "", price: 7 },
          { name: "كيكة أوبرا", description: "", price: 15 },
          { name: "ميني كيكة رد فلفت", description: "", price: 15 },
          { name: "كيكة شوكولاته", description: "", price: 60 },
          { name: "كيك حجم صغير", description: "", price: 40 },
          { name: "كيك حجم وسط", description: "", price: 50 },
          { name: "كيك حجم مربع", description: "", price: 70 },
          { name: "كيكة ماتيلدا", description: "", price: 20 },
          { name: "بلاك فلفت", description: "", price: 25 },
          { name: "كوكيز شوكولاته / بستاشيو", description: "", price: 5 },
          { name: "كيكة ترليتشيا", description: "", price: 10 }
        ]
      },
      {
        category: "المشروبات الباردة والكوكتيلات",
        items: [
          { name: "مشروب بارد بطعم الليمون والنعناع", description: "", price: 10 },
          { name: "كوكتيل فلورا", description: "بوظه وفواكه ومكسرات", price: 7 },
          { name: "ميلك شيك اوريو", description: "", price: 10 },
          { name: "ميلك شيك بستاشيو", description: "", price: 10 },
          { name: "ملك شيك لوتس", description: "", price: 10 },
          { name: "ملك شيك نوتيلا", description: "", price: 10 },
          { name: "أيس تي خوخ", description: "", price: 10 },
          { name: "أيس كوفي", description: "", price: 10 },
          { name: "مشروب بارد طعم الخوخ", description: "", price: 10 },
          { name: "مشروب بارد طعم بلوبيري", description: "", price: 10 },
          { name: "فريش فراولة", description: "", price: 10 },
          { name: "مشروب بارد طعم الاناناس", description: "", price: 10 },
          { name: "مشروب بارد طعم مس فلورا", description: "", price: 10 },
          { name: "مشروب بارد طعم المانجا", description: "", price: 10 },
          { name: "موهيتو سودة", description: "", price: 10 },
          { name: "موهيتو اكس ال (بلوبيري / رمان)", description: "", price: 12 },
          { name: "كوكتيل لوتس", description: "", price: 12 },
          { name: "كوكتيل مكسرات", description: "", price: 7 },
          { name: "كوكتيل فواكه", description: "", price: 7 }
        ]
      },
      {
        category: "المشروبات الساخنة والبوظة",
        items: [
          { name: "اسبريسو", description: "", price: 5 },
          { name: "كابتشينو", description: "", price: 7 },
          { name: "هوت شوكليت إيطالي", description: "", price: 7 },
          { name: "توفي كراميل", description: "", price: 7 },
          { name: "سحلب", description: "", price: 7 },
          { name: "شاي لاتيه", description: "", price: 7 },
          { name: "هوت شوكليت", description: "", price: 7 },
          { name: "هوت بندق", description: "", price: 7 },
          { name: "هوت بستاشيو", description: "", price: 7 },
          { name: "موكا", description: "", price: 7 },
          { name: "فرنش فنيل", description: "", price: 7 },
          { name: "كافيه لاتيه", description: "", price: 7 },
          { name: "لوتس (ساخن)", description: "", price: 7 },
          { name: "سولتي كراميل", description: "", price: 7 },
          { name: "بوظة سادة", description: "", price: 7 },
          { name: "بوظة بالمكسرات مع النوتيلا", description: "", price: 10 }
        ]
      }
    ]
  },
  {
    store_name: "مطعم وملحمة الريف",
    cuisine: "مشاوي وجبات سريعة",
    cuisineId: "grill",
    tagline: "أجود أنواع اللحوم والمشاوي الطازجة",
    menu: [
      {
        category: "وجبات وسندويشات",
        items: [
          { name: "لفة شورما", description: "لفة شورما", price: 15 },
          { name: "رول كرسبي مسحب", description: "رول كرسبي مسحب", price: 20 },
          { name: "وجبة بروست", description: "وجبة بروست", price: 20 },
          { name: "زنجر دجاج", description: "زنجر دجاج", price: 20 },
          { name: "وجبة ترتلا مسحب", description: "وجبة ترتلا مسحب مع بطاطا وسلطات", price: 20 },
          { name: "وجبة شورما عربي", description: "وجبة شورما عربي", price: 20 },
          { name: "وجبة باشكا تركية", description: "وجبة باشكا تركية", price: 25 },
          { name: "وجبة جناحان كرسبي", description: "وجبة جناحان كرسبي", price: 20 },
          { name: "وجبة شنتسل طازة", description: "وجبة شنتسل مع بطاطا وسلطات", price: 20 },
          { name: "وجبة مسحب دجاج", description: "وجبة مسحب دجاج", price: 20 }
        ]
      },
      {
        category: "البرجر",
        items: [
          { name: "برجر لحمة دبل", description: "برجر لحمة دبل", price: 35 },
          { name: "برجر لحمة كلاسيكي", description: "وجبة برجر مع بطاطا وسلطات", price: 25 },
          { name: "برجر دجاج كرسبي", description: "وجبة برجر دجاج كرسبي مع بطاطا وسلطات", price: 20 },
          { name: "برجر دجاج", description: "وجبة برجر مع بطاطا وسلطات", price: 20 }
        ]
      },
      {
        category: "المشاوي والدجاج",
        items: [
          { name: "ستك انتركوت مشوي على فحم", description: "ستك انتركوت مشوي على فحم", price: 150 },
          { name: "جناحان مشوي على فحم", description: "جناحان مشوي على فحم", price: 40 },
          { name: "شيش طاووق مشوي على فحم", description: "شيش طاووق مشوي على فحم", price: 60 },
          { name: "كباب طازة مشوي على فحم", description: "كباب طازة مشوي على فحم", price: 90 },
          { name: "راس عصفور مشوي على فحم", description: "راس عصفور مشوي على فحم", price: 120 },
          { name: "كيلو مشاوي مشكل", description: "كيلو مشاوي مشكل", price: 75 },
          { name: "دجاج محشي", description: "دجاج محشي", price: 45 },
          { name: "دجاج مدخن", description: "دجاج مدخن مع طبق رز كبير", price: 60 },
          { name: "دجاج على فحم", description: "دجاج على فحم", price: 45 },
          { name: "عرايس لحمة على فحم", description: "عرايس لحمة على فحم", price: 6 }
        ]
      },
      {
        category: "السلطات والمقبلات",
        items: [
          { name: "صحن سلطات مشكل", description: "صحن سلطات مشكل", price: 10 }
        ]
      }
    ]
  },
  {
    store_name: "مطعم الفاخر",
    cuisine: "وجبات شرقية وسريعة",
    cuisineId: "oriental",
    tagline: "أشهى الوجبات الشرقية والشاورما",
    menu: [
      {
        category: "الوجبات الرئيسية",
        items: [
          { name: "بروست", description: "بروست مع بطاطا وخبر وصوصات", price: 17 },
          { name: "شاورما عربي", description: "وجبة شاورما عربي مع بطاطا وسلطات", price: 17 },
          { name: "قدره مع لبن بلدي ومتوفر لبن رايب او سلطه حسب الرغبه", description: "رز قدره مع دجاج شوايه", price: 17 },
          { name: "دجاج محمر", description: "دجاج مشوي مع السماق والليمون والبطاطا والشراك", price: 30 },
          { name: "باشكا تركيه", description: "تحتوي على الشاورما وصوصات الفاخر مع جبن الموزاريلا", price: 20 },
          { name: "لفة شاورما شراك", description: "لفة شاورما شراك", price: 10 },
          { name: "صحن شاورما مع حمص", description: "صحن شاورما مع حمص", price: 10 },
          { name: "جناحان كرسبي حار وعادي حسب الطلب", description: "الوجبه 10 قطع جناح مع بطاطا وصوصات وثوم وحمام", price: 15 },
          { name: "رز عادي او قدره ومبهر", description: "صحن رز حجم عائلي", price: 15 },
          { name: "كرسبي اصابع دجاج", description: "8 اصابع كرسبي حار أو عادي مع بطاطا شيبس أو بطاطا وجز وصوصات", price: 20 }
        ]
      },
      {
        category: "المقبلات والجانبيات",
        items: [
          { name: "صحن بطاطا وجز", description: "صحن بطاطا وجز", price: 5 }
        ]
      },
      {
        category: "المشروبات",
        items: [
          { name: "كولا علب", description: "كولا علب", price: 2 },
          { name: "كولا علب 1 ش", description: "كولا علب 1 ش", price: 1 },
          { name: "كولا صغير", description: "كولا صغير", price: 4 },
          { name: "كولا كبير", description: "كولت كبير", price: 5 },
          { name: "عصير صغير", description: "عصير صغير", price: 2 },
          { name: "عصير كبير", description: "عصير كبير", price: 5 },
          { name: "مشروب بلو", description: "مشروب بلو", price: 4 },
          { name: "مشروب طاقه XL", description: "مشروب طاقه XL", price: 5 }
        ]
      }
    ]
  }
];

async function uploadData() {
  // 1. تنظيف المجموعات القديمة إن وجدت
  await deleteCollection('categories');
  await deleteCollection('products');
  await deleteCollection('restaurants');
  await deleteCollection('dishes');

  const batch = db.batch();
  const nowMs = Date.now();

  for (const store of rawData) {
    const restaurantRef = db.collection('restaurants').doc();
    
    batch.set(restaurantRef, {
      active: true,
      address: "نابلس",
      createdAt: nowMs,
      cuisine: store.cuisine,
      cuisineId: store.cuisineId,
      deliveryFee: 10,
      etaMinutes: 25,
      name: store.store_name,
      ownerId: "5TY2d2LvI4XteAICUsczMNRsuZC2",
      rating: 4.5,
      tagline: store.tagline,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    for (const cat of store.menu) {
      for (const item of cat.items) {
        const dishRef = db.collection('dishes').doc();
        
        batch.set(dishRef, {
          available: true,
          category: cat.category,
          createdAt: nowMs,
          description: item.description || '',
          isHot: false,
          name: item.name,
          price: Number(item.price),
          restaurantId: restaurantRef.id
        });
      }
    }
  }

  await batch.commit();
  console.log('🚀 تم رفع البيانات بالبنية الجديدة المعتمدة بنجاح وبدون تكرار!');
}

uploadData().catch(console.error);
