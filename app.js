// ═══════════════════════════════════════════════
// مصنّف المخلفات الذكي
// ═══════════════════════════════════════════════

let model = null;
let cameraConnected = false;
let currentIP = '';

// ═══════════════════════════════════════════════
// تحميل موديل AI
// ═══════════════════════════════════════════════
async function loadModel() {
  const modelURL = 'model/model.json';
  const metadataURL = 'model/metadata.json';

  try {
    model = await tmImage.load(modelURL, metadataURL);
    console.log('✅ الموديل اتحمل بنجاح');
    console.log('📋 التصنيفات:', model.getClassLabels());
  } catch (error) {
    console.error('❌ فشل تحميل الموديل:', error);
    setTimeout(() => {
      alert('⚠️ الموديل لسه بيتحمّل...\nتأكد من رفع ملفات model/ على GitHub');
    }, 1000);
  }
}

// ═══════════════════════════════════════════════
// الاتصال بالكاميرا
// ═══════════════════════════════════════════════
window.connectCamera = async function() {
  const ip = document.getElementById('cameraIP').value.trim();
  const status = document.getElementById('connectionStatus');

  if (!ip) {
    status.textContent = '❌ أدخل IP الكاميرا';
    status.className = 'status error';
    return;
  }

  currentIP = ip;
  const streamUrl = `http://${ip}:81/stream`;

  status.textContent = '⏳ جاري الاتصال...';
  status.className = 'status';

  const img = document.getElementById('cameraStream');

  // مؤقت timeout
  const timeoutId = setTimeout(() => {
    if (!cameraConnected) {
      status.textContent = '❌ فشل الاتصال\n\nتأكد من:\n1. الكاميرا شغالة\n2. على نفس الشبكة\n3. IP صحيح';
      status.className = 'status error';
    }
  }, 8000);

  img.onload = () => {
    clearTimeout(timeoutId);
    cameraConnected = true;
    status.textContent = '✅ تم الاتصال بالكاميرا!';
    status.className = 'status success';

    setTimeout(() => {
      document.getElementById('setupCard').classList.add('hidden');
      document.getElementById('cameraCard').classList.remove('hidden');
    }, 800);
  };

  img.onerror = () => {
    clearTimeout(timeoutId);
    status.textContent = '❌ فشل الاتصال بالكاميرا\n\nجرب:\n1. اعمل Refresh للصفحة\n2. اسمح بـ "Unsafe Scripts" من المتصفح\n3. تأكد إن IP صح';
    status.className = 'status error';
  };

  // محاولة الاتصال
  img.src = streamUrl + '?' + Date.now();
};

// ═══════════════════════════════════════════════
// قطع الاتصال
// ═══════════════════════════════════════════════
window.disconnectCamera = function() {
  cameraConnected = false;
  document.getElementById('cameraStream').src = '';
  document.getElementById('setupCard').classList.remove('hidden');
  document.getElementById('cameraCard').classList.add('hidden');
  document.getElementById('resultCard').classList.add('hidden');
  document.getElementById('connectionStatus').textContent = '';
};

// ═══════════════════════════════════════════════
// التقاط وتصنيف
// ═══════════════════════════════════════════════
window.captureAndClassify = async function() {
  if (!model) {
    alert('⏳ الموديل لسه بيتحمّل... انتظر شوية');
    return;
  }

  const img = document.getElementById('cameraStream');
  const resultCard = document.getElementById('resultCard');

  if (!img.complete || img.naturalWidth === 0) {
    alert('⚠️ الكاميرا مش جاهزة');
    return;
  }

  resultCard.classList.remove('hidden');
  document.getElementById('resultTitle').textContent = '🔍 جاري التصنيف...';
  document.getElementById('resultIcon').textContent = '⏳';

  // التقاط الصورة
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  try {
    // تصنيف بالـ AI
    const predictions = await model.predict(canvas);

    // ترتيب حسب أعلى نسبة
    predictions.sort((a, b) => b.probability - a.probability);
    const best = predictions[0];

    // عرض النتيجة
    displayResult(best, predictions);

    // صوت الصفارة
    playBeep();

  } catch (error) {
    console.error('❌ خطأ في التصنيف:', error);
    alert('❌ فشل التصنيف. حاول تاني.');
  }
};

