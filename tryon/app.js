const $ = (selector, root = document) => root.querySelector(selector);

const CONFIG = window.TRYON_CONFIG || { apiBase: "", apiMode: "tencent-aiart" };
const PROFILE_KEY = "tryon-profile-v2";
const PREFS_KEY = "tryon-prefs-v2";
const DB_NAME = "tryon-local-v2";
const DB_STORE = "assets";

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
  productName: "短款翻领夹克",
  productSrc: "assets/garment-clean.webp",
  personSrc: "",
  resultSrc: "assets/result-main.webp",
  generationError: "",
  requestId: "",
  generationRunning: false,
  avatarRunning: false,
  progress: 0,
  avatarProgress: 0,
  gender: "female",
  bodyShape: "balanced",
  bodyData: { height: "165", weight: "50", shoulder: "38", chest: "82", waist: "64", hip: "88" },
  favorite: false,
  wardrobeFilter: "全部",
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
  avatarResult: "个人形象确认",
  personUpload: "上传个人照片",
  photoGuide: "拍照指南与确认",
  confirm: "试穿设置确认",
  generating: "AI 试穿生成",
    generationError: "生成失败",
  result: "试穿结果",
  compare: "对比与细节",
  saved: "保存与整理",
  wardrobe: "我的衣橱",
  profile: "我的",
  settings: "设置与账号管理"
};

