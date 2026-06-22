const defaultEmotionData = [
  { name: "开心的宝子", iconType: "emoji", iconValue: "🌞" },
  { name: "难过的宝子", iconType: "emoji", iconValue: "☔" }
];
const defaultEmotions = defaultEmotionData.map((item) => item.name);
const emojiOptions = ["🌞", "☔", "🌸", "😭", "😡", "💤", "📚", "🌙", "🐰", "⭐", "🍀", "🧸"];
const QUOTES_KEY = "baozi_quotes";
const EMOTIONS_KEY = "baozi_emotions";
const PROFILE_KEY = "baozi_profile";
const defaultProfile = {
  avatarType: "emoji",
  avatarValue: "♡",
  coverType: "default",
  coverValue: "default",
  coverMode: "cover",
  title: "宝子",
  subtitle: "记录每一个情绪里的你",
  status: "今天也要好好记录自己"
};
const profileAvatarOptions = ["♡", "🐰", "🐱", "🌸", "⭐", "🌙", "🧸", "🍓", "🌞", "☁️"];

const moodPalette = [
  { color: "#f1c84d", soft: "#fff7cd", hint: "把开心的小瞬间留在这里吧" },
  { color: "#79afe8", soft: "#e6f2ff", hint: "难过也没关系，这里会认真听你说" },
  { color: "#ee9984", soft: "#fff0eb", hint: "把闷在心里的话都说出来吧" },
  { color: "#a791dc", soft: "#f0eaff", hint: "慢慢写，不需要马上振作起来" },
  { color: "#70c99a", soft: "#e7faef", hint: "记录正在努力长大的自己" },
  { color: "#ec8cab", soft: "#fff0f5", hint: "每一个小情绪都值得被记住" }
];

let quotes = [];
let customEmotions = [];
let currentView = "home";
let currentEmotion = null;
let allQuotesSearch = "";
let allQuotesFilter = "全部";
let selectedCustomEmoji = "🌸";
let customIconImage = "";
let editingQuoteId = null;
let editReturnView = "home";
let editReturnEmotion = null;
let profile = { ...defaultProfile };
let profileDraft = { ...defaultProfile };
let temporaryAvatarSelection = null;
let confirmCallback = null;
let toastTimer;
const elements = {};

const allEmotionRecords = () => [...defaultEmotionData, ...customEmotions];
const allEmotions = () => allEmotionRecords().map((item) => item.name);

function cacheElements() {
  const ids = [
    "homeView", "newQuoteView", "emotionView", "allQuotesView", "favoritesView", "statsView", "editQuoteView", "profileSettingsView",
    "profileHeader", "profileCoverBlur", "homeLogoButton", "profileAvatar", "profileTitle", "profileSubtitle", "profileStatus",
    "navProfileAvatar", "navProfileTitle", "navProfileSubtitle",
    "openNewQuoteViewButton", "homeAllQuotesButton", "homeQuoteCount", "homeFavoriteCount",
    "homeEmotionCount", "homeEmotionList", "customEmojiPicker", "customIconInput", "customIconUpload",
    "chooseCustomIconButton", "customIconPreview", "customEmotionInput", "addEmotionButton", "mobileEmotionToggle",
    "customEmotionPanel", "homeFavoritesButton",
    "homeStatsButton", "overviewAllQuotesButton", "overviewFavoritesButton", "quickFavoriteCount",
    "sidebarCoverPreview", "sidebarCoverUpload", "uploadSidebarCoverButton", "resetSidebarCoverButton", "sidebarEditProfileButton",
    "newQuoteEmotionSelect", "newQuoteInput", "newQuoteVoiceButton", "newQuoteCharCount",
    "newQuoteTagInput", "newQuotePublishButton", "newQuoteRecentList",
    "emotionViewMark", "emotionViewTitle", "emotionViewCount", "emotionComposerHint",
    "emotionQuoteInput", "emotionVoiceButton", "emotionCharCount", "emotionTagInput",
    "emotionPublishButton", "emotionFeedTitle", "emotionQuoteList", "allQuotesSearchInput",
    "clearAllQuotesSearchButton", "allQuotesFilters", "allQuotesCount", "allQuoteList", "favoriteQuoteList",
    "statsTodayCount", "statsWeekCount", "statsTotalCount", "topEmotionName",
    "topEmotionCount", "statsFavoriteCount", "topTagName", "topTagCount", "statsDetailList",
    "cancelEditTopButton", "editEmotionSelect", "editQuoteInput", "editCharCount",
    "editTagInput", "cancelEditButton", "saveEditButton", "backFromAvatar", "avatarBackButton",
    "avatarPreview", "avatarOptions", "avatarUpload", "chooseAvatarUploadButton", "cancelAvatarSelectionButton", "resetDefaultAvatarButton", "saveAvatarButton",
    "coverPreview", "coverPreviewBlur", "coverModeOptions", "coverUpload", "defaultCoverButton", "chooseCoverUploadButton",
    "profileTitleInput", "profileSubtitleInput", "profileStatusInput",
    "editPreviewText", "editPreviewMeta",
    "customConfirm", "confirmTitle", "confirmMessage", "confirmCancelButton", "confirmDeleteButton", "toast"
  ];
  ids.forEach((id) => { elements[id] = document.getElementById(id); });
  elements.views = [...document.querySelectorAll(".view")];
  elements.navButtons = [...document.querySelectorAll("[data-view-link]")];
  elements.mobileTabButtons = [...document.querySelectorAll("[data-mobile-tab]")];
}

function safeArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeCustomEmotion(item, index) {
  if (typeof item === "string") {
    return { name: item.trim(), iconType: "emoji", iconValue: emojiOptions[(index + 2) % emojiOptions.length] };
  }
  if (item && typeof item === "object") {
    const legacyEmoji = typeof item.emoji === "string" ? item.emoji : "";
    const iconType = item.iconType === "image" && typeof item.iconValue === "string" && item.iconValue
      ? "image"
      : "emoji";
    return {
      name: String(item.name || "").trim(),
      iconType,
      iconValue: iconType === "image" ? item.iconValue : String(item.iconValue || legacyEmoji || "🌸")
    };
  }
  return { name: "", iconType: "emoji", iconValue: "🌸" };
}

