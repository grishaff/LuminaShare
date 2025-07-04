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
  
  // Show user info in header (только если есть нужные элементы)
  if (user) {
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.photo_url) {
      userAvatar.src = user.photo_url;
      if (userInfo) userInfo.classList.remove('hidden');
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
  initCreateForm();
  initConnectWalletModal();
  initStarsModal();
  initUserProfileModal();
  
  // Set initial active tab
  switchTab('feed');
  
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
    tab.classList.remove('text-red-500');
    tab.classList.add('text-gray-400');
  });
  
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('text-red-500');
    activeTab.classList.remove('text-gray-400');
  }
  
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
  const banner = document.getElementById("infoBanner");
  if (!banner) return;

  banner.addEventListener("click", () => {
    banner.classList.add("hidden");
  });
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
  if (!user?.id) {
    console.log("No user ID available");
    return;
  }
  
  try {
    console.log("Loading profile for user:", user.id);
    
    // Try to get existing profile
    const resp = await fetch(`/api/users?tgId=${user.id}`);
    console.log("Profile fetch response:", resp.status, resp.statusText);
    
    if (resp.ok) {
      const responseText = await resp.text();
      console.log("Response text:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        userProfile = data.profile;
        console.log("Profile loaded:", userProfile);
        updateWalletStatus();
        return;
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw response:", responseText);
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }
    }
    
    // Create new profile if doesn't exist
    console.log("Creating new profile for user:", user);
    
    const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User ${user.id}`;
    const userData = {
      tgId: user.id,
      role: "user",
      displayName: displayName
    };
    
    // Добавляем аватар только если он есть
    if (user.photo_url) {
      userData.avatarUrl = user.photo_url;
    }
    // Добавляем username если есть
    if (user.username) {
      userData.username = user.username;
    }
    
    console.log("User data to send:", userData);
    
    const createResp = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });
    
    console.log("Create profile response:", createResp.status, createResp.statusText);
    
    if (createResp.ok) {
      const responseText = await createResp.text();
      console.log("Create response text:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        userProfile = data.user; // Исправлено: API возвращает 'user', а не 'profile'
        console.log("Profile created:", userProfile);
        updateWalletStatus();
      } catch (parseError) {
        console.error("JSON parse error in create:", parseError);
        console.error("Raw create response:", responseText);
        throw new Error(`Failed to parse create response: ${parseError.message}`);
      }
    } else {
      const errorText = await createResp.text();
      console.error("Failed to create profile:", createResp.status, errorText);
      
      let errorMsg = "Неизвестная ошибка";
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error || errorMsg;
      } catch {
        errorMsg = `HTTP ${createResp.status}: ${errorText}`;
      }
      
      // Показываем пользователю детали ошибки
      const fullErrorMsg = `Ошибка создания профиля: ${errorMsg}`;
      if (tg) {
        tg.showAlert(fullErrorMsg);
      } else {
        alert(fullErrorMsg);
      }
    }
  } catch (err) {
    console.error("Error loading user profile:", err);
    
    // Пробуем простой API как fallback
    try {
      console.log("Trying simple API as fallback...");
      
      // Пробуем получить профиль через простой API
      const simpleResp = await fetch(`/api/users-simple?tgId=${user.id}`);
      console.log("Simple API GET response:", simpleResp.status, simpleResp.statusText);
      
      if (simpleResp.ok) {
        const simpleText = await simpleResp.text();
        console.log("Simple API response text:", simpleText);
        
        try {
          const data = JSON.parse(simpleText);
          userProfile = data.profile;
          console.log("Profile loaded via simple API:", userProfile);
          updateWalletStatus();
          return;
        } catch (parseError) {
          console.error("Simple API JSON parse error:", parseError);
          console.error("Simple API raw response:", simpleText);
        }
      }
      
      // Пробуем создать через простой API
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User ${user.id}`;
      const createSimpleResp = await fetch("/api/users-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: user.id,
          displayName: displayName
        })
      });
      
      console.log("Simple API CREATE response:", createSimpleResp.status, createSimpleResp.statusText);
      
      if (createSimpleResp.ok) {
        const createSimpleText = await createSimpleResp.text();
        console.log("Simple API create response text:", createSimpleText);
        
        try {
          const data = JSON.parse(createSimpleText);
          userProfile = data.user;
          console.log("Profile created via simple API:", userProfile);
          updateWalletStatus();
        } catch (parseError) {
          console.error("Simple API create JSON parse error:", parseError);
          console.error("Simple API create raw response:", createSimpleText);
        }
      } else {
        const errorText = await createSimpleResp.text();
        console.error("Simple API also failed:", createSimpleResp.status, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error("Simple API error details:", errorData);
        } catch {
          console.error("Simple API error (non-JSON):", errorText);
        }
      }
      
    } catch (fallbackErr) {
      console.error("Fallback API also failed:", fallbackErr);
    }
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
     
     // Check if user profile is loaded
     if (!userProfile) {
       if (tg) {
         tg.showAlert("Профиль не загружен. Перейдите во вкладку 'Профиль' и попробуйте снова.");
       } else {
         alert("Профиль не загружен. Перейдите во вкладку 'Профиль' и попробуйте снова.");
       }
       switchTab('profile'); // Автоматически переключаемся на профиль
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
          <p class="text-gray-400">Пока нет донатов</p>
        </div>`;
      return;
    }

    rankingList.innerHTML = ranking.map((donor, index) => {
      const position = index + 1;
      const username = donor.username || '';
      // Определяем количество звезд для отображения
      const starsCount = donor.total_amount_stars || 0;
      const formattedStars = starsCount >= 1000 ? 
        `${(starsCount / 1000).toFixed(1)}K` : 
        starsCount.toString();
      
      return `
        <div class="flex items-center justify-between py-3 px-2 hover:bg-gray-800/30 transition-colors cursor-pointer ranking-item" 
             data-username="${username}"
             data-user-name="${username}"
             data-user-position="${position}"
             data-user-stars="${starsCount}"
             style="animation-delay: ${index * 0.05}s">
          
          <div class="flex items-center space-x-3">
            <!-- Avatar -->
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              ${(username || 'A').charAt(0).toUpperCase()}
            </div>
            
            <!-- User Info -->
            <div class="flex flex-col">
              <div class="flex items-center space-x-2">
                <span class="text-white font-medium">${username || 'Аноним'}</span>
                ${donor.total_amount_stars >= 1000 ? '<span class="text-blue-400">🔵</span>' : ''}
              </div>
              <div class="flex items-center space-x-1">
                <span class="text-blue-400 text-sm">🔵</span>
                <span class="text-gray-300 text-sm font-medium">${formattedStars}</span>
              </div>
            </div>
          </div>
          
          <!-- Position -->
          <div class="text-right">
            <span class="text-white font-bold text-lg">${position}</span>
          </div>
        </div>
      `;
    }).join('');
    
    // Добавляем обработчики кликов на пользователей
    document.querySelectorAll('.ranking-item').forEach(item => {
      item.addEventListener('click', () => {
        const username = item.dataset.username;
        if (username) {
          window.location.href = `/profile.html?username=${encodeURIComponent(username)}`;
        }
      });
    });
    
  } catch (err) {
    rankingList.innerHTML = `<p class="text-red-500 text-center py-8">Ошибка: ${err}</p>`;
  }
}

// Profile functionality
async function loadProfile() {
  const profileContent = document.getElementById("profileContent");
  
  if (!user?.id) {
    profileContent.innerHTML = `
      <div class="glass-card rounded-2xl p-6 text-center">
        <div class="text-6xl mb-4">👤</div>
        <p class="text-white text-lg">Профиль недоступен</p>
        <p class="text-gray-400">Запустите приложение в Telegram</p>
      </div>`;
    return;
  }
  
  if (!userProfile) {
    // Показываем индикатор загрузки
    profileContent.innerHTML = `
      <div class="glass-card rounded-2xl p-6 text-center">
        <div class="flex justify-center mb-4">
          <div class="loading w-8 h-8 bg-indigo-500 rounded-full"></div>
        </div>
        <p class="text-gray-700">Загрузка профиля...</p>
      </div>`;
    
    // Попытаемся загрузить профиль еще раз
    await loadUserProfile();
    
    if (!userProfile) {
      profileContent.innerHTML = `
        <div class="glass-card rounded-2xl p-6 text-center">
          <div class="text-6xl mb-4">⚠️</div>
          <p class="text-gray-700 text-lg mb-4">Не удалось загрузить профиль</p>
          <p class="text-gray-500 text-sm mb-4">Проверьте консоль для деталей</p>
          <div class="space-y-3">
            <button id="retryProfileBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
              Попробовать снова
            </button>
            <button id="testApiBtn" class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
              Тест API
            </button>
            <button id="debugBtn" class="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              Проверить базу данных
            </button>
          </div>
        </div>`;
      
      // Добавляем обработчик для кнопки повторной попытки
      const retryBtn = document.getElementById('retryProfileBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
          // Показываем загрузку при повторной попытке
          profileContent.innerHTML = `
            <div class="glass-card rounded-2xl p-6 text-center">
              <div class="flex justify-center mb-4">
                <div class="loading w-8 h-8 bg-indigo-500 rounded-full"></div>
              </div>
              <p class="text-gray-700">Повторная загрузка...</p>
            </div>`;
          await loadProfile();
        });
      }
      
      // Добавляем обработчик для test API кнопки
      const testApiBtn = document.getElementById('testApiBtn');
      if (testApiBtn) {
        testApiBtn.addEventListener('click', async () => {
          try {
            console.log("Testing API...");
            const resp = await fetch('/api/test');
            const responseText = await resp.text();
            console.log("Test API raw response:", responseText);
            
            try {
              const testData = JSON.parse(responseText);
              console.log("Test API data:", testData);
              
              if (testData.success) {
                if (tg) {
                  tg.showAlert("API работает корректно!");
                } else {
                  alert("API работает корректно!");
                }
              } else {
                if (tg) {
                  tg.showAlert("API возвращает ошибку - смотрите консоль");
                } else {
                  alert("API возвращает ошибку - смотрите консоль");
                }
              }
            } catch (parseError) {
              console.error("Test API JSON parse error:", parseError);
              if (tg) {
                tg.showAlert("API возвращает некорректный JSON");
              } else {
                alert("API возвращает некорректный JSON");
              }
            }
          } catch (err) {
            console.error("Test API fetch error:", err);
            if (tg) {
              tg.showAlert("Ошибка подключения к API");
            } else {
              alert("Ошибка подключения к API");
            }
          }
        });
      }
      
      // Добавляем обработчик для debug кнопки
      const debugBtn = document.getElementById('debugBtn');
      if (debugBtn) {
        debugBtn.addEventListener('click', async () => {
          try {
            console.log("Fetching debug info...");
            const resp = await fetch('/api/debug');
            const debugData = await resp.json();
            console.log("Debug data:", debugData);
            
            if (tg) {
              tg.showAlert("Debug информация выведена в консоль");
            } else {
              alert("Debug информация выведена в консоль");
            }
          } catch (err) {
            console.error("Debug fetch error:", err);
            if (tg) {
              tg.showAlert("Ошибка получения debug информации");
    } else {
              alert("Ошибка получения debug информации");
            }
          }
        });
      }
      return;
    }
  }
  
  try {
    console.log("Loading profile for user:", userProfile.id);
    // Get user's announcements
    const resp = await fetch(`/api/profile?id=${userProfile.id}`);
    console.log("Profile fetch response:", resp.status);
    
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Profile fetch error:", errorText);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }
    
    const responseText = await resp.text();
    console.log("Response text:", responseText);
    
    const data = JSON.parse(responseText);
    console.log("Profile loaded:", data.profile);
    
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
              `<div>
                <p class="font-mono text-sm text-gray-700 break-all mb-2">${profile.wallet_address}</p>
                <button id="disconnectWalletBtn" class="text-red-600 hover:text-red-800 font-medium text-sm">Отключить кошелёк</button>
              </div>` :
              `<button id="connectWalletBtn" class="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                🔗 Подключить кошелёк
              </button>`
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
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
      connectWalletBtn.addEventListener('click', showConnectWalletModal);
    }
    
    const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
    if (disconnectWalletBtn) {
      disconnectWalletBtn.addEventListener('click', disconnectWallet);
    }
    
  } catch (err) {
    console.error("Error in loadProfile:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    profileContent.innerHTML = `
      <div class="glass-card rounded-2xl p-6 text-center">
        <div class="text-4xl mb-4">💥</div>
        <p class="text-red-600 text-lg mb-4">Критическая ошибка</p>
        <p class="text-gray-600 text-sm mb-4">${errorMessage}</p>
        <button id="reloadPageBtn" class="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors">
          Перезагрузить страницу
        </button>
      </div>`;
    
    const reloadBtn = document.getElementById('reloadPageBtn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }
}

// Helper functions
function showUserProfile(userData) {
  const modal = document.getElementById('userProfileModal');
  const avatar = document.getElementById('profileAvatar');
  const name = document.getElementById('profileName');
  const rank = document.getElementById('profileRank');
  const stars = document.getElementById('profileStars');
  
  // Заполняем данные профиля
  avatar.textContent = (userData.first_name || 'A').charAt(0).toUpperCase();
  name.textContent = userData.first_name || 'Аноним';
  rank.textContent = `#${userData.position}`;
  
  // Форматируем количество звезд
  const starsCount = parseInt(userData.total_amount_stars) || 0;
  const formattedStars = starsCount >= 1000 ? 
    `${(starsCount / 1000).toFixed(1)}K` : 
    starsCount.toString();
  stars.textContent = formattedStars;
  
  // Сохраняем ID для функции "Открыть в Telegram"
  modal.dataset.userId = userData.tg_id;
  
  // Показываем модальное окно
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideUserProfile() {
  const modal = document.getElementById('userProfileModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function openUserInTelegram(username) {
  if (!username) return;
  const url = `https://t.me/${username}`;
  if (window.tg && tg.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (window.tg && tg.openLink) {
    tg.openLink(url, { try_instant_view: false });
  } else {
    window.open(url, '_blank');
  }
}

function initUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  const closeBtn = document.getElementById('closeUserProfile');
  const backBtn = document.getElementById('backFromProfile');
  const openTgBtn = document.getElementById('openInTelegram');

  // Закрытие модального окна
  closeBtn.addEventListener('click', hideUserProfile);
  backBtn.addEventListener('click', hideUserProfile);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideUserProfile();
    }
  });

  // Открытие в Telegram
  openTgBtn.addEventListener('click', () => {
    const userId = modal.dataset.userId;
    openUserInTelegram(userId);
  });
}

