// Telegram Web App initialization
let tg = window.Telegram?.WebApp;
let user = null;

if (tg) {
  tg.ready();
  tg.expand();
  user = tg.initDataUnsafe?.user;
}

// Get announcement ID from URL params
const urlParams = new URLSearchParams(window.location.search);
const announcementId = urlParams.get('id');

if (!announcementId) {
  document.getElementById('content').innerHTML = '<p class="text-white text-center">Объявление не найдено</p>';
} else {
  loadAnnouncement();
}

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = '/';
});

// Load announcement details
async function loadAnnouncement() {
  try {
    const resp = await fetch('/api/announcements');
    const json = await resp.json();
    const announcement = json.announcements?.find(a => a.id === announcementId);
    
    if (!announcement) {
      document.getElementById('content').innerHTML = '<p class="text-white text-center">Объявление не найдено</p>';
      return;
    }

    // Render announcement
    document.getElementById('content').innerHTML = `
      <div class="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto">
        <img src="${announcement.image_url}" alt="${announcement.title}" class="w-full h-64 object-cover" />
        
        <div class="p-6 space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">${announcement.title}</h2>
          
          ${announcement.description ? `<p class="text-gray-700 leading-relaxed">${announcement.description}</p>` : ''}
          
          <div class="flex items-center justify-between pt-4 border-t border-gray-200">
            <div class="text-sm text-gray-500">
              ${new Date(announcement.created_at).toLocaleDateString('ru-RU')}
            </div>
            <button id="donateBtn" class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
              💎 Поддержать TON
            </button>
          </div>
        </div>
      </div>`;

    // Setup donate modal
    setupDonateModal(announcement);
    
  } catch (err) {
    document.getElementById('content').innerHTML = `<p class="text-red-300 text-center">Ошибка: ${err}</p>`;
  }
}

// Setup donate modal
function setupDonateModal(announcement) {
  const donateBtn = document.getElementById('donateBtn');
  const donateModal = document.getElementById('donateModal');
  const cancelDonate = document.getElementById('cancelDonate');
  const confirmDonate = document.getElementById('confirmDonate');
  const recipientWallet = document.getElementById('recipientWallet');
  const amountInput = document.getElementById('amountInput');

  recipientWallet.textContent = announcement.recipient_wallet;

  donateBtn.addEventListener('click', () => {
    donateModal.classList.remove('hidden');
    donateModal.classList.add('flex');
  });

  cancelDonate.addEventListener('click', () => {
    donateModal.classList.add('hidden');
    donateModal.classList.remove('flex');
    amountInput.value = '';
  });

  confirmDonate.addEventListener('click', async () => {
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }

         try {
       let donorTgId;
       
       if (user?.id) {
         donorTgId = user.id;
       } else {
         // Fallback for testing outside Telegram
         donorTgId = prompt('Введите ваш Telegram ID (для тестирования):');
         if (!donorTgId) return;
         donorTgId = parseInt(donorTgId);
       }

       const txHash = 'test_' + Date.now(); // placeholder

      const resp = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
           announcementId,
           donorTgId,
           amountTon: amount,
           txHash
         })
      });

      const result = await resp.json();
      if (resp.status !== 201) throw new Error(result.error);

      alert(`Спасибо! Пожертвование ${amount} TON отправлено.`);
      cancelDonate.click();
      
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  });
}