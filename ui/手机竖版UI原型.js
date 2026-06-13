const viewportRoot = document.documentElement;
let viewportMetricsFrame = 0;

function updateViewportMetrics() {
  window.cancelAnimationFrame(viewportMetricsFrame);
  viewportMetricsFrame = window.requestAnimationFrame(() => {
    const visualViewport = window.visualViewport;
    const layoutHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    const visualHeight = Math.max(0, Math.round(visualViewport?.height || layoutHeight));

    viewportRoot.classList.add("has-js-viewport");
    viewportRoot.style.setProperty("--app-height", `${visualHeight}px`);
    viewportRoot.style.setProperty("--fixed-bottom-guard", "0px");
    viewportRoot.style.setProperty("--stage-bottom-guard", "0px");
  });
}

updateViewportMetrics();
window.addEventListener("resize", updateViewportMetrics);
window.addEventListener("orientationchange", updateViewportMetrics);
window.addEventListener("pageshow", updateViewportMetrics);
window.visualViewport?.addEventListener("resize", updateViewportMetrics);
window.visualViewport?.addEventListener("scroll", updateViewportMetrics);

const styleOptions = [
  {
    key: "original",
    label: "原图",
    image: "./assets/原图.jpg",
    note: "真实室内光线，适合做来源对照。",
    hero: "保留原始现场感，方便比较每次转换的变化。"
  },
  {
    key: "pro",
    label: "专业摄影",
    image: "./assets/专业摄影.jpg",
    note: "柔和景深，人物主体更清楚。",
    hero: "自然肤色、柔和景深和清楚主体。"
  },
  {
    key: "anime",
    label: "动画暖光",
    image: "./assets/吉卜力.jpg",
    note: "温暖叙事感，适合故事化展示。",
    hero: "暖色线稿和室内细节更有叙事感。"
  },
  {
    key: "watercolor",
    label: "水彩纸感",
    image: "./assets/水彩.jpg",
    note: "纸张肌理明显，适合轻量插画方向。",
    hero: "明亮纸感与留白更轻。"
  },
  {
    key: "film",
    label: "复古胶片",
    image: "./assets/专业摄影.jpg",
    note: "偏暖颗粒感，像旧相册翻拍。",
    hero: "让日常照片更像老胶片。"
  },
  {
    key: "clear",
    label: "清透写真",
    image: "./assets/原图.jpg",
    note: "保留真实光线，增加干净通透感。",
    hero: "适合生活方式和头像照片。"
  },
  {
    key: "paper",
    label: "手账拼贴",
    image: "./assets/水彩.jpg",
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
let albumAnimationTimer;
let toastTimer;
let generationInterval;
let generationTimers = [];
let styleDockRevealed = false;
let sourceReady = false;
let filmPointerStartX = null;
let filmPointerLastX = null;
let filmPointerStartFrames = 2.5;
let filmPointerMoved = false;
let filmClickSuppressed = false;
let filmPulledFrames = 2.5;
let filmVisibleFrames = 2.5;
let styleFocusOriginElement = null;
let styleFocusClosing = false;
let sharePreviewOriginElement = null;
let sharePreviewClosing = false;
let sharePreviewItems = [];
let sharePreviewIndex = 0;
let shareSwipeStartX = null;
let shareSwipeStartY = null;
let shareSwipePointerId = null;
let shareSwipeDragging = false;
let shareSwipeSettling = false;
let shareMouseSwipeActive = false;
let shareSwipeSuppressClick = false;
let deskFlightRunning = false;
let filmDockAnimating = false;
let styleFeedRestoreTimer;
const styleCardSnapshotCache = new Map();

const FILM_MIN_VISIBLE_FRAMES = 2.5;
const FILM_END_REVEAL_FRAMES = 0.22;
const STYLE_CARD_SNAPSHOT_WIDTH = 310;
const STYLE_CARD_SNAPSHOT_HEIGHT = 430;
const SHARE_PREVIEW_OPEN_DURATION = 430;
const SHARE_PREVIEW_CLOSE_DURATION = 360;
const STYLE_FEED_DURATION = 744;
const STYLE_REFERENCE_REAPPEAR_DELAY = 760;

const workList = document.querySelector("#workList");
const searchInput = document.querySelector("#searchInput");
const saveStatus = document.querySelector("#saveStatus");
const phoneShell = document.querySelector(".phone-shell");
const filmDock = document.querySelector("#filmDock");
const filmToggle = document.querySelector("#filmToggle");
const filmStrip = document.querySelector("#filmStrip");
const filmTrack = document.querySelector("#filmTrack");
const generationStage = document.querySelector(".generation-stage");
const sourcePhoto = document.querySelector("#sourcePhoto");
const sourceImage = sourcePhoto?.querySelector("img");
const generationCards = Array.from(document.querySelectorAll("[data-generation-card]"));
const captureActions = document.querySelector("#captureActions");
const styleAlbumToggle = document.querySelector("#styleAlbumToggle");
const styleWall = document.querySelector("#styleWall");
const styleWallInner = document.querySelector("#styleWallInner");
const selectedStyleDock = document.querySelector("#selectedStyleDock");
const styleFocus = document.querySelector("#styleFocus");
const styleFocusCard = document.querySelector("#styleFocusCard");
const styleFocusImage = document.querySelector("#styleFocusImage");
const styleFocusLabel = document.querySelector("#styleFocusLabel");
const startGenerationButton = document.querySelector("#startGenerationButton");
const deleteSourceButton = document.querySelector("#deleteSourceButton");
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
const shareCard = document.querySelector(".share-card");
const shareCopy = document.querySelector("#shareCopy");
const shareImageWindow = document.querySelector("#shareImageWindow");
const shareImageTrack = document.querySelector("#shareImageTrack");
const sharePrevImage = document.querySelector("#sharePrevImage");
const shareImage = document.querySelector("#shareImage");
const shareNextImage = document.querySelector("#shareNextImage");
const shareCaption = document.querySelector("#shareCaption");

const generationTiming = [
  { seconds: 12 },
  { seconds: 14 },
  { seconds: 16 }
];

let generationGroups = [
  createGroup("group-1", "原图和三张生成图", "./assets/原图.jpg", ["pro", "anime", "watercolor"]),
  createGroup("group-2", "专业摄影起稿", "./assets/专业摄影.jpg", ["anime", "watercolor", "film"]),
  createGroup("group-3", "动画暖光起稿", "./assets/吉卜力.jpg", ["watercolor", "pro", "paper"]),
  createGroup("group-4", "水彩纸感起稿", "./assets/水彩.jpg", ["pro", "anime", "clear"]),
  createGroup("group-5", "自然光起稿", "./assets/原图.jpg", ["film", "paper", "pro"])
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

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function drawImageCover(ctx, image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / boxRatio;
    sourceY = (image.naturalHeight - sourceHeight) * 0.34;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function loadCardImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = new URL(src, document.baseURI).href;
  });
}

function updateStyleSnapshotElements(styleKey, snapshotSrc) {
  document.querySelectorAll(`[data-style-card-snapshot="${styleKey}"]`).forEach((image) => {
    image.src = snapshotSrc;
  });
  if (styleFocus?.dataset.styleKey === styleKey && styleFocusImage) {
    styleFocusImage.src = snapshotSrc;
  }
}

function ensureStyleCardSnapshot(style) {
  const cached = styleCardSnapshotCache.get(style.key);
  if (typeof cached === "string") return Promise.resolve(cached);
  if (cached) return cached;
  const promise = loadCardImage(style.image)
    .then((image) => {
      const scale = 2;
      const width = STYLE_CARD_SNAPSHOT_WIDTH;
      const height = STYLE_CARD_SNAPSHOT_HEIGHT;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#fbf5e8";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(70, 49, 31, 0.16)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      drawImageCover(ctx, image, 8, 8, width - 16, height - 36);
      ctx.fillStyle = "rgba(42, 35, 29, 0.86)";
      ctx.font = '950 12px "Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
      ctx.textBaseline = "alphabetic";
      ctx.fillText(style.label, 12, height - 8);
      const snapshot = canvas.toDataURL("image/png");
      styleCardSnapshotCache.set(style.key, snapshot);
      updateStyleSnapshotElements(style.key, snapshot);
      return snapshot;
    })
    .catch(() => {
      styleCardSnapshotCache.delete(style.key);
      return style.image;
    });
  styleCardSnapshotCache.set(style.key, promise);
  return promise;
}

function getStyleCardSnapshot(style) {
  const cached = styleCardSnapshotCache.get(style.key);
  if (typeof cached === "string") return cached;
  ensureStyleCardSnapshot(style);
  return style.image;
}

function cleanCloneIds(element) {
  element.removeAttribute("id");
  element.classList.remove("is-flight-hidden");
  element.querySelectorAll?.("[id]").forEach((item) => item.removeAttribute("id"));
  element.querySelectorAll?.(".is-flight-hidden").forEach((item) => item.classList.remove("is-flight-hidden"));
}

function visibleRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return rect;
}

