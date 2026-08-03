// scripts/seed.js
//
// تشغيل: node scripts/seed.js
// يتطلب: ملف serviceAccountKey.json بجانب هذا السكربت (شرح التحميل بالأسفل)
//
// يحشو Firestore بمطاعم وأطباق وأكواد خصم وهمية للتجربة.
// يستخدم Admin SDK اللي يتجاوز قواعد Firestore بالكامل، فيشتغل بغض النظر
// عن أي قاعدة أمان — هذا مقصود ومخصص فقط للتشغيل من جهازك المحل
// scripts/seed.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const restaurants = [
  {
    id: "rest-pizza-house",
    name: "بيت البيتزا",
    cuisineId: "pizza",
    rating: 4.6,
    deliveryFee: 12,
    etaMinutes: 30,
    tagline: "بيتزا إيطالية أصلية على الحطب",
    address: "شارع رفيديا، نابلس",
    active: true,
  },
  {
    id: "rest-burger-lab",
    name: "برغر لاب",
    cuisineId: "burger",
    rating: 4.4,
    deliveryFee: 10,
    etaMinutes: 25,
    tagline: "برغر بلحم طازج يومياً",
    address: "شارع الجامعة القديمة، نابلس",
    active: true,
  },
  {
    id: "rest-oriental-taste",
    name: "مذاق الشرق",
    cuisineId: "oriental",
    rating: 4.8,
    deliveryFee: 8,
    etaMinutes: 35,
    tagline: "مشاوي وأطباق شرقية بيتية",
    address: "البلدة القديمة، نابلس",
    active: true,
  },
  {
    id: "rest-sushi-corner",
    name: "زاوية السوشي",
    cuisineId: "sushi",
    rating: 4.3,
    deliveryFee: 15,
    etaMinutes: 40,
    tagline: "سوشي طازج يومياً",
    address: "شارع غرناطة، نابلس",
    active: true,
  },
  {
    id: "rest-sweet-corner",
    name: "زاوية الحلا",
    cuisineId: "sweets",
    rating: 4.9,
    deliveryFee: 7,
    etaMinutes: 20,
    tagline: "كنافة وحلويات شرقية طازجة",
    address: "شارع فيصل، نابلس",
    active: true,
  },
];

const dishes = [
  // بيت البيتزا
  {
    restaurantId: "rest-pizza-house",
    name: "بيتزا مارغريتا",
    description: "صلصة طماطم، جبنة موزاريلا، ريحان طازج",
    price: 45,
    category: "بيتزا",
    available: true,
  },
  {
    restaurantId: "rest-pizza-house",
    name: "بيتزا خضار",
    description: "فلفل، زيتون، فطر، ذرة",
    price: 48,
    category: "بيتزا",
    available: true,
  },
  {
    restaurantId: "rest-pizza-house",
    name: "بيتزا دجاج بالباربكيو",
    description: "دجاج مشوي، صلصة باربكيو، بصل أحمر",
    price: 55,
    category: "بيتزا",
    available: true,
    isHot: true,
  },

  // برغر لاب
  {
    restaurantId: "rest-burger-lab",
    name: "برغر كلاسيك",
    description: "لحم بقري، خس، طماطم، جبنة شيدر",
    price: 35,
    category: "برغر",
    available: true,
  },
  {
    restaurantId: "rest-burger-lab",
    name: "برغر دبل تشيز",
    description: "قطعتين لحم، طبقتين جبنة، صلصة خاصة",
    price: 48,
    category: "برغر",
    available: true,
    isHot: true,
  },
  {
    restaurantId: "rest-burger-lab",
    name: "برغر دجاج مقرمش",
    description: "صدر دجاج مقرمش، مايونيز ثوم",
    price: 38,
    category: "برغر",
    available: true,
  },

  // مذاق الشرق
  {
    restaurantId: "rest-oriental-taste",
    name: "مشاوي مشكلة",
    description: "شيش طاووق، كباب، كفتة",
    price: 60,
    category: "مشاوي",
    available: true,
    isHot: true,
  },
  {
    restaurantId: "rest-oriental-taste",
    name: "مسخن دجاج",
    description: "دجاج، بصل، سماق، صاج",
    price: 42,
    category: "أطباق شرقية",
    available: true,
  },
  {
    restaurantId: "rest-oriental-taste",
    name: "مقلوبة",
    description: "أرز، دجاج، باذنجان، جوز هند",
    price: 40,
    category: "أطباق شرقية",
    available: true,
  },

  // زاوية السوشي
  {
    restaurantId: "rest-sushi-corner",
    name: "كاليفورنيا رول",
    description: "سلطعون، أفوكادو، خيار",
    price: 32,
    category: "رول",
    available: true,
  },
  {
    restaurantId: "rest-sushi-corner",
    name: "سالمون نيغيري",
    description: "سلمون طازج فوق أرز السوشي",
    price: 38,
    category: "نيغيري",
    available: true,
  },

  // زاوية الحلا
  {
    restaurantId: "rest-sweet-corner",
    name: "كنافة نابلسية",
    description: "جبنة، قطر، فستق حلبي",
    price: 25,
    category: "حلويات",
    available: true,
    isHot: true,
  },
  {
    restaurantId: "rest-sweet-corner",
    name: "بقلاوة مشكلة",
    description: "صحن بقلاوة متنوع بالفستق والجوز",
    price: 30,
    category: "حلويات",
    available: true,
  },
];

