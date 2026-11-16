const $ = (selector, root = document) => root.querySelector(selector);

const CONFIG = window.TRYON_CONFIG || { apiBase: "", apiMode: "hf-zero-gpu" };
const PROFILE_KEY = "tryon-profile-v2";
const PREFS_KEY = "tryon-prefs-v2";
const DB_NAME = "tryon-local-v2";
const DB_STORE = "assets";
const AVATAR_API_BASE = "https://briaai-bria-rmbg-2-0.hf.space";
const AVATAR_CPU_FALLBACK = "https://namelessai-rembg.hf.space";
const AVATAR_GENERATOR_BASE = "https://kulkas2pintu-qwen-edit-image.hf.space";
const HF_OAUTH_CLIENT_ID = "https://u2zqev.com.cn/.well-known/oauth-cimd";
const HF_OAUTH_REDIRECT = "https://u2zqev.com.cn/tryon/";
const HF_OAUTH_SCOPES = "openid profile inference-api";
const HF_AUTH_SESSION_KEY = "tryon-hf-auth-v1";
const HF_AUTH_DRAFT_KEY = "tryon-hf-auth-draft-v1";
const HF_AUTH_DRAFT_PERSON_KEY = "tryon-hf-auth-draft-person-v1";

const state = {
  screen: "welcome",
  activeTab: "home",
  history: [],
  booting: true,
  profileReady: false,
  usingDemo: false,
  onboarding: false,
  resumeTryOn: false,
  garmentType: "top",
  garmentSubtype: "jacket",
  garmentPhotoMode: "flat",
  productName: "短款翻领夹克",
  productSrc: "assets/garment-clean.webp",
  productOriginalSrc: "assets/garment-clean.webp",
  cropZoom: 1,
  cropX: 0,
  cropY: 0,
  cropApplied: false,
  personSrc: "",
  personOriginalSrc: "",
  personCropZoom: 1,
  personCropX: 0,
  personCropY: 0,
  singlePersonConfirmed: false,
  productCleaned: false,
  productCleaning: false,
  resultSrc: "assets/result-main.webp",
  generationError: "",
  requestId: "",
  generationRunning: false,
  avatarRunning: false,
  avatarError: "",
  avatarErrorRaw: "",
  currentJob: null,
  queueMessage: "正在连接免费 GPU…",
  queuePosition: null,
  queueEta: null,
  progress: 0,
  avatarProgress: 0,
  avatarFingerprint: "",
  hfToken: "",
  hfTokenExpiresAt: 0,
  hfUser: null,
  authError: "",
  justLoggedIn: false,
  hfLoginUrl: "",
  gender: "female",
  bodyShape: "balanced",
  bodyData: { height: "165", weight: "50", shoulder: "38", chest: "82", waist: "64", hip: "88" },
  favorite: false,
  wardrobeFilter: "全部",
  wardrobeSection: "tryons",
  userName: "我的账号",
  stylePrefs: ["简约", "通勤"],
  records: [],
  consent: true
};

const mainScreens = ["home", "wardrobe", "profile"];
const screenTitles = {
  upload: "上传商品",
  recognition: "商品识别",
  category: "选择服装类型",
  bodyData: "身体数据",
  avatarGenerating: "生成个人形象",
  avatarError: "形象生成失败",
  avatarResult: "个人形象确认",
  personUpload: "上传个人照片",
  personCrop: "裁剪个人照片",
  photoGuide: "拍照指南与确认",
  confirm: "试穿设置确认",
  generating: "AI 试穿生成",
    generationError: "生成失败",
  result: "试穿结果",
  compare: "对比与细节",
  saved: "保存与整理",
  wardrobe: "我的衣橱",
  stylePrefs: "风格偏好",
  profile: "我的",
  settings: "设置与账号管理"
};

const garmentLabels = { top: "上衣", bottom: "下装", dress: "连体服" };
const garmentSubtypes = {
  top: [["knit", "毛衣 / 针织衫"], ["jacket", "外套 / 夹克"], ["shirt", "衬衫"], ["hoodie", "卫衣"], ["tshirt", "T恤 / 背心"], ["other-top", "其他上衣"]],
  bottom: [["pants", "长裤"], ["skirt", "半身裙"], ["shorts", "短裤"], ["other-bottom", "其他下装"]],
  dress: [["dress", "连衣裙"], ["jumpsuit", "连体裤"], ["other-dress", "其他连体服"]]
};
const garmentSubtypeLabel = key => Object.values(garmentSubtypes).flat().find(([value]) => value === key)?.[1] || "待确认款式";
const icon = (name) => ({
  home: "⌂", tryon: "⌁", wardrobe: "◇", profile: "♙",
  upload: "▧", shirt: "♧", hanger: "⌁", closet: "▱"
}[name] || "·");

function go(screen, options = {}) {
  if (options.replace !== true && state.screen !== screen) state.history.push(state.screen);
  state.screen = screen;
  if (mainScreens.includes(screen)) state.activeTab = screen;
  if (screen === "upload") state.activeTab = "tryon";
  render();
}

function back() {
  const previous = state.history.pop();
  state.screen = previous || "home";
  if (mainScreens.includes(state.screen)) state.activeTab = state.screen;
  render();
}

function renderHeader() {
  const header = $("#appHeader");
  if (state.screen === "welcome") {
    header.style.display = "none";
    return;
  }
  header.style.display = "flex";
  const isHome = state.screen === "home";
  const isMain = mainScreens.includes(state.screen);
  header.innerHTML = isHome ? `
    <div class="header-side"><div class="header-title">TRY ON｜试一试</div></div>
    <div class="mini-program-pill" aria-label="应用菜单"><span>•••</span><span>◉</span></div>` : `
    <div class="header-side">
      ${isMain ? "" : `<button class="icon-btn" data-action="back" aria-label="返回">‹</button>`}
    </div>
    <div class="header-title small">${screenTitles[state.screen] || "TRY ON"}</div>
    <div class="header-side right">
      <button class="mini-program-pill" data-action="more" aria-label="更多操作"><span>•••</span><span>◉</span></button>
    </div>`;
}

function renderBottomNav() {
  const nav = $("#bottomNav");
  const visible = mainScreens.includes(state.screen);
  nav.classList.toggle("show", visible);
  if (!visible) { nav.innerHTML = ""; return; }
  const items = [
    ["home", "首页", "⌂"],
    ["tryon", "试穿", "⌁"],
    ["wardrobe", "衣橱", "▱"],
    ["profile", "我的", "♙"]
  ];
  nav.innerHTML = items.map(([key, label, symbol]) => `
    <button class="nav-item ${state.activeTab === key ? "active" : ""}" data-tab="${key}" aria-label="${label}">
      <span class="nav-icon">${symbol}</span><span>${label}</span>
    </button>`).join("");
}

function render() {
  renderHeader();
  renderBottomNav();
  const content = $("#appContent");
  content.className = "app-content" + (mainScreens.includes(state.screen) ? " has-nav" : "") + (state.screen === "welcome" ? " welcome-scroll" : "");
  const pages = {
    welcome: welcomePage,
    home: homePage,
    upload: uploadPage,
    recognition: recognitionPage,
    category: categoryPage,
    bodyData: bodyDataPage,
    avatarGenerating: avatarGeneratingPage,
    avatarError: avatarErrorPage,
    avatarResult: avatarResultPage,
    personUpload: personUploadPage,
    personCrop: personCropPage,
    photoGuide: photoGuidePage,
    confirm: confirmPage,
    generating: generatingPage,
    generationError: generationErrorPage,
    result: resultPage,
    compare: comparePage,
    saved: savedPage,
    wardrobe: wardrobePage,
    stylePrefs: stylePrefsPage,
    profile: profilePage,
    settings: settingsPage
  };
  content.innerHTML = (pages[state.screen] || homePage)();
  content.scrollTop = 0;
  bindInputs();
  if (state.screen === "generating" && !state.generationRunning) beginGeneration();
  if (state.screen === "avatarGenerating" && !state.avatarRunning) beginAvatarGeneration();
}

function welcomePage() {
  const hfName = state.hfUser?.preferred_username || state.hfUser?.name || "";
  return `<div class="splash">
    <div class="splash-brand">TRY ON｜试一试</div>
    <div class="splash-copy">
      <span class="micro-label">YOUR DIGITAL SELF</span>
      <h2>先建立你的<br>专属 AI 形象</h2>
      <p>上传正面全身照 · 保留真实人脸特征 · 后续反复试穿</p>
    </div>
    <img class="splash-model" src="assets/hero-young-v2.webp" alt="年轻时尚的AI试穿示例模特">
    <button class="primary-btn full" data-action="start">${state.profileReady ? "进入我的试穿空间" : "上传全身照，建立个人形象"} <span>›</span></button>
    ${state.hfToken ? `<div class="hf-welcome-status"><span>✓</span><b>${escapeHtml(hfName || "Hugging Face 免费账号")}</b><small>已使用免费账号额度</small></div>` : `<button class="hf-login-entry" data-action="hf-login"><b>◉ 免费账号登录</b><small>匿名约 2 分钟 → 免费账号约 5 分钟 GPU / 24小时</small></button>`}
  </div>`;
}

function homePage() {
  const avatar = state.personSrc || "assets/hero-young-v2.webp";
  return `<div class="home-hero">
    <img src="${avatar}" alt="我的个人试穿形象">
    <div class="home-hero-copy">
      <span class="hero-kicker">NEW · AI LOOK</span>
      <h2>AI试穿<br>发现更多穿搭灵感</h2>
      <p>${state.profileReady ? "个人形象已就绪 · 智能试穿 · 一键收藏" : "先建立个人形象 · 再开始智能试穿"}</p>
      <button class="mini-cta" data-action="start-flow">上传商品开始 ›</button>
    </div>
    <div class="hero-dots"><i></i><i></i><i></i></div>
  </div>
  <div class="quick-grid">
    <button class="quick-item" data-action="start-flow"><span>▧</span><b>截图上传</b></button>
    <button class="quick-item" data-action="start-flow"><span>♧</span><b>AI试穿</b></button>
    <button class="quick-item" data-action="smart-style"><span>✧</span><b>智能搭配</b></button>
    <button class="quick-item" data-action="open-wardrobe"><span>▱</span><b>我的衣橱</b></button>
  </div>
  <div class="section-head"><h3>穿搭灵感</h3><button data-action="open-wardrobe">查看全部 ›</button></div>
  <div class="look-row">
    ${lookCard("assets/inspire-urban-v2.webp", "都市通勤｜轻酷叠穿", "look-urban")}
    ${lookCard("assets/inspire-soft-v2.webp", "奶油柔光｜轻盈优雅", "look-soft")}
    ${lookCard("assets/inspire-cool-v2.webp", "先锋极简｜清冷克制", "look-cool")}
  </div>
  <div class="info-strip"><span>ⓘ</span><span>试穿结果为 AI 视觉预览，适合比较款式与风格，不代表实际尺码、面料或合身效果。</span></div>`;
}

function lookCard(src, text, id) {
  return `<button class="look-card" data-look="${id}"><img src="${src}" alt="${text}"><p>${text}</p><em>♡</em></button>`;
}

function uploadPage() {
  return `<div class="page-intro"><h2>选择一张<br>商品图片</h2><p>支持淘宝、京东、小红书等平台截图，系统会自动定位服装主体。</p></div>
  <label class="upload-zone" for="productFile">
    <input class="sr-only" id="productFile" type="file" accept="image/*" data-file="product">
    <div><div class="big-icon">▧</div><h3>相册上传商品截图</h3><p>JPG、PNG，建议图片主体清晰</p></div>
  </label>
  <div class="option-list">
    <button class="option-row featured" data-action="demo-product"><span class="row-icon">✦</span><span><b>使用示例商品体验</b><small>无需上传，快速走完完整流程</small></span><span class="chev">›</span></button>
    <label class="option-row" for="cameraProduct"><input class="sr-only" id="cameraProduct" type="file" accept="image/*" capture="environment" data-file="product"><span class="row-icon">◎</span><span><b>拍照上传</b><small>请将单件服装完整放入画面</small></span><span class="chev">›</span></label>
    <button class="option-row" data-action="history-product"><span class="row-icon">◷</span><span><b>历史商品</b><small>查看已上传的商品</small></span><span class="chev">›</span></button>
  </div>
  <div class="info-strip"><span>ⓘ</span><span>上传前可裁剪商品区域。若自动识别不准确，你可以手动修改服装类别。</span></div>`;
}