function loadData() {
  quotes = safeArray(QUOTES_KEY).map((quote) => {
    if (quote.date && quote.time && !String(quote.date).includes("T")) {
      return { ...quote, favorite: Boolean(quote.favorite) };
    }
    const legacyDate = new Date(quote.date || Date.now());
    return {
      ...quote,
      date: Number.isNaN(legacyDate.getTime()) ? String(quote.date || "") : toDateString(legacyDate),
      time: Number.isNaN(legacyDate.getTime()) ? "" : toTimeString(legacyDate),
      favorite: Boolean(quote.favorite)
    };
  });

  customEmotions = safeArray(EMOTIONS_KEY)
    .map(normalizeCustomEmotion)
    .filter((item) => item.name && !defaultEmotions.includes(item.name))
    .filter((item, index, array) => array.findIndex((other) => other.name === item.name) === index);

  saveEmotions();
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved === "object") {
      profile = {
        avatarType: saved.avatarType === "image" ? "image" : "emoji",
        avatarValue: typeof saved.avatarValue === "string" && saved.avatarValue ? saved.avatarValue : defaultProfile.avatarValue,
        coverType: saved.coverType === "image" ? "image" : "default",
        coverValue: saved.coverType === "image" && typeof saved.coverValue === "string" ? saved.coverValue : "default",
        coverMode: ["cover", "contain", "blur"].includes(saved.coverMode) ? saved.coverMode : "cover",
        title: String(saved.title || defaultProfile.title),
        subtitle: String(saved.subtitle || defaultProfile.subtitle),
        status: String(saved.status || defaultProfile.status)
      };
      profileDraft = { ...profile };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return;
    }
  } catch {
    // 损坏的数据会回退到默认头像。
  }
  profile = { ...defaultProfile };
  profileDraft = { ...defaultProfile };
}

function saveProfile(showMessage = false) {
  try {
    profile = {
      avatarType: profile.avatarType === "image" ? "image" : "emoji",
      avatarValue: profile.avatarValue || defaultProfile.avatarValue,
      coverType: profile.coverType === "image" ? "image" : "default",
      coverValue: profile.coverType === "image" ? profile.coverValue : "default",
      coverMode: ["cover", "contain", "blur"].includes(profile.coverMode) ? profile.coverMode : "cover",
      title: profile.title || defaultProfile.title,
      subtitle: profile.subtitle || defaultProfile.subtitle,
      status: profile.status || defaultProfile.status
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    renderProfile();
    if (showMessage) showToast("个人空间资料已经保存好啦。");
    return true;
  } catch {
    showToast("图片有点大，请换一张再试试。");
    return false;
  }
}

function saveQuotes() {
  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
    return true;
  } catch {
    showToast("保存失败，本地存储空间可能已满。");
    return false;
  }
}