function getElementRotation(element) {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === "none") return 0;
  const matrix3d = transform.match(/matrix3d\(([^)]+)\)/)?.[1]?.split(",").map(Number);
  if (matrix3d && matrix3d.length >= 16) {
    return Math.atan2(matrix3d[1], matrix3d[0]) * (180 / Math.PI);
  }
  const values = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(",").map(Number);
  if (!values || values.length < 4) return 0;
  return Math.atan2(values[1], values[0]) * (180 / Math.PI);
}

function getFlightPose(element, useElementTransform = false) {
  const rect = visibleRect(element);
  if (!rect) return null;
  if (!useElementTransform) {
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      transform: null
    };
  }
  const parentRect = element.offsetParent?.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    left: parentRect ? parentRect.left + element.offsetLeft : rect.left,
    top: parentRect ? parentRect.top + element.offsetTop : rect.top,
    width: element.offsetWidth || rect.width,
    height: element.offsetHeight || rect.height,
    transform: style.transform && style.transform !== "none" ? style.transform : "none"
  };
}

function createFlightGhost(sourceElement, templateElement = sourceElement, options = {}) {
  const matchStartTransform = options.matchStartElementTransform ?? options.matchElementTransform;
  const pose = getFlightPose(sourceElement, matchStartTransform);
  if (!pose) return null;
  const sourceStyle = getComputedStyle(sourceElement);
  const ghost = templateElement.cloneNode(true);
  cleanCloneIds(ghost);
  ghost.classList.add("fly-ghost");
  ghost.setAttribute("aria-hidden", "true");
  const rotation = getElementRotation(templateElement);
  const transform = matchStartTransform ? pose.transform : `rotate(${rotation}deg)`;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${pose.left}px`,
    top: `${pose.top}px`,
    width: `${pose.width}px`,
    height: `${pose.height}px`,
    margin: "0",
    transform,
    transformOrigin: sourceStyle.transformOrigin || "center center",
    borderRadius: sourceStyle.borderRadius,
    zIndex: options.zIndex ?? "80",
    pointerEvents: "none"
  });
  document.body.appendChild(ghost);
  return { ghost, pose, rotation };
}

function createAlbumFlightMask({ focused = false } = {}) {
  const rect = visibleRect(styleAlbumToggle);
  if (!styleAlbumToggle || !rect) return null;
  const mask = styleAlbumToggle.cloneNode(true);
  cleanCloneIds(mask);
  mask.classList.add("album-flight-mask");
  mask.classList.toggle("is-style-focus-mask", focused);
  mask.setAttribute("aria-hidden", "true");
  Object.assign(mask.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    right: "auto",
    bottom: "auto",
    margin: "0",
    zIndex: "95",
    pointerEvents: "none"
  });
  document.body.appendChild(mask);
  return mask;
}

function createStageFlightGhost(sourceElement, templateElement = sourceElement, options = {}) {
  if (!generationStage) return null;
  const matchStartTransform = options.matchStartElementTransform ?? options.matchElementTransform;
  const viewportPose = getFlightPose(sourceElement, matchStartTransform);
  const stageRect = generationStage.getBoundingClientRect();
  if (!viewportPose || !stageRect.width || !stageRect.height) return null;
  const sourceStyle = getComputedStyle(sourceElement);
  const ghost = templateElement.cloneNode(true);
  cleanCloneIds(ghost);
  ghost.classList.add("fly-ghost", "stage-fly-ghost");
  ghost.setAttribute("aria-hidden", "true");
  const rotation = getElementRotation(templateElement);
  const transform = matchStartTransform ? viewportPose.transform : `rotate(${rotation}deg)`;
  const pose = {
    ...viewportPose,
    left: viewportPose.left - stageRect.left,
    top: viewportPose.top - stageRect.top
  };
  Object.assign(ghost.style, {
    position: "absolute",
    left: `${pose.left}px`,
    top: `${pose.top}px`,
    width: `${pose.width}px`,
    height: `${pose.height}px`,
    margin: "0",
    transform,
    transformOrigin: sourceStyle.transformOrigin || "center center",
    borderRadius: sourceStyle.borderRadius,
    zIndex: options.zIndex ?? "6",
    pointerEvents: "none"
  });
  generationStage.appendChild(ghost);
  return { ghost, pose, rotation, stageRect };
}

function getStageFlightPose(element, useElementTransform = false) {
  if (!generationStage) return null;
  const viewportPose = getFlightPose(element, useElementTransform);
  if (!viewportPose) return null;
  const stageRect = generationStage.getBoundingClientRect();
  return {
    ...viewportPose,
    left: viewportPose.left - stageRect.left,
    top: viewportPose.top - stageRect.top
  };
}

async function flyElementBetween(sourceElement, targetElement, options = {}) {
  const start = createFlightGhost(sourceElement, options.templateElement || targetElement, options);
  const matchStartTransform = options.matchStartElementTransform ?? options.matchElementTransform;
  const matchEndTransform = options.matchEndElementTransform ?? options.matchElementTransform;
  const endPose = getFlightPose(targetElement, matchEndTransform);
  if (!start || !endPose) return;
  if (options.hideSource) sourceElement.classList.add("is-flight-hidden");
  const { ghost, pose: startPose, rotation } = start;
  const duration = options.duration ?? 460;
  const startDelay = options.delay ?? 0;
  const easing = options.easing ?? "cubic-bezier(0.16, 1, 0.3, 1)";
  const startTransform = matchStartTransform ? startPose.transform : `rotate(${rotation}deg)`;
  const endTransform = matchEndTransform ? endPose.transform : `rotate(${rotation}deg)`;
  const startStyle = getComputedStyle(sourceElement);
  const endStyle = getComputedStyle(targetElement);
  const startBorderRadius = startStyle.borderRadius;
  const endBorderRadius = endStyle.borderRadius;
  const startTransformOrigin = startStyle.transformOrigin || "center center";
  const endTransformOrigin = endStyle.transformOrigin || startTransformOrigin;
  let animation;
  try {
    animation = ghost.animate(
      [
        {
          left: `${startPose.left}px`,
          top: `${startPose.top}px`,
          width: `${startPose.width}px`,
          height: `${startPose.height}px`,
          opacity: 1,
          filter: "saturate(1)",
          transform: startTransform,
          transformOrigin: startTransformOrigin,
          borderRadius: startBorderRadius
        },
        {
          left: `${endPose.left}px`,
          top: `${endPose.top}px`,
          width: `${endPose.width}px`,
          height: `${endPose.height}px`,
          opacity: options.fadeOut ? 0 : 1,
          filter: "saturate(1.06)",
          transform: endTransform,
          transformOrigin: endTransformOrigin,
          borderRadius: endBorderRadius
        }
      ],
      { duration, delay: startDelay, easing, fill: "forwards" }
    );
    await Promise.race([
      animation.finished.catch(() => {}),
      new Promise((resolve) => window.setTimeout(resolve, duration + startDelay + 80))
    ]);
  } catch {
    // Animations can be canceled during fast repeated taps; the UI state below still resolves.
  } finally {
    if (options.revealTarget) {
      if (options.instantRevealTarget) {
        targetElement.classList.add("is-flight-revealing");
      }
      targetElement.classList.remove("is-flight-hidden");
      if (options.instantRevealTarget) {
        void targetElement.offsetHeight;
        requestAnimationFrame(() => {
          targetElement.classList.remove("is-flight-revealing");
        });
      }
    }
    animation?.cancel();
    ghost.remove();
  }
}

function getDeskPhotoElements() {
  return [sourcePhoto, ...generationCards].filter(Boolean);
}

function isFilmElement(element) {
  return Boolean(element?.closest?.("#filmDock"));
}

function isDeskPhotoVisible() {
  return generationStage?.classList.contains("has-source");
}

function updateDeleteSourceButton() {
  if (!deleteSourceButton || !generationStage) return;
  const canDelete =
    sourceReady &&
    generationStage.classList.contains("has-source") &&
    !generationStage.classList.contains("is-running") &&
    !generationStage.classList.contains("is-group-view");
  deleteSourceButton.hidden = !canDelete;
}

function clearDeskPhotos() {
  clearGenerationTimers();
  sourceReady = false;
  generationStage?.classList.remove("has-source", "is-running", "is-complete", "is-group-view");
  resetGenerationCards();
  if (startGenerationButton) startGenerationButton.hidden = true;
  updateDeleteSourceButton();
}

async function flyDeskPhotosTo(targetElement, { clearAfter = true, collapseFilmAfter = false } = {}) {
  if (!targetElement || !isDeskPhotoVisible() || deskFlightRunning) return;
  deskFlightRunning = true;
  const elements = getDeskPhotoElements().filter((element) => visibleRect(element));
  const fliesIntoFilm = isFilmElement(targetElement);
  const flightZIndex = fliesIntoFilm ? "8" : undefined;
  await Promise.all(
    elements.map((element, index) =>
      flyElementBetween(element, targetElement, {
        hideSource: true,
        fadeOut: !fliesIntoFilm,
        templateElement: element,
        matchElementTransform: fliesIntoFilm,
        zIndex: flightZIndex,
        duration: fliesIntoFilm ? 420 : 360,
        delay: fliesIntoFilm ? index * 24 : index * 34,
        easing: fliesIntoFilm ? "cubic-bezier(0.2, 0.82, 0.24, 1)" : undefined
      })
    )
  );
  if (clearAfter) clearDeskPhotos();
  elements.forEach((element) => element.classList.remove("is-flight-hidden"));
  if (collapseFilmAfter) filmDock?.classList.add("is-collapsed");
  deskFlightRunning = false;
  updateSelectedStyleDock();
}

async function flyDeskPhotosFrom(sourceElement) {
  if (!sourceElement) return;
  const candidates = getDeskPhotoElements();
  const fliesFromFilm = isFilmElement(sourceElement);
  const flightZIndex = fliesFromFilm ? "8" : undefined;
  candidates.forEach((element) => element.classList.add("is-flight-hidden"));
  if (generationStage) void generationStage.offsetHeight;
  const elements = candidates.filter((element) => visibleRect(element));
  await Promise.all(
    elements.map((element, index) =>
      flyElementBetween(sourceElement, element, {
        duration: fliesFromFilm ? 440 : 430,
        delay: fliesFromFilm ? index * 24 : index * 46,
        matchElementTransform: fliesFromFilm,
        easing: fliesFromFilm ? "cubic-bezier(0.2, 0.82, 0.24, 1)" : undefined,
        zIndex: flightZIndex,
        revealTarget: true
      })
    )
  );
  candidates.forEach((element) => element.classList.remove("is-flight-hidden"));
}

function isAlbumOpen() {
  return styleAlbumToggle?.getAttribute("aria-expanded") === "true";
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
  selectedStyleDock.style.setProperty("--selected-style-count", String(Math.max(1, selectedStyles.length)));
  const tossed = [
    { x: "-2px", y: "3px", rot: "-5deg" },
    { x: "3px", y: "-2px", rot: "4deg" },
    { x: "-1px", y: "4px", rot: "-2deg" }
  ];
  selectedStyleDock.innerHTML = selectedStyles
    .map((key, index) => {
      const style = getStyle(key);
      const pose = tossed[index % tossed.length];
      const snapshot = getStyleCardSnapshot(style);
      return `
        <button class="selected-style-card" type="button" data-style-preview="${style.key}" aria-label="预览${style.label}" style="--dock-x: ${pose.x}; --dock-y: ${pose.y}; --dock-rot: ${pose.rot}">
          <img data-style-card-snapshot="${style.key}" src="${snapshot}" alt="${style.label}风格卡片" />
          <span class="sr-only">${style.label}</span>
        </button>
      `;
    })
    .join("");
  updateSelectedStyleDock();
}

function updateSelectedStyleDock() {
  if (!selectedStyleDock) return;
  selectedStyleDock.style.setProperty("--selected-style-count", String(Math.max(1, selectedStyles.length)));
  const filmOpen = filmDockAnimating || !filmDock?.classList.contains("is-collapsed");
  const shouldShow = selectedStyles.length > 0 && !filmOpen;
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
  }
  updateStyleWallSelection();
  renderSelectedStyles();
  startGenerationButton.hidden = !(sourceReady && selectedStyles.length === 3);
}

function setAlbumOpen(open, options = {}) {
  if (!styleAlbumToggle || !styleWall) return;
  const revealDockOnClose = options.revealDockOnClose ?? true;
  window.clearTimeout(albumAnimationTimer);
  if (open) {
    if (isDeskPhotoVisible()) {
      flyDeskPhotosTo(styleAlbumToggle, { clearAfter: true });
    }
    setFilmDockExpanded(false, { keepDesk: true });
    renderStyleWall();
    styleWall.hidden = false;
    styleWall.classList.remove("is-closing");
    styleWall.classList.add("is-open");
  } else {
    if (selectedStyles.length === 3 && revealDockOnClose) styleDockRevealed = true;
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
  phoneShell?.classList.toggle("is-album-open", open);
  captureActions?.classList.toggle("is-hidden-by-album", open);
  updateSelectedStyleDock();
}

async function showStyleFocus(styleKey, originElement = null) {
  const style = getStyle(styleKey);
  if (!styleFocus || !styleFocusImage || !styleFocusLabel) return;
  styleFocusOriginElement = originElement;
  const snapshot = await ensureStyleCardSnapshot(style);
  styleFocus.dataset.styleKey = style.key;
  styleFocusImage.src = snapshot;
  styleFocusImage.alt = `${style.label}风格卡片`;
  styleFocusLabel.textContent = style.label;
  styleFocus.hidden = false;
  styleFocus.classList.remove("is-closing");
  styleFocus.classList.add("is-opening");
  const hasOrigin = originElement && visibleRect(originElement);
  if (hasOrigin) {
    styleFocusCard?.classList.add("is-flight-hidden");
  }
  void styleFocus.offsetHeight;
  if (hasOrigin) {
    const albumMask = createAlbumFlightMask();
    const flight = flyElementBetween(originElement, styleFocusCard, {
      duration: 360,
      hideSource: true,
      revealTarget: true,
      templateElement: styleFocusCard,
      matchStartElementTransform: true,
      matchEndElementTransform: true,
      zIndex: "90"
    });
    styleFocus.classList.remove("is-opening");
    phoneShell?.classList.add("is-style-focus");
    albumMask?.classList.add("is-style-focus-mask");
    try {
      await flight;
    } finally {
      albumMask?.remove();
    }
  } else {
    styleFocus.classList.remove("is-opening");
    phoneShell?.classList.add("is-style-focus");
  }
}

async function closeStyleFocus() {
  if (!styleFocus || styleFocus.hidden || styleFocusClosing) return;
  styleFocusClosing = true;
  const origin = styleFocusOriginElement;
  let flight = delay(320);
  let albumMask = null;
  if (origin && document.body.contains(origin) && visibleRect(origin)) {
    albumMask = createAlbumFlightMask({ focused: true });
    flight = flyElementBetween(styleFocusCard, origin, {
      duration: 360,
      hideSource: true,
      revealTarget: true,
      templateElement: styleFocusCard,
      matchStartElementTransform: true,
      matchEndElementTransform: true,
      instantRevealTarget: true,
      zIndex: "90"
    });
  }
  void styleFocus.offsetHeight;
  styleFocus.classList.add("is-closing");
  phoneShell?.classList.remove("is-style-focus");
  albumMask?.classList.remove("is-style-focus-mask");
  await flight;
  albumMask?.remove();
  origin?.classList.remove("is-flight-hidden");
  styleFocus.hidden = true;
  styleFocus.classList.remove("is-closing", "is-opening");
  styleFocusCard?.classList.remove("is-flight-hidden");
  styleFocusOriginElement = null;
  styleFocusClosing = false;
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
  window.clearTimeout(styleFeedRestoreTimer);
  selectedStyleDock?.classList.remove("is-reference-restoring");
  selectedStyleDock?.querySelectorAll(".selected-style-card.is-flight-hidden").forEach((card) => {
    card.classList.remove("is-flight-hidden");
  });
  generationCards.forEach((card, index) => {
    card.style.opacity = "";
    card.style.visibility = "";
    card.classList.remove("is-spawned", "is-generating", "is-ready", "is-fed-target");
    const time = card.querySelector(".result-time");
    if (time) time.textContent = "";
  });
}

function getSelectedStyleCardsInOrder() {
  if (!selectedStyleDock) return [];
  return selectedStyles
    .map((key) => selectedStyleDock.querySelector(`[data-style-preview="${key}"]`))
    .filter(Boolean);
}

function restoreSelectedStyleCards(cards) {
  if (!selectedStyleDock || !cards.length) return;
  window.clearTimeout(styleFeedRestoreTimer);
  selectedStyleDock.classList.add("is-reference-restoring");
  cards.forEach((card) => card.classList.remove("is-flight-hidden"));
  styleFeedRestoreTimer = window.setTimeout(() => {
    selectedStyleDock.classList.remove("is-reference-restoring");
  }, 1400);
}

async function flyStyleReferenceToGenerationTarget(card, target, index) {
  target.style.opacity = "0";
  target.style.visibility = "visible";
  const start = createStageFlightGhost(card, target, { matchStartElementTransform: true, zIndex: "6" });
  const endPose = getStageFlightPose(target, true);
  if (!start || !endPose) return;
  const { ghost, pose: startPose } = start;
  ghost.style.opacity = "1";
  const startStyle = getComputedStyle(card);
  const targetStyle = getComputedStyle(target);
  const targetImage = target.querySelector(".placeholder-img");
  const targetImageStyle = targetImage ? getComputedStyle(targetImage) : null;
  const targetFilter = targetImageStyle?.filter && targetImageStyle.filter !== "none"
    ? targetImageStyle.filter
    : "blur(12px) saturate(0.82) contrast(0.9)";
  const targetImageTransform = targetImageStyle?.transform && targetImageStyle.transform !== "none"
    ? targetImageStyle.transform
    : "scale(1.04)";
  const ghostImage = ghost.querySelector(".placeholder-img");
  const ghostFinalImage = ghost.querySelector(".final-img");
  const ghostLoader = ghost.querySelector(".result-loader");
  if (ghostImage) {
    ghostImage.style.opacity = "1";
    ghostImage.style.filter = "blur(0) saturate(1) contrast(1)";
    ghostImage.style.transform = "scale(1)";
  }
  if (ghostFinalImage) ghostFinalImage.style.opacity = "0";
  if (ghostLoader) ghostLoader.style.opacity = "0";
  const duration = STYLE_FEED_DURATION;
  const delayMs = index * 70;
  card.classList.add("is-flight-hidden");
  let flight;
  let imageBlur;
  let loaderFade;
  try {
    flight = ghost.animate(
      [
        {
          left: `${startPose.left}px`,
          top: `${startPose.top}px`,
          width: `${startPose.width}px`,
          height: `${startPose.height}px`,
          opacity: 1,
          filter: "saturate(1)",
          transform: startPose.transform,
          transformOrigin: startStyle.transformOrigin || "center center",
          borderRadius: startStyle.borderRadius
        },
        {
          left: `${endPose.left}px`,
          top: `${endPose.top}px`,
          width: `${endPose.width}px`,
          height: `${endPose.height}px`,
          opacity: 1,
          filter: "saturate(1)",
          transform: endPose.transform,
          transformOrigin: targetStyle.transformOrigin || startStyle.transformOrigin || "center center",
          borderRadius: targetStyle.borderRadius
        }
      ],
      {
        duration,
        delay: delayMs,
        easing: "cubic-bezier(0.2, 0.82, 0.24, 1)",
        fill: "forwards"
      }
    );
    imageBlur = ghostImage?.animate(
      [
        {
          filter: "blur(0) saturate(1) contrast(1)",
          transform: "scale(1)"
        },
        {
          filter: targetFilter,
          transform: targetImageTransform
        }
      ],
      {
        duration,
        delay: delayMs,
        easing: "cubic-bezier(0.2, 0.82, 0.24, 1)",
        fill: "forwards"
      }
    );
    loaderFade = ghostLoader?.animate(
      [
        { opacity: 0 },
        { opacity: 1 }
      ],
      {
        duration,
        delay: delayMs,
        easing: "cubic-bezier(0.2, 0.82, 0.24, 1)",
        fill: "forwards"
      }
    );
    await Promise.race([
      Promise.all([
        flight.finished.catch(() => {}),
        imageBlur?.finished?.catch(() => {}),
        loaderFade?.finished?.catch(() => {})
      ]),
      delay(duration + delayMs + 90)
    ]);
  } catch {
    // Fast repeated actions can cancel animations; the final DOM state still lands below.
  } finally {
    target.style.opacity = "";
    target.style.visibility = "";
    imageBlur?.cancel();
    loaderFade?.cancel();
    flight?.cancel();
    ghost.remove();
  }
}

async function flySelectedStylesToGenerationTargets() {
  const cards = getSelectedStyleCardsInOrder();
  if (!cards.length) return;
  await Promise.all(
    cards.map((card, index) => {
      const target = generationCards[index];
      if (!target || !visibleRect(card) || !visibleRect(target)) return Promise.resolve();
      return flyStyleReferenceToGenerationTarget(card, target, index);
    })
  );
  await delay(STYLE_REFERENCE_REAPPEAR_DELAY);
  restoreSelectedStyleCards(cards);
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
    if (placeholder) placeholder.src = output.image;
    if (label) label.textContent = output.label;
  });
}

function setSourceReady() {
  sourceReady = true;
  clearGenerationTimers();
  setAlbumOpen(false);
  setFilmDockExpanded(false, { keepDesk: true });
  resetGenerationCards();
  const group = createGroup(`draft-${Date.now()}`, "刚上传的原图", "./assets/原图.jpg", selectedStyles);
  setGenerationImages(group);
  generationStage.classList.add("has-source");
  generationStage.classList.remove("is-running", "is-complete", "is-group-view");
  restartElementAnimation(sourcePhoto);
  styleDockRevealed = true;
  startGenerationButton.hidden = selectedStyles.length !== 3;
  updateDeleteSourceButton();
  updateSelectedStyleDock();
  setSaveStatus("等待生成");
}

function deleteSourcePhoto() {
  if (!sourceReady || !generationStage?.classList.contains("has-source")) return;
  clearDeskPhotos();
  closeSharePreview();
  updateSelectedStyleDock();
  setSaveStatus("本地已保存");
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

  const activeGroup = createGroup(`group-${Date.now()}`, "刚刚生成的一组", "./assets/原图.jpg", selectedStyles);
  setGenerationImages(activeGroup);
  generationStage.classList.add("has-source", "is-running");
  generationStage.classList.remove("is-complete", "is-group-view");
  startGenerationButton.hidden = true;
  updateDeleteSourceButton();
  setSaveStatus("正在生成");

  generationCards.forEach((card, index) => {
    const item = generationTiming[index];
    card.style.opacity = "0";
    card.style.visibility = "visible";
    card.classList.add("is-spawned", "is-generating", "is-fed-target");
    generationTimers.push(
      window.setTimeout(() => {
        card.classList.remove("is-fed-target");
        card.classList.add("is-ready");
        const time = card.querySelector(".result-time");
        if (time) time.textContent = "";
      }, item.seconds * 1000 + index * 120)
    );
  });
  void flySelectedStylesToGenerationTargets();

  const startedAt = Date.now();
  updateGenerationCountdown(startedAt);
  generationInterval = window.setInterval(() => updateGenerationCountdown(startedAt), 1000);

  generationTimers.push(
    window.setTimeout(() => {
      generationStage.classList.add("is-complete");
      generationStage.classList.remove("is-running");
      updateDeleteSourceButton();
      setSaveStatus("本地已保存");
      generationGroups = [activeGroup, ...generationGroups].slice(0, 8);
      activeGroupIndex = 0;
      setFilmPulledFrames(FILM_MIN_VISIBLE_FRAMES);
      renderFilmFrames();
      styleDockRevealed = true;
      updateSelectedStyleDock();
    }, 16400)
  );
}

function getFilmFrameWidth() {
  const frame = filmTrack?.querySelector(".film-frame");
  return frame?.getBoundingClientRect().width || 68;
}

function clampFilmPull(value) {
  const groupCount = Math.max(1, generationGroups.length);
  const max = groupCount + FILM_END_REVEAL_FRAMES;
  const min = Math.min(FILM_MIN_VISIBLE_FRAMES, groupCount);
  return Math.min(Math.max(value, min), max);
}

function syncFilmPullStyles() {
  if (!filmDock) return;
  filmVisibleFrames = filmPulledFrames;
  filmDock.style.setProperty("--film-visible-frames", filmVisibleFrames.toFixed(3));
  filmDock.style.setProperty("--film-track-offset", "0px");
}

function setFilmPulledFrames(value) {
  filmPulledFrames = clampFilmPull(value);
  syncFilmPullStyles();
}

function getFilmFrameIndexFromPoint(clientX) {
  if (!filmStrip) return null;
  const stripBox = filmStrip.getBoundingClientRect();
  const localX = clientX - stripBox.left;
  if (localX < 0 || localX > stripBox.width) return null;
  const index = Math.floor(localX / getFilmFrameWidth());
  return index >= 0 && index < generationGroups.length ? index : null;
}

function renderFilmFrames() {
  if (!filmTrack) return;
  filmTrack.innerHTML = "";
  generationGroups.forEach((group, index) => {
    const button = document.createElement("button");
    button.className = `nav-item film-frame${index === activeGroupIndex ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.groupIndex = String(index);
    button.setAttribute("aria-label", `查看第 ${index + 1} 组`);
    button.innerHTML = `<img src="${group.source}" alt="" />`;
    filmTrack.appendChild(button);
  });
  setFilmPulledFrames(filmPulledFrames);
}

