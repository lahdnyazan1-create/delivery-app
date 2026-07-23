// src/lib/sound-haptics.ts
'use client';

// تشغيل اهتزاز الهاتف عند دعم الجهاز له
export const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'medium') navigator.vibrate(25);
    else if (type === 'success') navigator.vibrate([30, 50, 30]);
  }
};

// توليد أصوات تفاعلية ناعمة باستخدام Web Audio API
export const playSound = (type: 'add' | 'click' | 'success') => {
  if (typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'add') {
      // صوت نقرة ناعمة مرتفعة
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      // نغمة نجاح عند تقديم الطلب
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // صوت نبيطة خفيفة
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // تجاهل الأخطاء إذا كانت المتصفحات تمنع الصوت قبل التفاعل الأول
  }
};