function saveEmotions() {
  try {
    localStorage.setItem(EMOTIONS_KEY, JSON.stringify(customEmotions));
    return true;
  } catch {
    showToast("情绪保存失败，本地存储空间可能已满。");
    return false;
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeString(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function emotionRecord(emotion) {
  const found = allEmotionRecords().find((item) => item.name === emotion);
  if (found) return found;
  let hash = 0;
  for (const character of String(emotion)) hash += character.charCodeAt(0);
  return { name: emotion, iconType: "emoji", iconValue: emojiOptions[hash % emojiOptions.length] };
}

function paletteFor(emotion) {
  const names = allEmotions();
  let index = names.indexOf(emotion);
  if (index < 0) {
    index = [...String(emotion)].reduce((total, character) => total + character.charCodeAt(0), 0);
  }
  return {
    ...moodPalette[index % moodPalette.length],
    icon: emotionRecord(emotion)
  };
}

function moodStyle(emotion) {
  const palette = paletteFor(emotion);
  return `--mood-color:${palette.color};--mood-soft:${palette.soft}`;
}

function setActiveView(viewName) {
  currentView = viewName;
  elements.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  elements.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.viewLink === viewName));
  const mobileSection = viewName === "home"
    ? "home"
    : viewName === "newQuote"
      ? "newQuote"
      : viewName === "stats"
        ? "stats"
        : viewName === "profileSettings"
          ? "profileSettings"
          : "quotes";
  elements.mobileTabButtons.forEach((button) => {
    const active = button.dataset.mobileTab === mobileSection;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function showHomeView() {
  if (currentView === "profileSettings") discardProfileDraft();
  currentEmotion = null;
  if (elements.mobileEmotionToggle && window.matchMedia("(max-width: 600px)").matches) {
    setMobileEmotionPanel(false);
  }
  renderHome();
  setActiveView("home");
}

function showEmotionView(emotion) {
  if (!emotion) return;
  currentEmotion = emotion;
  renderEmotionView();
  setActiveView("emotion");
  setTimeout(() => elements.emotionQuoteInput.focus(), 80);
}

function showNewQuoteView() {
  currentEmotion = null;
  renderNewQuoteView();
  setActiveView("newQuote");
  setTimeout(() => elements.newQuoteInput.focus(), 80);
}

function showAllQuotesView() {
  currentEmotion = null;
  allQuotesSearch = "";
  allQuotesFilter = "全部";
  elements.allQuotesSearchInput.value = "";
  renderAllQuotesView();
  setActiveView("allQuotes");
}

function showFavoritesView() {
  currentEmotion = null;
  renderFavoritesView();
  setActiveView("favorites");
}

function showStatsView() {
  currentEmotion = null;
  renderStatsView();
  setActiveView("stats");
}

function showProfileSettingsView() {
  profileDraft = { ...profile };
  temporaryAvatarSelection = null;
  renderAvatarOptions();
  renderProfileSettings();
  setActiveView("profileSettings");
}

function discardProfileDraft() {
  profileDraft = { ...profile };
  temporaryAvatarSelection = null;
}

function showEditQuoteView(id) {
  const quote = quotes.find((item) => item.id === id);
  if (!quote) return;
  editingQuoteId = id;
  editReturnView = currentView;
  editReturnEmotion = currentEmotion;
  renderEditEmotionSelect(quote.emotion);
  elements.editQuoteInput.value = quote.text;
  elements.editTagInput.value = quote.tag || "";
  updateCharCount("edit");
  renderEditPreview();
  setActiveView("editQuote");
  setTimeout(() => elements.editQuoteInput.focus(), 80);
}

function returnFromEdit(emotionOverride = null) {
  if (editReturnView === "emotion") {
    showEmotionView(emotionOverride || editReturnEmotion);
  } else if (editReturnView === "allQuotes") {
    showAllQuotesView();
  } else if (editReturnView === "favorites") {
    showFavoritesView();
  } else if (editReturnView === "stats") {
    showStatsView();
  } else if (editReturnView === "newQuote") {
    showNewQuoteView();
  } else {
    showHomeView();
  }
}

function latestQuoteFor(emotion) {
  return quotes.find((quote) => quote.emotion === emotion);
}

function renderHome() {
  const favorites = quotes.filter((quote) => quote.favorite);
  elements.homeQuoteCount.textContent = quotes.length;
  elements.homeFavoriteCount.textContent = favorites.length;
  elements.quickFavoriteCount.textContent = `${favorites.length} 条`;
  elements.homeEmotionCount.textContent = allEmotions().length;
  renderEmojiPicker();
  renderHomeEmotionList();
}

function avatarMarkup(profileData) {
  const content = profileData.avatarType === "image"
    ? `<img src="${profileData.avatarValue}" alt="宝子头像">`
    : `<span class="avatar-emoji">${escapeHTML(profileData.avatarValue)}</span>`;
  return content;
}

function renderProfile() {
  elements.profileAvatar.innerHTML = avatarMarkup(profile);
  elements.navProfileAvatar.innerHTML = avatarMarkup(profile);
  elements.profileTitle.textContent = profile.title;
  elements.navProfileTitle.textContent = profile.title;
  elements.profileSubtitle.textContent = profile.subtitle;
  elements.navProfileSubtitle.textContent = profile.subtitle;
  elements.profileStatus.textContent = profile.status;
  renderCover(profile, elements.profileHeader, elements.profileCoverBlur);
  renderCover(profile, elements.sidebarCoverPreview);
}

function renderProfileSettings() {
  elements.avatarPreview.innerHTML = avatarMarkup(profileDraft);
  elements.profileTitleInput.value = profileDraft.title;
  elements.profileSubtitleInput.value = profileDraft.subtitle;
  elements.profileStatusInput.value = profileDraft.status;
  renderCover(profileDraft, elements.coverPreview, elements.coverPreviewBlur);
  elements.coverModeOptions.querySelectorAll("[data-cover-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.coverMode === profileDraft.coverMode);
  });
}

function renderCover(profileData, target, blurLayer = null) {
  const image = profileData.coverType === "image" && profileData.coverValue
    ? `url("${profileData.coverValue}")`
    : "";
  const mode = ["cover", "contain", "blur"].includes(profileData.coverMode) ? profileData.coverMode : "cover";
  target.dataset.coverMode = mode;
  target.style.backgroundImage = image;
  target.style.backgroundSize = image && mode === "contain" ? "contain" : "";
  target.style.backgroundPosition = "center";
  target.style.backgroundRepeat = "no-repeat";
  if (blurLayer) blurLayer.style.backgroundImage = image;
}

function setMobileEmotionPanel(open) {
  elements.customEmotionPanel.classList.toggle("mobile-open", open);
  elements.mobileEmotionToggle.setAttribute("aria-expanded", String(open));
}

function renderAvatarOptions() {
  const selectedAvatarOption = profileDraft.avatarType === "emoji"
    ? `emoji:${profileDraft.avatarValue}`
    : profileDraft.avatarValue === "baozi.png"
      ? "image:baozi.png"
      : null;
  elements.avatarOptions.innerHTML = profileAvatarOptions.map((avatar) => `
    <button class="avatar-option ${selectedAvatarOption === `emoji:${avatar}` ? "selected" : ""}"
      data-profile-avatar="${escapeHTML(avatar)}" type="button" aria-label="选择头像${escapeHTML(avatar)}">${escapeHTML(avatar)}</button>
  `).join("") + `
    <button class="avatar-option logo-avatar ${selectedAvatarOption === "image:baozi.png" ? "selected" : ""}"
      data-profile-avatar-image="baozi.png" type="button" aria-label="选择宝子 logo 头像">
      <img src="baozi.png" alt="">
    </button>`;
}

function selectDefaultAvatar(avatar) {
  const selectionKey = `emoji:${avatar}`;
  if (temporaryAvatarSelection === selectionKey) {
    cancelTemporaryAvatarSelection();
    return;
  }
  temporaryAvatarSelection = selectionKey;
  profileDraft.avatarType = "emoji";
  profileDraft.avatarValue = avatar;
  renderAvatarOptions();
  renderProfileSettings();
}

function selectImageAvatar(imagePath) {
  const selectionKey = `image:${imagePath}`;
  if (temporaryAvatarSelection === selectionKey) {
    cancelTemporaryAvatarSelection();
    return;
  }
  temporaryAvatarSelection = selectionKey;
  profileDraft.avatarType = "image";
  profileDraft.avatarValue = imagePath;
  renderAvatarOptions();
  renderProfileSettings();
}

function cancelTemporaryAvatarSelection() {
  temporaryAvatarSelection = null;
  profileDraft.avatarType = profile.avatarType;
  profileDraft.avatarValue = profile.avatarValue;
  renderAvatarOptions();
  renderProfileSettings();
}

function restoreDefaultAvatar() {
  temporaryAvatarSelection = "image:baozi.png";
  profileDraft.avatarType = "image";
  profileDraft.avatarValue = "baozi.png";
  renderAvatarOptions();
  renderProfileSettings();
  showToast("已临时恢复默认头像，保存后才会生效。");
}

function resizeAvatarImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - size) / 2;
      const sourceY = (image.naturalHeight - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const context = canvas.getContext("2d");
      context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 320, 320);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("请选择一张图片作为头像。");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const avatarValue = await resizeAvatarImage(reader.result);
      temporaryAvatarSelection = "image:upload";
      profileDraft.avatarType = "image";
      profileDraft.avatarValue = avatarValue;
      renderAvatarOptions();
      renderProfileSettings();
      showToast("头像图片已选好，记得保存资料哦。");
    } catch {
      showToast("这张图片读取失败，请换一张试试。");
    }
    event.target.value = "";
  };
  reader.onerror = () => {
    showToast("这张图片读取失败，请换一张试试。");
    event.target.value = "";
  };
  reader.readAsDataURL(file);
}