function showDonateModal(announcement) {
  if (!tg) {
    alert("Функция доступна только в Telegram");
    return;
  }

  // Показываем выбор количества звезд
  const options = [
    { stars: 10, label: "⭐ 10 звезд" },
    { stars: 50, label: "⭐ 50 звезд" },
    { stars: 100, label: "⭐ 100 звезд" },
    { stars: 500, label: "⭐ 500 звезд" },
    { stars: 1000, label: "⭐ 1000 звезд" }
  ];

  // Создаем модальное окно для выбора звезд
  showStarsModal(announcement, options);
}

// Stars donation functions
function showStarsModal(announcement, options) {
  const modal = document.getElementById('starsModal');
  const titleEl = document.getElementById('starsAnnouncementTitle');
  const optionsEl = document.getElementById('starsOptions');

  titleEl.textContent = `Поддержать: ${announcement.title}`;
  
  // Создаем кнопки для выбора звезд
  optionsEl.innerHTML = options.map(option => `
    <button class="stars-option w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors border border-gray-600" 
            data-stars="${option.stars}">
      ${option.label}
    </button>
  `).join('');

  // Добавляем обработчики для кнопок звезд
  optionsEl.querySelectorAll('.stars-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const stars = parseInt(btn.dataset.stars);
      showStarsConfirmation(announcement, stars);
    });
  });

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideStarsModal() {
  const modal = document.getElementById('starsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  
  // Сбрасываем состояние модального окна
  document.getElementById('starsOptions').classList.remove('hidden');
  document.getElementById('starsConfirmation').classList.add('hidden');
}

function showStarsConfirmation(announcement, stars) {
  // Скрываем варианты выбора
  document.getElementById('starsOptions').classList.add('hidden');
  
  // Показываем подтверждение
  const confirmationEl = document.getElementById('starsConfirmation');
  const amountEl = document.getElementById('confirmStarsAmount');
  const targetEl = document.getElementById('confirmStarsTarget');
  
  amountEl.textContent = `${stars} ⭐ звезд`;
  targetEl.textContent = `для "${announcement.title}"`;
  
  confirmationEl.classList.remove('hidden');
  
  // Сохраняем данные для подтверждения
  confirmationEl.dataset.announcementId = announcement.id;
  confirmationEl.dataset.stars = stars;
}

async function sendStarsDonation(announcementId, stars) {
  try {
    if (!tg || !tg.initDataUnsafe?.user) {
      throw new Error("Пользователь не авторизован");
    }

    console.log(`Processing ${stars} stars donation for announcement:`, announcementId);

    // Записываем донат в базу данных (симуляция успешного платежа)
    await recordStarsDonation(announcementId, tg.initDataUnsafe.user.id, stars);
    
  } catch (err) {
    console.error("Error sending stars donation:", err);
    if (tg) {
      tg.showAlert(`Ошибка: ${err.message}`);
    } else {
      alert(`Ошибка: ${err.message}`);
    }
  }
}

async function recordStarsDonation(announcementId, donorTgId, amountStars) {
  try {
    const resp = await fetch("/api/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcementId: announcementId,
        donorTgId: donorTgId,
        amountStars: amountStars,
        txHash: `stars_${Date.now()}` // Временный ID для звезд
      })
    });
    
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    
    // Показываем успешное сообщение
    if (tg) {
      tg.showAlert(`Спасибо! Вы отправили ${amountStars} ⭐ звезд!`);
    } else {
      alert(`Спасибо! Вы отправили ${amountStars} ⭐ звезд!`);
    }
    
    // Обновляем данные
    loadFeed();
    
  } catch (err) {
    console.error("Error recording donation:", err);
    if (tg) {
      tg.showAlert(`Ошибка записи доната: ${err.message}`);
    } else {
      alert(`Ошибка записи доната: ${err.message}`);
    }
  }
}