function recognitionPage() {
  return `<div class="crop-instruction"><b>拖动图片调整位置</b><span>双指缩放，或使用下方滑杆</span></div>
  <div class="recognition-visual crop-editor-stage" data-crop-stage>
    <img id="cropImage" src="${state.productOriginalSrc || state.productSrc}" alt="待裁剪的商品图片" draggable="false" style="transform:translate3d(${state.cropX}px,${state.cropY}px,0) scale(${state.cropZoom})">
    <div class="crop-box" aria-hidden="true"><i class="crop-handle tl"></i><i class="crop-handle tr"></i><i class="crop-handle bl"></i><i class="crop-handle br"></i></div>
  </div>
  <div class="crop-controls">
    <span>−</span><input id="cropZoom" type="range" min="1" max="3" step="0.02" value="${state.cropZoom}" aria-label="裁剪缩放"><span>＋</span>
    <button class="chip outline" data-action="recrop">重置</button>
  </div>
  <div class="recognition-card">
    <div class="confidence"><b>✧ 商品区域与来源确认</b><span>${state.cropApplied ? "已裁剪" : "待确认"}</span></div>
    <div class="result-item"><img src="${state.productSrc}" alt="识别出的商品"><div><h4>${state.productName}</h4><div class="chips"><span class="chip">${garmentLabels[state.garmentType]}</span><span class="chip">${garmentSubtypeLabel(state.garmentSubtype)}</span><button class="chip outline" data-action="edit-recognition">修改款式</button></div></div></div>
    <div class="source-confirm"><b>图片中服装的呈现方式</b><div class="segment-control"><button class="${state.garmentPhotoMode === "worn" ? "active" : ""}" data-garment-photo-mode="worn">模特上身图</button><button class="${state.garmentPhotoMode === "flat" ? "active" : ""}" data-garment-photo-mode="flat">单件商品图</button></div><p>${state.garmentPhotoMode === "worn" ? "模型会先从人物身上提取所选服装，人物和包袋不会作为商品输入。" : "适用于平铺、挂拍或白底单件服装图。"}</p></div>
    <div class="button-row"><button class="ghost-btn" data-action="person-reselect-product">重新选择</button><button class="primary-btn" data-action="recognition-next">使用此裁剪 ›</button></div>
  </div>`;
}

function categoryPage() {
  return `<div class="page-intro"><h2>选择要试穿的<br>服装类型</h2><p>确认分类可以帮助模型保持更自然的服装结构。</p></div>
  <div class="category-grid">
    ${categoryCard("top", "♧", "上衣")}
    ${categoryCard("bottom", "♜", "下装")}
    ${categoryCard("dress", "♙", "连体服")}
  </div>
  <div class="subtype-card"><b>确认具体款式</b><p>截图识别可能受模特、包袋和叠穿影响，请以商品本身为准。</p><div class="chips subtype-chips">${garmentSubtypes[state.garmentType].map(([key, label]) => `<button class="chip ${state.garmentSubtype === key ? "active" : ""}" data-garment-subtype="${key}">${label}</button>`).join("")}</div></div>
  <div class="selected-product"><h3>已选择的商品</h3><div class="product-summary"><img src="${state.productSrc}" alt="${state.productName}"><div><h4>${state.productName}</h4><p>${garmentLabels[state.garmentType]}｜${state.productCleaned ? "背景已净化" : state.garmentPhotoMode === "worn" ? "将从模特图提取" : "已完成裁剪"}</p></div><span class="chev">›</span></div></div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="category-next">下一步</button></div>`;
}

function categoryCard(type, symbol, label) {
  return `<button class="category-card ${state.garmentType === type ? "active" : ""}" data-category="${type}"><span class="garment-symbol">${symbol}</span><b>${label}</b></button>`;
}

function bodyDataPage() {
  const d = state.bodyData;
  return `<div class="flow-steps" aria-label="个人形象生成步骤"><span class="done">1</span><i></i><span class="active">2</span><i></i><span>3</span><small>商品确认</small><small>身体数据</small><small>生成形象</small></div>
  <div class="page-intro body-intro"><span class="micro-label">DIGITAL BODY PROFILE</span><h2>建立你的<br>数字身形</h2><p>填写基础身体数据，AI 将生成一张可重复使用的个人全身照。</p></div>
  <div class="data-card">
    <div class="form-label">性别</div>
    <div class="segment-control"><button class="${state.gender === "female" ? "active" : ""}" data-gender="female">女性</button><button class="${state.gender === "male" ? "active" : ""}" data-gender="male">男性</button></div>
    <div class="form-grid two-col">
      ${bodyInput("height", "身高", d.height, "cm")}
      ${bodyInput("weight", "体重", d.weight, "kg")}
    </div>
    <div class="form-label spaced">身形特征</div>
    <div class="shape-options">
      ${shapeOption("slim", "纤细")}${shapeOption("balanced", "匀称")}${shapeOption("curvy", "曲线")}${shapeOption("athletic", "健体")}
    </div>
  </div>
  <div class="data-card measurement-card">
    <div class="card-title"><div><b>精细数据</b><small>选填 · 可提升形象匹配度</small></div><span>CM</span></div>
    <div class="form-grid three-col">
      ${bodyInput("shoulder", "肩宽", d.shoulder, "")}
      ${bodyInput("chest", "胸围", d.chest, "")}
      ${bodyInput("waist", "腰围", d.waist, "")}
    </div>
    <div class="form-grid two-col compact-top">
      ${bodyInput("hip", "臀围", d.hip, "")}
      <button class="measure-help" data-action="measure-help"><span>⌁</span><b>如何测量</b><small>查看图示</small></button>
    </div>
  </div>
  <div class="privacy-line"><span>▣</span><p>身体数据仅用于本次数字形象与试穿预览，你可以随时删除。</p></div>
  ${state.authError ? `<div class="hf-inline-status error"><span>!</span><p><b>免费账号登录未完成</b><small>${escapeHtml(state.authError)}</small></p><button data-action="hf-login">重新登录</button></div>` : state.hfToken ? `<div class="hf-inline-status"><span>✓</span><p><b>免费账号已登录</b><small>本次生成将使用你的 Hugging Face 免费额度</small></p></div>` : ""}
  <div class="sticky-actions"><button class="primary-btn full fashion-btn" data-action="generate-avatar">✦ 生成我的个人全身照</button></div>`;
}

function bodyInput(field, label, value, unit) {
  return `<label class="data-field"><span>${label}</span><div><input inputmode="decimal" type="number" min="0" value="${value}" data-body-field="${field}" aria-label="${label}">${unit ? `<em>${unit}</em>` : ""}</div></label>`;
}

function shapeOption(key, label) {
  return `<button class="shape-option ${state.bodyShape === key ? "active" : ""}" data-shape="${key}"><i></i><span>${label}</span></button>`;
}

function avatarGeneratingPage() {
  return `<div class="avatar-generation">
    <div class="scan-frame photo-scan">${state.personOriginalSrc || state.personSrc ? `<img src="${state.personOriginalSrc || state.personSrc}" alt="正在建立的个人形象">` : `<div class="scan-silhouette">♙</div>`}<i></i><span></span></div>
    <span class="micro-label">AI BODY PROFILE</span>
    <h2>正在建立你的<br>个人数字形象</h2>
    <p id="avatarStatus">AI 正在提取人物并生成白底数字形象，请保持页面打开</p>
    <div class="progress-wrap"><div class="progress-track"><div id="avatarProgressBar" class="progress-bar" style="width:${state.avatarProgress}%"></div></div><span id="avatarProgressNum" class="progress-num">${state.avatarProgress}%</span></div>
    <div class="generation-tags"><span>照片优化</span><span>数据建档</span><span>形象确认</span></div>
    <div class="info-strip"><span>✦</span><span>数字形象用于穿搭预览，不代表精确的人体测量或尺码建议。</span></div>
  </div>`;
}

async function beginAvatarGeneration() {
  state.avatarRunning = true;
  state.avatarError = "";
  state.avatarErrorRaw = "";
  state.avatarProgress = 6;
  let step = 0;
  const timer = setInterval(() => {
    if (state.screen !== "avatarGenerating") { state.avatarRunning = false; return clearInterval(timer); }
    step += 1;
    state.avatarProgress = Math.min(86, Math.round(8 + step * 2.8 + Math.sin(step) * 2));
    const bar = $("#avatarProgressBar");
    const num = $("#avatarProgressNum");
    if (bar) bar.style.width = `${state.avatarProgress}%`;
    if (num) num.textContent = `${state.avatarProgress}%`;
  }, 420);
  try {
    const source = state.personOriginalSrc || state.personSrc;
    const expectedFingerprint = await computeAvatarFingerprint(source);
    if (state.profileReady && state.avatarFingerprint === expectedFingerprint && state.personSrc) {
      const status = $("#avatarStatus");
      if (status) status.textContent = "照片与身体数据没有变化，正在读取已缓存的数字形象…";
      state.avatarProgress = 100;
      await delay(350);
      if (state.screen === "avatarGenerating") go("avatarResult", { replace: true });
      return;
    }
    state.personSrc = await createDigitalAvatar(source);
    state.avatarFingerprint = expectedFingerprint;
    state.avatarProgress = 100;
    const bar = $("#avatarProgressBar");
    const num = $("#avatarProgressNum");
    if (bar) bar.style.width = "100%";
    if (num) num.textContent = "100%";
    state.profileReady = true;
    await saveProfile();
    await delay(300);
    if (state.screen === "avatarGenerating") go("avatarResult", { replace: true });
  } catch (error) {
    state.avatarError = friendlyAvatarError(error);
    state.avatarErrorRaw = String(error?.message || error || "UNKNOWN_AVATAR_ERROR");
    state.profileReady = false;
    if (state.screen === "avatarGenerating") go("avatarError", { replace: true });
  } finally {
    clearInterval(timer);
    state.avatarRunning = false;
  }
}

function avatarErrorPage() {
  return `<div class="generation error-state"><div class="error-orbit">!</div><span class="micro-label">AVATAR GENERATION STOPPED</span><h2>正面数字形象<br>还没有生成成功</h2><p>${escapeHtml(state.avatarError || "AI 服务暂时不可用，请稍后重试。")}</p><div class="tips-card"><h4>本次不会把简单抠图冒充 AI 形象</h4><p>✓ 将使用生成式模型补全缺失身体并调整为正面站姿</p><p>✓ 请保持当前页面打开并使用稳定 Wi-Fi</p><p>✓ 面部越清晰，身份特征越稳定</p>${state.avatarErrorRaw ? `<details><summary>查看错误代码</summary><code>${escapeHtml(state.avatarErrorRaw)}</code></details>` : ""}</div><div class="button-row"><button class="ghost-btn" data-action="person-reselect">更换照片</button><button class="primary-btn" data-action="retry-avatar">重新生成</button></div></div>`;
}

function avatarResultPage() {
  const shapeName = { slim: "纤细", balanced: "匀称", curvy: "曲线", athletic: "健体" }[state.bodyShape];
  return `<div class="avatar-result">
    <div class="avatar-stage"><img src="${state.personSrc}" alt="我的个人AI全身形象"><span>MY DIGITAL SELF</span><button data-action="favorite-avatar">♡</button></div>
    <div class="avatar-result-copy"><span class="success-pill">✓ 正面数字形象已生成</span><h2>你好，这是你的<br>数字试穿形象</h2><p>AI 已补全画面、调整为正面站姿并生成白底全身照；请确认人脸与身形后再用于试穿。</p></div>
    <div class="avatar-data-row"><span><b>${state.bodyData.height}</b> cm<small>身高</small></span><span><b>${state.bodyData.weight}</b> kg<small>体重</small></span><span><b>${shapeName}</b><small>身形</small></span></div>
    <div class="button-row"><button class="ghost-btn" data-action="avatar-adjust">调整数据</button><button class="primary-btn fashion-btn" data-action="avatar-use">使用此形象 ›</button></div>
    <button class="text-action" data-action="avatar-upload-photo">更换真人全身照</button>
  </div>`;
}