function selectGroup(index) {
  if (!generationGroups.length) return;
  const hadDeskPhotos = isDeskPhotoVisible();
  activeGroupIndex = Math.min(Math.max(0, index), generationGroups.length - 1);
  renderFilmFrames();
  const sourceFrame = filmTrack?.querySelector(`[data-group-index="${activeGroupIndex}"]`);
  setGroupOnDesk(generationGroups[activeGroupIndex], {
    animateFromElement: hadDeskPhotos ? null : sourceFrame
  });
}

function setGroupOnDesk(group, options = {}) {
  clearGenerationTimers();
  setGenerationImages(group);
  sourceReady = false;
  generationStage.classList.add("has-source", "is-complete", "is-group-view");
  generationStage.classList.remove("is-running");
  generationCards.forEach((card) => {
    card.classList.add("is-spawned", "is-ready");
    card.classList.remove("is-generating");
    const time = card.querySelector(".result-time");
    if (time) time.textContent = "";
  });
  startGenerationButton.hidden = true;
  updateDeleteSourceButton();
  updateSelectedStyleDock();
  if (options.animateFromElement) {
    flyDeskPhotosFrom(options.animateFromElement);
  }
}

async function setFilmDockExpanded(expanded, options = {}) {
  if (!filmDock || !filmToggle) return;
  if (filmDockAnimating) return;
  filmDock.classList.remove("is-dragging");
  filmToggle.setAttribute("aria-expanded", String(expanded));
  filmToggle.setAttribute("aria-label", expanded ? "收起生成组胶卷" : "展开生成组胶卷");
  if (expanded) {
    filmDockAnimating = true;
    if (isAlbumOpen()) setAlbumOpen(false, { revealDockOnClose: false });
    activeGroupIndex = 0;
    setFilmPulledFrames(FILM_MIN_VISIBLE_FRAMES);
    renderFilmFrames();
    updateSelectedStyleDock();
    filmDock.classList.remove("is-collapsed");
    await delay(420);
    const sourceFrame = filmTrack?.querySelector(`[data-group-index="${activeGroupIndex}"]`);
    setGroupOnDesk(generationGroups[activeGroupIndex], {
      animateFromElement: sourceFrame
    });
    filmDockAnimating = false;
  } else if (!options.keepDesk) {
    if (isDeskPhotoVisible()) {
      filmDockAnimating = true;
      setFilmPulledFrames(Math.max(filmPulledFrames, activeGroupIndex + 1));
      renderFilmFrames();
      const targetFrame = filmTrack?.querySelector(`[data-group-index="${activeGroupIndex}"]`) || filmToggle;
      await flyDeskPhotosTo(targetFrame, { clearAfter: true });
      filmDock.classList.add("is-collapsed");
      filmDockAnimating = false;
      updateSelectedStyleDock();
      return;
    }
    filmDock.classList.add("is-collapsed");
    clearGenerationTimers();
    sourceReady = false;
    generationStage.classList.remove("has-source", "is-running", "is-complete", "is-group-view");
    resetGenerationCards();
    startGenerationButton.hidden = true;
    updateDeleteSourceButton();
    styleDockRevealed = true;
    setSaveStatus("本地已保存");
  } else {
    filmDock.classList.add("is-collapsed");
  }
  updateSelectedStyleDock();
}

