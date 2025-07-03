// Telegram Web App initialization
let tg = window.Telegram?.WebApp;
let user = null;
let currentTab = 'feed';

if (tg) {
  tg.ready();
  tg.expand();
  user = tg.initDataUnsafe?.user;
  
  // Hide banner if in Telegram
  const bannerEl = document.getElementById("infoBanner");
  if (bannerEl) bannerEl.style.display = "none";
  
  // Show user info in header
  if (user) {
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    
    if (user.photo_url) {
      userAvatar.src = user.photo_url;
      userInfo.classList.remove('hidden');
    }
  }
} else {
  console.log("Running outside Telegram");
}

// Global state
let userProfile = null;
let announcements = [];
let ranking = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initInfoBanner();
  initImageViewer();
  loadInitialData();
});

// Navigation system
function initNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  if (currentTab === tabName) return;
  
  // Update nav visual state
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active', 'tab-active');
    const icon = tab.querySelector('.nav-icon');
    icon.classList.remove('active');
  });
  
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  activeTab.classList.add('active', 'tab-active');
  activeTab.querySelector('.nav-icon').classList.add('active');
  
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
    screen.classList.remove('active');
  });
  
  // Show target screen
  const targetScreen = document.getElementById(`${tabName}Screen`);
  targetScreen.classList.remove('hidden');
  targetScreen.classList.add('active', 'fade-in');
  
  currentTab = tabName;
  
  // Load data for specific tabs
  switch (tabName) {
    case 'feed':
      if (announcements.length === 0) loadFeed();
      break;
    case 'ranking':
      if (ranking.length === 0) loadRanking();
      break;
    case 'profile':
      loadProfile();
      break;
  }
}

// Info banner logic
function initInfoBanner() {
  const bannerEl = document.getElementById("infoBanner");
  const closeBannerBtn = document.getElementById("closeBanner");
  
  if (localStorage.getItem("bannerClosed")) {
    bannerEl.style.display = "none";
  } else {
    closeBannerBtn.addEventListener("click", () => {
      bannerEl.style.display = "none";
      localStorage.setItem("bannerClosed", "1");
    });
  }
}

// Image viewer
function initImageViewer() {
  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewerImg");
  const closeBtn = document.getElementById("closeViewer");
  
  closeBtn.addEventListener("click", () => {
    viewer.classList.add("hidden");
    viewer.classList.remove("flex");
    viewerImg.src = "";
  });
  
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) {
      closeBtn.click();
    }
  });
}

// Load initial data
async function loadInitialData() {
  await loadUserProfile();
  loadFeed();
}

// User profile management
async function loadUserProfile() {
  if (!user?.id) return;
  
  try {
    // Try to get existing profile
    const resp = await fetch(`/api/users?tgId=${user.id}`);
    if (resp.ok) {
      const data = await resp.json();
      userProfile = data.profile;
      updateWalletStatus();
      return;
    }
    
    // Create new profile if doesn't exist
    const createResp = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tgId: user.id,
        role: "user",
        displayName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User ${user.id}`
      })
    });
    
    if (createResp.ok) {
      const data = await createResp.json();
      userProfile = data.profile;
      updateWalletStatus();
    }
  } catch (err) {
    console.error("Error loading user profile:", err);
  }
}

function updateWalletStatus() {
  const walletStatus = document.getElementById('walletStatus');
  if (userProfile?.wallet_address) {
    walletStatus.textContent = "Кошелёк привязан";
    walletStatus.className = "px-2 py-1 text-xs rounded-full bg-green-100 text-green-600";
    walletStatus.classList.remove('hidden');
  } else {
    walletStatus.textContent = "Нет кошелька";
    walletStatus.className = "px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-600";
    walletStatus.classList.remove('hidden');
  }
}

// Feed functionality
async function loadFeed() {
  const feed = document.getElementById("feed");
  
  try {
    const resp = await fetch("/api/announcements");
    const json = await resp.json();
    announcements = json.announcements ?? [];
    
    if (announcements.length === 0) {
      feed.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📋</div>
          <p class="text-white text-lg mb-2">Пока нет объявлений</p>
          <p class="text-white/70">Будьте первым, кто попросит о помощи</p>
        </div>`;
      return;
    }
    
    feed.innerHTML = "";
    
         announcements.forEach((item, index) => {
       const card = document.createElement("article");
       card.className = "glass-card rounded-2xl shadow-lg mb-4 transition-all hover:shadow-xl hover:-translate-y-1 slide-up overflow-hidden";
       card.style.animationDelay = `${index * 0.1}s`;

       // Truncate description for preview
       const shortDescription = item.description ? 
         (item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description) : '';

       card.innerHTML = `
         <div class="flex items-start p-4 space-x-4">
           <!-- Image Section -->
           <div class="relative flex-shrink-0 group">
             <img src="${item.image_url}" alt="${item.title}" 
                  class="w-20 h-20 rounded-xl object-cover cursor-zoom-in transition-transform group-hover:scale-105" />
             <div class="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
               <span class="text-white text-xs font-bold">📷</span>
             </div>
           </div>
           
           <!-- Content Section -->
           <div class="flex-1 min-w-0">
             <!-- Header -->
             <div class="flex items-start justify-between mb-2">
               <h3 class="font-bold text-gray-900 text-lg leading-tight pr-2">${item.title}</h3>
               <span class="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                 ${new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
               </span>
             </div>
             
             <!-- Description -->
             ${shortDescription ? `
               <p class="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-2">${shortDescription}</p>
             ` : ''}
             
             <!-- Action Buttons -->
             <div class="flex items-center justify-between">
               <button class="author-btn flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors" data-recipient-id="${item.recipient_id}">
                 <span class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">👤</span>
                 <span>Автор</span>
               </button>
               
               <button class="donate-btn bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all" 
                       data-announcement='${JSON.stringify(item)}'>
                 💎 Помочь
               </button>
             </div>
           </div>
         </div>
         
         <!-- Progress indicator (visual element) -->
         <div class="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>`;

       // Image click to open viewer
       const img = card.querySelector("img");
       img.addEventListener("click", (e) => {
         e.stopPropagation();
         const viewer = document.getElementById("viewer");
         const viewerImg = document.getElementById("viewerImg");
         viewerImg.src = item.image_url;
         viewer.classList.remove("hidden");
         viewer.classList.add("flex");
       });

       // Author button click
       const authorBtn = card.querySelector(".author-btn");
       authorBtn.addEventListener("click", (e) => {
         e.stopPropagation();
         showUserProfile(item.recipient_id);
       });

       // Donate button click
       const donateBtn = card.querySelector(".donate-btn");
       donateBtn.addEventListener("click", (e) => {
         e.stopPropagation();
         showDonateModal(item);
       });

       feed.appendChild(card);
     });
  } catch (err) {
    feed.innerHTML = `<p class='text-red-300 text-center py-8'>Ошибка загрузки: ${err}</p>`;
  }
}