function personUploadPage() {
  return `<div class="flow-steps" aria-label="个人形象建立步骤"><span class="active">1</span><i></i><span>2</span><i></i><span>3</span><small>上传照片</small><small>身体数据</small><small>完成形象</small></div>
  <div class="page-intro"><span class="micro-label">FACE & BODY IDENTITY</span><h2>上传一张<br>清晰个人照片</h2><p>AI 会补全缺失身体并调整为正面白底全身照；面部越清晰，身份特征越稳定。</p></div>
  <label class="upload-zone" for="personFile"><input class="sr-only" id="personFile" type="file" accept="image/*" data-file="person"><div><div class="big-icon">▧</div><h3>上传全身照</h3><p>支持 JPG、PNG，建议正面 3:4</p></div></label>
  <div class="option-list">
    <button class="option-row featured" data-action="demo-person"><span class="row-icon">✦</span><span><b>先用示例照片体验</b><small>仅用于查看流程，不会成为你的真人档案</small></span><span class="chev">›</span></button>
    <label class="option-row" for="cameraPerson"><input class="sr-only" id="cameraPerson" type="file" accept="image/*" capture="user" data-file="person"><span class="row-icon">◎</span><span><b>拍照</b><small>打开前置相机拍摄</small></span><span class="chev">›</span></label>
    <button class="option-row" data-action="privacy"><span class="row-icon">▣</span><span><b>照片用途与隐私说明</b><small>了解处理、保存与删除方式</small></span><span class="chev">›</span></button>
  </div>`;
}

function personCropPage() {
  return `<div class="page-intro compact-intro"><span class="micro-label">SINGLE PERSON CROP</span><h2>只保留你本人</h2><p>拖动和缩放照片，让头部、身体和双脚进入引导框。请排除海报、屏幕或其他照片中的人脸。</p></div>
  <div class="person-crop-stage" data-person-crop-stage>
    <img id="personCropImage" src="${state.personOriginalSrc || state.personSrc}" alt="待裁剪的个人全身照" draggable="false" style="transform:translate3d(${state.personCropX}px,${state.personCropY}px,0) scale(${state.personCropZoom})">
    <div class="body-guide" aria-hidden="true"><i class="head-guide"></i><i class="body-guide-line"></i><span>头部</span><em>双脚</em></div>
    <div class="crop-warning">画面中只能出现你本人</div>
  </div>
  <div class="crop-controls person-controls"><span>−</span><input id="personCropZoom" type="range" min="1" max="4" step="0.02" value="${state.personCropZoom}" aria-label="人物裁剪缩放"><span>＋</span><button class="chip outline" data-action="reset-person-crop">重置</button></div>
  <div class="identity-note warning-note"><b>照片要求</b><p>正面站立、双臂与身体分开、无遮挡、光线均匀。背景中的明星海报、电视画面和镜子人像都会导致识别错误。</p></div>
  <div class="button-row"><button class="ghost-btn" data-action="person-reselect">重新选择</button><button class="primary-btn" data-action="apply-person-crop">确认单人裁剪 ›</button></div>`;
}

function photoGuidePage() {
  return `<div class="page-intro"><h2>确认照片符合<br>试穿要求</h2><p>清晰的正面全身照可以获得更稳定的预览效果。</p></div>
  <div class="guide-grid">
    ${guideShot(state.personSrc, "✓ 正确示例", "good", "center")}
    ${guideShot(state.personSrc, "× 半身", "bad", "top")}
    ${guideShot(state.personSrc, "× 角度偏侧", "bad", "right")}
    ${guideShot(state.personSrc, "× 光线过暗", "bad", "bottom")}
  </div>
  <div class="check-list">
    <div class="check-item"><span>♙</span><b>正面</b><span>面向镜头，姿态自然</span><i class="check-ok">●</i></div>
    <div class="check-item"><span>♜</span><b>全身</b><span>完整展示从头到脚</span><i class="check-ok">●</i></div>
    <div class="check-item"><span>☀</span><b>光线充足</b><span>光线均匀，面部清晰</span><i class="check-ok">●</i></div>
    <div class="check-item"><span>▧</span><b>背景简洁</b><span>纯色或简洁墙面</span><i class="check-ok">●</i></div>
  </div>
  <div class="selected-photo"><img src="${state.personSrc}" alt="已选择的个人照片"><div><b>照片已确认</b><p>✓ 将用于保留身份特征</p></div></div>
  <div class="identity-note"><b>人脸一致性提示</b><p>请确保面部无遮挡、无重度美颜、光线均匀。换装服务会保留原图人物，但生成式模型仍可能轻微改变五官或发丝。</p></div>
  <button class="single-person-check ${state.singlePersonConfirmed ? "active" : ""}" data-action="toggle-single-person"><span>${state.singlePersonConfirmed ? "✓" : ""}</span><b>确认裁剪画面中只有我本人一张脸</b></button>
  <div class="button-row"><button class="ghost-btn" data-action="back-to-person-crop">重新裁剪</button><button class="primary-btn ${state.singlePersonConfirmed ? "" : "disabled"}" data-action="photo-next">确认照片并填写数据</button></div>`;
}

function guideShot(src, label, cls, pos) {
  return `<div class="guide-shot ${cls}"><img src="${src}" alt="${label}" style="object-position:${pos}"><small>${label}</small></div>`;
}

function confirmPage() {
  return `<div class="page-intro"><h2>确认试穿设置</h2><p>已选商品与个人数字形象确认无误后，即可开始生成。</p></div>
  <div class="pair-grid">
    <div class="pair-card"><img src="${state.productSrc}" alt="试穿商品"><b>试穿商品</b><small>${state.productName}</small></div>
    <div class="pair-plus">＋</div>
    <div class="pair-card"><img src="${state.personSrc}" alt="个人数字形象"><b>个人形象</b><small>AI数字全身照</small></div>
  </div>
  <div class="setting-list">
    <div class="setting-row"><span>♧</span><span>服装类型</span><b>${garmentSubtypeLabel(state.garmentSubtype)} ›</b></div>
    <div class="setting-row"><span>▧</span><span>商品来源</span><b>${state.garmentPhotoMode === "worn" ? "模特上身图 · 自动提取" : "单件商品图"}</b></div>
    <button class="setting-row" data-action="avatar-adjust"><span>♙</span><span>身体数据</span><b>${state.bodyData.height} cm · ${state.bodyData.weight} kg ›</b></button>
    <button class="setting-row" data-action="style-pref"><span>♙</span><span>风格偏好</span><b>${state.stylePrefs.join(" · ") || "未设置"} ›</b></button>
    <div class="setting-row"><span>✧</span><span>生成预览</span><b>标准（1张） ›</b></div>
  </div>
  <div class="info-strip"><span>ⓘ</span><span>将调用 Hugging Face ZeroGPU 上的开源真实试穿模型。匿名免费额度有限，高峰期可能需要排队。</span></div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="generate">✧ 开始 AI 试穿</button></div>`;
}

function generatingPage() {
  return `<div class="generation">
    <div class="orbit"><div class="orbit-core">⌁</div></div>
    <h2>AI 正在生成试穿效果…</h2>
    <p id="queueStatus">${escapeHtml(state.queueMessage)}</p>
    <div class="progress-wrap"><div class="progress-track"><div id="progressBar" class="progress-bar" style="width:${state.progress}%"></div></div><span id="progressNum" class="progress-num">${state.progress}%</span></div>
    <div class="generation-meta"><span>◷ 当前状态<b id="queueDetail">${state.queuePosition ? `排队第 ${state.queuePosition} 位` : "连接中"}</b></span><i></i><span>▱ 生成张数<b>1 张预览图</b></span></div>
    <div class="tips-card"><h4>✧ 试穿小贴士</h4><p>✓ 清晰照片有助于保持人物特征</p><p>✓ 免费 GPU 高峰期会排队，页面会显示实时队列</p><p>✓ 视觉预览不等同于真实尺码与合身效果</p></div>
    <button class="text-action cancel-generation" data-action="cancel-generation">取消本次生成</button>
  </div>`;
}

function updateGenerationStatus() {
  const status = $("#queueStatus");
  const detail = $("#queueDetail");
  if (status) status.textContent = state.queueMessage;
  if (detail) detail.textContent = state.queuePosition ? `排队第 ${state.queuePosition} 位${state.queueEta ? ` · 约 ${state.queueEta} 秒` : ""}` : "GPU 处理中";
}

async function beginGeneration() {
  state.generationRunning = true;
  state.progress = 4;
  state.queueMessage = "正在连接免费 GPU…";
  state.queuePosition = null;
  state.queueEta = null;
  const timer = setInterval(() => {
    if (state.screen !== "generating") { clearInterval(timer); state.generationRunning = false; return; }
    state.progress = Math.min(88, state.progress + Math.max(1, Math.round((90 - state.progress) / 14)));
    const bar = $("#progressBar");
    const num = $("#progressNum");
    if (bar) bar.style.width = `${state.progress}%`;
    if (num) num.textContent = `${state.progress}%`;
  }, 650);
  try {
    const response = await callTryOnApi();
    state.queueMessage = "正在整理最终试穿结果…";
    updateGenerationStatus();
    state.resultSrc = response.image;
    state.requestId = response.requestId || "";
    state.progress = 100;
    const bar = $("#progressBar");
    const num = $("#progressNum");
    if (bar) bar.style.width = "100%";
    if (num) num.textContent = "100%";
    await delay(260);
    if (state.screen === "generating") go("result", { replace: true });
  } catch (error) {
    state.generationError = friendlyApiError(error);
    if (state.screen === "generating") go("generationError", { replace: true });
  } finally {
    clearInterval(timer);
    state.generationRunning = false;
  }
}

function generationErrorPage() {
  return `<div class="generation error-state"><div class="error-orbit">!</div><span class="micro-label">GENERATION STOPPED</span><h2>这次没有生成成功</h2><p>${escapeHtml(state.generationError || "服务暂时不可用，请稍后重试。")}</p><div class="tips-card"><h4>你可以检查</h4><p>✓ 具体款式是否选择正确</p><p>✓ 商品来源是否选对“模特上身图 / 单件商品图”</p><p>✓ 免费额度是否已恢复、当前网络是否稳定</p>${state.requestId ? `<p>请求编号：${escapeHtml(state.requestId)}</p>` : ""}</div><div class="button-row"><button class="ghost-btn" data-action="back-to-confirm">返回检查</button><button class="primary-btn" data-action="retry-generate">重新生成</button></div></div>`;
}

function resultPage() {
  return `<div class="result-view">
    <img src="${state.resultSrc}" alt="AI试穿视觉预览结果">
    <span class="result-badge">1 / 1 · AI视觉预览</span>
    <div class="floating-tools">
      <button data-action="favorite" aria-label="收藏">${state.favorite ? "♥" : "♡"}</button>
      <button data-action="download" aria-label="下载">⇩</button>
      <button data-action="compare" aria-label="对比">◫</button>
    </div>
  </div>
  <div class="result-actions">
    <button data-action="favorite"><b>${state.favorite ? "♥" : "♡"}</b><span>收藏</span></button>
    <button data-action="download"><b>⇩</b><span>下载</span></button>
    <button data-action="compare"><b>◫</b><span>对比</span></button>
    <button data-action="share"><b>↗</b><span>分享</span></button>
  </div>
  <div class="button-row"><button class="secondary-btn" data-action="again">↻ 再次生成</button><button class="primary-btn" data-action="save">▣ 保存到衣橱</button></div>
  <div class="ai-note">AI 可能改变部分纹理、结构与人物细节。本结果仅作为购买前的款式和风格参考。</div>`;
}

function comparePage() {
  return `<div class="tabs"><button class="tab-btn active">原图对比</button><button class="tab-btn">细节查看</button><button class="tab-btn">多角度</button></div>
  <div class="compare-grid"><img src="${state.productSrc}" alt="商品原图"><img src="${state.resultSrc}" alt="试穿效果"><button class="swap-button" data-action="swap">⇄</button></div>
  <div class="compare-labels"><span>商品原图</span><span>试穿效果</span></div>
  <div class="section-head" style="margin-top:18px"><h3>细节查看</h3><button>查看全部 ›</button></div>
  <div class="detail-row">
    ${detailCard("assets/garment-shirt.webp", "领口细节")}
    ${detailCard("assets/result-main.webp", "袖口细节")}
    ${detailCard("assets/result-main.webp", "腰线细节")}
    ${detailCard("assets/garment-shirt.webp", "面料纹理")}
  </div>
  <div class="section-head" style="margin-top:20px"><h3>判断提示</h3></div>
  <div class="info-strip"><span>✧</span><span>款式轮廓与配色可作为对比依据；纽扣、褶皱、纹理等细节请以原商品图为准。</span></div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="save">保存本次试穿</button></div>`;
}