function resetFilmDrag() {
  filmPointerStartX = null;
  filmPointerLastX = null;
  filmPointerStartFrames = filmPulledFrames;
  filmPointerMoved = false;
  filmDock?.classList.remove("is-dragging");
  window.removeEventListener("pointermove", handleFilmPointerMove);
  window.removeEventListener("pointerup", handleFilmPointerEnd);
  window.removeEventListener("pointercancel", resetFilmDrag);
}

function beginFilmDrag(clientX) {
  if (styleFocus && !styleFocus.hidden) return false;
  if (isAlbumOpen()) setAlbumOpen(false, { revealDockOnClose: false });
  if (filmDock?.classList.contains("is-collapsed")) return false;
  filmPointerStartX = clientX;
  filmPointerLastX = clientX;
  filmPointerStartFrames = filmPulledFrames;
  filmPointerMoved = false;
  filmDock?.classList.add("is-dragging");
  window.addEventListener("pointermove", handleFilmPointerMove);
  window.addEventListener("pointerup", handleFilmPointerEnd);
  window.addEventListener("pointercancel", resetFilmDrag);
  return true;
}

function handleFilmPointerMove(event) {
  if (filmPointerStartX === null || !filmStrip) return;
  const delta = event.clientX - filmPointerStartX;
  filmPointerLastX = event.clientX;
  if (Math.abs(delta) > 4) filmPointerMoved = true;
  const frameWidth = getFilmFrameWidth();
  const pulledFrames = filmPointerStartFrames + (-delta / frameWidth);
  setFilmPulledFrames(pulledFrames);
}

