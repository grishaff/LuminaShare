// Telegram Web App initialization
let tg = window.Telegram?.WebApp;
let user = null;

if (tg) {
  tg.ready();
  tg.expand();
  user = tg.initDataUnsafe?.user;
  
  // Hide banner if in Telegram
  const bannerEl = document.getElementById("infoBanner");
  if (bannerEl) bannerEl.style.display = "none";
} else {
  console.log("Running outside Telegram");
}

// Info banner logic
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

// Load announcements
async function loadFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "<p class='p-4 text-gray-500'>Загрузка...</p>";
  try {
    const resp = await fetch("/api/announcements");
    const json = await resp.json();
    const list = json.announcements ?? [];
    if (list.length === 0) {
      feed.innerHTML = "<p class='p-4 text-gray-500'>Пока нет объявлений.</p>";
      return;
    }
    feed.innerHTML = "";
    const viewer = document.getElementById("viewer");
    const viewerImg = document.getElementById("viewerImg");

    list.forEach((item) => {
      const card = document.createElement("article");
      card.className =
        "bg-white/80 backdrop-blur-md shadow-lg rounded-2xl m-4 overflow-hidden transition transform hover:shadow-xl hover:-translate-y-0.5";

      card.innerHTML = `
        <div class="relative group">
          <img src="${item.image_url}" alt="${item.title}" class="w-full h-40 object-cover cursor-zoom-in" />
        </div>
        <div class="p-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-1">${item.title}</h2>
          ${item.description ? `<p class="text-sm text-gray-700 line-clamp-3">${item.description}</p>` : ""}
        </div>`;

      // open full image on click
      const img = card.querySelector("img");
      img.addEventListener("click", (e) => {
        e.stopPropagation();
        viewerImg.src = item.image_url;
        viewer.classList.remove("hidden");
        viewer.classList.add("flex");
      });

      // navigate to announcement details
      card.addEventListener("click", () => {
        window.location.href = `/announcement.html?id=${item.id}`;
      });

      feed.appendChild(card);
    });

    // close viewer on overlay click
    viewer.addEventListener("click", () => {
      viewer.classList.add("hidden");
      viewer.classList.remove("flex");
      viewerImg.src = "";
    });
  } catch (err) {
    feed.innerHTML = `<p class='p-4 text-red-600'>Ошибка загрузки: ${err}</p>`;
  }
}

loadFeed();

// ===== Рейтинг =====
const rankingBtn = document.getElementById("rankingBtn");
rankingBtn.addEventListener("click", () => {
  window.location.href = "/ranking.html";
});

// ===== Новое объявление =====
const newBtn = document.getElementById("newBtn");
const newModal = document.getElementById("newModal");
const cancelNew = document.getElementById("cancelNew");
const newForm = document.getElementById("newForm");

newBtn.addEventListener("click", () => {
  newModal.classList.remove("hidden");
  newModal.classList.add("flex");
});

cancelNew.addEventListener("click", () => {
  newModal.classList.add("hidden");
  newModal.classList.remove("flex");
  newForm.reset();
});

newForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(newForm);
  const title = fd.get("title");
  const description = fd.get("description");
  const wallet = fd.get("wallet");
  const imageFile = fd.get("image");

  if (!imageFile || !(imageFile instanceof File)) return;

  try {
    // 1) upload image
    const imgForm = new FormData();
    imgForm.append("file", imageFile);
    const upResp = await fetch("/api/uploadImage", { method: "POST", body: imgForm });
    const upJson = await upResp.json();
    if (!upJson.ok) throw new Error("upload failed");
    const imageUrl = upJson.url;

    // 2) get or create user profile
    let recipientId;
    
    if (user?.id) {
      // Create/update user profile in database
      const userResp = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tgId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username
        })
      });
      const userData = await userResp.json();
      recipientId = userData.user.id;
    } else {
      // Fallback for testing outside Telegram
      recipientId = localStorage.getItem("recipientId");
      if (!recipientId) {
        recipientId = prompt("Введите UUID вашего профиля (recipientId)");
        if (!recipientId) return;
        localStorage.setItem("recipientId", recipientId);
      }
    }

    // 3) create announcement
    const annResp = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, imageUrl, recipientWallet: wallet, recipientId }),
    });
    const annJson = await annResp.json();
    if (annResp.status !== 201) throw new Error(annJson.error || "Ошибка создания");

    // 4) close modal and refresh feed
    cancelNew.click();
    loadFeed();
  } catch (err) {
    alert(err);
  }
}); 