function detailCard(src, label) {
  return `<button class="detail-card" data-action="detail"><img src="${src}" alt="${label}"><span>${label}</span></button>`;
}

function savedPage() {
  return `<div class="success-banner"><span class="success-icon">✓</span><b>试穿效果已保存到衣橱</b></div>
  <div class="save-summary"><img src="${state.resultSrc}" alt="本次试穿效果"><div><h3>本次试穿效果</h3><p>♧ ${state.productName}</p><p>♜ 深棕阔腿裤</p><p>记录于 刚刚</p></div></div>
  <div class="option-list">
    <button class="primary-btn full" data-action="open-wardrobe">▣ 查看我的衣橱</button>
    <button class="option-row featured" data-action="smart-style"><span class="row-icon">⌁</span><span><b>创建搭配</b><small>基于本套造型，生成搭配建议</small></span><span class="chev">›</span></button>
    <button class="option-row" data-action="again"><span class="row-icon">↻</span><span><b>再次生成</b><small>更换服装或风格，重新试穿</small></span><span class="chev">›</span></button>
  </div>
  <div class="section-head" style="margin-top:20px"><h3>你可能还想试试</h3><button>换一批 ↻</button></div>
  <div class="look-row">${lookCard("assets/inspire-urban-v2.webp", "轻酷夹克", "look-urban")}${lookCard("assets/inspire-soft-v2.webp", "奶油柔光", "look-soft")}${lookCard("assets/inspire-cool-v2.webp", "先锋极简", "look-cool")}</div>`;
}

function wardrobePage() {
  const tabs = [["tryons","我的试穿"],["items","我的单品"],["outfits","搭配方案"]];
  const tabBar = `<div class="tabs">${tabs.map(([key,label])=>`<button class="tab-btn ${state.wardrobeSection===key?"active":""}" data-wardrobe-tab="${key}">${label}</button>`).join("")}</div>`;
  if (state.wardrobeSection === "items") {
    const items = state.records.length ? state.records : [{product:state.productSrc,productName:state.productName,typeLabel:garmentLabels[state.garmentType]}];
    return `${tabBar}<div class="section-head"><h3>我的单品</h3><button data-action="start-flow">＋ 添加单品</button></div>
    <div class="wardrobe-grid">${items.map((item,i)=>`<button class="wardrobe-card item-card" data-item-record="${i}"><img src="${item.product || state.productSrc}" alt="${escapeHtml(item.productName || "服装单品")}"><span class="tag">${escapeHtml(item.typeLabel || "单品")}</span><span class="card-caption">${escapeHtml(item.productName || "已上传单品")}</span></button>`).join("")}</div>`;
  }
  if (state.wardrobeSection === "outfits") {
    return `${tabBar}<div class="section-head"><h3>搭配方案</h3><button data-action="smart-style">智能生成 ›</button></div>
    <div class="outfit-list">
      ${outfitCard("assets/inspire-urban-v2.webp","都市通勤","利落剪裁 · 中性色层次","简约 · 通勤")}
      ${outfitCard("assets/inspire-soft-v2.webp","奶油柔光","浅色叠穿 · 温柔质感","法式 · 简约")}
      ${outfitCard("assets/inspire-cool-v2.webp","先锋极简","黑灰对比 · 清冷轮廓","轻酷 · 中性")}
    </div>`;
  }
  const cards = state.wardrobeFilter === "全部" ? state.records : state.records.filter(item => item.typeLabel === state.wardrobeFilter || (state.wardrobeFilter === "连衣裙" && item.typeLabel === "连体服"));
  return `${tabBar}<div class="section-head"><h3>共 ${cards.length} 条试穿记录</h3><button data-action="manage">▣ 管理</button></div>
  <div class="filter-row">${["全部","上衣","下装","连衣裙"].map(x => `<button class="filter-pill ${state.wardrobeFilter===x?"active":""}" data-filter="${x}">${x}</button>`).join("")}</div>
  ${cards.length ? `<div class="wardrobe-grid">${cards.map((item, i) => `<button class="wardrobe-card" data-record-id="${item.id}"><img src="${item.result}" alt="${escapeHtml(item.productName)}试穿记录"><span class="tag">${escapeHtml(item.typeLabel || "试穿")}</span><span class="heart">${item.favorite?"♥":"♡"}</span></button>`).join("")}</div>` : `<div class="empty-state"><span>▱</span><h3>还没有试穿记录</h3><p>完成一次 AI 试穿并保存后，会出现在这里。</p><button class="primary-btn" data-action="start-flow">开始第一次试穿</button></div>`}`;
}

function outfitCard(src, title, desc, tags) {
  return `<button class="outfit-card" data-look="${src.includes("urban")?"look-urban":src.includes("soft")?"look-soft":"look-cool"}"><img src="${src}" alt="${title}"><span><b>${title}</b><small>${desc}</small><em>${tags}</em></span><i>›</i></button>`;
}

function stylePrefsPage() {
  const styles = [
    ["简约","干净线条与低饱和配色","MINIMAL"], ["通勤","利落剪裁与日常实穿","COMMUTE"],
    ["复古","经典廓形与温暖色调","RETRO"], ["中性","克制轮廓与松弛比例","UNISEX"],
    ["运动","轻量面料与活力层次","SPORT"], ["甜美","柔和细节与轻盈色彩","SWEET"],
    ["轻酷","深色对比与先锋配饰","COOL"], ["法式","自然优雅与松弛质感","FRENCH"]
  ];
  return `<div class="page-intro"><span class="micro-label">PERSONAL STYLE</span><h2>选择你的<br>日常穿搭偏好</h2><p>可选择 1–4 项，用于首页灵感与搭配方案推荐。</p></div>
  <div class="style-choice-grid">${styles.map(([name,desc,en])=>`<button class="style-choice ${state.stylePrefs.includes(name)?"active":""}" data-style-choice="${name}"><span>${state.stylePrefs.includes(name)?"✓":"＋"}</span><small>${en}</small><b>${name}</b><p>${desc}</p></button>`).join("")}</div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="save-style-prefs">保存风格偏好（${state.stylePrefs.length}/4）</button></div>`;
}

function profilePage() {
  const avatar = state.personSrc || "assets/hero-young-v2.webp";
  const hfName = state.hfUser?.preferred_username || state.hfUser?.name || "";
  return `<div class="profile-head"><img class="avatar" src="${avatar}" alt="我的头像"><div><h2>${escapeHtml(state.userName)} <span class="vip">${state.hfToken ? "免费账号" : "游客"}</span></h2><p>${state.profileReady ? "个人 AI 形象已建立" : "请先建立个人 AI 形象"}</p></div><button class="icon-btn" data-action="settings">›</button></div>
  <div class="hf-auth-card ${state.hfToken ? "connected" : ""}"><div><span class="hf-mark">HF</span><p><b>${state.hfToken ? escapeHtml(hfName || "Hugging Face 已登录") : "登录免费 Hugging Face 账号"}</b><small>${state.hfToken ? "约 5 分钟 GPU / 24小时 · 中等排队优先级" : "游客约 2 分钟，登录后提升至约 5 分钟"}</small></p></div><button data-action="${state.hfToken ? "hf-logout" : "hf-login"}">${state.hfToken ? "退出" : "免费登录"}</button></div>
  <div class="member-card"><div class="top"><h3>✦ 我的数字形象</h3><button data-action="photo-archive">${state.profileReady ? "管理形象" : "立即建立"} ›</button></div><div class="quota"><div><span>保存的试穿</span><b>${state.records.length} 次</b></div><div><span>AI 服务</span><b>${state.hfToken ? "免费账号额度" : CONFIG.apiBase ? "游客额度" : "等待连接"}</b></div></div></div>
  <div class="profile-stats">
    <button class="stat-card" data-action="open-wardrobe"><b>${state.records.filter(x=>x.favorite).length}</b><span>我的收藏</span></button>
    <button class="stat-card" data-action="style-pref"><b>${state.stylePrefs.length}</b><span>风格偏好</span></button>
    <button class="stat-card" data-action="open-wardrobe"><b>${state.records.length}</b><span>试穿记录</span></button>
  </div>
  <div class="menu-list">
    <button class="menu-item" data-action="body-profile"><span>♙</span><b>身体数据</b><small>${state.bodyData.height} cm · ${state.bodyData.weight} kg ›</small></button>
    <button class="menu-item" data-action="style-pref"><span>✦</span><b>风格偏好</b><small>${state.stylePrefs.join(" · ") || "未设置"} ›</small></button>
    <button class="menu-item" data-action="photo-archive"><span>▧</span><b>个人照片档案</b><small>${state.profileReady ? "已上传 1 张" : "未上传"} ›</small></button>
  </div>
  <div class="menu-list">
    <button class="menu-item" data-action="message"><span>♧</span><b>消息通知</b><small>暂无未读 ›</small></button>
    <button class="menu-item" data-action="privacy"><span>▣</span><b>隐私设置</b><small>›</small></button>
    <button class="menu-item" data-action="help"><span>?</span><b>帮助反馈</b><small>›</small></button>
  </div>`;
}

function settingsPage() {
  return `<div class="settings-section"><h3>照片与试穿记录</h3><div class="menu-list"><button class="menu-item" data-action="photo-archive"><span>▧</span><b>照片管理</b><small>${state.profileReady ? "共 1 张" : "暂无照片"} ›</small></button><button class="menu-item" data-action="clear-records"><span>♜</span><b>删除试穿记录</b><small>${state.records.length} 条，可批量清理 ›</small></button></div></div>
  <div class="settings-section"><h3>免费 AI 账号</h3><div class="menu-list"><button class="menu-item" data-action="${state.hfToken ? "hf-logout" : "hf-login"}"><span>HF</span><b>${state.hfToken ? "Hugging Face 已登录" : "登录 Hugging Face"}</b><small>${state.hfToken ? "免费账号额度 · 退出 ›" : "提升免费生成额度 ›"}</small></button></div></div>
  <div class="settings-section"><h3>隐私与安全</h3><div class="menu-list"><button class="menu-item" data-action="privacy"><span>▣</span><b>隐私与授权</b><small>相机、相册、数据权限 ›</small></button><button class="menu-item" data-action="account"><span>◉</span><b>账号与安全</b><small>手机号、密码、登录管理 ›</small></button></div></div>
  <div class="settings-section"><h3>服务与帮助</h3><div class="menu-list"><button class="menu-item" data-action="help"><span>?</span><b>客服帮助</b><small>在线咨询 · 常见问题 ›</small></button></div></div>
  <button class="danger-btn" data-action="delete-all-data">删除本机全部个人数据</button>
  <p style="text-align:center;color:#999;font-size:10px;margin-top:26px">TRY ON｜试一试　v2.0 正面形象与模特商品提取版</p>`;
}