function handleFilmPointerEnd() {
  if (filmPointerStartX === null || !filmStrip) return;
  if (filmPointerMoved) {
    filmClickSuppressed = true;
    window.setTimeout(() => {
      filmClickSuppressed = false;
    }, 180);
  }
  filmDock?.classList.remove("is-dragging");
  filmPointerStartX = null;
  filmPointerLastX = null;
  filmPointerMoved = false;
  filmPointerStartFrames = filmPulledFrames;
  window.removeEventListener("pointermove", handleFilmPointerMove);
  window.removeEventListener("pointerup", handleFilmPointerEnd);
  window.removeEventListener("pointercancel", resetFilmDrag);
}

function getShareItemFromElement(element) {
  if (!element) return null;
  if (element === sourcePhoto) {
    const label = element.querySelector("figcaption")?.textContent?.trim() || "原图";
    return {
      element,
      src: sourceImage?.src || "",
      label
    };
  }
  const finalImage = element.querySelector(".final-img");
  if (!finalImage) return null;
  const label = element.querySelector(".result-label")?.textContent?.trim() || "生成图";
  return {
    element,
    src: finalImage.src,
    label
  };
}

function isSharePhotoAvailable(element) {
  if (!visibleRect(element)) return false;
  const style = getComputedStyle(element);
  if (style.visibility === "hidden" || Number(style.opacity) <= 0.01) return false;
  if (element === sourcePhoto) return true;
  return element.classList.contains("is-ready") || generationStage?.classList.contains("is-group-view");
}