function readImageFile(file, resizeFunction) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("invalid-image"));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        resolve(await resizeFunction(reader.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeCoverImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function handleCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    profileDraft.coverType = "image";
    profileDraft.coverValue = await readImageFile(file, resizeCoverImage);
    renderProfileSettings();
    showToast("封面图片已选好，保存资料后生效。");
  } catch {
    showToast("封面图片读取失败，请换一张试试。");
  }
  event.target.value = "";
}

async function handleSidebarCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const coverValue = await readImageFile(file, resizeCoverImage);
    const previousProfile = { ...profile };
    profile = { ...profile, coverType: "image", coverValue };
    if (!saveProfile()) profile = previousProfile;
    else showToast("顶部个人空间封面已经更新啦。");
  } catch {
    showToast("封面图片读取失败，请换一张试试。");
  }
  event.target.value = "";
}

async function handleCustomIconUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    customIconImage = await readImageFile(file, resizeAvatarImage);
    elements.customIconPreview.innerHTML = `<img src="${customIconImage}" alt=""> 已选择图片`;
    elements.customIconInput.value = "";
    renderEmojiPicker();
  } catch {
    showToast("情绪图标读取失败，请换一张试试。");
  }
  event.target.value = "";
}

function iconMarkup(record, className = "") {
  if (record?.iconType === "image" && record.iconValue) {
    return `<img class="${className}" src="${record.iconValue}" alt="">`;
  }
  return escapeHTML(record?.iconValue || "🌸");
}

function renderEmojiPicker() {
  elements.customEmojiPicker.innerHTML = emojiOptions.map((emoji) => `
    <button class="emoji-option ${emoji === selectedCustomEmoji ? "selected" : ""}"
      data-emoji="${emoji}" type="button" aria-label="选择${emoji}">${emoji}</button>
  `).join("");
}

function renderNewQuoteView() {
  renderEmotionSelect(elements.newQuoteEmotionSelect);
  renderNewQuoteRecentList();
}

function renderHomeEmotionList() {
  const latestAll = quotes[0]?.text || "看看所有宝子的心情";
  const allCard = `
    <button class="mood-card home-emotion-card all-card" data-open-all-quotes type="button">
      <span class="emotion-avatar">✦</span>
      <span class="emotion-card-copy">
        <strong>查看全部</strong>
        <small>${quotes.length} 条宝子语录</small>
        <p>最近：${escapeHTML(latestAll)}</p>
      </span>
      <span class="emotion-card-arrow">›</span>
    </button>`;

  const emotionCards = allEmotionRecords().map((record) => {
    const { name } = record;
    const latest = latestQuoteFor(name);
    const count = quotes.filter((quote) => quote.emotion === name).length;
    const deleteButton = customEmotions.some((item) => item.name === name)
      ? `<button class="delete-emotion-button" data-delete-emotion="${escapeHTML(name)}"
          type="button" aria-label="删除${escapeHTML(name)}">×</button>`
      : "";
    return `
      <article class="mood-card home-emotion-card" data-open-emotion="${escapeHTML(name)}"
        tabindex="0" role="button" style="${moodStyle(name)}">
        <span class="emotion-avatar">${iconMarkup(record)}</span>
        <span class="emotion-card-copy">
          <strong title="${escapeHTML(name)}">${escapeHTML(name)}</strong>
          <small>${count} 条宝子语录</small>
          <p>最近：${escapeHTML(latest?.text || "等你记录第一句")}</p>
        </span>
        <span class="emotion-card-arrow">›</span>
        ${deleteButton}
      </article>`;
  }).join("");
  elements.homeEmotionList.innerHTML = allCard + emotionCards;
}

function recentQuoteMarkup(quote) {
  const palette = paletteFor(quote.emotion);
  return `
    <article class="recent-item" style="${moodStyle(quote.emotion)}">
      <span class="recent-avatar">${iconMarkup(palette.icon)}</span>
      <div class="recent-copy">
        <p>${escapeHTML(quote.text)}</p>
        <span>${escapeHTML(quote.emotion)} · ${escapeHTML(quote.date)} ${escapeHTML(quote.time || "")}</span>
      </div>
    </article>`;
}

function renderEmotionView() {
  if (!currentEmotion) return;
  const palette = paletteFor(currentEmotion);
  const emotionQuotes = quotes.filter((quote) => quote.emotion === currentEmotion);
  elements.emotionView.style.setProperty("--mood-color", palette.color);
  elements.emotionView.style.setProperty("--mood-soft", palette.soft);
  elements.emotionViewMark.innerHTML = iconMarkup(palette.icon);
  elements.emotionViewTitle.textContent = currentEmotion;
  elements.emotionViewCount.textContent = emotionQuotes.length;
  elements.emotionComposerHint.textContent = palette.hint;
  elements.emotionPublishButton.textContent = `发布到${currentEmotion} ♡`;
  elements.emotionFeedTitle.textContent = `${currentEmotion}语录`;
  renderQuoteList(elements.emotionQuoteList, emotionQuotes, "这个情绪里还没有宝子语录。");
}