const garmentLabels = { top: "上衣", bottom: "下装", dress: "连体服" };
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
  content.className = "app-content" + (mainScreens.includes(state.screen) ? " has-nav" : "");
  const pages = {
    welcome: welcomePage,
    home: homePage,
    upload: uploadPage,
    recognition: recognitionPage,
    category: categoryPage,
    bodyData: bodyDataPage,
    avatarGenerating: avatarGeneratingPage,
    avatarResult: avatarResultPage,
    personUpload: personUploadPage,
    photoGuide: photoGuidePage,
    confirm: confirmPage,
    generating: generatingPage,
    generationError: generationErrorPage,
    result: resultPage,
    compare: comparePage,
    saved: savedPage,
    wardrobe: wardrobePage,
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
  return `<div class="splash">
    <div class="splash-brand">TRY ON｜试一试</div>
    <div class="splash-copy">
      <span class="micro-label">YOUR DIGITAL SELF</span>
      <h2>先建立你的<br>专属 AI 形象</h2>
      <p>上传正面全身照 · 保留真实人脸特征 · 后续反复试穿</p>
    </div>
    <img class="splash-model" src="assets/hero-young-v2.webp" alt="年轻时尚的AI试穿示例模特">
    <button class="primary-btn full" data-action="start">${state.profileReady ? "进入我的试穿空间" : "上传全身照，建立个人形象"} <span>›</span></button>
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
  return `<div class="recognition-visual">
    <img src="${state.productSrc}" alt="待识别的商品图片">
    <div class="crop-box"><i class="crop-handle tl"></i><i class="crop-handle tr"></i><i class="crop-handle bl"></i><i class="crop-handle br"></i></div>
  </div>
  <div class="recognition-card">
    <div class="confidence"><b>✧ 识别结果</b><span>识别准确度 98%</span></div>
    <div class="result-item"><img src="${state.productSrc}" alt="识别出的商品"><div><h4>${state.productName}</h4><div class="chips"><button class="chip">${garmentLabels[state.garmentType]}</button><button class="chip">夹克</button><button class="chip outline" data-action="edit-recognition">修改</button></div></div></div>
    <div class="button-row"><button class="ghost-btn" data-action="recrop">⛶ 重新裁剪</button><button class="primary-btn" data-action="recognition-next">继续下一步 ›</button></div>
  </div>`;
}

function categoryPage() {
  return `<div class="page-intro"><h2>选择要试穿的<br>服装类型</h2><p>确认分类可以帮助模型保持更自然的服装结构。</p></div>
  <div class="category-grid">
    ${categoryCard("top", "♧", "上衣")}
    ${categoryCard("bottom", "♜", "下装")}
    ${categoryCard("dress", "♙", "连体服")}
  </div>
  <div class="selected-product"><h3>已选择的商品</h3><div class="product-summary"><img src="${state.productSrc}" alt="${state.productName}"><div><h4>${state.productName}</h4><p>${garmentLabels[state.garmentType]}｜AI已识别</p></div><span class="chev">›</span></div></div>
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
    <div class="scan-frame photo-scan">${state.personSrc ? `<img src="${state.personSrc}" alt="正在建立的个人形象">` : `<div class="scan-silhouette">♙</div>`}<i></i><span></span></div>
    <span class="micro-label">AI BODY PROFILE</span>
    <h2>正在建立你的<br>个人数字形象</h2>
    <p>保存人脸与全身特征，准备后续腾讯云 AI 换装</p>
    <div class="progress-wrap"><div class="progress-track"><div id="avatarProgressBar" class="progress-bar" style="width:${state.avatarProgress}%"></div></div><span id="avatarProgressNum" class="progress-num">${state.avatarProgress}%</span></div>
    <div class="generation-tags"><span>照片优化</span><span>数据建档</span><span>形象确认</span></div>
    <div class="info-strip"><span>✦</span><span>数字形象用于穿搭预览，不代表精确的人体测量或尺码建议。</span></div>
  </div>`;
}

function beginAvatarGeneration() {
  state.avatarRunning = true;
  state.avatarProgress = 6;
  let step = 0;
  const timer = setInterval(() => {
    if (state.screen !== "avatarGenerating") { state.avatarRunning = false; return clearInterval(timer); }
    step += 1;
    state.avatarProgress = Math.min(100, Math.round(8 + step * 6.8 + Math.sin(step) * 2));
    const bar = $("#avatarProgressBar");
    const num = $("#avatarProgressNum");
    if (bar) bar.style.width = `${state.avatarProgress}%`;
    if (num) num.textContent = `${state.avatarProgress}%`;
    if (state.avatarProgress >= 100) {
      clearInterval(timer);
      state.profileReady = true;
      saveProfile().finally(() => {
        state.avatarRunning = false;
        setTimeout(() => { if (state.screen === "avatarGenerating") go("avatarResult", { replace: true }); }, 260);
      });
    }
  }, 190);
}

function avatarResultPage() {
  const shapeName = { slim: "纤细", balanced: "匀称", curvy: "曲线", athletic: "健体" }[state.bodyShape];
  return `<div class="avatar-result">
    <div class="avatar-stage"><img src="${state.personSrc}" alt="我的个人AI全身形象"><span>MY DIGITAL SELF</span><button data-action="favorite-avatar">♡</button></div>
    <div class="avatar-result-copy"><span class="success-pill">✓ 个人形象已生成</span><h2>你好，这是你的<br>数字试穿形象</h2><p>已根据基础数据生成，可作为后续试穿的默认个人全身照。</p></div>
    <div class="avatar-data-row"><span><b>${state.bodyData.height}</b> cm<small>身高</small></span><span><b>${state.bodyData.weight}</b> kg<small>体重</small></span><span><b>${shapeName}</b><small>身形</small></span></div>
    <div class="button-row"><button class="ghost-btn" data-action="avatar-adjust">调整数据</button><button class="primary-btn fashion-btn" data-action="avatar-use">使用此形象 ›</button></div>
    <button class="text-action" data-action="avatar-upload-photo">更换真人全身照</button>
  </div>`;
}

function personUploadPage() {
  return `<div class="flow-steps" aria-label="个人形象建立步骤"><span class="active">1</span><i></i><span>2</span><i></i><span>3</span><small>上传照片</small><small>身体数据</small><small>完成形象</small></div>
  <div class="page-intro"><span class="micro-label">FACE & BODY IDENTITY</span><h2>上传你的正面<br>清晰全身照</h2><p>试穿会直接以这张照片作为人物底图，尽量保留你的真实人脸、发型与身体轮廓。</p></div>
  <label class="upload-zone" for="personFile"><input class="sr-only" id="personFile" type="file" accept="image/*" data-file="person"><div><div class="big-icon">▧</div><h3>上传全身照</h3><p>支持 JPG、PNG，建议正面 3:4</p></div></label>
  <div class="option-list">
    <button class="option-row featured" data-action="demo-person"><span class="row-icon">✦</span><span><b>先用示例照片体验</b><small>仅用于查看流程，不会成为你的真人档案</small></span><span class="chev">›</span></button>
    <label class="option-row" for="cameraPerson"><input class="sr-only" id="cameraPerson" type="file" accept="image/*" capture="user" data-file="person"><span class="row-icon">◎</span><span><b>拍照</b><small>打开前置相机拍摄</small></span><span class="chev">›</span></label>
    <button class="option-row" data-action="privacy"><span class="row-icon">▣</span><span><b>照片用途与隐私说明</b><small>了解处理、保存与删除方式</small></span><span class="chev">›</span></button>
  </div>`;
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
  <div class="button-row"><button class="ghost-btn" data-action="person-reselect">↻ 重新选择</button><button class="primary-btn" data-action="photo-next">确认照片并填写数据</button></div>`;
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
    <div class="setting-row"><span>♧</span><span>服装类型</span><b>${garmentLabels[state.garmentType]} ›</b></div>
    <button class="setting-row" data-action="avatar-adjust"><span>♙</span><span>身体数据</span><b>${state.bodyData.height} cm · ${state.bodyData.weight} kg ›</b></button>
    <button class="setting-row" data-action="style-pref"><span>♙</span><span>风格偏好</span><b>${state.stylePrefs.join(" · ") || "未设置"} ›</b></button>
    <div class="setting-row"><span>✧</span><span>生成预览</span><b>标准（1张） ›</b></div>
  </div>
  <div class="info-strip"><span>ⓘ</span><span>将调用腾讯云模特换装服务。单次生成按腾讯云实际计费，结果仅作为穿搭视觉参考。</span></div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="generate">✧ 开始 AI 试穿</button></div>`;
}

function generatingPage() {
  return `<div class="generation">
    <div class="orbit"><div class="orbit-core">⌁</div></div>
    <h2>AI 正在生成试穿效果…</h2>
    <p>腾讯云正在分析服装结构、人物轮廓与面部特征</p>
    <div class="progress-wrap"><div class="progress-track"><div id="progressBar" class="progress-bar" style="width:${state.progress}%"></div></div><span id="progressNum" class="progress-num">${state.progress}%</span></div>
    <div class="generation-meta"><span>◷ 预计等待<b>20–60 秒</b></span><i></i><span>▱ 生成张数<b>1 张预览图</b></span></div>
    <div class="tips-card"><h4>✧ 试穿小贴士</h4><p>✓ 清晰照片有助于保持人物特征</p><p>✓ 系统会尽量保留领口、袖口与面料细节</p><p>✓ 视觉预览不等同于真实尺码与合身效果</p></div>
  </div>`;
}

async function beginGeneration() {
  state.generationRunning = true;
  state.progress = 4;
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
  return `<div class="generation error-state"><div class="error-orbit">!</div><span class="micro-label">GENERATION STOPPED</span><h2>这次没有生成成功</h2><p>${escapeHtml(state.generationError || "服务暂时不可用，请稍后重试。")}</p><div class="tips-card"><h4>你可以检查</h4><p>✓ 人物照片是否为正面清晰全身照</p><p>✓ 商品图是否只有一件正面服装</p><p>✓ 当前网络是否稳定</p>${state.requestId ? `<p>请求编号：${escapeHtml(state.requestId)}</p>` : ""}</div><div class="button-row"><button class="ghost-btn" data-action="back-to-confirm">返回检查</button><button class="primary-btn" data-action="retry-generate">重新生成</button></div></div>`;
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
  const cards = state.records;
  return `<div class="tabs"><button class="tab-btn active">我的试穿</button><button class="tab-btn">我的单品</button><button class="tab-btn">搭配方案</button></div>
  <div class="section-head"><h3>共 ${cards.length} 条试穿记录</h3><button data-action="manage">▣ 管理</button></div>
  <div class="filter-row">${["全部","上衣","下装","连衣裙","外套"].map(x => `<button class="filter-pill ${state.wardrobeFilter===x?"active":""}" data-filter="${x}">${x}</button>`).join("")}</div>
  ${cards.length ? `<div class="wardrobe-grid">${cards.map((item, i) => `<button class="wardrobe-card" data-record="${i}"><img src="${item.result}" alt="${escapeHtml(item.productName)}试穿记录"><span class="tag">${escapeHtml(item.typeLabel || "试穿")}</span><span class="heart">${item.favorite?"♥":"♡"}</span></button>`).join("")}</div>` : `<div class="empty-state"><span>▱</span><h3>还没有试穿记录</h3><p>完成一次 AI 试穿并保存后，会出现在这里。</p><button class="primary-btn" data-action="start-flow">开始第一次试穿</button></div>`}`;
}

function profilePage() {
  const avatar = state.personSrc || "assets/hero-young-v2.webp";
  return `<div class="profile-head"><img class="avatar" src="${avatar}" alt="我的头像"><div><h2>${escapeHtml(state.userName)} <span class="vip">本机体验版</span></h2><p>${state.profileReady ? "个人 AI 形象已建立" : "请先建立个人 AI 形象"}</p></div><button class="icon-btn" data-action="settings">›</button></div>
  <div class="member-card"><div class="top"><h3>✦ 我的数字形象</h3><button data-action="photo-archive">${state.profileReady ? "管理形象" : "立即建立"} ›</button></div><div class="quota"><div><span>保存的试穿</span><b>${state.records.length} 次</b></div><div><span>AI 服务</span><b>${CONFIG.apiBase ? "腾讯云已连接" : "等待连接"}</b></div></div></div>
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
  <div class="settings-section"><h3>隐私与安全</h3><div class="menu-list"><button class="menu-item" data-action="privacy"><span>▣</span><b>隐私与授权</b><small>相机、相册、数据权限 ›</small></button><button class="menu-item" data-action="account"><span>◉</span><b>账号与安全</b><small>手机号、密码、登录管理 ›</small></button></div></div>
  <div class="settings-section"><h3>服务与帮助</h3><div class="menu-list"><button class="menu-item" data-action="help"><span>?</span><b>客服帮助</b><small>在线咨询 · 常见问题 ›</small></button></div></div>
  <button class="danger-btn" data-action="delete-all-data">删除本机全部个人数据</button>
  <p style="text-align:center;color:#999;font-size:10px;margin-top:26px">TRY ON｜试一试　v1.1 腾讯云 AI 版</p>`;
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
          state.productSrc = dataUrl;
          state.productName = file.name.replace(/\.[^.]+$/, "").slice(0, 12) || "上传的服装";
          go("recognition");
        } else {
          state.personSrc = dataUrl;
          state.usingDemo = false;
          state.profileReady = false;
          go("photoGuide");
        }
      } catch (error) {
        toast(error.message || "图片处理失败，请换一张重试");
      }
    }, { once: true });
  });
  document.querySelectorAll("input[data-body-field]").forEach(input => {
    input.addEventListener("input", () => { state.bodyData[input.dataset.bodyField] = input.value; });
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
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

async function callTryOnApi() {
  if (!CONFIG.apiBase) throw new Error("AI_BACKEND_NOT_CONFIGURED");
  if (!state.personSrc || !state.productSrc) throw new Error("MISSING_IMAGES");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${CONFIG.apiBase.replace(/\/$/, "")}/tryon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelImage: state.personSrc,
        clothesImage: state.productSrc,
        clothesType: { top: "Upper-body", bottom: "Lower-body", dress: "Dress" }[state.garmentType],
        bodyProfile: state.bodyData,
        consent: state.consent
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.image) {
      const error = new Error(data.message || `HTTP_${response.status}`);
      error.code = data.code;
      error.requestId = data.requestId;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function friendlyApiError(error) {
  if (error?.requestId) state.requestId = error.requestId;
  if (error?.name === "AbortError") return "生成等待超过 2 分钟，服务可能繁忙，请稍后重试。";
  const text = String(error?.message || error || "");
  if (text.includes("AI_BACKEND_NOT_CONFIGURED")) return "腾讯云 AI 后端尚未完成连接，请在服务配置完成后重试。";
  if (text.includes("MISSING_IMAGES")) return "缺少人物照或商品图，请返回重新上传。";
  if (/quota|balance|ResourceInsufficient|欠费|余额/i.test(text)) return "腾讯云额度不足或后付费未开通，请检查账号余额与模特换装服务。";
  if (/cors|fetch|network|Failed to fetch/i.test(text)) return "无法连接腾讯云生成服务，请检查网络或后端域名配置。";
  return text.length < 160 ? text : "腾讯云没有完成本次生成，请稍后重试。";
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
  const profile = { bodyData: state.bodyData, bodyShape: state.bodyShape, gender: state.gender, userName: state.userName, updatedAt: Date.now() };
  if (state.usingDemo) { state.profileReady = true; return; }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (state.personSrc) await dbSet("profileImage", state.personSrc);
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
    typeLabel: garmentLabels[state.garmentType],
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
    const [profileImage, records] = await Promise.all([dbGet("profileImage"), dbGet("records")]);
    if (profile) {
      state.bodyData = { ...state.bodyData, ...(profile.bodyData || {}) };
      state.bodyShape = profile.bodyShape || state.bodyShape;
      state.gender = profile.gender || state.gender;
      state.userName = profile.userName || state.userName;
    }
    if (prefs) {
      state.stylePrefs = Array.isArray(prefs.stylePrefs) ? prefs.stylePrefs : state.stylePrefs;
      state.consent = prefs.consent !== false;
    }
    state.personSrc = profileImage || "";
    state.profileReady = Boolean(profile && profileImage);
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
  await Promise.all([dbDelete("profileImage"), dbDelete("records")]);
  state.profileReady = false;
  state.personSrc = "";
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
  $("#modalRoot").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${title}" onclick="event.stopPropagation()"><div class="modal-handle"></div><h3>${title}</h3><div>${body}</div>${actions || `<button class="primary-btn full" data-action="close-modal">知道了</button>`}</div></div>`;
}

