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
    list.forEach((item) => {
      const card = document.createElement("article");
      card.className =
        "bg-white shadow-sm rounded-lg m-4 overflow-hidden cursor-pointer transition hover:shadow-md";
      card.innerHTML = `
        <img src="${item.image_url}" alt="${item.title}" class="w-full h-48 object-cover"/>
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-1">${item.title}</h2>
          ${item.description ? `<p class="text-sm text-gray-700 line-clamp-2">${item.description}</p>` : ""}
        </div>`;
      card.addEventListener("click", () => {
        // TODO: open announcement detail page (later)
        alert(`Открыть объявление: ${item.id}`);
      });
      feed.appendChild(card);
    });
  } catch (err) {
    feed.innerHTML = `<p class='p-4 text-red-600'>Ошибка загрузки: ${err}</p>`;
  }
}

loadFeed(); 