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

      // placeholder card click
      card.addEventListener("click", () => {
        alert(`Открыть объявление: ${item.id}`);
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