const promoCodes = [
  { code: "ZEST10", percentOff: 10, active: true },
  { code: "WELCOME20", percentOff: 20, active: true },
  { code: "OLDCODE5", percentOff: 5, active: false }, // كود غير فعّال، للتأكد إن النظام يتجاهله
];

const categories = [
  { id: "pizza", label: "بيتزا", icon: "🍕", order: 1, visible: true },
  { id: "burger", label: "برغر", icon: "🍔", order: 2, visible: true },
  { id: "oriental", label: "شرقي", icon: "🥙", order: 3, visible: true },
  { id: "sushi", label: "سوشي", icon: "🍣", order: 4, visible: true },
  { id: "sweets", label: "حلويات", icon: "🍰", order: 5, visible: true },
];

const banners = [
  {
    id: "banner-welcome",
    title: "أهلاً بك في Zest",
    subtitle: "اطلب من أفضل المطاعم المحلية الآن",
    ctaText: "تصفح المطاعم",
    ctaLink: "/search",
    gradient: "from-primary to-red-700",
    order: 1,
    active: true,
  },
  {
    id: "banner-promo",
    title: "خصم 30% على أول طلب",
    subtitle: "استخدم كود ZEST30 عند الدفع",
    ctaText: "اطلب الآن",
    ctaLink: "/cart",
    gradient: "from-secondary to-primary",
    order: 2,
    active: true,
  },
];

async function seed() {
  const batch = db.batch();

  // المطاعم بمعرّفات ثابتة (سهل تتبعها وحذفها لاحقاً)
  for (const restaurant of restaurants) {
    const { id, ...data } = restaurant;
    batch.set(db.collection("restaurants").doc(id), {
      ...data,
      createdAt: Date.now(),
    });
  }

  // الأطباق بمعرّفات تلقائية
  for (const dish of dishes) {
    const ref = db.collection("dishes").doc();
    batch.set(ref, { ...dish, createdAt: Date.now() });
  }

  // أكواد الخصم (معرّف الوثيقة = نص الكود نفسه)
  for (const promo of promoCodes) {
    const { code, ...data } = promo;
    batch.set(db.collection("promoCodes").doc(code), data);
  }

  for (const cat of categories) {
    const { id, ...data } = cat;
    batch.set(db.collection("categories").doc(id), data);
  }

  for (const banner of banners) {
    const { id, ...data } = banner;
    batch.set(db.collection("banners").doc(id), data);
  }

  await batch.commit();
  console.log(
    `تم إدخال ${restaurants.length} مطاعم، ${dishes.length} طبق، ${categories.length} فئة، ${banners.length} بانر، ${promoCodes.length} كود خصم بنجاح ✅`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("فشل التعبئة:", err);
    process.exit(1);
  });