function closeModal() { $("#modalRoot").innerHTML = ""; }

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    const target = tab.dataset.tab;
    if (target === "tryon") go("upload"); else go(target);
    return;
  }
  const category = event.target.closest("[data-category]");
  if (category) { state.garmentType = category.dataset.category; render(); return; }
  const gender = event.target.closest("[data-gender]");
  if (gender) { state.gender = gender.dataset.gender; render(); return; }
  const shape = event.target.closest("[data-shape]");
  if (shape) { state.bodyShape = shape.dataset.shape; render(); return; }
  const filter = event.target.closest("[data-filter]");
  if (filter) { state.wardrobeFilter = filter.dataset.filter; render(); return; }
  const look = event.target.closest("[data-look]");
  if (look) {
    const src = {"look-urban":"assets/inspire-urban-v2.webp","look-soft":"assets/inspire-soft-v2.webp","look-cool":"assets/inspire-cool-v2.webp"}[look.dataset.look];
    state.resultSrc = src;
    go("result");
    return;
  }
  const record = event.target.closest("[data-record]");
  if (record) { const item = state.records[Number(record.dataset.record)]; if (item) { state.resultSrc=item.result; state.productSrc=item.product || state.productSrc; state.productName=item.productName || state.productName; state.favorite=Boolean(item.favorite); state.requestId=item.requestId || ""; go("result"); } return; }
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const actions = {
    start: () => { if (state.profileReady) go("home"); else { state.onboarding=true; state.resumeTryOn=false; go("personUpload"); } },
    back,
    "start-flow": () => { if (state.profileReady) go("upload"); else { state.onboarding=true; state.resumeTryOn=true; go("personUpload"); } },
    "open-wardrobe": () => go("wardrobe"),
    "demo-product": () => { state.productSrc="assets/garment-clean.webp"; state.productName="短款翻领夹克"; go("recognition"); },
    "history-product": () => openModal("历史商品", `<p>你的示例商品已保留。首版将支持按来源平台、类别和收藏状态筛选。</p><button class="option-row" data-action="demo-product"><span class="row-icon">♧</span><span><b>短款翻领夹克</b><small>上衣 · 示例商品</small></span><span class="chev">›</span></button>`),
    "recrop": () => toast("已重置裁剪区域"),
    "edit-recognition": () => go("category"),
    "recognition-next": () => go("category"),
    "category-next": () => { if (state.profileReady) go("confirm"); else { state.resumeTryOn=true; go("personUpload"); } },
    "generate-avatar": () => {
      if (!state.bodyData.height || !state.bodyData.weight) return toast("请先填写身高和体重");
      if (!state.personSrc) return toast("请先上传一张正面全身照");
      state.avatarProgress = 0;
      go("avatarGenerating");
    },
    "avatar-adjust": () => { state.resumeTryOn = state.screen === "confirm"; go("bodyData"); },
    "avatar-use": () => { state.onboarding=false; if (state.resumeTryOn) { state.resumeTryOn=false; go("confirm"); } else go("home"); },
    "avatar-upload-photo": () => { state.resumeTryOn=false; go("personUpload"); },
    "favorite-avatar": () => toast("数字形象已收藏"),
    "measure-help": () => openModal("身体数据测量方法", `<p><b>肩宽：</b>左右肩峰之间的直线距离。</p><p><b>胸围：</b>胸部最丰满处水平一周。</p><p><b>腰围：</b>自然腰线最细处水平一周。</p><p><b>臀围：</b>臀部最丰满处水平一周。</p>`),
    "demo-person": () => { state.personSrc="assets/person-clean.webp"; state.usingDemo=true; state.profileReady=false; go("photoGuide"); },
    "person-reselect": () => go("personUpload"),
    "photo-next": () => go("bodyData"),
    generate: () => { if (!state.consent) return openModal("需要图片处理授权", `<p>只有在你主动点击生成时，人物照和商品图才会发送至腾讯云进行本次换装。请先在隐私设置中允许。</p>`, `<button class="primary-btn full" data-action="privacy">查看并授权</button>`); state.progress=0; state.generationError=""; go("generating"); },
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
    privacy: () => openModal("照片用途与隐私", `<p><b>本机保存：</b>个人全身照、身体数据和试穿记录保存在当前手机浏览器中。</p><p><b>生成处理：</b>点击“开始 AI 试穿”后，人物照和商品图会发送至你的腾讯云函数，再调用腾讯云模特换装接口；临时源图在生成结束后删除。</p><p><b>你的控制：</b>可在设置中删除照片、记录或全部本机个人数据。</p><button class="consent-row" data-action="toggle-consent"><span>${state.consent ? "✓" : ""}</span><b>允许在点击生成时发送图片至腾讯云</b></button>`),
    "style-pref": () => openModal("选择风格偏好", `<p>选择 1–4 个常用风格，会用于首页推荐与后续搭配。</p><div class="chips pref-chips" style="margin:12px 0 20px">${["简约","通勤","复古","中性","运动","甜美","轻酷","法式"].map(x=>`<button class="chip ${state.stylePrefs.includes(x)?"active":""}" data-action="toggle-pref" data-value="${x}">${x}</button>`).join("")}</div>`, `<button class="primary-btn full" data-action="save-prefs">保存偏好</button>`),
    "toggle-pref": () => { const value=trigger.dataset.value; state.stylePrefs = state.stylePrefs.includes(value) ? state.stylePrefs.filter(x=>x!==value) : state.stylePrefs.length<4 ? [...state.stylePrefs,value] : state.stylePrefs; closeModal(); actions["style-pref"](); },
    "save-prefs": () => { savePreferences(); closeModal(); render(); toast("风格偏好已保存"); },
    "photo-archive": () => state.profileReady ? openModal("个人照片档案", `<div class="selected-photo"><img src="${state.personSrc}" alt="个人照片"><div><b>默认个人全身照</b><p>✓ 已保存在本机，可重复试穿</p></div></div><p>上传新的照片会替换当前默认形象；删除后再次试穿前需要重新建档。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="delete-photo">删除照片</button><button class="primary-btn" data-action="replace-photo">更换照片</button></div>`) : openModal("个人照片档案", `<div class="empty-state small"><span>▧</span><p>还没有个人全身照</p></div>`, `<button class="primary-btn full" data-action="replace-photo">上传并建立形象</button>`),
    "replace-photo": () => { closeModal(); state.resumeTryOn=false; go("personUpload"); },
    "delete-photo": () => openModal("删除个人照片？", `<p>删除后，现有试穿记录仍会保留，但再次生成前必须上传新的全身照。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-delete-photo">确认删除</button></div>`),
    "confirm-delete-photo": async () => { await dbDelete("profileImage"); localStorage.removeItem(PROFILE_KEY); state.personSrc=""; state.profileReady=false; closeModal(); render(); toast("个人照片已删除"); },
    more: () => openModal("更多操作", `<div class="option-list"><button class="option-row" data-action="privacy"><span class="row-icon">▣</span><span><b>隐私说明</b></span><span class="chev">›</span></button><button class="option-row" data-action="help"><span class="row-icon">?</span><span><b>使用帮助</b></span><span class="chev">›</span></button></div>`),
    help: () => openModal("使用帮助", `<p><b>首次使用：</b>上传正面清晰全身照 → 确认照片 → 填写身体数据 → 建立个人形象。</p><p><b>试穿：</b>上传商品正面平铺图 → 选择服装类型 → 确认人物形象 → 调用腾讯云生成。</p><p><b>效果建议：</b>人物照建议 3:4、正面无遮挡；商品图只保留一件上衣、下装或连衣裙。</p>`),
    message: () => openModal("消息通知", `<div class="empty-state small"><span>♧</span><h3>暂无新消息</h3><p>生成完成、服务状态与隐私更新会显示在这里。</p></div>`),
    upgrade: () => openModal("AI 服务说明", `<p>当前版本按腾讯云模特换装接口实际调用量计费，不设置虚拟会员套餐。</p>`),
    manage: () => openModal("管理试穿记录", `<p>当前共有 <b>${state.records.length}</b> 条本机记录。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="clear-records">全部清理</button></div>`),
    swap: () => toast("已切换对比视图"),
    "clear-records": () => openModal("删除试穿记录", `<p>确认后将永久删除当前手机浏览器中的 ${state.records.length} 条试穿结果，个人全身照和身体数据不受影响。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-clear">确认删除</button></div>`),
    "confirm-clear": async () => { state.records=[]; await dbSet("records", []); closeModal(); render(); toast("试穿记录已清理"); },
    "toggle-consent": () => { state.consent=!state.consent; savePreferences(); closeModal(); actions.privacy(); },
    account: () => openModal("账号与显示名称", `<label class="data-field"><span>显示名称</span><div><input id="accountName" maxlength="12" value="${escapeHtml(state.userName)}" aria-label="显示名称"></div></label><p>当前版本不上传手机号和密码，个人资料只保存在本机。</p>`, `<button class="primary-btn full" data-action="save-account">保存</button>`),
    "save-account": () => { const value=$("#accountName")?.value.trim(); if (value) state.userName=value.slice(0,12); saveProfile(); closeModal(); render(); toast("显示名称已保存"); },
    "delete-all-data": () => openModal("删除全部个人数据？", `<p>这会删除本机保存的个人照片、身体数据、风格偏好和全部试穿记录，无法撤销。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-delete-all">确认全部删除</button></div>`),
    "confirm-delete-all": async () => { await deleteAllLocalData(); closeModal(); state.screen="welcome"; state.history=[]; render(); toast("本机个人数据已全部删除"); },
    "retry-generate": () => { state.generationError=""; state.progress=0; go("generating", {replace:true}); },
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
loadAppData().then(render);

