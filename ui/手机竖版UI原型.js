const styleOptions = [
  {
    key: "original",
    label: "原图",
    image: "../backup/原图.jpg",
    note: "真实室内光线，适合做来源对照。",
    hero: "保留原始现场感，方便比较每次转换的变化。"
  },
  {
    key: "pro",
    label: "专业摄影",
    image: "../backup/专业摄影.jpg",
    note: "景深更明确，人物主体更突出。",
    hero: "柔和景深、真实肤色和清楚主体，适合做首屏主视觉。"
  },
  {
    key: "anime",
    label: "动画暖光",
    image: "../backup/吉卜力.jpg",
    note: "温暖叙事感，适合故事化展示。",
    hero: "暖色线稿和室内细节更有叙事感，适合做风格示例。"
  },
  {
    key: "watercolor",
    label: "水彩纸感",
    image: "../backup/水彩.jpg",
    note: "纸张肌理明显，适合轻量插画方向。",
    hero: "明亮纸感与留白更轻，适合做空状态或草稿预览。"
  }
];

const statusMap = {
  ready: "完成",
  draft: "草稿",
  failed: "异常"
};

let works = [
  {
    id: "work-pro",
    title: "窗边人像专业摄影版",
    style: "pro",
    status: "ready",
    time: "16:12",
    desc: "主体清楚，适合首页封面。"
  },
  {
    id: "work-anime",
    title: "室内暖光动画版",
    style: "anime",
    status: "ready",
    time: "16:08",
    desc: "书架和窗光更有故事感。"
  },
  {
    id: "work-watercolor",
    title: "水彩纸感草稿",
    style: "watercolor",
    status: "draft",
    time: "15:58",
    desc: "等待补充标题和关键词。"
  },
  {
    id: "work-original",
    title: "原图对照",
    style: "original",
    status: "failed",
    time: "15:35",
    desc: "需要重新生成缩略图。"
  }
];

let activeStyle = "pro";
let activeFilter = "all";
let selectedWorkId = works[0].id;
let toastTimer;
let generationInterval;
let generationTimers = [];

const styleRail = document.querySelector("#styleRail");
const workList = document.querySelector("#workList");
const searchInput = document.querySelector("#searchInput");
const saveStatus = document.querySelector("#saveStatus");
const phoneShell = document.querySelector(".phone-shell");
const generationStage = document.querySelector(".generation-stage");
const generationStatus = document.querySelector("#generationStatus");
const sourcePhoto = document.querySelector("#sourcePhoto");
const generationCards = Array.from(document.querySelectorAll("[data-generation-card]"));
const detailSheet = document.querySelector("#detailSheet");
const detailTitle = document.querySelector("#detailTitle");
const detailImage = document.querySelector("#detailImage");
const detailStatus = document.querySelector("#detailStatus");
const detailTime = document.querySelector("#detailTime");
const detailThumbs = document.querySelector("#detailThumbs");
const createSheet = document.querySelector("#createSheet");
const confirmModal = document.querySelector("#confirmModal");
const toast = document.querySelector("#toast");
const styleSelect = document.querySelector("#styleSelect");
const formPreview = document.querySelector("#formPreview");
const shotTitle = document.querySelector("#shotTitle");
const titleError = document.querySelector("#titleError");
const submitCreate = document.querySelector("#submitCreate");
const errorCard = document.querySelector("#errorCard");
const draftSkeleton = document.querySelector("#draftSkeleton");

const generationQueue = [
  { workId: "work-pro", label: "专业摄影", seconds: 12 },
  { workId: "work-anime", label: "动画暖光", seconds: 14 },
  { workId: "work-watercolor", label: "水彩纸感", seconds: 16 }
];

function getStyle(key) {
  return styleOptions.find((style) => style.key === key) || styleOptions[0];
}

