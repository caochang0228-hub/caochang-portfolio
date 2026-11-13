const $ = (selector, root = document) => root.querySelector(selector);

const state = {
  screen: "welcome",
  activeTab: "home",
  history: [],
  garmentType: "top",
  productName: "短款翻领夹克",
  productSrc: "assets/garment-clean.webp",
  personSrc: "assets/person-clean.webp",
  resultSrc: "assets/result-main.webp",
  progress: 0,
  avatarProgress: 0,
  gender: "female",
  bodyShape: "balanced",
  bodyData: { height: "165", weight: "50", shoulder: "38", chest: "82", waist: "64", hip: "88" },
  favorite: false,
  wardrobeFilter: "全部",
  records: Number(localStorage.getItem("tryon-records") || 4)
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
  if (state.screen === "generating") beginGeneration();
  if (state.screen === "avatarGenerating") beginAvatarGeneration();
}

function welcomePage() {
  return `<div class="splash">
    <div class="splash-brand">TRY ON｜试一试</div>
    <div class="splash-copy">
      <h2>AI虚拟试穿<br>看见穿上身的自己</h2>
      <p>上传商品图 · 一键试穿 · 智能搭配</p>
    </div>
    <img class="splash-model" src="assets/hero-young-v2.webp" alt="年轻时尚的AI试穿示例模特">
    <button class="primary-btn full" data-action="start">立即体验 AI 试穿 <span>›</span></button>
  </div>`;
}

function homePage() {
  return `<div class="home-hero">
    <img src="assets/hero-young-v2.webp" alt="年轻时尚的AI试穿穿搭示例">
    <div class="home-hero-copy">
      <span class="hero-kicker">NEW · AI LOOK</span>
      <h2>AI试穿<br>发现更多穿搭灵感</h2>
      <p>建立数字形象 · 智能试穿 · 一键收藏</p>
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
    <div class="scan-frame"><div class="scan-silhouette">♙</div><i></i><span></span></div>
    <span class="micro-label">AI BODY PROFILE</span>
    <h2>正在生成你的<br>个人数字形象</h2>
    <p>根据身高、体重与身形数据构建全身比例</p>
    <div class="progress-wrap"><div class="progress-track"><div id="avatarProgressBar" class="progress-bar" style="width:${state.avatarProgress}%"></div></div><span id="avatarProgressNum" class="progress-num">${state.avatarProgress}%</span></div>
    <div class="generation-tags"><span>轮廓计算</span><span>比例匹配</span><span>形象合成</span></div>
    <div class="info-strip"><span>✦</span><span>数字形象用于穿搭预览，不代表精确的人体测量或尺码建议。</span></div>
  </div>`;
}

function beginAvatarGeneration() {
  state.avatarProgress = 6;
  let step = 0;
  const timer = setInterval(() => {
    if (state.screen !== "avatarGenerating") return clearInterval(timer);
    step += 1;
    state.avatarProgress = Math.min(100, Math.round(8 + step * 6.8 + Math.sin(step) * 2));
    const bar = $("#avatarProgressBar");
    const num = $("#avatarProgressNum");
    if (bar) bar.style.width = `${state.avatarProgress}%`;
    if (num) num.textContent = `${state.avatarProgress}%`;
    if (state.avatarProgress >= 100) {
      clearInterval(timer);
      state.personSrc = "assets/avatar-body-v2.webp";
      setTimeout(() => { if (state.screen === "avatarGenerating") go("avatarResult", { replace: true }); }, 350);
    }
  }, 190);
}

function avatarResultPage() {
  const shapeName = { slim: "纤细", balanced: "匀称", curvy: "曲线", athletic: "健体" }[state.bodyShape];
  return `<div class="avatar-result">
    <div class="avatar-stage"><img src="assets/avatar-body-v2.webp" alt="根据身体数据生成的个人全身照"><span>AI DIGITAL SELF</span><button data-action="favorite-avatar">♡</button></div>
    <div class="avatar-result-copy"><span class="success-pill">✓ 个人形象已生成</span><h2>你好，这是你的<br>数字试穿形象</h2><p>已根据基础数据生成，可作为后续试穿的默认个人全身照。</p></div>
    <div class="avatar-data-row"><span><b>${state.bodyData.height}</b> cm<small>身高</small></span><span><b>${state.bodyData.weight}</b> kg<small>体重</small></span><span><b>${shapeName}</b><small>身形</small></span></div>
    <div class="button-row"><button class="ghost-btn" data-action="avatar-adjust">调整数据</button><button class="primary-btn fashion-btn" data-action="avatar-use">使用此形象 ›</button></div>
    <button class="text-action" data-action="avatar-upload-photo">或上传真人全身照</button>
  </div>`;
}