// Create announcement functionality
function initCreateForm() {
  const createForm = document.getElementById("createForm");
  const imageInput = document.getElementById("imageInput");
  
  // Image input preview
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const label = document.querySelector('label[for="imageInput"]');
      label.innerHTML = `
        <div class="text-green-500 mb-2">✅</div>
        <div class="text-sm text-gray-600">${file.name}</div>
      `;
    }
  });
  
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Check if user has wallet (future implementation)
    if (!userProfile) {
      alert("Сначала необходимо настроить профиль");
      return;
    }
    
    const formData = new FormData(createForm);
    const title = formData.get("title");
    const description = formData.get("description");
    const wallet = formData.get("wallet");
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      alert("Выберите изображение");
      return;
    }

    const submitBtn = createForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Публикуем...";

    try {
      // 1) Upload image
      const imgFormData = new FormData();
      imgFormData.append("file", imageFile);
      const upResp = await fetch("/api/uploadImage", { method: "POST", body: imgFormData });
      const upJson = await upResp.json();
      if (!upJson.ok) throw new Error("Ошибка загрузки изображения");

      // 2) Create announcement
      const annResp = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description, 
          imageUrl: upJson.url, 
          recipientWallet: wallet, 
          recipientId: userProfile.id 
        }),
      });
      
      const annJson = await annResp.json();
      if (annResp.status !== 201) throw new Error(annJson.error || "Ошибка создания объявления");

      // 3) Success
      createForm.reset();
      announcements = []; // Reset to reload
      switchTab('feed');
      
      if (tg) {
        tg.showAlert("Объявление успешно опубликовано!");
      } else {
        alert("Объявление успешно опубликовано!");
      }
      
    } catch (err) {
      if (tg) {
        tg.showAlert(`Ошибка: ${err.message}`);
      } else {
        alert(`Ошибка: ${err.message}`);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Опубликовать";
      
      // Reset image input label
      const label = document.querySelector('label[for="imageInput"]');
      label.innerHTML = `
        <div class="text-gray-400 mb-2">📷</div>
        <div class="text-sm text-gray-600">Нажмите для выбора фото</div>
      `;
    }
  });
}