function initStarsModal() {
  const modal = document.getElementById('starsModal');
  const closeBtn = document.getElementById('closeStarsModal');
  const confirmBtn = document.getElementById('confirmStarsPayment');
  const backBtn = document.getElementById('backToStarsOptions');

  // Закрытие модального окна
  closeBtn.addEventListener('click', hideStarsModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideStarsModal();
    }
  });

  // Подтверждение платежа
  confirmBtn.addEventListener('click', async () => {
    const confirmationEl = document.getElementById('starsConfirmation');
    const announcementId = confirmationEl.dataset.announcementId;
    const stars = parseInt(confirmationEl.dataset.stars);
    
    hideStarsModal();
    await sendStarsDonation(announcementId, stars);
  });

  // Кнопка "Назад"
  backBtn.addEventListener('click', () => {
    document.getElementById('starsConfirmation').classList.add('hidden');
    document.getElementById('starsOptions').classList.remove('hidden');
  });
}

// Wallet connection functions
function showConnectWalletModal() {
  const modal = document.getElementById('connectWalletModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideConnectWalletModal() {
  const modal = document.getElementById('connectWalletModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function connectToTelegramWallet() {
  try {
    // Используем Telegram WebApp API для подключения кошелька
    if (tg && tg.openTelegramLink) {
      // Показываем запрос разрешения как в Major
      const result = await new Promise((resolve) => {
        if (tg.showConfirm) {
          tg.showConfirm(
            "LuminaShare запрашивает доступ к TON Space\n\nПриложение сможет видеть адрес TON, баланс и историю активности.",
            (confirmed) => resolve(confirmed)
          );
        } else {
          // Fallback для старых версий
          const confirmed = confirm("LuminaShare запрашивает доступ к TON Space\n\nПриложение сможет видеть адрес TON, баланс и историю активности.\n\nПодключить?");
          resolve(confirmed);
        }
      });
      
      if (result) {
        // Открываем Telegram Wallet
        tg.openTelegramLink("https://t.me/wallet");
        
        // В реальной интеграции здесь бы был TON Connect
        // Пока симулируем получение адреса
        setTimeout(() => {
          simulateWalletConnection("UQCQ...NqMC"); // Примерный адрес
        }, 2000);
      }
    } else {
      // Fallback для браузера
      alert("Функция доступна только в Telegram");
    }
  } catch (err) {
    console.error("Error connecting wallet:", err);
    if (tg) {
      tg.showAlert("Ошибка подключения кошелька");
    } else {
      alert("Ошибка подключения кошелька");
    }
  }
}

async function simulateWalletConnection(walletAddress) {
  try {
    const resp = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tgId: user.id,
        walletAddress: walletAddress
      })
    });
    
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    
    userProfile = data.user;
    updateWalletStatus();
    loadProfile(); // Reload profile to show updated wallet
    hideConnectWalletModal();
    
    if (tg) {
      tg.showAlert("Кошелёк успешно подключен!");
    } else {
      alert("Кошелёк успешно подключен!");
    }
  } catch (err) {
    console.error("Error saving wallet:", err);
    if (tg) {
      tg.showAlert(`Ошибка: ${err.message}`);
    } else {
      alert(`Ошибка: ${err.message}`);
    }
  }
}