function buildSharePreviewItems(originElement, imageSrc, label) {
  const items = getDeskPhotoElements()
    .filter(isSharePhotoAvailable)
    .map(getShareItemFromElement)
    .filter((item) => item?.src);

  if (!items.length && originElement) {
    const item = getShareItemFromElement(originElement);
    if (item?.src) items.push(item);
  }
  if (!items.length && imageSrc) {
    items.push({ element: originElement, src: imageSrc, label });
  }
  return items;
}

function updateSharePreviewMode() {
  const singleItem = sharePreviewItems.length <= 1;
  sharePreview?.classList.toggle("is-single-item", singleItem);
  shareCard?.classList.toggle("is-single-item", singleItem);
}

function normalizeShareIndex(index) {
  if (!sharePreviewItems.length) return 0;
  return (index + sharePreviewItems.length) % sharePreviewItems.length;
}

function getSharePreviewItem(index) {
  return sharePreviewItems[normalizeShareIndex(index)];
}

function setCarouselImage(image, item, isCurrent = false) {
  if (!image || !item) return;
  image.src = item.src;
  image.alt = isCurrent ? `${item.label}发布预览` : "";
}

function updateShareCarouselImages(index = sharePreviewIndex) {
  if (!sharePreviewItems.length) return;
  setCarouselImage(sharePrevImage, getSharePreviewItem(index - 1));
  setCarouselImage(shareImage, getSharePreviewItem(index), true);
  setCarouselImage(shareNextImage, getSharePreviewItem(index + 1));
}

function setShareTrackOffset(offset = 0, { animate = false } = {}) {
  if (!shareImageTrack) return;
  shareImageTrack.style.transition = animate ? "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)" : "none";
  shareImageTrack.style.transform = `translate3d(-100%, 0, 0) translate3d(${offset}px, 0, 0)`;
}

function settleShareTrack(direction) {
  const width = shareImageWindow?.getBoundingClientRect().width || shareCard?.getBoundingClientRect().width || 320;
  shareSwipeSettling = true;
  setShareTrackOffset(direction > 0 ? -width : width, { animate: true });
  window.setTimeout(() => {
    setSharePreviewItem(sharePreviewIndex + direction);
    setShareTrackOffset(0);
    shareSwipeSettling = false;
  }, 280);
}