// Ranking functionality
async function loadRanking() {
  const rankingList = document.getElementById("rankingList");
  
  try {
    const resp = await fetch('/api/ranking');
    const json = await resp.json();
    ranking = json.ranking || [];
    
    if (ranking.length === 0) {
      rankingList.innerHTML = `
        <div class="text-center py-8">
          <div class="text-4xl mb-3">🏆</div>
          <p class="text-gray-600">Пока нет донатов</p>
        </div>`;
      return;
    }

    rankingList.innerHTML = ranking.map((donor, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      
      return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors slide-up" style="animation-delay: ${index * 0.1}s">
          <div class="flex items-center space-x-4">
            <span class="text-2xl font-bold w-8">${medal}</span>
            <div>
              <p class="font-semibold text-gray-900">${donor.first_name || 'Аноним'}</p>
              <p class="text-sm text-gray-500">${donor.donation_count} ${donor.donation_count === 1 ? 'донат' : 'донатов'}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-green-600 text-lg">${donor.total_amount} TON</p>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    rankingList.innerHTML = `<p class="text-red-500 text-center py-8">Ошибка: ${err}</p>`;
  }
}

// Profile functionality
async function loadProfile() {
  const profileContent = document.getElementById("profileContent");
  
  if (!user?.id) {
    profileContent.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">👤</div>
        <p class="text-white text-lg">Профиль недоступен</p>
        <p class="text-white/70">Запустите приложение в Telegram</p>
      </div>`;
    return;
  }
  
  if (!userProfile) {
    profileContent.innerHTML = `
      <div class="flex justify-center py-8">
        <div class="loading w-6 h-6 bg-white rounded-full"></div>
      </div>`;
    return;
  }
  
  try {
    // Get user's announcements
    const resp = await fetch(`/api/profile/${userProfile.id}`);
    const data = await resp.json();
    
    if (!resp.ok) throw new Error(data.error);
    
    const profile = data.profile;
    const userAnnouncements = data.announcements || [];
    
    profileContent.innerHTML = `
      <div class="glass-card rounded-2xl shadow-xl p-6 fade-in">
        <div class="text-center mb-6">
          ${user.photo_url ? 
            `<img src="${user.photo_url}" class="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg" />` :
            `<div class="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">${profile.display_name.charAt(0)}</div>`
          }
          <h2 class="text-2xl font-bold text-gray-900">${profile.display_name}</h2>
          <p class="text-gray-600">@${user.username || 'no_username'}</p>
          <p class="text-sm text-gray-500 mt-2">Участник с ${new Date(profile.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
        
        <div class="space-y-4">
          <div class="p-4 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-2">💰 TON Кошелёк</h3>
            ${profile.wallet_address ? 
              `<p class="font-mono text-sm text-gray-700 break-all">${profile.wallet_address}</p>` :
              `<button id="addWalletBtn" class="text-indigo-600 hover:text-indigo-800 font-medium">+ Добавить кошелёк</button>`
            }
          </div>
          
          <div class="p-4 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-3">📝 Мои объявления (${userAnnouncements.length})</h3>
            ${userAnnouncements.length > 0 ? 
              userAnnouncements.map(ann => `
                <div class="flex items-center space-x-3 p-3 bg-white rounded-lg mb-2 hover:shadow-md transition-shadow">
                  <img src="${ann.image_url}" class="w-12 h-12 rounded-lg object-cover" />
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">${ann.title}</p>
                    <p class="text-xs text-gray-500">${new Date(ann.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
              `).join('') :
              `<p class="text-gray-500 text-center py-4">Пока нет объявлений</p>`
            }
          </div>
        </div>
      </div>`;
    
    // Add wallet button functionality
    const addWalletBtn = document.getElementById('addWalletBtn');
    if (addWalletBtn) {
      addWalletBtn.addEventListener('click', showAddWalletModal);
    }
    
  } catch (err) {
    profileContent.innerHTML = `<p class="text-red-300 text-center py-8">Ошибка загрузки профиля: ${err}</p>`;
  }
}

// Helper functions
function showUserProfile(userId) {
  window.location.href = `/profile.html?id=${userId}`;
}

function showDonateModal(announcement) {
  // This will show donation modal - to be implemented
  alert(`Донат для "${announcement.title}" будет добавлен после интеграции TON Connect`);
}

async function showAddWalletModal() {
  const wallet = prompt("Введите адрес вашего TON кошелька (UQA...):");
  if (!wallet || !wallet.trim()) return;
  
  // Basic wallet validation
  if (!wallet.startsWith('UQ') && !wallet.startsWith('EQ')) {
    alert("Неверный формат кошелька. Кошелёк должен начинаться с UQ или EQ");
    return;
  }
  
  try {
    const resp = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tgId: user.id,
        walletAddress: wallet.trim()
      })
    });
    
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    
    userProfile = data.user;
    updateWalletStatus();
    loadProfile(); // Reload profile to show updated wallet
    
    if (tg) {
      tg.showAlert("Кошелёк успешно привязан!");
    } else {
      alert("Кошелёк успешно привязан!");
    }
  } catch (err) {
    if (tg) {
      tg.showAlert(`Ошибка: ${err.message}`);
    } else {
      alert(`Ошибка: ${err.message}`);
    }
  }
}

// Initialize create form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCreateForm();
}); 