function renderAllQuotesView() {
  const keyword = allQuotesSearch.toLowerCase();
  const filtered = quotes.filter((quote) => {
    const matchesSearch = `${quote.text} ${quote.tag || ""} ${quote.emotion}`.toLowerCase().includes(keyword);
    const matchesFilter = allQuotesFilter === "全部" || quote.emotion === allQuotesFilter;
    return matchesSearch && matchesFilter;
  });
  const filterNames = ["全部", ...allEmotionRecords().map((item) => item.name)];
  elements.allQuotesFilters.innerHTML = filterNames.map((name) => `
    <button class="filter-chip ${name === allQuotesFilter ? "active" : ""}"
      data-quotes-filter="${escapeHTML(name)}" type="button">${escapeHTML(name)}</button>
  `).join("");
  elements.allQuotesCount.textContent = `${filtered.length} 条语录`;
  renderQuoteList(
    elements.allQuoteList,
    filtered,
    allQuotesSearch ? "没有找到相关宝子语录。" : "还没有宝子语录，快记录第一句话吧。"
  );
}

function renderFavoritesView() {
  const favorites = quotes.filter((quote) => quote.favorite);
  if (!favorites.length) {
    elements.favoriteQuoteList.innerHTML = `
      <div class="empty-state favorites-empty">
        <span>♡</span>
        <p>还没有收藏的语录。</p>
        <div class="empty-actions">
          <button class="primary-button" data-empty-new-quote type="button">去记录一句</button>
          <button class="secondary-button" data-empty-all-quotes type="button">查看全部语录</button>
        </div>
      </div>`;
    return;
  }
  renderQuoteList(elements.favoriteQuoteList, favorites, "");
}