function bindInputs() {
  document.querySelectorAll("input[data-file]").forEach(input => {
    input.addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return toast("请选择图片文件");
      toast("正在优化图片…");
      try {
        const dataUrl = await processImageFile(file);
        if (input.dataset.file === "product") {
          state.productOriginalSrc = dataUrl;
          state.productSrc = dataUrl;
          state.cropZoom = 1;
          state.cropX = 0;
          state.cropY = 0;
          state.cropApplied = false;
          state.garmentType = "top";
          state.garmentSubtype = "";
          state.garmentPhotoMode = "worn";
          state.productName = "待确认商品款式";
          go("recognition");
        } else {
          state.personOriginalSrc = dataUrl;
          state.personSrc = dataUrl;
          dbSet("hfAuthDraftPerson", dataUrl).catch(() => {});
          state.personCropZoom = 1;
          state.personCropX = 0;
          state.personCropY = 0;
          state.singlePersonConfirmed = false;
          state.usingDemo = false;
          state.profileReady = false;
          go("personCrop");
        }
      } catch (error) {
        toast(error.message || "图片处理失败，请换一张重试");
      }
    }, { once: true });
  });
  document.querySelectorAll("input[data-body-field]").forEach(input => {
    input.addEventListener("input", () => { state.bodyData[input.dataset.bodyField] = input.value; });
  });
  const cropStage = $("[data-crop-stage]");
  const cropImage = $("#cropImage");
  const cropZoom = $("#cropZoom");
  if (cropStage && cropImage) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = state.cropX;
    let originY = state.cropY;
    cropStage.addEventListener("pointerdown", event => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = state.cropX;
      originY = state.cropY;
      cropStage.setPointerCapture?.(event.pointerId);
    });
    cropStage.addEventListener("pointermove", event => {
      if (!dragging) return;
      state.cropX = originX + event.clientX - startX;
      state.cropY = originY + event.clientY - startY;
      cropImage.style.transform = `translate3d(${state.cropX}px,${state.cropY}px,0) scale(${state.cropZoom})`;
    });
    const stop = () => { dragging = false; };
    cropStage.addEventListener("pointerup", stop);
    cropStage.addEventListener("pointercancel", stop);
  }
  cropZoom?.addEventListener("input", () => {
    state.cropZoom = Number(cropZoom.value);
    if (cropImage) cropImage.style.transform = `translate3d(${state.cropX}px,${state.cropY}px,0) scale(${state.cropZoom})`;
  });
  const personStage = $("[data-person-crop-stage]");
  const personImage = $("#personCropImage");
  const personZoom = $("#personCropZoom");
  if (personStage && personImage) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = state.personCropX;
    let originY = state.personCropY;
    personStage.addEventListener("pointerdown", event => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = state.personCropX;
      originY = state.personCropY;
      personStage.setPointerCapture?.(event.pointerId);
    });
    personStage.addEventListener("pointermove", event => {
      if (!dragging) return;
      state.personCropX = originX + event.clientX - startX;
      state.personCropY = originY + event.clientY - startY;
      personImage.style.transform = `translate3d(${state.personCropX}px,${state.personCropY}px,0) scale(${state.personCropZoom})`;
    });
    const stopPersonDrag = () => { dragging = false; };
    personStage.addEventListener("pointerup", stopPersonDrag);
    personStage.addEventListener("pointercancel", stopPersonDrag);
  }
  personZoom?.addEventListener("input", () => {
    state.personCropZoom = Number(personZoom.value);
    if (personImage) personImage.style.transform = `translate3d(${state.personCropX}px,${state.personCropY}px,0) scale(${state.personCropZoom})`;
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomOauthValue(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function restoreHfSession() {
  try {
    const auth = JSON.parse(sessionStorage.getItem(HF_AUTH_SESSION_KEY) || "null");
    if (!auth?.accessToken || Number(auth.expiresAt || 0) <= Date.now() + 30000) {
      sessionStorage.removeItem(HF_AUTH_SESSION_KEY);
      return;
    }
    state.hfToken = auth.accessToken;
    state.hfTokenExpiresAt = Number(auth.expiresAt || 0);
    state.hfUser = auth.userInfo || null;
  } catch (error) {
    sessionStorage.removeItem(HF_AUTH_SESSION_KEY);
  }
}

function hfAuthHeaders(base, extra = {}) {
  const headers = { ...extra };
  if (!state.hfToken) return headers;
  try {
    const host = new URL(base, location.href).hostname;
    if (host === "huggingface.co" || host.endsWith(".hf.space")) {
      headers.Authorization = `Bearer ${state.hfToken}`;
    }
  } catch (error) {}
  return headers;
}

function saveHfLoginDraft() {
  const draft = {
    bodyData: state.bodyData,
    bodyShape: state.bodyShape,
    gender: state.gender,
    resumeTryOn: state.resumeTryOn,
    hasPerson: Boolean(state.personOriginalSrc || state.personSrc),
    updatedAt: Date.now()
  };
  localStorage.setItem(HF_AUTH_DRAFT_KEY, JSON.stringify(draft));
  if (draft.hasPerson) {
    const person = state.personOriginalSrc || state.personSrc;
    try { sessionStorage.setItem(HF_AUTH_DRAFT_PERSON_KEY, person); }
    catch (error) { dbSet("hfAuthDraftPerson", person).catch(() => {}); }
  }
}

async function restoreHfLoginDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(HF_AUTH_DRAFT_KEY) || "null");
    if (!draft || Date.now() - Number(draft.updatedAt || 0) > 60 * 60 * 1000) return;
    state.bodyData = { ...state.bodyData, ...(draft.bodyData || {}) };
    state.bodyShape = draft.bodyShape || state.bodyShape;
    state.gender = draft.gender || state.gender;
    state.resumeTryOn = Boolean(draft.resumeTryOn);
    const person = sessionStorage.getItem(HF_AUTH_DRAFT_PERSON_KEY) || await dbGet("hfAuthDraftPerson");
    if (person && !state.profileReady) {
      state.personOriginalSrc = person;
      state.personSrc = person;
      state.singlePersonConfirmed = true;
      state.screen = "bodyData";
      state.onboarding = true;
    }
    if (state.hfToken) {
      localStorage.removeItem(HF_AUTH_DRAFT_KEY);
      sessionStorage.removeItem(HF_AUTH_DRAFT_PERSON_KEY);
      await dbDelete("hfAuthDraftPerson");
    }
  } catch (error) {
    console.warn("HF login draft could not be restored", error);
  }
}

async function prepareHfLoginUrl() {
  const verifier = randomOauthValue(64);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const oauthState = randomOauthValue(24);
  sessionStorage.setItem("tryon-hf-code-verifier", verifier);
  sessionStorage.setItem("tryon-hf-oauth-state", oauthState);
  const params = new URLSearchParams({
    client_id: HF_OAUTH_CLIENT_ID,
    redirect_uri: HF_OAUTH_REDIRECT,
    response_type: "code",
    scope: HF_OAUTH_SCOPES,
    state: oauthState,
    code_challenge: base64Url(digest),
    code_challenge_method: "S256"
  });
  state.hfLoginUrl = `https://huggingface.co/oauth/authorize?${params}`;
  return state.hfLoginUrl;
}

function beginHfLogin() {
  state.authError = "";
  saveHfLoginDraft();
  if (state.hfLoginUrl) {
    location.href = state.hfLoginUrl;
    return Promise.resolve();
  }
  return prepareHfLoginUrl().then(url => { location.href = url; });
}

async function completeHfLoginIfPresent() {
  restoreHfSession();
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const oauthError = params.get("error");
  if (oauthError) {
    state.authError = params.get("error_description") || "Hugging Face 登录没有完成";
    history.replaceState(null, "", `${location.pathname}?v=20261116-fix13`);
    return;
  }
  if (!code) return;
  const expectedState = sessionStorage.getItem("tryon-hf-oauth-state");
  const verifier = sessionStorage.getItem("tryon-hf-code-verifier");
  if (!expectedState || returnedState !== expectedState || !verifier) throw new Error("HF_OAUTH_STATE_INVALID");
  const body = new URLSearchParams({
    client_id: HF_OAUTH_CLIENT_ID,
    code,
    grant_type: "authorization_code",
    redirect_uri: HF_OAUTH_REDIRECT,
    code_verifier: verifier
  });
  const tokenResponse = await fetch("https://huggingface.co/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || token.error || `HF_OAUTH_${tokenResponse.status}`);
  const userResponse = await fetch("https://huggingface.co/oauth/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  const userInfo = userResponse.ok ? await userResponse.json() : null;
  const expiresAt = Date.now() + Math.max(300, Number(token.expires_in || 28800)) * 1000;
  sessionStorage.setItem(HF_AUTH_SESSION_KEY, JSON.stringify({ accessToken: token.access_token, expiresAt, userInfo }));
  sessionStorage.removeItem("tryon-hf-code-verifier");
  sessionStorage.removeItem("tryon-hf-oauth-state");
  state.hfToken = token.access_token;
  state.hfTokenExpiresAt = expiresAt;
  state.hfUser = userInfo;
  state.authError = "";
  state.justLoggedIn = true;
  history.replaceState(null, "", `${location.pathname}?v=20261116-fix13`);
}

function logoutHf() {
  sessionStorage.removeItem(HF_AUTH_SESSION_KEY);
  state.hfToken = "";
  state.hfTokenExpiresAt = 0;
  state.hfUser = null;
}

async function computeAvatarFingerprint(source) {
  const profile = JSON.stringify({ source, bodyData: state.bodyData, bodyShape: state.bodyShape, gender: state.gender });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(profile));
  return base64Url(digest);
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 18 * 1024 * 1024) return reject(new Error("图片超过 18MB，请先压缩后上传"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取这张图片"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片格式暂不支持"));
      image.onload = () => {
        if (Math.min(image.width, image.height) < 512) return reject(new Error("图片过小，请选择单边大于 512px 的清晰照片"));
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadToGradio(base, blob, filename) {
  const form = new FormData();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  form.append("files", file);
  const response = await fetch(`${base.replace(/\/$/, "")}/gradio_api/upload`, {
    method: "POST",
    headers: hfAuthHeaders(base),
    body: form
  });
  if (!response.ok) throw new Error(`HF_UPLOAD_${response.status}`);
  const uploaded = await response.json();
  if (!Array.isArray(uploaded) || !uploaded[0]) throw new Error("HF_UPLOAD_EMPTY");
  return { path: uploaded[0], orig_name: filename, mime_type: file.type, meta: { _type: "gradio.FileData" } };
}

function parseSseBlock(block) {
  const event = (block.match(/^event:\s*(.+)$/m) || [])[1] || "message";
  const data = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("");
  return { event, data };
}

function formatApiErrorDetail(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); }
  catch (error) { return String(value); }
}

async function callGradioDirect(base, endpoint, data, options = {}) {
  const cleanBase = base.replace(/\/$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 240000);
  state.currentJob = { cancel: () => controller.abort() };
  try {
    const startResponse = await fetch(`${cleanBase}/gradio_api/call/${endpoint}`, {
      method: "POST",
      headers: hfAuthHeaders(cleanBase, { "Content-Type": "application/json" }),
      body: JSON.stringify({ data }),
      signal: controller.signal
    });
    const started = await startResponse.json().catch(() => ({}));
    if (!startResponse.ok || !started.event_id) {
      const detail = formatApiErrorDetail(started.detail || started.message);
      throw new Error(detail ? `HF_START_${startResponse.status}: ${detail}` : `HF_START_${startResponse.status}`);
    }
    state.requestId = started.event_id;
    options.onEvent?.("pending", null);
    const resultResponse = await fetch(`${cleanBase}/gradio_api/call/${endpoint}/${encodeURIComponent(started.event_id)}`, {
      headers: hfAuthHeaders(cleanBase, { Accept: "text/event-stream" }), signal: controller.signal
    });
    if (!resultResponse.ok) throw new Error(`HF_RESULT_${resultResponse.status}`);
    const reader = resultResponse.body?.getReader();
    if (!reader) {
      const text = await resultResponse.text();
      const blocks = text.trim().split(/\n\n+/);
      const complete = blocks.map(parseSseBlock).findLast?.(item => item.event === "complete") || blocks.map(parseSseBlock).reverse().find(item => item.event === "complete");
      if (!complete?.data) throw new Error("HF_INCOMPLETE_RESULT");
      return JSON.parse(complete.data);
    }
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\n\n+/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const parsed = parseSseBlock(block);
        options.onEvent?.(parsed.event, parsed.data);
        if (parsed.event === "error") {
          const detail = String(parsed.data || "").trim();
          throw new Error(!detail || detail === "null" ? "HF_GENERATION_FAILED" : detail);
        }
        if (parsed.event === "complete") return JSON.parse(parsed.data || "null");
      }
      if (done) break;
    }
    const tail = parseSseBlock(buffer);
    if (tail.event === "complete" && tail.data) return JSON.parse(tail.data);
    throw new Error("HF_INCOMPLETE_RESULT");
  } finally {
    clearTimeout(timeoutId);
    state.currentJob = null;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法处理这张图片"));
    image.src = src;
  });
}

async function applyProductCrop() {
  const source = state.productOriginalSrc || state.productSrc;
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const scale = baseScale * state.cropZoom;
  const stageWidth = $("[data-crop-stage]")?.clientWidth || 390;
  const offsetScale = canvas.width / stageWidth;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2 + state.cropX * offsetScale, (canvas.height - height) / 2 + state.cropY * offsetScale, width, height);
  state.productSrc = canvas.toDataURL("image/jpeg", 0.9);
  state.cropApplied = true;
}