async function disconnectWallet() {
  try {
    const confirmed = confirm("Отключить кошелёк?");
    if (!confirmed) return;
    
    const resp = await fetch("/api/users", {
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tgId: user.id,
        walletAddress: null
      })
    });
    
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error);
    
    userProfile = data.user;
    updateWalletStatus();
    loadProfile(); // Reload profile
    
    if (tg) {
      tg.showAlert("Кошелёк отключен");
    } else {
      alert("Кошелёк отключен");
    }
  } catch (err) {
    console.error("Error disconnecting wallet:", err);
    if (tg) {
      tg.showAlert(`Ошибка: ${err.message}`);
    } else {
      alert(`Ошибка: ${err.message}`);
    }
  }
}

function initConnectWalletModal() {
  const modal = document.getElementById('connectWalletModal');
  const closeBtn = document.getElementById('closeConnectModal');
  const telegramWalletBtn = document.getElementById('openTelegramWallet');
  const walletOptions = document.querySelectorAll('.wallet-option');

  closeBtn.addEventListener('click', hideConnectWalletModal);
  
  telegramWalletBtn.addEventListener('click', () => {
    hideConnectWalletModal();
    connectToTelegramWallet();
  });
  
  walletOptions.forEach(option => {
    option.addEventListener('click', () => {
      const walletType = option.dataset.wallet;
      hideConnectWalletModal();
      
      if (walletType === 'other') {
        alert("Другие кошельки будут добавлены в следующих версиях");
      } else {
        alert(`Подключение ${walletType} будет добавлено в следующих версиях`);
      }
    });
  });

  // Закрытие при клике вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideConnectWalletModal();
    }
  });
}

