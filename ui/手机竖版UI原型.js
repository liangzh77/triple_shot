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
    note: "柔和景深，人物主体更清楚。",
    hero: "自然肤色、柔和景深和清楚主体。"
  },
  {
    key: "anime",
    label: "动画暖光",
    image: "../backup/吉卜力.jpg",
    note: "温暖叙事感，适合故事化展示。",
    hero: "暖色线稿和室内细节更有叙事感。"
  },
  {
    key: "watercolor",
    label: "水彩纸感",
    image: "../backup/水彩.jpg",
    note: "纸张肌理明显，适合轻量插画方向。",
    hero: "明亮纸感与留白更轻。"
  },
  {
    key: "film",
    label: "复古胶片",
    image: "../backup/专业摄影.jpg",
    note: "偏暖颗粒感，像旧相册翻拍。",
    hero: "让日常照片更像老胶片。"
  },
  {
    key: "clear",
    label: "清透写真",
    image: "../backup/原图.jpg",
    note: "保留真实光线，增加干净通透感。",
    hero: "适合生活方式和头像照片。"
  },
  {
    key: "paper",
    label: "手账拼贴",
    image: "../backup/水彩.jpg",
    note: "轻微纸边和手工感，适合发帖封面。",
    hero: "像贴进手账里的照片。"
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

const selectableStyles = styleOptions.filter((style) => style.key !== "original");
let selectedStyles = ["pro", "anime", "watercolor"];
let activeFilter = "all";
let selectedWorkId = works[0].id;
let activeGroupIndex = 0;
let filmWindowStart = 0;
let albumAnimationTimer;
let toastTimer;
let generationInterval;
let generationTimers = [];
let styleDockRevealed = false;
let sourceReady = false;
let filmPointerStartX = null;
let filmPointerLastX = null;
let filmPointerMoved = false;
let filmClickSuppressed = false;
let filmPeekRevealedDuringDrag = false;
let filmMovedGroupDuringDrag = false;

const workList = document.querySelector("#workList");
const searchInput = document.querySelector("#searchInput");
const saveStatus = document.querySelector("#saveStatus");
const phoneShell = document.querySelector(".phone-shell");
const filmDock = document.querySelector("#filmDock");
const filmToggle = document.querySelector("#filmToggle");
const filmStrip = document.querySelector("#filmStrip");
const generationStage = document.querySelector(".generation-stage");
const sourcePhoto = document.querySelector("#sourcePhoto");
const sourceImage = sourcePhoto?.querySelector("img");
const generationCards = Array.from(document.querySelectorAll("[data-generation-card]"));
const styleAlbumToggle = document.querySelector("#styleAlbumToggle");
const styleWall = document.querySelector("#styleWall");
const styleWallInner = document.querySelector("#styleWallInner");
const selectedStyleDock = document.querySelector("#selectedStyleDock");
const styleFocus = document.querySelector("#styleFocus");
const styleFocusCard = document.querySelector("#styleFocusCard");
const styleFocusImage = document.querySelector("#styleFocusImage");
const styleFocusLabel = document.querySelector("#styleFocusLabel");
const startGenerationButton = document.querySelector("#startGenerationButton");
const takePhotoButton = document.querySelector("#takePhotoButton");
const fakeUploadButton = document.querySelector("#fakeUpload");
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
const sharePreview = document.querySelector("#sharePreview");
const sharePreviewScrim = document.querySelector("#sharePreviewScrim");
const shareCopy = document.querySelector("#shareCopy");
const shareImage = document.querySelector("#shareImage");

const generationTiming = [
  { seconds: 12 },
  { seconds: 14 },
  { seconds: 16 }
];

let generationGroups = [
  createGroup("group-1", "原图和三张生成图", "../backup/原图.jpg", ["pro", "anime", "watercolor"]),
  createGroup("group-2", "专业摄影起稿", "../backup/专业摄影.jpg", ["anime", "watercolor", "film"]),
  createGroup("group-3", "动画暖光起稿", "../backup/吉卜力.jpg", ["watercolor", "pro", "paper"]),
  createGroup("group-4", "水彩纸感起稿", "../backup/水彩.jpg", ["pro", "anime", "clear"]),
  createGroup("group-5", "自然光起稿", "../backup/原图.jpg", ["film", "paper", "pro"])
];

function createGroup(id, title, source, styleKeys) {
  return {
    id,
    title,
    source,
    outputs: styleKeys.slice(0, 3).map((key) => getStyle(key))
  };
}

function getStyle(key) {
  return styleOptions.find((style) => style.key === key) || styleOptions[1];
}

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function setSaveStatus(message) {
  if (saveStatus) saveStatus.textContent = message;
}

function makeStatus(status) {
  return `<span class="status ${status}">${statusMap[status]}</span>`;
}

function renderWorks({ loading = false } = {}) {
  if (!workList || !searchInput) return;
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
  if (!phoneShell) return;
  phoneShell.classList.toggle("home-mode", name === "home");
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  });
  const newShotButton = document.querySelector("#newShotButton");
  if (newShotButton) newShotButton.hidden = name === "home" || name === "settings";
}