async function applyPersonCrop() {
  const source = state.personOriginalSrc || state.personSrc;
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const scale = baseScale * state.personCropZoom;
  const stageWidth = $("[data-person-crop-stage]")?.clientWidth || 360;
  const offsetScale = canvas.width / stageWidth;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2 + state.personCropX * offsetScale, (canvas.height - height) / 2 + state.personCropY * offsetScale, width, height);
  const cropped = canvas.toDataURL("image/jpeg", 0.92);
  state.personOriginalSrc = cropped;
  state.personSrc = cropped;
  state.singlePersonConfirmed = false;
}

async function protectIdentityFace(resultSrc, identitySrc) {
  try {
    const [result, identity] = await Promise.all([loadImage(resultSrc), loadImage(identitySrc)]);
    const canvas = document.createElement("canvas");
    canvas.width = result.naturalWidth || 768;
    canvas.height = result.naturalHeight || 1024;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(result, 0, 0, canvas.width, canvas.height);
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const overlayCtx = overlay.getContext("2d");
    overlayCtx.drawImage(identity, 0, 0, canvas.width, canvas.height);
    overlayCtx.globalCompositeOperation = "destination-in";
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.135;
    const rx = canvas.width * 0.072;
    const ry = canvas.height * 0.06;
    overlayCtx.save();
    overlayCtx.translate(cx, cy);
    overlayCtx.scale(rx, ry);
    const feather = overlayCtx.createRadialGradient(0, 0, 0.55, 0, 0, 1);
    feather.addColorStop(0, "rgba(0,0,0,1)");
    feather.addColorStop(0.72, "rgba(0,0,0,.92)");
    feather.addColorStop(1, "rgba(0,0,0,0)");
    overlayCtx.fillStyle = feather;
    overlayCtx.beginPath();
    overlayCtx.arc(0, 0, 1, 0, Math.PI * 2);
    overlayCtx.fill();
    overlayCtx.restore();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(overlay, 0, 0);
    ctx.globalAlpha = 1;
    return canvas.toDataURL("image/jpeg", 0.93);
  } catch (error) {
    return resultSrc;
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractRemoteFile(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractRemoteFile(item);
      if (found) return found;
    }
  }
  return value.url || value.path || value.image?.url || value.image?.path || "";
}

async function compositeOnWhite(src) {
  let usableSrc = src;
  let objectUrl = "";
  if (/^https?:/i.test(src)) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("AVATAR_FILE_FETCH_FAILED");
    objectUrl = URL.createObjectURL(await response.blob());
    usableSrc = objectUrl;
  }
  const image = await loadImage(usableSrc);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width * 0.92 / image.naturalWidth, canvas.height * 0.94 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, canvas.height - height - 22, width, height);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function createDigitalAvatar(source) {
  if (!source) throw new Error("MISSING_PERSON_IMAGE");
  const status = $("#avatarStatus");
  if (status) status.textContent = "正在补全身体、调整正面站姿并保护人脸特征…";
  const blob = await fetch(source).then(response => response.blob());
  const uploaded = await uploadToGradio(AVATAR_GENERATOR_BASE, blob, "identity.jpg");
  const shape = { slim: "slim", balanced: "balanced", curvy: "curvy", athletic: "athletic" }[state.bodyShape] || "balanced";
  const prompt = [
    "Create a photorealistic studio full-body photograph of the exact same person.",
    "Turn the person to face the camera directly, standing straight in a neutral symmetrical pose with both arms slightly away from the torso.",
    "Complete all missing or cropped body parts naturally from head to toe, including both hands, legs and feet.",
    "Preserve the person's facial identity, facial proportions, skin tone, hairstyle and apparent age.",
    `Use the supplied body profile as a visual guide: height ${state.bodyData.height} cm, weight ${state.bodyData.weight} kg, ${shape} body shape.`,
    "Remove bags, handheld objects, posters, other people and background clutter.",
    "Dress the person in a plain fitted neutral gray short-sleeve top and fitted black shorts suitable as a virtual try-on base.",
    "Pure seamless white background, even soft studio lighting, realistic anatomy, natural hands, centered 3:4 composition, high detail."
  ].join(" ");
  const result = await callGradioDirect(
    AVATAR_GENERATOR_BASE,
    "edit",
    // Quota-saving mode: native 4-step inference at 1024px, one result only.
    // Face/hair locking remains enabled so identity stability is not traded away.
    [uploaded, prompt, "", null, 0, true, 1.0, 4, true, 90, 1024, false, true],
    { timeout: 300000 }
  );
  let file = extractRemoteFile(Array.isArray(result) ? result[0] : result);
  if (!file) throw new Error("AVATAR_GENERATIVE_EMPTY_RESULT");
  if (!/^https?:|^data:/i.test(file)) file = `${AVATAR_GENERATOR_BASE}/gradio_api/file=${encodeURIComponent(file)}`;
  return compositeOnWhite(file);
}

async function createWhiteBackgroundAvatar(source) {
  if (!source) throw new Error("MISSING_PERSON_IMAGE");
  const blob = await fetch(source).then(response => response.blob());
  const backends = [
    { base: AVATAR_API_BASE, endpoint: "image", data: uploaded => [uploaded], pick: result => result?.[1] || result?.[0], timeout: 90000, label: "主通道" },
    { base: AVATAR_CPU_FALLBACK, endpoint: "update_ui", data: uploaded => [uploaded, "PNG"], pick: result => result?.[1] || result?.[0], timeout: 180000, label: "备用 CPU 通道" }
  ];
  const failures = [];
  for (const backend of backends) {
    try {
      const status = $("#avatarStatus");
      if (status) status.textContent = `${backend.label}正在提取人物，请保持页面打开…`;
      const uploaded = await uploadToGradio(backend.base, blob, "person.jpg");
      const result = await callGradioDirect(backend.base, backend.endpoint, backend.data(uploaded), { timeout: backend.timeout });
      let file = extractRemoteFile(backend.pick(result));
      if (!file) throw new Error("AVATAR_EMPTY_RESULT");
      if (!/^https?:|^data:/i.test(file)) file = `${backend.base}/gradio_api/file=${encodeURIComponent(file)}`;
      return await compositeOnWhite(file);
    } catch (error) {
      const detail = String(error?.message || error || "UNKNOWN_ERROR");
      failures.push(`${backend.label}:${detail === "null" ? "HF_GENERATION_FAILED" : detail}`);
      const status = $("#avatarStatus");
      if (status) status.textContent = `${backend.label}暂不可用，正在切换备用服务…`;
      await delay(300);
    }
  }
  throw new Error(`AVATAR_ALL_BACKENDS_FAILED | ${failures.join(" | ")}`);
}

function friendlyAvatarError(error) {
  const text = String(error?.message || error || "");
  if (error?.name === "AbortError" || /TIMEOUT/i.test(text)) return "正面形象生成等待超时，请稍后重新生成。";
  if (/quota|ZeroGPU|429|capacity|busy/i.test(text)) return "今天的免费 GPU 额度可能已经用完，请在额度恢复后再生成正面数字形象。";
  if (/HF_START_422|validation error|field required|missing/i.test(text)) return "形象模型接口刚刚更新，请刷新页面后重新生成。";
  if (/HF_UPLOAD|Failed to fetch|network|fetch/i.test(text)) return "手机网络暂时无法连接生成式形象服务，请切换稳定 Wi-Fi 后重试。";
  if (/HF_GENERATION_FAILED|AVATAR_GENERATIVE_EMPTY_RESULT/i.test(text)) return "生成式模型没有返回完整形象，请更换面部更清晰的照片后重试。";
  return text.length < 120 ? text : "正面数字形象服务暂时不可用，请稍后重试。";
}

async function callTryOnApi() {
  if (!CONFIG.apiBase && !CONFIG.spaceId) throw new Error("AI_BACKEND_NOT_CONFIGURED");
  if (!state.personSrc || !state.productSrc) throw new Error("MISSING_IMAGES");

  if (CONFIG.apiMode === "hf-public-leffa") {
    const requestId = globalThis.crypto?.randomUUID?.() || `tryon-${Date.now()}`;
    state.requestId = requestId;
    const category = { top: "upper", bottom: "lower", dress: "dress" }[state.garmentType] || "upper";
    const base = CONFIG.apiBase.replace(/\/$/, "");
    state.queueMessage = "正在检查免费试穿服务状态…";
    updateGenerationStatus();
    const healthResult = await callGradioDirect(base, "health", [], { timeout: 45000 });
    const health = Array.isArray(healthResult) ? healthResult[0] : healthResult;
    if (health && health.ready === false) throw new Error(health.error || "VTON_SERVICE_NOT_READY");
    const [personBlob, garmentBlob] = await Promise.all([
      fetch(state.personSrc).then(response => response.blob()),
      fetch(state.productSrc).then(response => response.blob())
    ]);
    state.queueMessage = "正在上传人物与商品图片…";
    updateGenerationStatus();
    const [personFile, garmentFile] = await Promise.all([
      uploadToGradio(base, personBlob, "person.jpg"),
      uploadToGradio(base, garmentBlob, "garment.jpg")
    ]);
    state.queueMessage = "正在校验数字形象是否完整…";
    updateGenerationStatus();
    const validationResult = await callGradioDirect(base, "validate", [personFile], { timeout: 90000 });
    const validation = Array.isArray(validationResult) ? validationResult[0] : validationResult;
    if (validation && validation.usable === false) {
      const error = new Error(validation.reason || validation.error_code || "NO_PERSON_DETECTED");
      error.code = validation.error_code || "NO_PERSON_DETECTED";
      throw error;
    }
    const result = await callGradioDirect(base, "tryon", [personFile, garmentFile, category, state.garmentPhotoMode === "worn", requestId, 16, 2.2, 42], {
      timeout: 240000,
      onEvent: event => {
        state.queueMessage = event === "pending" ? "请求已提交，正在等待免费 GPU…" : event === "generating" ? "GPU 已开始生成，请保持页面打开…" : "正在接收生成结果…";
        updateGenerationStatus();
      }
    });
    const payload = Array.isArray(result) ? result[0] : result;
    if (!payload?.ok || !payload?.image) {
      const error = new Error(payload?.message || payload?.error_code || "HF_GENERATION_FAILED");
      error.code = payload?.error_code;
      error.requestId = payload?.request_hash || requestId;
      throw error;
    }
    return { image: payload.image, requestId: payload.request_hash || requestId };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);
  const base = CONFIG.apiBase.replace(/\/$/, "");
  const garmentType = { top: "upper", bottom: "lower", dress: "overall" }[state.garmentType] || "upper";
  try {
    const startResponse = await fetch(`${base}/gradio_api/call/try_on`, {
      method: "POST",
      headers: hfAuthHeaders(base, { "Content-Type": "application/json" }),
      body: JSON.stringify({ data: [state.personSrc, state.productSrc, garmentType, 30, 2.5, -1] }),
      signal: controller.signal
    });
    const started = await startResponse.json().catch(() => ({}));
    if (!startResponse.ok || !started.event_id) {
      throw new Error(started.detail || started.message || `HF_START_${startResponse.status}`);
    }
    state.requestId = started.event_id;
    const resultResponse = await fetch(
      `${base}/gradio_api/call/try_on/${encodeURIComponent(started.event_id)}`,
      { headers: hfAuthHeaders(base, { Accept: "text/event-stream" }), signal: controller.signal }
    );
    const eventText = await resultResponse.text();
    if (!resultResponse.ok) throw new Error(`HF_RESULT_${resultResponse.status}`);
    const events = eventText.trim().split(/\n\n+/);
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const block = events[i];
      const eventName = (block.match(/^event:\s*(.+)$/m) || [])[1];
      const dataText = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("");
      if (eventName === "error") throw new Error(dataText || "HF_GENERATION_FAILED");
      if (eventName !== "complete" || !dataText) continue;
      const payload = JSON.parse(dataText);
      const image = Array.isArray(payload) ? payload[0] : payload;
      if (!image || typeof image !== "string") throw new Error("HF_EMPTY_RESULT");
      return { image, requestId: started.event_id };
    }
    throw new Error("HF_INCOMPLETE_RESULT");
  } finally {
    clearTimeout(timeoutId);
  }
}