function setSharePreviewItem(index) {
  if (!sharePreviewItems.length || !shareImage || !shareCopy) return;
  updateSharePreviewMode();
  sharePreviewIndex = normalizeShareIndex(index);
  const item = sharePreviewItems[sharePreviewIndex];
  sharePreviewOriginElement = item.element;
  updateShareCarouselImages();
  if (shareCaption) shareCaption.textContent = item.label;
  shareCopy.textContent = `${item.label}像从旧相册里翻出来的一小段日常。光线落得刚刚好，画面安静，却有一种很适合发小红书的温度。`;
  scheduleSharePreviewFit();
  void waitForImageReady(shareImage).then(scheduleSharePreviewFit);
}

function cycleSharePreview(direction) {
  if (sharePreviewClosing || sharePreviewItems.length < 2) return;
  settleShareTrack(direction);
}

function canStartShareSwipe() {
  return Boolean(
    sharePreview &&
    !sharePreview.hidden &&
    !sharePreviewClosing &&
    sharePreviewItems.length > 1 &&
    !shareSwipeSettling
  );
}

function beginShareSwipe(clientX, clientY, pointerId = null) {
  if (!canStartShareSwipe() || shareSwipeStartX !== null) return false;
  shareSwipeStartX = clientX;
  shareSwipeStartY = clientY;
  shareSwipePointerId = pointerId;
  shareSwipeDragging = false;
  setShareTrackOffset(0);
  return true;
}

function updateShareSwipe(clientX, clientY) {
  if (shareSwipeStartX === null || shareSwipeStartY === null || !shareImageWindow) return false;
  const deltaX = clientX - shareSwipeStartX;
  const deltaY = clientY - shareSwipeStartY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (!shareSwipeDragging) {
    if (absX < 8 && absY < 8) return false;
    if (absY > absX * 1.12) return false;
    shareSwipeDragging = true;
  }
  const width = shareImageWindow.getBoundingClientRect().width || 320;
  const boundedX = Math.max(-width, Math.min(width, deltaX));
  setShareTrackOffset(boundedX);
  return true;
}

function finishShareSwipe(clientX, clientY) {
  if (shareSwipeStartX === null || shareSwipeStartY === null || !shareImageWindow) {
    resetShareSwipe();
    return false;
  }
  const deltaX = clientX - shareSwipeStartX;
  const deltaY = clientY - shareSwipeStartY;
  const wasDragging = shareSwipeDragging;
  const width = shareImageWindow.getBoundingClientRect().width || 320;
  const shouldCycle =
    wasDragging &&
    sharePreviewItems.length > 1 &&
    Math.abs(deltaX) > Math.min(72, width * 0.22) &&
    Math.abs(deltaX) > Math.abs(deltaY) * 0.9;
  shareSwipeStartX = null;
  shareSwipeStartY = null;
  shareSwipePointerId = null;
  shareMouseSwipeActive = false;
  shareSwipeDragging = false;
  if (!wasDragging) return false;
  shareSwipeSuppressClick = true;
  if (shouldCycle) {
    cycleSharePreview(deltaX < 0 ? 1 : -1);
  } else {
    setShareTrackOffset(0, { animate: true });
  }
  window.setTimeout(() => {
    shareSwipeSuppressClick = false;
  }, 320);
  return true;
}

function resetShareSwipe({ animate = false } = {}) {
  shareSwipeStartX = null;
  shareSwipeStartY = null;
  shareSwipePointerId = null;
  shareMouseSwipeActive = false;
  shareSwipeDragging = false;
  setShareTrackOffset(0, { animate });
}

function pixelValue(value) {
  return Number.parseFloat(value) || 0;
}

function getShareImageRatio() {
  if (shareImage?.naturalWidth && shareImage?.naturalHeight) {
    return shareImage.naturalHeight / shareImage.naturalWidth;
  }
  const origin = sharePreviewItems[sharePreviewIndex]?.element;
  const rect = visibleRect(origin);
  if (rect?.width && rect?.height) return rect.height / rect.width;
  return 4 / 3;
}

