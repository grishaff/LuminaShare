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
  document.getElementById('content').innerHTML = `
    <div class="max-w-md mx-auto">
      <div class="glass-card rounded-2xl p-6 text-center">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-gray-700">Объявление не найдено</p>
      </div>
    </div>`;
} else {
  loadAnnouncement();
}

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
  window.history.back();
});

// Load announcement details
async function loadAnnouncement() {
  try {
    const resp = await fetch('/api/announcements');
    const json = await resp.json();
    const announcement = json.announcements?.find(a => a.id === announcementId);
    
    if (!announcement) {
      document.getElementById('content').innerHTML = `
        <div class="max-w-md mx-auto">
          <div class="glass-card rounded-2xl p-6 text-center">
            <div class="text-4xl mb-4">❌</div>
            <p class="text-gray-700">Объявление не найдено</p>
          </div>
        </div>`;
      return;
    }

    // Render announcement
    document.getElementById('content').innerHTML = `
      <div class="max-w-md mx-auto">
        <div class="glass-card rounded-2xl shadow-xl overflow-hidden fade-in">
          <img src="${announcement.image_url}" alt="${announcement.title}" class="w-full h-64 object-cover" />
          
          <div class="p-6 space-y-4">
            <h2 class="text-2xl font-bold text-gray-900">${announcement.title}</h2>
            
            ${announcement.description ? `<p class="text-gray-700 leading-relaxed">${announcement.description}</p>` : ''}
            
            <div class="flex items-center justify-between pt-4 border-t border-gray-200">
              <div class="flex items-center space-x-4">
                <button id="authorBtn" class="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors" data-recipient-id="${announcement.recipient_id}">
                  <span>👤</span>
                  <span>Автор</span>
                </button>
                <div class="text-sm text-gray-500">
                  ${new Date(announcement.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <button id="donateBtn" class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                💎 Поддержать
              </button>
            </div>
          </div>
        </div>
      </div>`;

    // Setup buttons
    setupButtons(announcement);
    
  } catch (err) {
    document.getElementById('content').innerHTML = `
      <div class="max-w-md mx-auto">
        <div class="glass-card rounded-2xl p-6 text-center">
          <div class="text-4xl mb-4">❌</div>
          <p class="text-red-600">Ошибка загрузки: ${err.message}</p>
        </div>
      </div>`;
  }
}

// Setup buttons functionality
function setupButtons(announcement) {
  const authorBtn = document.getElementById('authorBtn');
  const donateBtn = document.getElementById('donateBtn');
  
  // Author button
  authorBtn.addEventListener('click', () => {
    window.location.href = `/profile.html?id=${announcement.recipient_id}`;
  });
  
  // Donate button
  donateBtn.addEventListener('click', () => {
    setupDonateModal(announcement);
  });
}

// Setup donate modal
function setupDonateModal(announcement) {
  const donateModal = document.getElementById('donateModal');
  const cancelDonate = document.getElementById('cancelDonate');
  const confirmDonate = document.getElementById('confirmDonate');
  const recipientWallet = document.getElementById('recipientWallet');
  const amountInput = document.getElementById('amountInput');

  recipientWallet.textContent = announcement.recipient_wallet;

  // Show modal
  donateModal.classList.remove('hidden');
  donateModal.classList.add('flex');

  // Cancel button
  cancelDonate.addEventListener('click', () => {
    donateModal.classList.add('hidden');
    donateModal.classList.remove('flex');
    amountInput.value = '';
  });

  // Confirm button
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

      if (tg) {
        tg.showAlert(`Спасибо! Пожертвование ${amount} TON отправлено.`);
      } else {
        alert(`Спасибо! Пожертвование ${amount} TON отправлено.`);
      }
      cancelDonate.click();
      
    } catch (err) {
      if (tg) {
        tg.showAlert(`Ошибка: ${err.message}`);
      } else {
        alert(`Ошибка: ${err.message}`);
      }
    }
  });
}