// ═══════════════════════════════════════════════
// عرض النتيجة + تشغيل الليد
// ═══════════════════════════════════════════════
function displayResult(best, predictions) {
  const resultCard = document.getElementById('resultCard');
  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resultTitle');
  const desc = document.getElementById('resultDesc');
  const confidenceFill = document.getElementById('confidenceFill');
  const confidenceText = document.getElementById('confidenceText');
  const predictionsList = document.getElementById('predictionsList');

  let colorClass, emoji, arabicName, hardwareColor, ledColor;
  const className = best.className.toLowerCase();

  // تحديد التصنيف حسب اللون
  if (className.includes('glass') || className.includes('زجاج')) {
    colorClass = 'result-red';
    emoji = '🔴';
    arabicName = 'زجاج (Glass)';
    hardwareColor = 'أحمر';
    ledColor = 'red';
  } else if (className.includes('paper') || className.includes('ورق')) {
    colorClass = 'result-green';
    emoji = '🟢';
    arabicName = 'ورق (Paper)';
    hardwareColor = 'أخضر';
    ledColor = 'green';
  } else {
    // بلاستيك أو أي حاجة تانية → أصفر
    colorClass = 'result-yellow';
    emoji = '🟡';
    arabicName = 'بلاستيك (Plastic)';
    hardwareColor = 'أصفر';
    ledColor = 'yellow';
  }

  // تطبيق التصنيف
  resultCard.className = 'card result-card ' + colorClass;

  icon.textContent = emoji;
  title.textContent = arabicName;
  desc.textContent = `💡 اللمبة: ${hardwareColor} | 🎯 الدقة: ${(best.probability * 100).toFixed(1)}%`;

  confidenceFill.style.width = (best.probability * 100) + '%';
  confidenceText.textContent = `دقة التصنيف: ${(best.probability * 100).toFixed(1)}%`;

  // قائمة كل التصنيفات
  predictionsList.innerHTML = predictions.map((p, i) => {
    const isBest = i === 0;
    return `
      <div class="prediction-item ${isBest ? 'best' : ''}">
        <span class="prediction-name">${p.className}</span>
        <span class="prediction-value">${(p.probability * 100).toFixed(1)}%</span>
      </div>
    `;
  }).join('');

  // إرسال الأمر للأردوينو (اختياري)
  sendCommandToArduino(ledColor);
}

// ═══════════════════════════════════════════════
// إرسال الأمر للأردوينو (لتشغيل الليد)
// ═══════════════════════════════════════════════
async function sendCommandToArduino(color) {
  if (!currentIP) return;

  // خريطة الألوان
  const commandMap = {
    'red': '/glass',
    'yellow': '/plastic',
    'green': '/paper'
  };

  const url = `http://${currentIP}${commandMap[color]}`;

  try {
    // نستخدم fetch مع no-cors لأن الكاميرا على HTTP
    await fetch(url, { mode: 'no-cors' });
    console.log(`✅ تم إرسال الأمر: ${color}`);
  } catch (error) {
    console.log(`⚠️ فشل إرسال الأمر: ${color}`, error);
  }
}

// ═══════════════════════════════════════════════
// صوت الصفارة
// ═══════════════════════════════════════════════
function playBeep() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // صفارة مزدوجة
    const now = audioContext.currentTime;

    for (let i = 0; i < 2; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now + i * 0.25);
      oscillator.frequency.setValueAtTime(1200, now + i * 0.25 + 0.1);

      gainNode.gain.setValueAtTime(0, now + i * 0.25);
      gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.25 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(now + i * 0.25);
      oscillator.stop(now + i * 0.25 + 0.2);
    }
  } catch (error) {
    console.log('⚠️ فشل تشغيل الصوت:', error);
  }
}

// ═══════════════════════════════════════════════
// التهيئة عند فتح الصفحة
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 التطبيق بيشتغل');
  loadModel();
});