function waitForImageReady(image) {
  if (!image) return Promise.resolve();
  if (image.complete) {
    if (image.naturalWidth && typeof image.decode === "function") {
      return image.decode().catch(() => {});
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => resolve();
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function fitSharePreviewCard() {
  if (!sharePreview || sharePreview.hidden || !shareCard || !shareImage) return;
  const previewStyle = getComputedStyle(sharePreview);
  const cardStyle = getComputedStyle(shareCard);
  const copyStyle = shareCopy ? getComputedStyle(shareCopy) : null;
  const captionStyle = shareCaption ? getComputedStyle(shareCaption) : null;
  const hints = sharePreview.querySelector(".share-swipe-hints");
  const actions = sharePreview.querySelector(".share-actions");
  const hintsVisible = hints && getComputedStyle(hints).display !== "none";
  const actionsVisible = actions && getComputedStyle(actions).display !== "none";
  const rowGapCount = Number(hintsVisible) + Number(actionsVisible);
  const previewChrome =
    pixelValue(previewStyle.paddingTop) +
    pixelValue(previewStyle.paddingBottom) +
    (pixelValue(previewStyle.rowGap) * rowGapCount) +
    (hintsVisible ? hints.getBoundingClientRect().height : 0) +
    (actionsVisible ? actions.getBoundingClientRect().height : 0);
  const cardChrome =
    pixelValue(cardStyle.paddingTop) +
    pixelValue(cardStyle.paddingBottom) +
    (shareCopy?.getBoundingClientRect().height || 0) +
    pixelValue(copyStyle?.marginTop) +
    pixelValue(copyStyle?.marginBottom) +
    (shareCaption?.getBoundingClientRect().height || 0) +
    pixelValue(captionStyle?.marginTop) +
    pixelValue(captionStyle?.marginBottom);
  const viewportSpace = window.innerHeight - previewChrome - cardChrome - 18;
  const cardSpace = window.innerHeight - 180 - cardChrome;
  const cardRect = shareCard.getBoundingClientRect();
  const imageWidth = shareImageWindow?.getBoundingClientRect().width ||
    shareImage.getBoundingClientRect().width ||
    Math.max(0, cardRect.width - pixelValue(cardStyle.paddingLeft) - pixelValue(cardStyle.paddingRight));
  const imageNaturalHeight = imageWidth * getShareImageRatio();
  const imageHeight = Math.max(40, Math.floor(Math.min(viewportSpace, cardSpace, imageNaturalHeight)));
  sharePreview.style.setProperty("--share-image-height", `${imageHeight}px`);
  shareCard.style.setProperty("--share-image-height", `${imageHeight}px`);
}

function scheduleSharePreviewFit() {
  if (!sharePreview || sharePreview.hidden) return;
  window.requestAnimationFrame(fitSharePreviewCard);
}

async function openSharePreview(imageSrc, label = "照片", originElement = null) {
  if (!sharePreview || !shareImage || !shareCopy) return;
  sharePreviewOriginElement = originElement;
  phoneShell?.classList.add("is-share-preview");
  sharePreview.classList.remove("is-closing");
  sharePreview.classList.add("is-opening");
  sharePreview.style.setProperty("--share-preview-duration", `${SHARE_PREVIEW_OPEN_DURATION}ms`);
  shareImage.src = imageSrc;
  shareImage.alt = `${label}发布预览`;
  shareCopy.textContent = `${label}像从旧相册里翻出来的一小段日常。光线落得刚刚好，画面安静，却有一种很适合发小红书的温度。`;
  sharePreviewItems = buildSharePreviewItems(originElement, imageSrc, label);
  const originIndex = sharePreviewItems.findIndex((item) => item.element === originElement);
  setSharePreviewItem(originIndex >= 0 ? originIndex : 0);
  sharePreview.hidden = false;
  const target = shareCard || shareImage;
  if (originElement && visibleRect(originElement)) {
    target?.classList.add("is-flight-hidden");
  }
  fitSharePreviewCard();
  await waitForImageReady(shareImage);
  fitSharePreviewCard();
  void sharePreview.offsetHeight;
  const backdrop = delay(SHARE_PREVIEW_OPEN_DURATION);
  sharePreview.classList.remove("is-opening");
  if (originElement && visibleRect(originElement)) {
    await Promise.all([
      flyElementBetween(originElement, target, {
        duration: SHARE_PREVIEW_OPEN_DURATION,
        hideSource: true,
        revealTarget: true
      }),
      backdrop
    ]);
  } else {
    await backdrop;
  }
}

async function closeSharePreview() {
  if (!sharePreview || sharePreview.hidden || sharePreviewClosing) return;
  sharePreviewClosing = true;
  const origin = sharePreviewOriginElement;
  const source = shareCard || shareImage;
  sharePreview.classList.remove("is-opening", "is-closing");
  sharePreview.style.setProperty("--share-preview-duration", `${SHARE_PREVIEW_CLOSE_DURATION}ms`);
  void sharePreview.offsetHeight;
  sharePreview.classList.add("is-closing");
  phoneShell?.classList.remove("is-share-preview");
  const backdrop = delay(SHARE_PREVIEW_CLOSE_DURATION);
  if (origin && document.body.contains(origin) && visibleRect(origin)) {
    await Promise.all([
      flyElementBetween(source, origin, {
        duration: SHARE_PREVIEW_CLOSE_DURATION,
        hideSource: true,
        matchEndElementTransform: true,
        revealTarget: true
      }),
      backdrop
    ]);
  } else {
    await backdrop;
  }
  origin?.classList.remove("is-flight-hidden");
  getDeskPhotoElements().forEach((element) => element.classList.remove("is-flight-hidden"));
  sharePreview.hidden = true;
  sharePreview.classList.remove("is-closing", "is-opening");
  source?.classList.remove("is-flight-hidden");
  sharePreviewOriginElement = null;
  sharePreviewItems = [];
  sharePreviewIndex = 0;
  updateSharePreviewMode();
  resetShareSwipe();
  phoneShell?.classList.remove("is-share-preview");
  sharePreviewClosing = false;
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
  event.stopPropagation();
  toggleStyleSelection(card.dataset.style);
});

styleWall?.addEventListener("click", (event) => {
  if (event.target.closest("[data-style]")) return;
  setAlbumOpen(false);
});

selectedStyleDock?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-style-preview]");
  if (!card) return;
  showStyleFocus(card.dataset.stylePreview, card);
});

styleFocus?.addEventListener("click", closeStyleFocus);
styleFocusCard?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeStyleFocus();
});

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
deleteSourceButton?.addEventListener("click", deleteSourcePhoto);

filmToggle?.addEventListener("click", () => {
  if (styleFocus && !styleFocus.hidden) return;
  if (isAlbumOpen()) setAlbumOpen(false, { revealDockOnClose: false });
  setFilmDockExpanded(filmDock.classList.contains("is-collapsed"));
});

filmStrip?.addEventListener("click", (event) => {
  if (styleFocus && !styleFocus.hidden) return;
  if (isAlbumOpen()) setAlbumOpen(false, { revealDockOnClose: false });
  if (filmClickSuppressed) {
    filmClickSuppressed = false;
    return;
  }
  const frame = event.target.closest("[data-group-index]");
  const index = frame ? Number(frame.dataset.groupIndex) : getFilmFrameIndexFromPoint(event.clientX);
  if (index === null || Number.isNaN(index)) return;
  selectGroup(index);
});

filmStrip?.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

filmStrip?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  beginFilmDrag(event.clientX);
  event.currentTarget.setPointerCapture?.(event.pointerId);
});

filmStrip?.addEventListener("pointermove", (event) => {
  if (filmPointerStartX !== null || event.buttons !== 1) return;
  if (!beginFilmDrag(event.clientX)) return;
  handleFilmPointerMove(event);
});


sourcePhoto?.addEventListener("click", () => {
  if (!generationStage.classList.contains("has-source")) return;
  openSharePreview(sourceImage.src, "原图", sourcePhoto);
});

generationCards.forEach((card) => {
  card.addEventListener("click", () => {
    if (!card.classList.contains("is-ready")) {
      showToast("还在生成，先看模糊预览。");
      return;
    }
    const finalImage = card.querySelector(".final-img");
    const label = card.querySelector(".result-label")?.textContent || "生成图";
    openSharePreview(finalImage.src, label, card);
  });
});

sharePreview?.addEventListener("click", (event) => {
  if (shareSwipeSuppressClick) {
    event.preventDefault();
    event.stopPropagation();
    shareSwipeSuppressClick = false;
    return;
  }
  const actionButton = event.target.closest("[data-share-action]");
  if (!actionButton) {
    closeSharePreview();
    return;
  }
  event.stopPropagation();
  handleShareAction(actionButton.dataset.shareAction);
});

shareImageWindow?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !beginShareSwipe(event.clientX, event.clientY, event.pointerId)) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
});

shareImageWindow?.addEventListener("pointermove", (event) => {
  if (shareSwipePointerId !== event.pointerId || !updateShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener("pointermove", (event) => {
  if (shareSwipePointerId !== event.pointerId || !updateShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

shareImageWindow?.addEventListener("pointerup", (event) => {
  if (shareSwipePointerId !== event.pointerId || !finishShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener("pointerup", (event) => {
  if (shareSwipePointerId !== event.pointerId || !finishShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

shareImageWindow?.addEventListener("pointercancel", (event) => {
  if (shareSwipePointerId !== event.pointerId) return;
  resetShareSwipe({ animate: shareSwipeDragging });
});

shareImageWindow?.addEventListener("mousedown", (event) => {
  if (event.button !== 0 || !beginShareSwipe(event.clientX, event.clientY, "mouse")) return;
  shareMouseSwipeActive = true;
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener("mousemove", (event) => {
  if (!shareMouseSwipeActive || !updateShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener("mouseup", (event) => {
  if (!shareMouseSwipeActive || !finishShareSwipe(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopPropagation();
});

shareImageWindow?.addEventListener("dragstart", (event) => {
  event.preventDefault();
});
shareImage?.addEventListener("load", scheduleSharePreviewFit);
window.addEventListener("resize", scheduleSharePreviewFit);
window.addEventListener("orientationchange", scheduleSharePreviewFit);

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