// Для profile.html: загрузка профиля по username
async function loadProfileByUsername() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');
  if (!username) return;

  const profileContent = document.getElementById("profileContent");
  profileContent.innerHTML = `<div class='text-center py-8 text-white'>Загрузка профиля...</div>`;

  try {
    // Получаем профиль по username
    const resp = await fetch(`/api/users-by-username?username=${encodeURIComponent(username)}`);
    if (!resp.ok) throw new Error('Пользователь не найден');
    const data = await resp.json();
    const profile = data.profile;

    // Заполняем профиль
    profileContent.innerHTML = `
      <div class="glass-card rounded-2xl shadow-xl p-6 fade-in">
        <div class="text-center mb-6">
          <div class="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">${(profile.username || 'A').charAt(0).toUpperCase()}</div>
          <h2 class="text-2xl font-bold text-white mb-2">${profile.username || 'Аноним'}</h2>
        </div>
        <div class="space-y-3 mb-6">
          <div class="bg-gray-800 rounded-xl p-3 border border-gray-600 flex items-center space-x-3">
            <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><span class="text-white font-bold text-sm">🏆</span></div>
            <div class="flex-1"><span class="text-gray-400 text-sm">Ранг</span></div>
            <span class="text-white font-bold">#${profile.rank || '-'}</span>
          </div>
          <div class="bg-gray-800 rounded-xl p-3 border border-gray-600 flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><span class="text-white text-sm">⭐</span></div>
            <div class="flex-1"><span class="text-gray-400 text-sm">Звезды</span></div>
            <span class="text-white font-bold">${profile.total_amount_stars || 0}</span>
          </div>
        </div>
        <button id="openInTelegram" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors mb-4">Открыть в Telegram</button>
        <div>
          <h3 class="text-gray-400 text-sm font-semibold mb-3 uppercase tracking-wide">ДОСТИЖЕНИЯ ПОЛЬЗОВАТЕЛЯ</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">⚡</span></div>
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">💎</span></div>
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">🏆</span></div>
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">⭐</span></div>
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">🎯</span></div>
            <div class="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-600"><span class="text-2xl">💰</span></div>
          </div>
        </div>
      </div>
    `;
    // Кнопка Telegram
    document.getElementById('openInTelegram').onclick = () => openUserInTelegram(profile.username);
  } catch (err) {
    profileContent.innerHTML = `<div class='text-center py-8 text-red-500'>Ошибка: ${err.message}</div>`;
  }
}

// Initialize create form when DOM is ready
// (moved to main DOMContentLoaded above) 