function friendlyApiError(error) {
  if (error?.requestId) state.requestId = error.requestId;
  if (error?.name === "AbortError") return "免费 GPU 排队或生成超过 4 分钟，本次已自动停止。建议避开高峰期，或稍后重新尝试。";
  const text = String(error?.message || error || "");
  const code = String(error?.code || "");
  if (text.includes("AI_BACKEND_NOT_CONFIGURED")) return "免费 AI 空间尚未绑定。完成 Hugging Face Space 部署后即可真实生成。";
  if (text.includes("MISSING_IMAGES")) return "缺少人物照或商品图，请返回重新上传。";
  if (code === "NO_PERSON_DETECTED" || /NO_PERSON_DETECTED/i.test(text)) return "数字形象没有被识别为完整正面全身照，请重新生成人物形象后再试穿。";
  if (code === "NO_GARMENT_FOUND" || /NO_GARMENT_FOUND/i.test(text)) return "没有从商品图中提取到所选服装，请检查具体款式以及“模特上身图 / 单件商品图”设置。";
  if (code === "BAD_IMAGE" || /BAD_IMAGE/i.test(text)) return "人物图或商品图不符合模型输入要求，请返回重新裁剪。";
  if (/VTON_SERVICE_NOT_READY/i.test(text)) return "免费试穿服务正在启动或维护，请稍后再试。";
  if (/Space metadata could not be loaded/i.test(text)) return "当前仍在使用旧版 AI 连接，请关闭页面后从最新链接重新打开。";
  if (/HF_UPLOAD/i.test(text)) return "图片上传到 AI 服务失败，请切换稳定 Wi-Fi 后重试。";
  if (/quota|exceeded|ZeroGPU|GPU quota/i.test(text)) return "今天的免费 GPU 额度可能已经用完，请在额度恢复后重试。";
  if (/queue|busy|capacity|429/i.test(text)) return "当前免费 GPU 排队人数较多，请稍后重试。";
  if (/cors|fetch|network|Failed to fetch/i.test(text)) return "暂时无法连接 Hugging Face AI 空间，请检查网络后重试。";
  if (/HF_EMPTY_RESULT|HF_INCOMPLETE_RESULT|HF_GENERATION_FAILED/i.test(text)) return "模型没有返回完整图片，请更换清晰的正面全身照后重试。";
  return text.length < 160 ? text : "开源 AI 模型没有完成本次生成，请稍后重试。";
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function saveProfile() {
  const profile = { bodyData: state.bodyData, bodyShape: state.bodyShape, gender: state.gender, userName: state.userName, avatarFingerprint: state.avatarFingerprint, avatarVersion: 5, updatedAt: Date.now() };
  if (state.usingDemo) { state.profileReady = true; return; }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (state.personSrc) await dbSet("profileImage", state.personSrc);
  if (state.personOriginalSrc) await dbSet("profileOriginalImage", state.personOriginalSrc);
  state.profileReady = Boolean(state.personSrc);
}

function savePreferences() {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ stylePrefs: state.stylePrefs, consent: state.consent }));
}

async function saveCurrentRecord() {
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    result: state.resultSrc,
    product: state.productSrc,
    productName: state.productName,
    type: state.garmentType,
    typeLabel: garmentSubtypeLabel(state.garmentSubtype),
    favorite: state.favorite,
    requestId: state.requestId,
    createdAt: Date.now()
  };
  state.records.unshift(item);
  state.records = state.records.slice(0, 20);
  await dbSet("records", state.records);
}

async function loadAppData() {
  try {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    const [profileImage, profileOriginalImage, records] = await Promise.all([dbGet("profileImage"), dbGet("profileOriginalImage"), dbGet("records")]);
    if (profile) {
      state.bodyData = { ...state.bodyData, ...(profile.bodyData || {}) };
      state.bodyShape = profile.bodyShape || state.bodyShape;
      state.gender = profile.gender || state.gender;
      state.userName = profile.userName || state.userName;
      state.avatarFingerprint = profile.avatarFingerprint || "";
    }
    if (prefs) {
      state.stylePrefs = Array.isArray(prefs.stylePrefs) ? prefs.stylePrefs : state.stylePrefs;
      state.consent = prefs.consent !== false;
    }
    state.personSrc = profileImage || "";
    state.personOriginalSrc = profileOriginalImage || profileImage || "";
    state.profileReady = Boolean(profile && profileImage && profile.avatarVersion === 5);
    state.records = Array.isArray(records) ? records : [];
  } catch (error) {
    console.warn("Local profile could not be loaded", error);
  } finally {
    state.booting = false;
  }
}

async function deleteAllLocalData() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(PREFS_KEY);
  await Promise.all([dbDelete("profileImage"), dbDelete("profileOriginalImage"), dbDelete("records")]);
  state.profileReady = false;
  state.personSrc = "";
  state.personOriginalSrc = "";
  state.records = [];
  state.stylePrefs = ["简约", "通勤"];
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 1800);
}