function personUploadPage() {
  return `<div class="page-intro"><h2>上传或选择您的<br>全身照</h2><p>照片仅用于生成试穿预览，可随时在设置中删除。</p></div>
  <label class="upload-zone" for="personFile"><input class="sr-only" id="personFile" type="file" accept="image/*" data-file="person"><div><div class="big-icon">▧</div><h3>上传全身照</h3><p>支持 JPG、PNG，建议大于 1MB</p></div></label>
  <div class="option-list">
    <button class="option-row featured" data-action="demo-person"><span class="row-icon">✦</span><span><b>使用示例照片体验</b><small>正面全身、背景简洁</small></span><span class="chev">›</span></button>
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
  <div class="selected-photo"><img src="${state.personSrc}" alt="已选择的个人照片"><div><b>照片已确认</b><p>✓ 符合试穿要求</p></div></div>
  <div class="button-row"><button class="ghost-btn" data-action="person-reselect">↻ 重新选择</button><button class="primary-btn" data-action="photo-next">确认并继续</button></div>`;
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
    <button class="setting-row" data-action="style-pref"><span>♙</span><span>风格偏好</span><b>简约通勤 ›</b></button>
    <div class="setting-row"><span>✧</span><span>生成预览</span><b>标准（1张） ›</b></div>
  </div>
  <div class="info-strip"><span>ⓘ</span><span>演示版将展示预设试穿效果；接入正式 AI 服务后，会使用你授权的图片生成。</span></div>
  <div class="sticky-actions"><button class="primary-btn full" data-action="generate">✧ 开始 AI 试穿</button></div>`;
}

function generatingPage() {
  return `<div class="generation">
    <div class="orbit"><div class="orbit-core">⌁</div></div>
    <h2>AI 正在生成试穿效果…</h2>
    <p>正在分析服装结构与人物轮廓</p>
    <div class="progress-wrap"><div class="progress-track"><div id="progressBar" class="progress-bar" style="width:${state.progress}%"></div></div><span id="progressNum" class="progress-num">${state.progress}%</span></div>
    <div class="generation-meta"><span>◷ 预计等待<b>约 6 秒</b></span><i></i><span>▱ 生成张数<b>1 张预览图</b></span></div>
    <div class="tips-card"><h4>✧ 试穿小贴士</h4><p>✓ 清晰照片有助于保持人物特征</p><p>✓ 系统会尽量保留领口、袖口与面料细节</p><p>✓ 视觉预览不等同于真实尺码与合身效果</p></div>
  </div>`;
}

function beginGeneration() {
  state.progress = 4;
  let step = 0;
  const timer = setInterval(() => {
    if (state.screen !== "generating") return clearInterval(timer);
    step += 1;
    state.progress = Math.min(100, Math.round(5 + step * 4.7 + Math.sin(step) * 2));
    const bar = $("#progressBar");
    const num = $("#progressNum");
    if (bar) bar.style.width = `${state.progress}%`;
    if (num) num.textContent = `${state.progress}%`;
    if (state.progress >= 100) {
      clearInterval(timer);
      setTimeout(() => { if (state.screen === "generating") go("result", { replace: true }); }, 420);
    }
  }, 210);
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
  const cards = [
    [state.resultSrc, "最新试穿", state.favorite],
    ["assets/inspire-urban-v2.webp", "轻酷", true],
    ["assets/inspire-cool-v2.webp", "先锋", false],
    ["assets/inspire-soft-v2.webp", "柔光", false]
  ];
  return `<div class="tabs"><button class="tab-btn active">我的试穿</button><button class="tab-btn">我的单品</button><button class="tab-btn">搭配方案</button></div>
  <div class="section-head"><h3>共 ${state.records} 条试穿记录</h3><button data-action="manage">▣ 管理</button></div>
  <div class="filter-row">${["全部","上衣","下装","连衣裙","外套"].map(x => `<button class="filter-pill ${state.wardrobeFilter===x?"active":""}" data-filter="${x}">${x}</button>`).join("")}</div>
  <div class="wardrobe-grid">${cards.map(([src, tag, fav], i) => `<button class="wardrobe-card" data-record="${i}"><img src="${src}" alt="${tag}试穿记录"><span class="tag">${tag}</span><span class="heart">${fav?"♥":"♡"}</span></button>`).join("")}</div>`;
}

function profilePage() {
  return `<div class="profile-head"><img class="avatar" src="assets/hero-young-v2.webp" alt="用户头像"><div><h2>林汐 <span class="vip">会员 · 尊享版</span></h2><p>探索更适合我的穿搭风格</p></div><button class="icon-btn" data-action="settings">›</button></div>
  <div class="member-card"><div class="top"><h3>♛ 会员权益</h3><button data-action="upgrade">续费升级 ›</button></div><div class="quota"><div><span>本月试穿次数</span><b>24 / 50 次</b></div><div><span>剩余有效期</span><b>28 天</b></div></div></div>
  <div class="profile-stats">
    <button class="stat-card" data-action="open-wardrobe"><b>15</b><span>我的收藏</span></button>
    <button class="stat-card" data-action="smart-style"><b>3</b><span>搭配方案</span></button>
    <button class="stat-card" data-action="open-wardrobe"><b>${state.records}</b><span>试穿记录</span></button>
  </div>
  <div class="menu-list">
    <button class="menu-item" data-action="style-pref"><span>♙</span><b>风格偏好</b><small>简约 · 通勤 · 质感中性 ›</small></button>
    <button class="menu-item" data-action="photo-archive"><span>▧</span><b>个人照片档案</b><small>已上传 1 张 ›</small></button>
  </div>
  <div class="menu-list">
    <button class="menu-item" data-action="message"><span>♧</span><b>消息通知</b><small>2 条未读 ›</small></button>
    <button class="menu-item" data-action="privacy"><span>▣</span><b>隐私设置</b><small>›</small></button>
    <button class="menu-item" data-action="help"><span>?</span><b>帮助反馈</b><small>›</small></button>
  </div>`;
}

function settingsPage() {
  return `<div class="settings-section"><h3>照片与试穿记录</h3><div class="menu-list"><button class="menu-item" data-action="photo-archive"><span>▧</span><b>照片管理</b><small>共 1 张 ›</small></button><button class="menu-item" data-action="clear-records"><span>♜</span><b>删除试穿记录</b><small>可批量清理 ›</small></button></div></div>
  <div class="settings-section"><h3>隐私与安全</h3><div class="menu-list"><button class="menu-item" data-action="privacy"><span>▣</span><b>隐私与授权</b><small>相机、相册、数据权限 ›</small></button><button class="menu-item" data-action="account"><span>◉</span><b>账号与安全</b><small>手机号、密码、登录管理 ›</small></button></div></div>
  <div class="settings-section"><h3>服务与帮助</h3><div class="menu-list"><button class="menu-item" data-action="help"><span>?</span><b>客服帮助</b><small>在线咨询 · 常见问题 ›</small></button></div></div>
  <button class="danger-btn" data-action="logout">↪ 退出登录</button>
  <p style="text-align:center;color:#999;font-size:10px;margin-top:26px">TRY ON｜试一试　v1.0 原型演示</p>`;
}

function bindInputs() {
  document.querySelectorAll("input[data-file]").forEach(input => {
    input.addEventListener("change", event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return toast("请选择图片文件");
      const url = URL.createObjectURL(file);
      if (input.dataset.file === "product") {
        state.productSrc = url;
        state.productName = file.name.replace(/\.[^.]+$/, "").slice(0, 12) || "上传的服装";
        go("recognition");
      } else {
        state.personSrc = url;
        go("photoGuide");
      }
    }, { once: true });
  });
  document.querySelectorAll("input[data-body-field]").forEach(input => {
    input.addEventListener("input", () => { state.bodyData[input.dataset.bodyField] = input.value; });
  });
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
  if (record) { state.resultSrc = [state.resultSrc,"assets/inspire-urban-v2.webp","assets/inspire-cool-v2.webp","assets/inspire-soft-v2.webp"][Number(record.dataset.record)] || state.resultSrc; go("result"); return; }
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const actions = {
    start: () => go("home"),
    back,
    "start-flow": () => go("upload"),
    "open-wardrobe": () => go("wardrobe"),
    "demo-product": () => { state.productSrc="assets/garment-clean.webp"; state.productName="短款翻领夹克"; go("recognition"); },
    "history-product": () => openModal("历史商品", `<p>你的示例商品已保留。首版将支持按来源平台、类别和收藏状态筛选。</p><button class="option-row" data-action="demo-product"><span class="row-icon">♧</span><span><b>短款翻领夹克</b><small>上衣 · 示例商品</small></span><span class="chev">›</span></button>`),
    "recrop": () => toast("已重置裁剪区域"),
    "edit-recognition": () => go("category"),
    "recognition-next": () => go("category"),
    "category-next": () => go("bodyData"),
    "generate-avatar": () => {
      if (!state.bodyData.height || !state.bodyData.weight) return toast("请先填写身高和体重");
      state.avatarProgress = 0;
      go("avatarGenerating");
    },
    "avatar-adjust": () => go("bodyData"),
    "avatar-use": () => { state.personSrc="assets/avatar-body-v2.webp"; go("confirm"); },
    "avatar-upload-photo": () => go("personUpload"),
    "favorite-avatar": () => toast("数字形象已收藏"),
    "measure-help": () => openModal("身体数据测量方法", `<p><b>肩宽：</b>左右肩峰之间的直线距离。</p><p><b>胸围：</b>胸部最丰满处水平一周。</p><p><b>腰围：</b>自然腰线最细处水平一周。</p><p><b>臀围：</b>臀部最丰满处水平一周。</p>`),
    "demo-person": () => { state.personSrc="assets/person-clean.webp"; go("photoGuide"); },
    "person-reselect": () => go("personUpload"),
    "photo-next": () => go("confirm"),
    generate: () => { state.progress=0; go("generating"); },
    favorite: () => { state.favorite=!state.favorite; render(); toast(state.favorite ? "已收藏" : "已取消收藏"); },
    download: () => { const a=document.createElement("a"); a.href=state.resultSrc; a.download="TRY-ON-试穿预览.webp"; a.click(); toast("已开始下载预览图"); },
    compare: () => go("compare"),
    share: () => navigator.share ? navigator.share({title:"TRY ON 试穿预览",text:"看看我的 AI 试穿效果"}).catch(()=>{}) : toast("分享卡片已准备好"),
    again: () => go("confirm"),
    save: () => { state.records += 1; localStorage.setItem("tryon-records", String(state.records)); go("saved"); },
    detail: () => openModal("细节查看", `<img src="${state.resultSrc}" alt="试穿细节" style="width:100%;max-height:420px;object-fit:cover;border-radius:16px"><p>细节图用于辅助观察轮廓与配色。面料肌理、纽扣与褶皱请以商品原图为准。</p>`),
    "smart-style": () => openModal("智能搭配", `<p>根据你当前选择的米白上衣，推荐轻酷叠穿、奶油柔光与先锋极简三种方向。</p><div class="look-row">${lookCard("assets/inspire-urban-v2.webp","轻酷叠穿","look-urban")}${lookCard("assets/inspire-soft-v2.webp","奶油柔光","look-soft")}${lookCard("assets/inspire-cool-v2.webp","先锋极简","look-cool")}</div>`),
    settings: () => go("settings"),
    privacy: () => openModal("照片用途与隐私", `<p><b>用途：</b>个人照片和商品图片仅用于生成试穿视觉预览。</p><p><b>控制：</b>你可以在照片管理与试穿记录中查看、更换或删除内容。</p><p><b>边界：</b>正式接入第三方 AI 服务前，会另行说明处理方、保存期限与删除机制。</p>`),
    "style-pref": () => openModal("选择风格偏好", `<div class="chips" style="margin:12px 0 20px"><button class="chip active">简约</button><button class="chip active">通勤</button><button class="chip">复古</button><button class="chip">中性</button><button class="chip">运动</button><button class="chip">甜美</button></div>`, `<button class="primary-btn full" data-action="close-modal">保存偏好</button>`),
    "photo-archive": () => openModal("个人照片档案", `<div class="selected-photo"><img src="${state.personSrc}" alt="个人照片"><div><b>默认全身照</b><p>✓ 可用于再次试穿</p></div></div><p>原型演示中照片只保留在当前浏览器会话；正式版将提供保存期限和一键删除。</p>`),
    more: () => openModal("更多操作", `<div class="option-list"><button class="option-row" data-action="privacy"><span class="row-icon">▣</span><span><b>隐私说明</b></span><span class="chev">›</span></button><button class="option-row" data-action="help"><span class="row-icon">?</span><span><b>使用帮助</b></span><span class="chev">›</span></button></div>`),
    help: () => openModal("使用帮助", `<p>推荐流程：上传商品截图 → 确认识别与类别 → 填写身体数据 → 生成个人全身照 → AI试穿 → 对比并保存。</p><p>如果识别不准确，可以重新裁剪或手动修改类别。</p>`),
    message: () => toast("暂无新的系统消息"),
    upgrade: () => toast("会员升级功能暂未开放"),
    manage: () => toast("已进入批量管理模式"),
    swap: () => toast("已切换对比视图"),
    "clear-records": () => openModal("删除试穿记录", `<p>原型不会实际删除你的源图片。确认后将把本地演示记录恢复为 0 条。</p>`, `<div class="button-row"><button class="ghost-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="confirm-clear">确认删除</button></div>`),
    "confirm-clear": () => { state.records=0; localStorage.setItem("tryon-records","0"); closeModal(); toast("试穿记录已清理"); },
    account: () => toast("账号安全设置为演示状态"),
    logout: () => { state.screen="welcome"; state.history=[]; render(); toast("已退出原型体验"); },
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
render();