function renderStyleWall() {
  if (!styleWallInner) return;
  styleWallInner.innerHTML = selectableStyles
    .map((style, index) => {
      const selected = selectedStyles.includes(style.key) ? " is-selected" : "";
      const pressed = selectedStyles.includes(style.key) ? "true" : "false";
      return `
        <button class="style-choice-card${selected}" type="button" data-style="${style.key}" aria-pressed="${pressed}" style="--i: ${index}">
          <img src="${style.image}" alt="${style.label}风格预览" />
          <span>
            <strong>${style.label}</strong>
          </span>
        </button>
      `;
    })
    .join("");
}

function updateStyleWallSelection() {
  if (!styleWallInner) return;
  styleWallInner.querySelectorAll("[data-style]").forEach((card) => {
    const selected = selectedStyles.includes(card.dataset.style);
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function renderSelectedStyles() {
  if (!selectedStyleDock) return;
  selectedStyleDock.innerHTML = selectedStyles
    .map((key) => {
      const style = getStyle(key);
      return `
        <button class="selected-style-card is-selected" type="button" data-style-preview="${style.key}" aria-label="预览${style.label}">
          <img src="${style.image}" alt="${style.label}小卡片" />
          <span>${style.label}</span>
        </button>
      `;
    })
    .join("");
  updateSelectedStyleDock();
}

function updateSelectedStyleDock() {
  if (!selectedStyleDock) return;
  const albumOpen = styleAlbumToggle?.getAttribute("aria-expanded") === "true";
  const filmOpen = !filmDock?.classList.contains("is-collapsed");
  const shouldShow = styleDockRevealed && selectedStyles.length === 3 && !albumOpen && !filmOpen && !generationStage?.classList.contains("is-running");
  selectedStyleDock.classList.toggle("is-visible", shouldShow);
}

function toggleStyleSelection(styleKey) {
  if (selectedStyles.includes(styleKey)) {
    if (selectedStyles.length === 1) return;
    selectedStyles = selectedStyles.filter((key) => key !== styleKey);
  } else if (selectedStyles.length < 3) {
    selectedStyles = [...selectedStyles, styleKey];
  } else {
    selectedStyles = [...selectedStyles.slice(1), styleKey];
    showToast("已替换最早选择的风格。");
  }
  updateStyleWallSelection();
  renderSelectedStyles();
  startGenerationButton.hidden = !(sourceReady && selectedStyles.length === 3);
}

function setAlbumOpen(open) {
  if (!styleAlbumToggle || !styleWall) return;
  window.clearTimeout(albumAnimationTimer);
  if (open) {
    setFilmDockExpanded(false, { keepDesk: true });
    renderStyleWall();
    styleWall.hidden = false;
    styleWall.classList.remove("is-closing");
    styleWall.classList.add("is-open");
  } else {
    if (selectedStyles.length === 3) styleDockRevealed = true;
    styleWall.classList.remove("is-open");
    if (!styleWall.hidden) {
      styleWall.classList.add("is-closing");
      albumAnimationTimer = window.setTimeout(() => {
        styleWall.hidden = true;
        styleWall.classList.remove("is-closing");
      }, 620);
    } else {
      styleWall.hidden = true;
      styleWall.classList.remove("is-closing");
    }
  }
  styleAlbumToggle.setAttribute("aria-expanded", String(open));
  styleAlbumToggle.setAttribute("aria-label", open ? "收起风格影集" : "打开风格影集");
  updateSelectedStyleDock();
}

function showStyleFocus(styleKey) {
  const style = getStyle(styleKey);
  if (!styleFocus || !styleFocusImage || !styleFocusLabel) return;
  styleFocusImage.src = style.image;
  styleFocusImage.alt = `${style.label}风格大图`;
  styleFocusLabel.textContent = style.label;
  styleFocus.hidden = false;
  phoneShell?.classList.add("is-style-focus");
}

function closeStyleFocus() {
  if (styleFocus) styleFocus.hidden = true;
  phoneShell?.classList.remove("is-style-focus");
}

function closeDetail() {
  if (detailSheet) detailSheet.hidden = true;
}

function openDetail(workId = selectedWorkId) {
  if (!detailSheet || !detailThumbs) return;
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

function openCreate() {
  if (!createSheet || !styleSelect || !formPreview || !shotTitle || !submitCreate || !titleError) return;
  titleError.hidden = true;
  shotTitle.value = "";
  styleSelect.value = selectedStyles[0] || "pro";
  formPreview.src = getStyle(styleSelect.value).image;
  submitCreate.disabled = false;
  submitCreate.innerHTML = `<svg><use href="#icon-check"></use></svg>保存草稿`;
  createSheet.hidden = false;
  window.setTimeout(() => shotTitle.focus(), 80);
}

function closeCreate() {
  if (createSheet) createSheet.hidden = true;
}

function deleteSelectedWork() {
  works = works.filter((work) => work.id !== selectedWorkId);
  if (confirmModal) confirmModal.hidden = true;
  closeDetail();
  renderWorks();
  showToast("样张已从列表移除，原图文件已保留。");
}

function addRipple(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled || button.classList.contains("share-preview-scrim")) return;
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
  generationCards.forEach((card, index) => {
    card.classList.remove("is-spawned", "is-generating", "is-ready");
    const item = generationTiming[index];
    const time = card.querySelector(".result-time");
    if (time) time.textContent = item ? `${item.seconds}s` : "";
  });
}

function setGenerationImages(group) {
  if (sourceImage) {
    sourceImage.src = group.source;
    sourceImage.alt = `${group.title}原图`;
  }
  generationCards.forEach((card, index) => {
    const output = group.outputs[index] || group.outputs[0];
    const finalImage = card.querySelector(".final-img");
    const placeholder = card.querySelector(".placeholder-img");
    const label = card.querySelector(".result-label");
    if (finalImage) {
      finalImage.src = output.image;
      finalImage.alt = `${output.label}生成结果`;
    }
    if (placeholder) placeholder.src = group.source;
    if (label) label.textContent = output.label;
  });
}

function setSourceReady() {
  sourceReady = true;
  clearGenerationTimers();
  setAlbumOpen(false);
  setFilmDockExpanded(false, { keepDesk: true });
  resetGenerationCards();
  const group = createGroup(`draft-${Date.now()}`, "刚上传的原图", "../backup/原图.jpg", selectedStyles);
  setGenerationImages(group);
  generationStage.classList.add("has-source");
  generationStage.classList.remove("is-running", "is-complete", "is-group-view");
  restartElementAnimation(sourcePhoto);
  styleDockRevealed = true;
  startGenerationButton.hidden = selectedStyles.length !== 3;
  updateSelectedStyleDock();
  setSaveStatus("等待生成");
}

function updateGenerationCountdown(startedAt) {
  const remaining = generationTiming
    .map((item) => item.seconds - Math.floor((Date.now() - startedAt) / 1000))
    .filter((seconds) => seconds > 0);
  if (!remaining.length) {
    window.clearInterval(generationInterval);
    return;
  }
  setSaveStatus(`生成中 ${Math.max(...remaining)}s`);
}

function startGenerationDemo() {
  if (!generationStage) return;
  if (!sourceReady) setSourceReady();

  clearGenerationTimers();
  resetGenerationCards();
  setFilmDockExpanded(false, { keepDesk: true });
  setAlbumOpen(false);
  styleDockRevealed = false;
  updateSelectedStyleDock();

  const activeGroup = createGroup(`group-${Date.now()}`, "刚刚生成的一组", "../backup/原图.jpg", selectedStyles);
  setGenerationImages(activeGroup);
  generationStage.classList.add("has-source", "is-running");
  generationStage.classList.remove("is-complete", "is-group-view");
  startGenerationButton.hidden = true;
  restartElementAnimation(sourcePhoto);
  setSaveStatus("正在生成");

  generationCards.forEach((card, index) => {
    const item = generationTiming[index];
    generationTimers.push(
      window.setTimeout(() => {
        card.classList.add("is-spawned", "is-generating");
      }, 760 + index * 190)
    );
    generationTimers.push(
      window.setTimeout(() => {
        card.classList.add("is-ready");
        const time = card.querySelector(".result-time");
        const label = card.querySelector(".result-label")?.textContent || "风格";
        if (time) time.textContent = "完成";
        showToast(`${label} 已生成`);
      }, item.seconds * 1000 + index * 120)
    );
  });

  const startedAt = Date.now();
  updateGenerationCountdown(startedAt);
  generationInterval = window.setInterval(() => updateGenerationCountdown(startedAt), 1000);

  generationTimers.push(
    window.setTimeout(() => {
      generationStage.classList.add("is-complete");
      generationStage.classList.remove("is-running");
      setSaveStatus("本地已保存");
      generationGroups = [activeGroup, ...generationGroups].slice(0, 8);
      activeGroupIndex = 0;
      filmWindowStart = 0;
      renderFilmFrames();
      styleDockRevealed = true;
      updateSelectedStyleDock();
    }, 16400)
  );
}

function renderFilmFrames() {
  if (!filmStrip) return;
  const image = filmStrip.querySelector(".film-strip-image");
  const maxStart = Math.max(0, generationGroups.length - 4);
  filmWindowStart = Math.min(Math.max(0, filmWindowStart), maxStart);
  const visible = generationGroups.slice(filmWindowStart, filmWindowStart + 4);
  filmStrip.innerHTML = "";
  if (image) filmStrip.appendChild(image);
  visible.forEach((group, index) => {
    const button = document.createElement("button");
    button.className = `nav-item film-frame${filmWindowStart + index === activeGroupIndex ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.groupIndex = String(filmWindowStart + index);
    button.setAttribute("aria-label", `查看第 ${filmWindowStart + index + 1} 组`);
    button.innerHTML = `<img src="${group.source}" alt="" />`;
    filmStrip.appendChild(button);
  });
}

function selectGroup(index) {
  if (!generationGroups.length) return;
  activeGroupIndex = Math.min(Math.max(0, index), generationGroups.length - 1);
  if (activeGroupIndex <= 0) {
    filmWindowStart = 0;
  } else {
    const maxStart = Math.max(0, generationGroups.length - 4);
    filmWindowStart = Math.min(activeGroupIndex - 1, maxStart);
  }
  setGroupOnDesk(generationGroups[activeGroupIndex]);
  renderFilmFrames();
}

function setGroupOnDesk(group) {
  clearGenerationTimers();
  setGenerationImages(group);
  sourceReady = false;
  generationStage.classList.add("has-source", "is-complete", "is-group-view");
  generationStage.classList.remove("is-running");
  generationCards.forEach((card) => {
    card.classList.add("is-spawned", "is-ready");
    card.classList.remove("is-generating");
    const time = card.querySelector(".result-time");
    if (time) time.textContent = "完成";
  });
  startGenerationButton.hidden = true;
  updateSelectedStyleDock();
}

function setFilmDockExpanded(expanded, options = {}) {
  if (!filmDock || !filmToggle) return;
  filmDock.classList.toggle("is-collapsed", !expanded);
  filmDock.classList.toggle("is-peek", expanded);
  filmDock.classList.remove("is-dragging");
  filmStrip?.style.removeProperty("--film-drag-x");
  filmToggle.setAttribute("aria-expanded", String(expanded));
  filmToggle.setAttribute("aria-label", expanded ? "收起生成组胶卷" : "展开生成组胶卷");
  if (expanded) {
    setAlbumOpen(false);
    styleDockRevealed = false;
    selectGroup(activeGroupIndex);
  } else if (!options.keepDesk) {
    clearGenerationTimers();
    sourceReady = false;
    generationStage.classList.remove("has-source", "is-running", "is-complete", "is-group-view");
    resetGenerationCards();
    startGenerationButton.hidden = true;
    styleDockRevealed = true;
    setSaveStatus("本地已保存");
  }
  updateSelectedStyleDock();
}

function resetFilmDrag() {
  filmPointerStartX = null;
  filmPointerLastX = null;
  filmPointerMoved = false;
  filmPeekRevealedDuringDrag = false;
  filmMovedGroupDuringDrag = false;
  filmDock?.classList.remove("is-dragging");
  filmStrip?.style.removeProperty("--film-drag-x");
  window.removeEventListener("pointermove", handleFilmPointerMove);
  window.removeEventListener("pointerup", handleFilmPointerEnd);
  window.removeEventListener("pointercancel", resetFilmDrag);
}

function handleFilmPointerMove(event) {
  if (filmPointerStartX === null || !filmStrip) return;
  const delta = event.clientX - filmPointerStartX;
  filmPointerLastX = event.clientX;
  if (Math.abs(delta) > 4) filmPointerMoved = true;
  const offset = Math.max(-22, Math.min(8, delta * 0.28));
  filmStrip.style.setProperty("--film-drag-x", `${offset}px`);
  if (filmDock?.classList.contains("is-peek") && delta < -26) {
    filmDock.classList.remove("is-peek");
    filmPeekRevealedDuringDrag = true;
  }
  if (!filmDock?.classList.contains("is-peek") && !filmPeekRevealedDuringDrag && !filmMovedGroupDuringDrag) {
    if (delta < -72) {
      selectGroup(activeGroupIndex + 1);
      filmMovedGroupDuringDrag = true;
      filmPointerStartX = event.clientX;
    } else if (delta > 72) {
      selectGroup(activeGroupIndex - 1);
      filmMovedGroupDuringDrag = true;
      filmPointerStartX = event.clientX;
    }
  }
}

function handleFilmPointerEnd(event) {
  if (filmPointerStartX === null || !filmStrip) return;
  const delta = (filmPointerLastX ?? event.clientX) - filmPointerStartX;
  if (filmPointerMoved) {
    filmClickSuppressed = true;
    window.setTimeout(() => {
      filmClickSuppressed = false;
    }, 180);
  }
  filmDock?.classList.remove("is-dragging");
  filmStrip.style.removeProperty("--film-drag-x");
  filmPointerStartX = null;
  filmPointerLastX = null;
  const revealedOnly = filmPeekRevealedDuringDrag;
  const movedGroup = filmMovedGroupDuringDrag;
  filmPointerMoved = false;
  filmPeekRevealedDuringDrag = false;
  filmMovedGroupDuringDrag = false;
  window.removeEventListener("pointermove", handleFilmPointerMove);
  window.removeEventListener("pointerup", handleFilmPointerEnd);
  window.removeEventListener("pointercancel", resetFilmDrag);
  if (Math.abs(delta) < 28) return;
  if (movedGroup) return;
  if (revealedOnly) return;
  selectGroup(activeGroupIndex + (delta < 0 ? 1 : -1));
}

function openSharePreview(imageSrc, label = "照片") {
  if (!sharePreview || !shareImage || !shareCopy) return;
  shareImage.src = imageSrc;
  shareImage.alt = `${label}发布预览`;
  shareCopy.textContent = `${label}像从旧相册里翻出来的一小段日常。光线落得刚刚好，画面安静，却有一种很适合发小红书的温度。`;
  sharePreview.hidden = false;
}

function closeSharePreview() {
  if (sharePreview) sharePreview.hidden = true;
}

async function handleShareAction(action) {
  if (action === "copy-text") {
    try {
      await navigator.clipboard.writeText(shareCopy.textContent);
      showToast("文案已复制。");
    } catch {
      showToast("文案已准备好，可以手动复制。");
    }
    return;
  }
  if (action === "copy-image") {
    showToast("图片复制功能会在接入原生能力后启用。");
    return;
  }
  if (action === "download-image") {
    const link = document.createElement("a");
    link.href = shareImage.src;
    link.download = "triple-shot.jpg";
    link.click();
    showToast("已开始下载图片。");
  }
}

styleAlbumToggle?.addEventListener("click", () => {
  const open = styleAlbumToggle.getAttribute("aria-expanded") !== "true";
  setAlbumOpen(open);
});

styleWallInner?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-style]");
  if (!card) return;
  toggleStyleSelection(card.dataset.style);
});

selectedStyleDock?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-style-preview]");
  if (!card) return;
  showStyleFocus(card.dataset.stylePreview);
});

styleFocus?.addEventListener("click", closeStyleFocus);
styleFocusCard?.addEventListener("click", closeStyleFocus);

document.addEventListener(
  "click",
  (event) => {
    if (!styleFocus || styleFocus.hidden) return;
    if (event.target.closest("#styleFocus")) return;
    event.preventDefault();
    event.stopPropagation();
    closeStyleFocus();
  },
  true
);

takePhotoButton?.addEventListener("click", setSourceReady);
fakeUploadButton?.addEventListener("click", setSourceReady);
startGenerationButton?.addEventListener("click", startGenerationDemo);

filmToggle?.addEventListener("click", () => {
  if (styleFocus && !styleFocus.hidden) return;
  setFilmDockExpanded(filmDock.classList.contains("is-collapsed"));
});

filmStrip?.addEventListener("click", (event) => {
  if (styleFocus && !styleFocus.hidden) return;
  if (filmClickSuppressed) {
    filmClickSuppressed = false;
    return;
  }
  const frame = event.target.closest("[data-group-index]");
  if (!frame) return;
  selectGroup(Number(frame.dataset.groupIndex));
});

filmStrip?.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

filmStrip?.addEventListener("pointerdown", (event) => {
  if (styleFocus && !styleFocus.hidden) return;
  if (filmDock?.classList.contains("is-collapsed")) return;
  filmPointerStartX = event.clientX;
  filmPointerLastX = event.clientX;
  filmPointerMoved = false;
  filmPeekRevealedDuringDrag = false;
  filmMovedGroupDuringDrag = false;
  filmDock?.classList.add("is-dragging");
  window.addEventListener("pointermove", handleFilmPointerMove);
  window.addEventListener("pointerup", handleFilmPointerEnd);
  window.addEventListener("pointercancel", resetFilmDrag);
});


sourcePhoto?.addEventListener("click", () => {
  if (!generationStage.classList.contains("has-source")) return;
  openSharePreview(sourceImage.src, "原图");
});

generationCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (!card.classList.contains("is-ready")) {
      showToast("还在生成，先看模糊预览。");
      return;
    }
    const finalImage = card.querySelector(".final-img");
    const label = card.querySelector(".result-label")?.textContent || "生成图";
    openSharePreview(finalImage.src, label);
  });
});

sharePreview?.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-share-action]");
  if (!actionButton) {
    closeSharePreview();
    return;
  }
  event.stopPropagation();
  handleShareAction(actionButton.dataset.shareAction);
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

searchInput?.addEventListener("input", () => renderWorks());

workList?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-work]");
  if (!card) return;
  openDetail(card.dataset.work);
});

detailThumbs?.addEventListener("click", (event) => {
  const thumb = event.target.closest("[data-detail-style]");
  if (!thumb) return;
  const style = getStyle(thumb.dataset.detailStyle);
  detailImage.src = style.image;
  detailImage.alt = `${style.label}详情预览`;
  detailThumbs.querySelectorAll(".thumb-button").forEach((item) => {
    item.classList.toggle("is-active", item === thumb);
  });
});

document.querySelector("#newShotButton")?.addEventListener("click", openCreate);
document.querySelector("#openCreateFromDrop")?.addEventListener("click", openCreate);
document.querySelector("[data-close-sheet]")?.addEventListener("click", closeDetail);
document.querySelector("[data-close-create]")?.addEventListener("click", closeCreate);

document.querySelector("#saveWork")?.addEventListener("click", () => {
  setSaveStatus("正在写入本地");
  showToast("保存中，列表状态会自动更新。");
  window.setTimeout(() => {
    setSaveStatus("本地已保存");
    showToast("样张已保存。");
  }, 900);
});

document.querySelector("#deleteWork")?.addEventListener("click", () => {
  if (confirmModal) confirmModal.hidden = false;
});

document.querySelector("#cancelDelete")?.addEventListener("click", () => {
  if (confirmModal) confirmModal.hidden = true;
});

document.querySelector("#confirmDelete")?.addEventListener("click", deleteSelectedWork);

styleSelect?.addEventListener("change", () => {
  formPreview.src = getStyle(styleSelect.value).image;
});

document.querySelector("#createForm")?.addEventListener("submit", (event) => {
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

document.querySelector("#retryDraft")?.addEventListener("click", () => {
  errorCard.hidden = true;
  draftSkeleton.hidden = false;
  setSaveStatus("正在恢复草稿");
  window.setTimeout(() => {
    draftSkeleton.hidden = true;
    setSaveStatus("本地已保存");
    showToast("草稿已恢复，可以继续编辑。");
  }, 1100);
});

document.querySelector("#refreshDemo")?.addEventListener("click", () => {
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
  closeSharePreview();
  closeStyleFocus();
  closeDetail();
  closeCreate();
  if (confirmModal) confirmModal.hidden = true;
  setAlbumOpen(false);
});

detailSheet?.addEventListener("click", (event) => {
  if (event.target === detailSheet) closeDetail();
});

createSheet?.addEventListener("click", (event) => {
  if (event.target === createSheet) closeCreate();
});

confirmModal?.addEventListener("click", (event) => {
  if (event.target === confirmModal) confirmModal.hidden = true;
});

renderStyleWall();
renderSelectedStyles();
renderWorks();
renderFilmFrames();
resetGenerationCards();
setFilmDockExpanded(false, { keepDesk: true });
startGenerationButton.hidden = true;
setSaveStatus("本地已保存");