function quoteDate(quote) {
  const date = new Date(`${quote.date}T${quote.time || "00:00"}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfCurrentWeek(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function mostFrequentTag() {
  const counts = new Map();
  quotes.forEach((quote) => {
    String(quote.tag || "").split(/[,，、\s]+/).filter(Boolean).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

function renderStatsView() {
  const now = new Date();
  const today = toDateString(now);
  const weekStart = startOfCurrentWeek(now);
  const favorites = quotes.filter((quote) => quote.favorite);
  const todayCount = quotes.filter((quote) => quote.date === today).length;
  const weekCount = quotes.filter((quote) => {
    const date = quoteDate(quote);
    return date && date >= weekStart && date <= now;
  }).length;
  const emotionNames = [...new Set([...allEmotions(), ...quotes.map((quote) => quote.emotion)])];
  const data = emotionNames.map((emotion) => ({
    emotion,
    count: quotes.filter((quote) => quote.emotion === emotion).length
  }));
  const topEmotion = [...data].sort((a, b) => b.count - a.count)[0];
  const topTag = mostFrequentTag();
  const maxCount = Math.max(1, ...data.map((item) => item.count));

  elements.statsTodayCount.textContent = todayCount;
  elements.statsWeekCount.textContent = weekCount;
  elements.statsTotalCount.textContent = quotes.length;
  elements.statsFavoriteCount.textContent = favorites.length;
  elements.topEmotionName.textContent = topEmotion?.count ? topEmotion.emotion : "暂无";
  elements.topEmotionCount.textContent = topEmotion?.count ? `${topEmotion.count} 条` : "暂无";
  elements.topTagName.textContent = topTag ? `#${topTag[0]}` : "暂无";
  elements.topTagCount.textContent = topTag ? `${topTag[1]} 次` : "暂无";
  elements.statsDetailList.innerHTML = data.map((item) => {
    const palette = paletteFor(item.emotion);
    return `
      <div class="stat-item" style="${moodStyle(item.emotion)}">
        <div class="stat-line">
          <span>${iconMarkup(palette.icon, "mood-icon-image")} ${escapeHTML(item.emotion)}</span>
          <b>${item.count} 条</b>
        </div>
        <div class="stat-track"><i style="width:${(item.count / maxCount) * 100}%"></i></div>
      </div>`;
  }).join("");
}

function quoteCard(quote) {
  const palette = paletteFor(quote.emotion);
  const tags = String(quote.tag || "").split(/[,，、\s]+/).filter(Boolean);
  return `
    <article class="quote-card" style="${moodStyle(quote.emotion)}">
      <div class="quote-author">
        <span class="quote-avatar">${iconMarkup(palette.icon)}</span>
        <div class="author-info">
          <strong>宝子</strong>
          <time datetime="${escapeHTML(`${quote.date}T${quote.time || "00:00"}`)}">${escapeHTML(quote.date)} · ${escapeHTML(quote.time || "")}</time>
        </div>
        <span class="mood-pill">${iconMarkup(palette.icon, "mood-icon-image")} ${escapeHTML(quote.emotion)}</span>
      </div>
      <div class="quote-content">${escapeHTML(quote.text)}</div>
      <div class="quote-tags">
        <span class="tag emotion-tag"># ${escapeHTML(quote.emotion)}</span>
        ${tags.map((tag) => `<span class="tag"># ${escapeHTML(tag)}</span>`).join("")}
      </div>
      <div class="quote-actions">
        <button class="action-button ${quote.favorite ? "favorited" : ""}" data-favorite-id="${quote.id}" type="button">
          ${quote.favorite ? "♥ 已收藏" : "♡ 收藏"}
        </button>
        <button class="action-button edit-button" data-edit-id="${quote.id}" type="button">✎ 编辑</button>
        <button class="action-button delete-button" data-delete-id="${quote.id}" type="button">删除</button>
      </div>
    </article>`;
}

function renderEditPreview() {
  if (!elements.editPreviewText) return;
  const emotion = elements.editEmotionSelect.value || "宝子情绪";
  const text = elements.editQuoteInput.value.trim() || "修改后的语录会显示在这里。";
  const tag = elements.editTagInput.value.trim();
  elements.editPreviewText.textContent = text;
  elements.editPreviewMeta.textContent = `${emotion}${tag ? ` · #${tag}` : ""}`;
}

function renderQuoteList(container, list, emptyMessage) {
  container.innerHTML = list.length
    ? list.map(quoteCard).join("")
    : `<div class="empty-state"><span>♡</span>${emptyMessage}</div>`;
}

function renderEmotionSelect(select, selected = null, includeOrphans = false) {
  const emotionNames = includeOrphans
    ? [...new Set([...allEmotions(), ...quotes.map((quote) => quote.emotion)])]
    : allEmotions();
  const previous = selected || select.value;
  select.innerHTML = emotionNames.map((emotion) =>
    `<option value="${escapeHTML(emotion)}">${paletteFor(emotion).icon.iconType === "emoji" ? escapeHTML(paletteFor(emotion).icon.iconValue) : "🖼️"} ${escapeHTML(emotion)}</option>`
  ).join("");
  select.value = emotionNames.includes(previous) ? previous : emotionNames[0];
}

function renderEditEmotionSelect(selected) {
  renderEmotionSelect(elements.editEmotionSelect, selected, true);
}

function renderNewQuoteRecentList() {
  const recent = quotes.slice(0, 3);
  elements.newQuoteRecentList.innerHTML = recent.length
    ? recent.map(recentQuoteMarkup).join("")
    : `<div class="empty-state compact-empty"><span>♡</span>还没有最近语录。</div>`;
}

function renderAll() {
  renderHome();
  if (currentView === "newQuote") renderNewQuoteView();
  if (currentView === "emotion") renderEmotionView();
  if (currentView === "allQuotes") renderAllQuotesView();
  if (currentView === "favorites") renderFavoritesView();
  if (currentView === "stats") renderStatsView();
}

function createQuote(text, emotion, tag) {
  const now = new Date();
  return {
    id: Date.now(),
    text,
    emotion,
    tag,
    date: toDateString(now),
    time: toTimeString(now),
    favorite: false
  };
}

function addQuote() {
  const text = elements.emotionQuoteInput.value.trim();
  if (!text) {
    showToast("请输入想记录的宝子语录。");
    elements.emotionQuoteInput.focus();
    return;
  }
  const quote = createQuote(text, currentEmotion, elements.emotionTagInput.value.trim());
  quotes.unshift(quote);
  if (!saveQuotes()) {
    quotes = quotes.filter((item) => item.id !== quote.id);
    return;
  }
  elements.emotionQuoteInput.value = "";
  elements.emotionTagInput.value = "";
  updateCharCount("emotion");
  renderEmotionView();
  showToast("宝子语录已经发布成功啦。");
}

function addQuoteFromNewView() {
  const text = elements.newQuoteInput.value.trim();
  if (!text) {
    showToast("请输入想记录的宝子语录。");
    elements.newQuoteInput.focus();
    return;
  }
  const emotion = elements.newQuoteEmotionSelect.value;
  const quote = createQuote(text, emotion, elements.newQuoteTagInput.value.trim());
  quotes.unshift(quote);
  if (!saveQuotes()) {
    quotes = quotes.filter((item) => item.id !== quote.id);
    return;
  }
  elements.newQuoteInput.value = "";
  elements.newQuoteTagInput.value = "";
  updateCharCount("newQuote");
  showEmotionView(emotion);
  showToast("宝子语录已经发布成功啦。");
}

function saveEditedQuote() {
  const quote = quotes.find((item) => item.id === editingQuoteId);
  const text = elements.editQuoteInput.value.trim();
  if (!quote || !text) {
    showToast("语录内容不能为空哦。");
    elements.editQuoteInput.focus();
    return;
  }
  const previousQuote = { ...quote };
  quote.text = text;
  quote.tag = elements.editTagInput.value.trim();
  quote.emotion = elements.editEmotionSelect.value;
  if (!saveQuotes()) {
    Object.assign(quote, previousQuote);
    return;
  }
  const updatedEmotion = quote.emotion;
  editingQuoteId = null;
  showToast("宝子语录已经修改好啦。");
  returnFromEdit(updatedEmotion);
}

function deleteQuote(id) {
  showCustomConfirm({
    title: "确定要删除这条宝子语录吗？",
    message: "删除后就不能恢复啦。",
    confirmText: "确定删除",
    cancelText: "取消",
    onConfirm: () => {
      const previousQuotes = quotes;
      quotes = quotes.filter((quote) => quote.id !== id);
      if (!saveQuotes()) {
        quotes = previousQuotes;
        return;
      }
      renderAll();
      showToast("宝子语录已经删除。");
    }
  });
}

function toggleFavorite(id) {
  const quote = quotes.find((item) => item.id === id);
  if (!quote) return;
  quote.favorite = !quote.favorite;
  if (!saveQuotes()) {
    quote.favorite = !quote.favorite;
    return;
  }
  renderAll();
  showToast(quote.favorite ? "已加入收藏。" : "已取消收藏。");
}

function addCustomEmotion() {
  const name = elements.customEmotionInput.value.trim();
  if (!name) {
    showToast("请输入新的宝子情绪名称。");
    elements.customEmotionInput.focus();
    return;
  }
  if (allEmotions().some((item) => item.toLowerCase() === name.toLowerCase())) {
    showToast("这个宝子情绪已经存在啦。");
    return;
  }
  const customSymbol = elements.customIconInput.value.trim();
  const icon = customIconImage
    ? { iconType: "image", iconValue: customIconImage }
    : { iconType: "emoji", iconValue: customSymbol || selectedCustomEmoji };
  customEmotions.push({ name, ...icon });
  if (!saveEmotions()) {
    customEmotions.pop();
    return;
  }
  elements.customEmotionInput.value = "";
  elements.customIconInput.value = "";
  customIconImage = "";
  elements.customIconPreview.textContent = "未选择图片";
  renderHome();
  if (window.matchMedia("(max-width: 600px)").matches) setMobileEmotionPanel(false);
  showToast("新的宝子情绪添加成功。");
}

function saveProfileSettings() {
  const title = elements.profileTitleInput.value.trim();
  const subtitle = elements.profileSubtitleInput.value.trim();
  const status = elements.profileStatusInput.value.trim();
  if (!title) {
    showToast("昵称不能为空哦。");
    elements.profileTitleInput.focus();
    return;
  }
  const previousProfile = { ...profile };
  profile = {
    ...profileDraft,
    title,
    subtitle: subtitle || defaultProfile.subtitle,
    status: status || defaultProfile.status
  };
  if (saveProfile(true)) {
    showHomeView();
  } else {
    profile = previousProfile;
  }
}

function deleteCustomEmotion(emotion) {
  if (defaultEmotions.includes(emotion)) {
    showToast("默认宝子情绪不能删除哦。");
    return;
  }
  showCustomConfirm({
    title: "确定要删除这个宝子情绪吗？",
    message: "删除后，这个情绪分类会从首页消失，但以前保存的语录不会丢失。",
    confirmText: "确定删除",
    cancelText: "取消",
    onConfirm: () => {
      const previousEmotions = customEmotions;
      customEmotions = customEmotions.filter((item) => item.name !== emotion);
      if (!saveEmotions()) {
        customEmotions = previousEmotions;
        return;
      }
      renderHome();
      showToast("自定义情绪已经删除，旧语录会继续保留。");
    }
  });
}

function startVoiceInput(target = "emotion") {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("当前浏览器暂不支持语音输入，请使用文字输入。");
    return;
  }
  const isNewQuote = target === "newQuote";
  const input = isNewQuote ? elements.newQuoteInput : elements.emotionQuoteInput;
  const button = isNewQuote ? elements.newQuoteVoiceButton : elements.emotionVoiceButton;
  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onstart = () => {
    button.textContent = "正在听宝子说话...";
    button.classList.add("listening");
  };
  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    input.value = `${input.value}${input.value ? " " : ""}${spokenText}`.slice(0, 500);
    updateCharCount(target);
  };
  recognition.onerror = () => showToast("没有听清楚，再试一次吧。");
  recognition.onend = () => {
    button.textContent = "🎤 语音输入";
    button.classList.remove("listening");
  };
  recognition.start();
}

function updateCharCount(target = "emotion") {
  if (target === "newQuote") {
    elements.newQuoteCharCount.textContent = elements.newQuoteInput.value.length;
  } else if (target === "edit") {
    elements.editCharCount.textContent = elements.editQuoteInput.value.length;
  } else {
    elements.emotionCharCount.textContent = elements.emotionQuoteInput.value.length;
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function showCustomConfirm(options) {
  elements.confirmTitle.textContent = options.title || "确定要继续吗？";
  elements.confirmMessage.textContent = options.message || "";
  elements.confirmDeleteButton.textContent = options.confirmText || "确定";
  elements.confirmCancelButton.textContent = options.cancelText || "取消";
  confirmCallback = typeof options.onConfirm === "function" ? options.onConfirm : null;
  elements.customConfirm.classList.add("open");
  elements.customConfirm.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.confirmCancelButton.focus(), 20);
}

function closeCustomConfirm() {
  confirmCallback = null;
  elements.customConfirm.classList.remove("open");
  elements.customConfirm.setAttribute("aria-hidden", "true");
}

function confirmCustomAction() {
  const callback = confirmCallback;
  closeCustomConfirm();
  if (callback) callback();
}

function handleQuoteListClick(event) {
  const favoriteButton = event.target.closest("[data-favorite-id]");
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  if (favoriteButton) toggleFavorite(Number(favoriteButton.dataset.favoriteId));
  if (editButton) showEditQuoteView(Number(editButton.dataset.editId));
  if (deleteButton) deleteQuote(Number(deleteButton.dataset.deleteId));
}

function bindEvents() {
  elements.homeLogoButton.addEventListener("click", showHomeView);
  elements.sidebarEditProfileButton.addEventListener("click", showProfileSettingsView);
  document.querySelectorAll("[data-back-home]").forEach((button) => button.addEventListener("click", showHomeView));
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.viewLink;
      if (view === "home") showHomeView();
      if (view === "favorites") showFavoritesView();
      if (view === "allQuotes") showAllQuotesView();
      if (view === "stats") showStatsView();
      if (view === "profileSettings") showProfileSettingsView();
    });
  });

  elements.openNewQuoteViewButton.addEventListener("click", showNewQuoteView);
  document.querySelectorAll("[data-mobile-new-quote]").forEach((button) => {
    button.addEventListener("click", showNewQuoteView);
  });
  elements.mobileTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.mobileTab;
      if (view === "home") showHomeView();
      if (view === "quotes") showAllQuotesView();
      if (view === "newQuote") showNewQuoteView();
      if (view === "stats") showStatsView();
      if (view === "profileSettings") showProfileSettingsView();
    });
  });
  elements.mobileEmotionToggle.addEventListener("click", () => {
    setMobileEmotionPanel(elements.mobileEmotionToggle.getAttribute("aria-expanded") !== "true");
  });
  elements.backFromAvatar.addEventListener("click", showHomeView);
  elements.avatarBackButton.addEventListener("click", showHomeView);
  elements.saveAvatarButton.addEventListener("click", saveProfileSettings);
  elements.chooseAvatarUploadButton.addEventListener("click", () => elements.avatarUpload.click());
  elements.cancelAvatarSelectionButton.addEventListener("click", cancelTemporaryAvatarSelection);
  elements.resetDefaultAvatarButton.addEventListener("click", restoreDefaultAvatar);
  elements.avatarUpload.addEventListener("change", handleAvatarUpload);
  elements.chooseCoverUploadButton.addEventListener("click", () => elements.coverUpload.click());
  elements.coverUpload.addEventListener("change", handleCoverUpload);
  elements.defaultCoverButton.addEventListener("click", () => {
    profileDraft.coverType = "default";
    profileDraft.coverValue = "default";
    profileDraft.coverMode = "cover";
    renderProfileSettings();
  });
  elements.coverModeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cover-mode]");
    if (!button) return;
    profileDraft.coverMode = button.dataset.coverMode;
    renderProfileSettings();
  });
  elements.uploadSidebarCoverButton.addEventListener("click", () => elements.sidebarCoverUpload.click());
  elements.sidebarCoverUpload.addEventListener("change", handleSidebarCoverUpload);
  elements.resetSidebarCoverButton.addEventListener("click", () => {
    const previousProfile = { ...profile };
    profile = { ...profile, coverType: "default", coverValue: "default", coverMode: "cover" };
    if (saveProfile()) showToast("已经恢复默认顶部封面。");
    else profile = previousProfile;
  });
  elements.profileTitleInput.addEventListener("input", () => {
    profileDraft.title = elements.profileTitleInput.value;
  });
  elements.profileSubtitleInput.addEventListener("input", () => {
    profileDraft.subtitle = elements.profileSubtitleInput.value;
  });
  elements.profileStatusInput.addEventListener("input", () => {
    profileDraft.status = elements.profileStatusInput.value;
  });
  elements.avatarOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile-avatar]");
    if (button) selectDefaultAvatar(button.dataset.profileAvatar);
    const imageButton = event.target.closest("[data-profile-avatar-image]");
    if (imageButton) selectImageAvatar(imageButton.dataset.profileAvatarImage);
  });
  elements.confirmCancelButton.addEventListener("click", closeCustomConfirm);
  elements.confirmDeleteButton.addEventListener("click", confirmCustomAction);
  elements.customConfirm.addEventListener("click", (event) => {
    if (event.target.matches("[data-confirm-cancel]")) closeCustomConfirm();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.customConfirm.classList.contains("open")) {
      closeCustomConfirm();
    }
  });
  elements.homeEmotionList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-emotion]");
    if (deleteButton) {
      event.stopPropagation();
      deleteCustomEmotion(deleteButton.dataset.deleteEmotion);
      return;
    }
    if (event.target.closest("[data-open-all-quotes]")) {
      showAllQuotesView();
      return;
    }
    const emotionCard = event.target.closest("[data-open-emotion]");
    if (emotionCard) showEmotionView(emotionCard.dataset.openEmotion);
  });
  elements.homeEmotionList.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-open-emotion]")) {
      event.preventDefault();
      showEmotionView(event.target.dataset.openEmotion);
    }
  });
  elements.homeAllQuotesButton.addEventListener("click", showAllQuotesView);

  elements.customEmojiPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-emoji]");
    if (!button) return;
    selectedCustomEmoji = button.dataset.emoji;
    customIconImage = "";
    elements.customIconInput.value = "";
    elements.customIconPreview.textContent = "未选择图片";
    renderEmojiPicker();
  });
  elements.customIconInput.addEventListener("input", () => {
    if (elements.customIconInput.value.trim()) {
      customIconImage = "";
      elements.customIconPreview.textContent = "使用自定义符号";
      renderEmojiPicker();
    }
  });
  [elements.customIconInput, elements.customEmotionInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
  });
  elements.chooseCustomIconButton.addEventListener("click", () => elements.customIconUpload.click());
  elements.customIconUpload.addEventListener("change", handleCustomIconUpload);
  elements.addEmotionButton.addEventListener("click", addCustomEmotion);
  elements.homeFavoritesButton.addEventListener("click", showFavoritesView);
  elements.overviewAllQuotesButton.addEventListener("click", showAllQuotesView);
  elements.overviewFavoritesButton.addEventListener("click", showFavoritesView);
  elements.homeStatsButton.addEventListener("click", showStatsView);

  elements.emotionQuoteInput.addEventListener("input", () => updateCharCount("emotion"));
  elements.emotionVoiceButton.addEventListener("click", () => startVoiceInput("emotion"));
  elements.emotionPublishButton.addEventListener("click", addQuote);
  elements.newQuoteInput.addEventListener("input", () => updateCharCount("newQuote"));
  elements.newQuoteVoiceButton.addEventListener("click", () => startVoiceInput("newQuote"));
  elements.newQuotePublishButton.addEventListener("click", addQuoteFromNewView);
  elements.editQuoteInput.addEventListener("input", () => updateCharCount("edit"));
  elements.editQuoteInput.addEventListener("input", renderEditPreview);
  elements.editTagInput.addEventListener("input", renderEditPreview);
  elements.editEmotionSelect.addEventListener("change", renderEditPreview);
  elements.saveEditButton.addEventListener("click", saveEditedQuote);
  elements.cancelEditButton.addEventListener("click", () => returnFromEdit());
  elements.cancelEditTopButton.addEventListener("click", () => returnFromEdit());

  elements.allQuotesSearchInput.addEventListener("input", () => {
    allQuotesSearch = elements.allQuotesSearchInput.value.trim();
    renderAllQuotesView();
  });
  elements.clearAllQuotesSearchButton.addEventListener("click", () => {
    elements.allQuotesSearchInput.value = "";
    allQuotesSearch = "";
    renderAllQuotesView();
    elements.allQuotesSearchInput.focus();
  });
  elements.allQuotesFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quotes-filter]");
    if (!button) return;
    allQuotesFilter = button.dataset.quotesFilter;
    renderAllQuotesView();
  });

  elements.favoriteQuoteList.addEventListener("click", (event) => {
    if (event.target.closest("[data-empty-new-quote]")) showNewQuoteView();
    if (event.target.closest("[data-empty-all-quotes]")) showAllQuotesView();
    handleQuoteListClick(event);
  });
  elements.favoritesView.addEventListener("click", (event) => {
    if (event.target.closest(".favorites-guide [data-empty-new-quote]")) showNewQuoteView();
    if (event.target.closest(".favorites-guide [data-empty-all-quotes]")) showAllQuotesView();
  });
  [elements.emotionQuoteList, elements.allQuoteList]
    .forEach((list) => list.addEventListener("click", handleQuoteListClick));
}

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadData();
  loadProfile();
  bindEvents();
  renderProfile();
  renderHome();
  updateCharCount("emotion");
  updateCharCount("newQuote");
  updateCharCount("edit");
  setActiveView("home");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service Worker 注册失败：", error);
    });
  });
}