function renderStyleRail() {
  if (!styleRail) return;
  styleRail.innerHTML = styleOptions
    .map((style) => {
      const selected = style.key === activeStyle ? " is-active" : "";
      return `
        <button class="style-card${selected}" type="button" data-style="${style.key}" aria-pressed="${style.key === activeStyle}">
          <img src="${style.image}" alt="${style.label}样张" />
          <span>
            <strong>${style.label}</strong>
            <small>${style.note}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function setActiveStyle(key) {
  if (!styleRail) return;
  const next = getStyle(key);
  activeStyle = next.key;
  const hero = document.querySelector(".hero-shot");
  if (!hero) return;
  hero.classList.add("is-switching");
  window.setTimeout(() => {
    const heroImage = document.querySelector("#heroImage");
    const heroDesc = document.querySelector("#heroDesc");
    const activeStyleLabel = document.querySelector("#activeStyleLabel");
    if (heroImage) {
      heroImage.src = next.image;
      heroImage.alt = `${next.label}风格样张`;
    }
    if (heroDesc) heroDesc.textContent = next.hero;
    if (activeStyleLabel) activeStyleLabel.textContent = next.label;
    renderStyleRail();
    hero.classList.remove("is-switching");
  }, 150);
}

function makeStatus(status) {
  return `<span class="status ${status}">${statusMap[status]}</span>`;
}

function renderWorks({ loading = false } = {}) {
  if (loading) {
    workList.innerHTML = `
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
    `;
    return;
  }

  const term = searchInput.value.trim().toLowerCase();
  const filtered = works.filter((work) => {
    const style = getStyle(work.style);
    const matchesFilter = activeFilter === "all" || work.status === activeFilter;
    const haystack = `${work.title} ${style.label} ${statusMap[work.status]} ${work.desc}`.toLowerCase();
    return matchesFilter && (!term || haystack.includes(term));
  });

  if (!filtered.length) {
    workList.innerHTML = `
      <div class="empty-state">
        <strong>没有匹配的样张</strong>
        <p>换一个关键词，或者清除当前筛选后再看一次。</p>
      </div>
    `;
    return;
  }

  workList.innerHTML = filtered
    .map((work, index) => {
      const style = getStyle(work.style);
      return `
        <button class="work-card" type="button" data-work="${work.id}" style="--i: ${index}">
          <img src="${style.image}" alt="${style.label}缩略图" />
          <span>
            <strong>${work.title}</strong>
            <small>${work.desc} ${work.time}</small>
          </span>
          <span class="more-mark" aria-hidden="true">
            ${makeStatus(work.status)}
          </span>
        </button>
      `;
    })
    .join("");
}

function setPanel(name) {
  phoneShell.classList.toggle("home-mode", name === "home");
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.target === name);
  });
  document.querySelector("#newShotButton").hidden = name === "home" || name === "settings";
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
}

function openDetail(workId = selectedWorkId) {
  const work = works.find((item) => item.id === workId) || works[0];
  const style = getStyle(work.style);
  selectedWorkId = work.id;
  detailTitle.textContent = work.title;
  detailImage.src = style.image;
  detailImage.alt = `${style.label}详情预览`;
  detailStatus.textContent = statusMap[work.status];
  detailTime.textContent = work.time;
  detailThumbs.innerHTML = styleOptions
    .map((item) => `
      <button class="thumb-button${item.key === work.style ? " is-active" : ""}" type="button" data-detail-style="${item.key}" aria-label="查看${item.label}">
        <img src="${item.image}" alt="${item.label}缩略图" />
      </button>
    `)
    .join("");
  detailSheet.hidden = false;
}

function closeDetail() {
  detailSheet.hidden = true;
}

function openCreate() {
  titleError.hidden = true;
  shotTitle.value = "";
  styleSelect.value = activeStyle;
  formPreview.src = getStyle(styleSelect.value).image;
  submitCreate.disabled = false;
  submitCreate.innerHTML = `<svg><use href="#icon-check"></use></svg>保存草稿`;
  createSheet.hidden = false;
  window.setTimeout(() => shotTitle.focus(), 80);
}

function closeCreate() {
  createSheet.hidden = true;
}

function deleteSelectedWork() {
  works = works.filter((work) => work.id !== selectedWorkId);
  confirmModal.hidden = true;
  closeDetail();
  renderWorks();
  showToast("样张已从列表移除，原图文件已保留。");
}

function addRipple(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  button.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

function restartElementAnimation(element) {
  if (!element) return;
  element.style.animation = "none";
  void element.offsetHeight;
  element.style.animation = "";
}

function clearGenerationTimers() {
  window.clearInterval(generationInterval);
  generationTimers.forEach((timer) => window.clearTimeout(timer));
  generationTimers = [];
}

function resetGenerationCards() {
  generationCards.forEach((card) => {
    const item = generationQueue.find((queueItem) => queueItem.workId === card.dataset.generationCard);
    card.classList.remove("is-spawned", "is-generating", "is-ready");
    card.querySelector(".result-time").textContent = item ? `${item.seconds}s` : "";
  });
}

function updateGenerationCountdown(startedAt) {
  const remaining = generationQueue
    .map((item) => item.seconds - Math.floor((Date.now() - startedAt) / 1000))
    .filter((seconds) => seconds > 0);
  if (!remaining.length) {
    generationStatus.textContent = "三张都好了";
    window.clearInterval(generationInterval);
    return;
  }
  generationStatus.textContent = `生成中 ${Math.max(...remaining)}s`;
}

function startGenerationDemo() {
  if (!generationStage) return;
  clearGenerationTimers();
  resetGenerationCards();
  generationStage.classList.remove("is-running", "is-complete");
  restartElementAnimation(sourcePhoto);
  generationStatus.textContent = "照片已落桌";
  setSaveStatus("正在生成");

  window.setTimeout(() => {
    generationStage.classList.add("is-running");
    generationStatus.textContent = "生成中 16s";
  }, 280);

  generationCards.forEach((card, index) => {
    const item = generationQueue.find((queueItem) => queueItem.workId === card.dataset.generationCard);
    generationTimers.push(
      window.setTimeout(() => {
        card.classList.add("is-spawned", "is-generating");
      }, 760 + index * 190)
    );
    generationTimers.push(
      window.setTimeout(() => {
        card.classList.add("is-ready");
        card.querySelector(".result-time").textContent = "完成";
        showToast(`${item.label} 已生成`);
      }, (item.seconds * 1000) + index * 120)
    );
  });

  const startedAt = Date.now();
  updateGenerationCountdown(startedAt);
  generationInterval = window.setInterval(() => updateGenerationCountdown(startedAt), 1000);

  generationTimers.push(
    window.setTimeout(() => {
      generationStage.classList.add("is-complete");
      generationStatus.textContent = "三张都好了";
      setSaveStatus("本地已保存");
    }, 16400)
  );
}

if (styleRail) {
  styleRail.addEventListener("click", (event) => {
    const card = event.target.closest("[data-style]");
    if (!card) return;
    setActiveStyle(card.dataset.style);
  });
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.target));
});

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });
    renderWorks();
  });
});

searchInput.addEventListener("input", () => renderWorks());

workList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-work]");
  if (!card) return;
  openDetail(card.dataset.work);
});

detailThumbs.addEventListener("click", (event) => {
  const thumb = event.target.closest("[data-detail-style]");
  if (!thumb) return;
  const style = getStyle(thumb.dataset.detailStyle);
  detailImage.src = style.image;
  detailImage.alt = `${style.label}详情预览`;
  detailThumbs.querySelectorAll(".thumb-button").forEach((item) => {
    item.classList.toggle("is-active", item === thumb);
  });
});

document.querySelector("#showDetailFromHome").addEventListener("click", () => openDetail());
document.querySelector("#fakeUpload").addEventListener("click", startGenerationDemo);
document.querySelector("#restartGeneration").addEventListener("click", startGenerationDemo);
generationCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (!card.classList.contains("is-ready")) {
      showToast("还在生成，先看模糊预览。");
      return;
    }
    openDetail(card.dataset.generationCard);
  });
});
document.querySelector("#newShotButton").addEventListener("click", openCreate);
document.querySelector("#openCreateFromDrop").addEventListener("click", openCreate);
document.querySelector("[data-close-sheet]").addEventListener("click", closeDetail);
document.querySelector("[data-close-create]").addEventListener("click", closeCreate);

document.querySelector("#saveWork").addEventListener("click", () => {
  setSaveStatus("正在写入本地");
  showToast("保存中，列表状态会自动更新。");
  window.setTimeout(() => {
    setSaveStatus("本地已保存");
    showToast("样张已保存。");
  }, 900);
});

document.querySelector("#deleteWork").addEventListener("click", () => {
  confirmModal.hidden = false;
});

document.querySelector("#cancelDelete").addEventListener("click", () => {
  confirmModal.hidden = true;
});

document.querySelector("#confirmDelete").addEventListener("click", deleteSelectedWork);

styleSelect.addEventListener("change", () => {
  formPreview.src = getStyle(styleSelect.value).image;
});

document.querySelector("#createForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = shotTitle.value.trim();
  if (!title) {
    titleError.hidden = false;
    shotTitle.focus();
    return;
  }
  titleError.hidden = true;
  submitCreate.disabled = true;
  submitCreate.textContent = "保存中";
  setSaveStatus("正在写入本地");
  window.setTimeout(() => {
    const style = getStyle(styleSelect.value);
    works.unshift({
      id: `work-${Date.now()}`,
      title,
      style: style.key,
      status: "draft",
      time: "刚刚",
      desc: `${style.label}方向，等待最终确认。`
    });
    activeFilter = "all";
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.filter === "all");
    });
    closeCreate();
    setPanel("works");
    setSaveStatus("本地已保存");
    renderWorks();
    showToast("草稿已加入作品列表。");
  }, 850);
});

document.querySelector("#retryDraft").addEventListener("click", () => {
  errorCard.hidden = true;
  draftSkeleton.hidden = false;
  setSaveStatus("正在恢复草稿");
  window.setTimeout(() => {
    draftSkeleton.hidden = true;
    setSaveStatus("本地已保存");
    showToast("草稿已恢复，可以继续编辑。");
  }, 1100);
});

document.querySelector("#refreshDemo").addEventListener("click", () => {
  setSaveStatus("正在刷新");
  renderWorks({ loading: true });
  window.setTimeout(() => {
    setSaveStatus("本地已保存");
    renderWorks();
    showToast("状态已刷新。");
  }, 900);
});

document.addEventListener("click", addRipple);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  detailSheet.hidden = true;
  createSheet.hidden = true;
  confirmModal.hidden = true;
});

detailSheet.addEventListener("click", (event) => {
  if (event.target === detailSheet) closeDetail();
});

createSheet.addEventListener("click", (event) => {
  if (event.target === createSheet) closeCreate();
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) confirmModal.hidden = true;
});

renderStyleRail();
renderWorks();
startGenerationDemo();