function openModal(title, body, actions = "") {
  $("#modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-handle"></div><h3>${title}</h3><div>${body}</div>${actions || `<button class="primary-btn full" data-action="close-modal">知道了</button>`}</div></div>`;
}

function closeModal() { $("#modalRoot").innerHTML = ""; }

function openFreeAccountModal(kind) {
  const isAvatar = kind === "avatar";
  const isTryOn = kind === "tryon";
  const guestAction = isAvatar ? "continue-avatar-guest" : isTryOn ? "continue-tryon-guest" : "close-modal";
  openModal(
    "使用免费账号额度",
    `<div class="quota-login-copy"><div><b>游客模式</b><span>约 2 分钟 GPU / 24小时</span></div><i>→</i><div class="better"><b>免费账号</b><span>约 5 分钟 GPU / 24小时</span></div></div>
    <p>国内网络可能无法打开 Hugging Face 登录页。可在电脑端免费创建一个以 <b>hf_</b> 开头的访问令牌，粘贴后直接使用账号额度。令牌只保存在当前浏览器会话，不会写入网页或 GitHub。</p>
    <label class="hf-token-field"><span>Hugging Face 访问令牌</span><input id="hfAccessToken" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="hf_xxxxxxxxxxxx"></label>
    <div class="hf-login-links"><a href="https://huggingface.co/settings/tokens" target="_blank">获取免费令牌 ↗</a><button data-action="hf-web-login">海外网络可用：网页登录</button></div>`,
    `<div class="button-row"><button class="ghost-btn" data-action="${guestAction}">${isAvatar || isTryOn ? "游客继续" : "暂不登录"}</button><button class="primary-btn" data-action="hf-token-login">令牌登录</button></div>`
  );
}

document.addEventListener("click", event => {
  if (event.target.classList?.contains("modal-backdrop")) { closeModal(); return; }
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    const target = tab.dataset.tab;
    if (target === "tryon") go("upload"); else go(target);
    return;
  }
  const category = event.target.closest("[data-category]");
  if (category) {
    state.garmentType = category.dataset.category;
    if (!garmentSubtypes[state.garmentType].some(([key]) => key === state.garmentSubtype)) {
      state.garmentSubtype = "";
      state.productName = "待确认商品款式";
    }
    render();
    return;
  }
  const subtype = event.target.closest("[data-garment-subtype]");
  if (subtype) {
    state.garmentSubtype = subtype.dataset.garmentSubtype;
    state.productName = garmentSubtypeLabel(state.garmentSubtype);
    render();
    return;
  }
  const photoMode = event.target.closest("[data-garment-photo-mode]");
  if (photoMode) { state.garmentPhotoMode = photoMode.dataset.garmentPhotoMode; render(); return; }
  const gender = event.target.closest("[data-gender]");
  if (gender) { state.gender = gender.dataset.gender; render(); return; }
  const shape = event.target.closest("[data-shape]");
  if (shape) { state.bodyShape = shape.dataset.shape; render(); return; }
  const filter = event.target.closest("[data-filter]");
  if (filter) { state.wardrobeFilter = filter.dataset.filter; render(); return; }
  const wardrobeTab = event.target.closest("[data-wardrobe-tab]");
  if (wardrobeTab) { state.wardrobeSection = wardrobeTab.dataset.wardrobeTab; render(); return; }
  const styleChoice = event.target.closest("[data-style-choice]");
  if (styleChoice) {
    const value = styleChoice.dataset.styleChoice;
    if (state.stylePrefs.includes(value)) state.stylePrefs = state.stylePrefs.filter(x => x !== value);
    else if (state.stylePrefs.length < 4) state.stylePrefs = [...state.stylePrefs, value];
    else return toast("最多选择 4 个风格");
    render();
    return;
  }
  const look = event.target.closest("[data-look]");
  if (look) {
    const src = {"look-urban":"assets/inspire-urban-v2.webp","look-soft":"assets/inspire-soft-v2.webp","look-cool":"assets/inspire-cool-v2.webp"}[look.dataset.look];
    state.resultSrc = src;
    go("result");
    return;
  }
  const record = event.target.closest("[data-record-id]");
  if (record) { const item = state.records.find(x => x.id === record.dataset.recordId); if (item) { state.resultSrc=item.result; state.productSrc=item.product || state.productSrc; state.productName=item.productName || state.productName; state.favorite=Boolean(item.favorite); state.requestId=item.requestId || ""; go("result"); } return; }
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const actions = {
    start: () => { if (state.profileReady) go("home"); else { state.onboarding=true; state.resumeTryOn=false; go("personUpload"); } },
    back,
    "start-flow": () => { if (state.profileReady) go("upload"); else { state.onboarding=true; state.resumeTryOn=true; go("personUpload"); } },
    "open-wardrobe": () => go("wardrobe"),
    "demo-product": () => { state.productSrc="assets/garment-clean.webp"; state.productOriginalSrc=state.productSrc; state.cropZoom=1; state.cropX=0; state.cropY=0; state.cropApplied=false; state.garmentType="top"; state.garmentSubtype="jacket"; state.garmentPhotoMode="flat"; state.productName="短款翻领夹克"; go("recognition"); },
    "history-product": () => openModal("历史商品", `<p>你的示例商品已保留。首版将支持按来源平台、类别和收藏状态筛选。</p><button class="option-row" data-action="demo-product"><span class="row-icon">♧</span><span><b>短款翻领夹克</b><small>上衣 · 示例商品</small></span><span class="chev">›</span></button>`),
    "recrop": () => { state.cropZoom=1; state.cropX=0; state.cropY=0; state.cropApplied=false; render(); toast("已重置裁剪区域"); },
    "person-reselect-product": () => go("upload"),
    "edit-recognition": () => go("category"),
    "recognition-next": async () => {
      if (state.productCleaning) return;
      state.productCleaning = true;
      trigger.disabled = true;
      trigger.textContent = state.garmentPhotoMode === "worn" ? "正在准备模特商品图…" : "AI 正在净化商品图…";
      try {
        await applyProductCrop();
        if (state.garmentPhotoMode === "flat") {
          try {
            state.productSrc = await createWhiteBackgroundAvatar(state.productSrc);
            state.productCleaned = true;
          } catch (cleanError) {
            state.productCleaned = false;
          }
        } else {
          state.productCleaned = false;
        }
        go("category");
      } catch (error) { toast("裁剪失败，请重新选择图片"); }
      finally { state.productCleaning = false; }
    },
    "category-next": () => { if (!state.garmentSubtype) return toast("请先确认毛衣、夹克等具体款式"); if (state.profileReady) go("confirm"); else { state.resumeTryOn=true; go("personUpload"); } },
    "generate-avatar": async () => {
      if (!state.consent) return openModal("需要图片处理授权", `<p>生成正面数字形象需要把你选择的个人照片发送至 Hugging Face 公共生成式图像模型。请先查看并允许。</p>`, `<button class="primary-btn full" data-action="privacy">查看并授权</button>`);
      if (!state.bodyData.height || !state.bodyData.weight) return toast("请先填写身高和体重");
      if (!state.personSrc) return toast("请先上传一张正面全身照");
      const source = state.personOriginalSrc || state.personSrc;
      const fingerprint = await computeAvatarFingerprint(source).catch(() => "");
      const canUseCache = Boolean(state.profileReady && fingerprint && state.avatarFingerprint === fingerprint && state.personSrc);
      if (canUseCache) { state.avatarProgress=0; return go("avatarGenerating"); }
      if (!state.hfToken) return openFreeAccountModal("avatar");
      state.avatarProgress = 0;
      go("avatarGenerating");
    },
    "continue-avatar-guest": () => { closeModal(); state.avatarProgress=0; go("avatarGenerating"); },
    "avatar-adjust": () => { state.resumeTryOn = state.screen === "confirm"; go("bodyData"); },
    "avatar-use": () => { state.onboarding=false; if (state.resumeTryOn) { state.resumeTryOn=false; go("confirm"); } else go("home"); },
    "avatar-upload-photo": () => { state.resumeTryOn=false; go("personUpload"); },
    "favorite-avatar": () => toast("数字形象已收藏"),
    "measure-help": () => openModal("身体数据测量方法", `<p><b>肩宽：</b>左右肩峰之间的直线距离。</p><p><b>胸围：</b>胸部最丰满处水平一周。</p><p><b>腰围：</b>自然腰线最细处水平一周。</p><p><b>臀围：</b>臀部最丰满处水平一周。</p>`),
    "demo-person": () => { state.personSrc="assets/person-clean.webp"; state.personOriginalSrc=state.personSrc; state.personCropZoom=1; state.personCropX=0; state.personCropY=0; state.singlePersonConfirmed=false; state.usingDemo=true; state.profileReady=false; go("personCrop"); },
    "person-reselect": () => go("personUpload"),
    "reset-person-crop": () => { state.personCropZoom=1; state.personCropX=0; state.personCropY=0; render(); },
    "apply-person-crop": async () => { try { await applyPersonCrop(); go("photoGuide"); } catch (error) { toast("人物裁剪失败，请重新选择照片"); } },
    "back-to-person-crop": () => go("personCrop"),
    "toggle-single-person": () => { state.singlePersonConfirmed=!state.singlePersonConfirmed; render(); },
    "photo-next": () => { if (!state.singlePersonConfirmed) return toast("请先确认画面中只有你本人一张脸"); go("bodyData"); },
    generate: () => { if (!state.consent) return openModal("需要图片处理授权", `<p>只有在你主动点击生成时，人物照和商品图才会发送至 AI 服务进行本次换装。请先在隐私设置中允许。</p>`, `<button class="primary-btn full" data-action="privacy">查看并授权</button>`); if (!state.hfToken) return openFreeAccountModal("tryon"); state.progress=0; state.generationError=""; go("generating"); },
    "continue-tryon-guest": () => { closeModal(); state.progress=0; state.generationError=""; go("generating"); },
    "hf-login": () => openFreeAccountModal("account"),
    "hf-token-login": () => {
      const token = $("#hfAccessToken")?.value.trim() || "";
      if (!/^hf_[A-Za-z0-9_-]{12,}$/.test(token)) return toast("请输入有效的 hf_ 访问令牌");
      const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
      sessionStorage.setItem(HF_AUTH_SESSION_KEY, JSON.stringify({ accessToken: token, expiresAt, userInfo: { name: "Hugging Face 免费账号" } }));
      state.hfToken = token;
      state.hfTokenExpiresAt = expiresAt;
      state.hfUser = { name: "Hugging Face 免费账号" };
      state.authError = "";
      closeModal();
      render();
      toast("免费账号令牌已登录");
    },
    "hf-web-login": () => { closeModal(); toast("正在打开 Hugging Face…"); beginHfLogin().catch(error => { state.authError=error.message || "网页登录暂时不可用"; render(); toast(state.authError); }); },
    "hf-logout": () => { logoutHf(); render(); toast("已退出 Hugging Face 免费账号"); },
    favorite: () => { state.favorite=!state.favorite; render(); toast(state.favorite ? "已收藏" : "已取消收藏"); },
    download: () => { const a=document.createElement("a"); a.href=state.resultSrc; a.download="TRY-ON-试穿预览.webp"; a.click(); toast("已开始下载预览图"); },
    compare: () => go("compare"),
    share: () => navigator.share ? navigator.share({title:"TRY ON 试穿预览",text:"看看我的 AI 试穿效果"}).catch(()=>{}) : toast("分享卡片已准备好"),
    again: () => go("confirm"),
    save: async () => { await saveCurrentRecord(); go("saved"); },
    detail: () => openModal("细节查看", `<img src="${state.resultSrc}" alt="试穿细节" style="width:100%;max-height:420px;object-fit:cover;border-radius:16px"><p>细节图用于辅助观察轮廓与配色。面料肌理、纽扣与褶皱请以商品原图为准。</p>`),
    "smart-style": () => openModal("智能搭配", `<p>根据你当前选择的米白上衣，推荐轻酷叠穿、奶油柔光与先锋极简三种方向。</p><div class="look-row">${lookCard("assets/inspire-urban-v2.webp","轻酷叠穿","look-urban")}${lookCard("assets/inspire-soft-v2.webp","奶油柔光","look-soft")}${lookCard("assets/inspire-cool-v2.webp","先锋极简","look-cool")}</div>`),
    settings: () => go("settings"),
    "body-profile": () => go("bodyData"),
    privacy: () => openModal("照片用途与隐私", `<p><b>本机保存：</b>数字形象、身体数据和试穿记录保存在当前手机浏览器中。</p><p><b>AI 处理：</b>点击生成数字形象时，个人照片会发送至 Hugging Face 公共生成式图像模型，用于补全身体、调整正面站姿和生成白底形象；点击开始试穿时，数字形象与商品图会发送至公共试穿模型。图片用于当次临时推理，不上传腾讯云 COS，也不会加入本应用的永久云端相册。请勿上传身份证件或其他敏感照片。</p><p><b>你的控制：</b>可在设置中删除照片、记录或全部本机个人数据。</p><button class="consent-row" data-action="toggle-consent"><span>${state.consent ? "✓" : ""}</span><b>允许在点击生成时发送图片至 AI 服务</b></button>`),
    "style-pref": () => go("stylePrefs"),
    "toggle-pref": () => { const value=trigger.dataset.value; state.stylePrefs = state.stylePrefs.includes(value) ? state.stylePrefs.filter(x=>x!==value) : state.stylePrefs.length<4 ? [...state.stylePrefs,value] : state.stylePrefs; closeModal(); actions["style-pref"](); },
    "save-prefs": () => { savePreferences(); closeModal(); render(); toast("风格偏好已保存"); },
    "save-style-prefs": () => { if (!state.stylePrefs.length) return toast("请至少选择 1 个风格"); savePreferences(); toast("风格偏好已保存"); back(); },
    "photo-archive": () => state.profileReady ? openModal("个人照片档案", `<div class="selected-photo"><img src="${state.personSrc}" alt="个人照片"><div><b>默认个人全身照</b><p>✓ 已保存在本机，可重复试穿</p></div></div><p>上传新的照片会替换当前默认形象；删除后再次试穿前需要重新建档。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="delete-photo">删除照片</button><button class="primary-btn" data-action="replace-photo">更换照片</button></div>`) : openModal("个人照片档案", `<div class="empty-state small"><span>▧</span><p>还没有个人全身照</p></div>`, `<button class="primary-btn full" data-action="replace-photo">上传并建立形象</button>`),
    "replace-photo": () => { closeModal(); state.resumeTryOn=false; go("personUpload"); },
    "delete-photo": () => openModal("删除个人照片？", `<p>删除后，现有试穿记录仍会保留，但再次生成前必须上传新的全身照。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-delete-photo">确认删除</button></div>`),
    "confirm-delete-photo": async () => { await Promise.all([dbDelete("profileImage"),dbDelete("profileOriginalImage")]); localStorage.removeItem(PROFILE_KEY); state.personSrc=""; state.personOriginalSrc=""; state.avatarFingerprint=""; state.profileReady=false; closeModal(); render(); toast("个人照片已删除"); },
    more: () => openModal("更多操作", `<div class="option-list"><button class="option-row" data-action="privacy"><span class="row-icon">▣</span><span><b>隐私说明</b></span><span class="chev">›</span></button><button class="option-row" data-action="help"><span class="row-icon">?</span><span><b>使用帮助</b></span><span class="chev">›</span></button></div>`),
    help: () => openModal("使用帮助", `<p><b>首次使用：</b>上传面部清晰的个人照片 → 填写身体数据 → AI 补全并生成正面白底全身形象。</p><p><b>试穿：</b>上传商品图 → 确认“模特上身图 / 单件商品图” → 选择毛衣、夹克等具体款式 → 调用 Hugging Face ZeroGPU 真实生成。</p><p><b>效果建议：</b>人物照尽量无遮挡；商品图应能清楚看见服装完整轮廓，避免多人和复杂叠穿。</p>`),
    message: () => openModal("消息通知", `<div class="empty-state small"><span>♧</span><h3>暂无新消息</h3><p>生成完成、服务状态与隐私更新会显示在这里。</p></div>`),
    upgrade: () => openModal("AI 服务说明", `<p>当前版本使用 Hugging Face ZeroGPU 的开源试穿模型，不收取费用；匿名用户每天有少量 GPU 额度，高峰期可能排队。</p>`),
    manage: () => openModal("管理试穿记录", `<p>当前共有 <b>${state.records.length}</b> 条本机记录。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="clear-records">全部清理</button></div>`),
    swap: () => toast("已切换对比视图"),
    "clear-records": () => openModal("删除试穿记录", `<p>确认后将永久删除当前手机浏览器中的 ${state.records.length} 条试穿结果，个人全身照和身体数据不受影响。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-clear">确认删除</button></div>`),
    "confirm-clear": async () => { state.records=[]; await dbSet("records", []); closeModal(); render(); toast("试穿记录已清理"); },
    "toggle-consent": () => { state.consent=!state.consent; savePreferences(); closeModal(); actions.privacy(); },
    account: () => openModal("账号与显示名称", `<label class="data-field"><span>显示名称</span><div><input id="accountName" maxlength="12" value="${escapeHtml(state.userName)}" aria-label="显示名称"></div></label><p>显示名称和个人资料只保存在本机。Hugging Face 登录仅用于调用你的免费 GPU 额度。</p>`, `<button class="primary-btn full" data-action="save-account">保存</button>`),
    "save-account": () => { const value=$("#accountName")?.value.trim(); if (value) state.userName=value.slice(0,12); saveProfile(); closeModal(); render(); toast("显示名称已保存"); },
    "delete-all-data": () => openModal("删除全部个人数据？", `<p>这会删除本机保存的个人照片、身体数据、风格偏好和全部试穿记录，无法撤销。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-delete-all">确认全部删除</button></div>`),
    "confirm-delete-all": async () => { await deleteAllLocalData(); closeModal(); state.screen="welcome"; state.history=[]; render(); toast("本机个人数据已全部删除"); },
    "retry-generate": () => { state.generationError=""; state.progress=0; go("generating", {replace:true}); },
    "retry-avatar": () => { state.avatarError=""; state.avatarErrorRaw=""; state.avatarProgress=0; go("avatarGenerating", {replace:true}); },
    "cancel-generation": () => { state.currentJob?.cancel?.(); state.currentJob=null; state.generationRunning=false; go("confirm", {replace:true}); toast("已取消本次生成"); },
    "back-to-confirm": () => go("confirm", {replace:true}),
    "dismiss-install": () => {
      sessionStorage.setItem("tryon-install-hint", "dismissed");
      $("#installHint")?.classList.remove("show");
    },
    "close-modal": closeModal
  };
  if (actions[action]) actions[action]();
});

function setupPwa() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isiPhone = /iPhone|iPod/.test(navigator.userAgent);
  const hint = $("#installHint");
  if (isiPhone && !standalone && sessionStorage.getItem("tryon-install-hint") !== "dismissed") {
    window.setTimeout(() => hint?.classList.add("show"), 1200);
  }
}

setupPwa();
(async function boot() {
  try {
    await completeHfLoginIfPresent();
  } catch (error) {
    state.authError = error?.message || "Hugging Face 登录没有完成";
    history.replaceState(null, "", `${location.pathname}?v=20261116-fix13`);
  }
  await loadAppData();
  await restoreHfLoginDraft();
  render();
  if (state.authError) toast(`登录未完成：${state.authError}`);
  else if (state.justLoggedIn) toast("免费账号登录成功");
})();


