import { signInWithGoogle, signOut, onAuthStateChange, currentSession } from "./firebase-client.js";
import { getCredits, generate, startCardCharge, submitChargeAuthorization } from "./api.js";
import { PLANS } from "./plans.js";
import { LEGAL } from "./legal.js";
import { Icon } from "./icons.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  session: null,
  view: "create",
  sidebarCollapsed: false,
  drawerOpen: false,
  credits: null,
  generating: false,
  lastResult: null,
  history: JSON.parse(localStorage.getItem("wyte_local_gallery") || "[]"),
};

const NAV = [
  { id: "create", label: "Create", icon: "sparkle" },
  { id: "suggestions", label: "Suggestions", icon: "bulb", mobileLabel: "Ideas" },
  { id: "templates", label: "Templates", icon: "grid" },
  { id: "gallery", label: "Gallery", icon: "gallery" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "brandkit", label: "Brand Kit", icon: "brand" },
  { id: "pricing", label: "Pricing", icon: "bolt" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const el = (sel) => document.querySelector(sel);
const root = () => el("#view-root");

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function toast(message) {
  const host = el("#toast-root");
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add("leave");
    setTimeout(() => node.remove(), 250);
  }, 3200);
}

// ---------------------------------------------------------------------------
// Modal (used for the Help & Support dialog, mirrors the AlertDialog)
// ---------------------------------------------------------------------------
function openModal({ title, body, actionLabel = "Close" }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${title}</h3>
      <p>${body}</p>
      <div class="modal-actions"><button class="btn btn-outline" data-close>${actionLabel}</button></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));
  const close = () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.hasAttribute("data-close")) close();
  });
}

// ---------------------------------------------------------------------------
// Auth gate — Welcome vs App shell
// ---------------------------------------------------------------------------
async function boot() {
  state.session = await currentSession();
  render();
  onAuthStateChange((session) => {
    state.session = session;
    render();
  });
}

function render() {
  if (!state.session) {
    renderWelcome();
  } else {
    renderShell();
  }
}

// ---------------------------------------------------------------------------
// Welcome screen
// ---------------------------------------------------------------------------
function renderWelcome() {
  el("#app-shell").classList.remove("active");
  const w = el("#welcome");
  w.style.display = "flex";
  w.innerHTML = `
    <div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>
    <div class="welcome-inner">
      <div class="brandmark">
        <svg viewBox="0 0 512 512"><path class="strokepath" d="M92 130L158 382L256 218L354 382L420 130"/></svg>
        <div class="wordmark">WYTE AI</div>
      </div>
      <h1 class="hero-title">Turn ideas into visuals<br>people remember.</h1>
      <p class="hero-sub">A premium AI creative studio for products, campaigns, brands and imagination.</p>
      <div class="hero-cta">
        <button class="btn btn-primary" id="google-signin">${Icon.google(20)} Continue with Google</button>
      </div>
      <div class="hero-links">
        <button data-legal="privacy">Privacy</button>
        <button data-legal="terms">Terms</button>
        <button data-legal="security">Security</button>
      </div>
      <div class="hero-pills">
        <span class="pill">Premium image creation</span>
        <span class="pill">Campaign Mode</span>
        <span class="pill">Brand memory</span>
        <span class="pill">Fast workflow</span>
      </div>
    </div>
  `;

  el("#google-signin").addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      toast(`Google sign-in failed: ${e.message || e}`);
    }
  });
  w.querySelectorAll("[data-legal]").forEach((btn) =>
    btn.addEventListener("click", () => showLegalStandalone(btn.dataset.legal))
  );

  // subtle cursor parallax on the aurora blobs — the signature ambient touch
  const blobs = w.querySelectorAll(".blob");
  w.onmousemove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 24;
    const y = (e.clientY / window.innerHeight - 0.5) * 24;
    blobs.forEach((b, i) => {
      const f = (i + 1) * 0.5;
      b.style.transform = `translate(${x * f}px, ${y * f}px)`;
    });
  };
}

function showLegalStandalone(key) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.alignItems = "flex-start";
  overlay.innerHTML = `<div class="modal" style="max-width:640px;max-height:80vh;overflow:auto;margin-top:6vh;">${legalHTML(key, true)}</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("open");
      setTimeout(() => overlay.remove(), 200);
    }
  });
  overlay.querySelector("[data-close-legal]")?.addEventListener("click", () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  });
}

// ---------------------------------------------------------------------------
// App shell (sidebar / topbar / bottomnav / drawer)
// ---------------------------------------------------------------------------
function renderShell() {
  el("#welcome").style.display = "none";
  const shell = el("#app-shell");
  shell.classList.add("active");
  shell.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-head">
        <div class="brand">WYTE AI</div>
        <button class="icon-btn" id="collapse-btn" title="Toggle menu">${Icon.menu(18)}</button>
      </div>
      <nav class="nav-list" id="nav-list"></nav>
      <div class="sidebar-foot">
        <button class="nav-item" id="signout-desktop">${Icon.logout(20)}<span>Sign out</span></button>
      </div>
    </aside>

    <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
      <div class="topbar">
        <button class="icon-btn" id="drawer-open">${Icon.menu(20)}</button>
        <div class="brand">WYTE AI</div>
        <div class="topbar-actions">
          <button class="icon-btn" id="topbar-pricing" title="Pricing">${Icon.bolt(20)}</button>
          <button class="icon-btn" id="topbar-account" title="Account">${Icon.user(20)}</button>
        </div>
      </div>
      <main id="view-root"></main>
      <nav class="bottomnav">
        <div class="bottomnav-row" id="bottomnav-row"></div>
      </nav>
    </div>
  `;

  buildNav();
  el("#collapse-btn").addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    el("#sidebar").classList.toggle("collapsed", state.sidebarCollapsed);
  });
  el("#signout-desktop").addEventListener("click", doSignOut);
  el("#drawer-open").addEventListener("click", openDrawer);
  el("#topbar-pricing").addEventListener("click", () => navigate("pricing"));
  el("#topbar-account").addEventListener("click", () => navigate("settings"));

  navigate(state.view);
}

function buildNav() {
  const list = el("#nav-list");
  list.innerHTML = NAV.map(
    (n) => `<button class="nav-item" data-nav="${n.id}">${Icon[n.icon](20)}<span>${n.label}</span></button>`
  ).join("");
  list.querySelectorAll("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => navigate(b.dataset.nav))
  );

  const bottom = el("#bottomnav-row");
  bottom.innerHTML = NAV.slice(0, 4)
    .map((n) => `<button class="nav-item" data-nav="${n.id}">${Icon[n.icon](20)}<span>${n.mobileLabel || n.label}</span></button>`)
    .join("");
  bottom.querySelectorAll("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => navigate(b.dataset.nav))
  );
}

function openDrawer() {
  closeDrawer();
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  const drawer = document.createElement("div");
  drawer.className = "drawer";
  drawer.innerHTML = `
    <div class="brand">WYTE AI</div>
    ${NAV.map((n) => `<button class="nav-item" data-nav="${n.id}">${Icon[n.icon](20)}<span>${n.label}</span></button>`).join("")}
    <div style="flex:1"></div>
    <button class="nav-item" id="drawer-signout">${Icon.logout(20)}<span>Sign out</span></button>
  `;
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  requestAnimationFrame(() => {
    overlay.classList.add("open");
    drawer.classList.add("open");
  });
  overlay.addEventListener("click", closeDrawer);
  drawer.querySelectorAll("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => {
      navigate(b.dataset.nav);
      closeDrawer();
    })
  );
  drawer.querySelector("#drawer-signout").addEventListener("click", doSignOut);
}
function closeDrawer() {
  document.querySelectorAll(".drawer-overlay, .drawer").forEach((n) => n.remove());
}

async function doSignOut() {
  closeDrawer();
  await signOut();
}

function navigate(view) {
  state.view = view;
  el("#nav-list")?.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
  el("#bottomnav-row")?.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.nav === view));

  const views = {
    create: renderCreate,
    suggestions: renderSuggestions,
    templates: renderTemplates,
    gallery: renderGallery,
    projects: () => renderSimpleRoom("Projects", "folder", "Organize your campaigns, product launches and creative work."),
    brandkit: () => renderSimpleRoom("Brand Kit", "brand", "Keep your brand style, colors, logo and visual direction ready for every creation."),
    pricing: renderPricing,
    settings: renderSettings,
  };
  (views[view] || views.create)();
  root().scrollTo?.({ top: 0 });
}

// ---------------------------------------------------------------------------
// Create workspace
// ---------------------------------------------------------------------------
const PHASES = ["Understanding your idea…", "Choosing the best model…", "Creating your composition…", "Polishing details…"];

async function renderCreate() {
  root().innerHTML = `
    <div class="room">
      <div class="create-head">
        <div>
          <div class="create-title">Create something amazing</div>
          <p class="room-sub">Your idea is the starting point. Wyte AI handles the creative heavy lifting.</p>
          <div id="credits-badge" style="margin-top:10px;"></div>
        </div>
      </div>

      <div class="create-toolbar">
        <button class="chip" id="chip-ref">${Icon.image(16)} Reference</button>
        <button class="chip" id="chip-aspect">${Icon.aspect(16)} 1:1</button>
        <button class="chip" id="chip-auto">${Icon.sparkle(16)} Auto AI</button>
      </div>

      <div class="prompt-shell" id="prompt-shell">
        <span class="prompt-icon">${Icon.sparkle(20)}</span>
        <textarea id="prompt-input" placeholder="Describe what you want… e.g. luxury product campaign for a skincare brand in Lagos"></textarea>
      </div>

      <div id="progress-slot"></div>

      <button class="btn btn-primary btn-block generate-btn" id="generate-btn">${Icon.sparkle(18)} Generate ✨</button>

      <div id="result-slot"></div>

      <div class="recent-head">Recent creations</div>
      <div class="grid-tiles" id="recent-grid"></div>
    </div>
  `;

  el("#chip-ref").addEventListener("click", () => toast("Reference upload is ready for the storage connector."));
  el("#chip-aspect").addEventListener("click", () => toast("Aspect ratio: 1:1"));
  el("#chip-auto").addEventListener("click", () => toast("Auto selects the best available model."));

  renderRecent();
  refreshCreditsBadge();

  el("#generate-btn").addEventListener("click", runGenerate);
  el("#prompt-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runGenerate();
  });
}

async function refreshCreditsBadge() {
  const slot = el("#credits-badge");
  if (!slot) return;
  try {
    const data = await getCredits();
    state.credits = data.credits;
    slot.innerHTML = `<span class="badge-credits">${Icon.bolt(14)} ${state.credits} credits left</span>`;
  } catch {
    // Credit balance is a convenience display; ignore failures silently.
  }
}

function renderRecent() {
  const grid = el("#recent-grid");
  if (!grid) return;
  const items = state.history.slice(0, 4);
  if (items.length === 0) {
    grid.innerHTML = Array.from({ length: 4 })
      .map(() => `<div class="tile">${Icon.image(30)}</div>`)
      .join("");
    return;
  }
  grid.innerHTML = items
    .map(
      (it) => `<div class="tile" data-open="${it.imageUrl}"><img src="${it.imageUrl}" alt="${escapeAttr(it.prompt)}"><span class="tile-tag">${it.model || "auto"}</span></div>`
    )
    .join("");
  grid.querySelectorAll("[data-open]").forEach((t) =>
    t.addEventListener("click", () => window.open(t.dataset.open, "_blank"))
  );
}

async function runGenerate() {
  if (state.generating) return;
  const input = el("#prompt-input");
  const prompt = input.value.trim();
  if (!prompt) {
    toast("Describe what you want to create first.");
    return;
  }

  state.generating = true;
  el("#prompt-shell").classList.add("generating");
  const btn = el("#generate-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spin-loader"></span> Creating…`;

  let phase = 0;
  const progressSlot = el("#progress-slot");
  const paintPhase = () => {
    progressSlot.innerHTML = `
      <div class="progress-card">
        <span class="progress-spin">${Icon.sparkle(26)}</span>
        <div class="progress-label">${PHASES[phase]}</div>
        <div class="progress-track"><i></i></div>
      </div>`;
  };
  paintPhase();
  const timer = setInterval(() => {
    phase = (phase + 1) % PHASES.length;
    paintPhase();
  }, 1100);

  try {
    const result = await generate({ prompt });
    clearInterval(timer);
    progressSlot.innerHTML = "";
    if (result.imageUrl) {
      state.history.unshift({ prompt, imageUrl: result.imageUrl, model: result.model, ts: Date.now() });
      state.history = state.history.slice(0, 24);
      localStorage.setItem("wyte_local_gallery", JSON.stringify(state.history));
      el("#result-slot").innerHTML = `
        <div class="result-card">
          <img src="${result.imageUrl}" alt="${escapeAttr(prompt)}">
          <div class="result-meta"><span>${result.model || "auto"}</span><span>${result.creditsUsed ?? ""} credit${result.creditsUsed === 1 ? "" : "s"} used</span></div>
        </div>`;
      renderRecent();
      toast("Your image is ready.");
    } else {
      toast("Generation completed.");
    }
  } catch (e) {
    clearInterval(timer);
    progressSlot.innerHTML = "";
    toast(e.message || String(e));
  } finally {
    state.generating = false;
    el("#prompt-shell")?.classList.remove("generating");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${Icon.sparkle(18)} Generate ✨`;
    }
    refreshCreditsBadge();
  }
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Suggestion Room / Template Room
// ---------------------------------------------------------------------------
const SUGGESTIONS = [
  "Luxury skincare campaign",
  "Streetwear campaign in Lagos",
  "Premium restaurant launch",
  "Tech product hero image",
  "Cinematic travel poster",
  "Real-estate social campaign",
];
const TEMPLATES = ["Product Ad", "Instagram Story", "WhatsApp Flyer", "YouTube Thumbnail", "Fashion Editorial", "Event Poster", "Website Hero", "Campaign Pack"];

function renderSuggestions() {
  root().innerHTML = roomShell("Suggestion Room", "Need inspiration? Start with a direction and make it yours.",
    `<div class="choice-grid" id="choice-grid">${SUGGESTIONS.map((s) => choiceCard(s, "bulb")).join("")}</div>`);
  wireChoiceCards();
}
function renderTemplates() {
  root().innerHTML = roomShell("Template Room", "Start faster with polished creative directions.",
    `<div class="choice-grid" id="choice-grid">${TEMPLATES.map((s) => choiceCard(s, "grid")).join("")}</div>`);
  wireChoiceCards();
}
function choiceCard(title, icon) {
  return `<button class="choice-card" data-title="${escapeAttr(title)}">${Icon[icon](22)}<span>${title}</span></button>`;
}
function wireChoiceCards() {
  el("#choice-grid").querySelectorAll("[data-title]").forEach((card) =>
    card.addEventListener("click", () => {
      toast(`${card.dataset.title} selected — open Create to continue.`);
      navigate("create");
      setTimeout(() => {
        const input = el("#prompt-input");
        if (input && !input.value) input.value = card.dataset.title;
      }, 30);
    })
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
function renderGallery() {
  const items = state.history;
  const tiles = items.length
    ? items.map((it) => `<div class="tile" data-open="${it.imageUrl}"><img src="${it.imageUrl}" alt="${escapeAttr(it.prompt)}"><span class="tile-tag">${it.model || "auto"}</span></div>`).join("")
    : Array.from({ length: 8 }).map(() => `<div class="tile">${Icon.image(32)}</div>`).join("");
  root().innerHTML = roomShell("Gallery", "Your creations, ready to revisit, remix or share.", `<div class="grid-tiles">${tiles}</div>`);
  root().querySelectorAll("[data-open]").forEach((t) => t.addEventListener("click", () => window.open(t.dataset.open, "_blank")));
  if (!items.length) {
    root().querySelectorAll(".tile").forEach((t) =>
      t.addEventListener("click", () => toast("Open generation details here when an image is available."))
    );
  }
}

// ---------------------------------------------------------------------------
// Simple room (Projects / Brand Kit)
// ---------------------------------------------------------------------------
function renderSimpleRoom(title, icon, description) {
  root().innerHTML = roomShell(title, description,
    `<div class="card simple-card">${Icon[icon](46)}<p>Ready for your content.</p></div>`);
}

function roomShell(title, subtitle, body) {
  return `<div class="room"><div class="room-title">${title}</div><p class="room-sub">${subtitle}</p><div class="room-body">${body}</div></div>`;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
function renderPricing() {
  const planCard = (plan, featured) => `
    <div class="card plan-card ${featured ? "featured" : ""}">
      ${featured ? `<span class="plan-badge">MOST POWERFUL</span>` : ""}
      <div class="plan-name">${plan.name}</div>
      <p class="plan-tagline">${plan.tagline}</p>
      <div class="plan-price">${plan.price}</div>
      <div class="plan-cadence">${plan.credits} credits ${plan.cadence}</div>
      <div class="plan-features">${plan.features.map((f) => `<div>${Icon.check(16)}<span>${f}</span></div>`).join("")}</div>
      ${featured ? `<button class="btn btn-primary btn-block" id="upgrade-btn">Upgrade to Pro</button>` : ""}
    </div>`;

  root().innerHTML = `
    <div class="room">
      <div class="pricing-head">
        <h2>Choose your creative power</h2>
        <p>Start free. Upgrade when you want more control, speed and creative depth.</p>
      </div>
      <div class="plans-wrap">
        ${planCard(PLANS.free, false)}
        ${planCard(PLANS.pro, true)}
      </div>
    </div>`;

  el("#upgrade-btn")?.addEventListener("click", openCardCheckout);
}

// ---------------------------------------------------------------------------
// Card checkout (Flutterwave v4) — collects card details inline, then walks
// through whatever authorization step(s) the charge requires (PIN, OTP,
// billing-address/AVS, or a bank redirect for 3-D Secure).
// ---------------------------------------------------------------------------
function openCardCheckout() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>Upgrade to Pro</h3>
      <div id="checkout-step"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));
  const close = () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 200);
  };
  const step = () => overlay.querySelector("#checkout-step");

  renderCardStep();

  function renderCardStep() {
    step().innerHTML = `
      <p class="room-sub" style="margin:0 0 14px;">Enter your card details to activate Pro.</p>
      <label class="field-label">Currency
        <select id="cc-currency" class="field-input">
          <option value="NGN">NGN — ₦10,000</option>
          <option value="USD">USD — $10</option>
        </select>
      </label>
      <label class="field-label">Card number
        <input id="cc-number" class="field-input" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242">
      </label>
      <div style="display:flex;gap:10px;">
        <label class="field-label" style="flex:1;">Expiry month
          <input id="cc-exp-month" class="field-input" inputmode="numeric" autocomplete="cc-exp-month" placeholder="MM" maxlength="2">
        </label>
        <label class="field-label" style="flex:1;">Expiry year
          <input id="cc-exp-year" class="field-input" inputmode="numeric" autocomplete="cc-exp-year" placeholder="YYYY" maxlength="4">
        </label>
        <label class="field-label" style="flex:1;">CVV
          <input id="cc-cvv" class="field-input" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4">
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-close>Cancel</button>
        <button class="btn btn-primary" id="cc-submit">Pay</button>
      </div>`;
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("#cc-submit").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const currency = overlay.querySelector("#cc-currency").value;
      const card = {
        number: overlay.querySelector("#cc-number").value.replace(/\s+/g, ""),
        expiryMonth: overlay.querySelector("#cc-exp-month").value.trim(),
        expiryYear: overlay.querySelector("#cc-exp-year").value.trim(),
        cvv: overlay.querySelector("#cc-cvv").value.trim(),
      };
      if (!card.number || !card.expiryMonth || !card.expiryYear || !card.cvv) {
        toast("Fill in every card field.");
        return;
      }
      btn.disabled = true;
      btn.innerHTML = `<span class="spin-loader"></span> Processing…`;
      try {
        const result = await startCardCharge({ currency, card });
        handleChargeResult(result);
      } catch (err) {
        toast(err.message || String(err));
        btn.disabled = false;
        btn.textContent = "Pay";
      }
    });
  }

  function handleChargeResult(result) {
    const { chargeId, status, nextAction } = result;
    if (nextAction?.type === "redirect_url") {
      step().innerHTML = `<p class="room-sub">Redirecting you to your bank to confirm this payment…</p>`;
      window.location.href = nextAction.redirect_url.url;
      return;
    }
    if (nextAction?.type === "authorize") {
      renderAuthorizeStep(chargeId, nextAction.authorization?.type);
      return;
    }
    if (nextAction?.type === "payment_instruction") {
      step().innerHTML = `
        <p class="room-sub">${nextAction.payment_instruction?.note || "Follow the instructions to complete payment."}</p>
        <div class="modal-actions"><button class="btn btn-outline" data-close>Close</button></div>`;
      step().querySelector("[data-close]").addEventListener("click", close);
      return;
    }
    if (status === "succeeded") {
      step().innerHTML = `<p class="room-sub">Payment received — activating Pro…</p>`;
      setTimeout(() => {
        close();
        refreshCreditsBadge();
        navigate("pricing");
      }, 1500);
      return;
    }
    step().innerHTML = `<p class="room-sub">Payment is processing. We'll email you once it's confirmed.</p>
      <div class="modal-actions"><button class="btn btn-outline" data-close>Close</button></div>`;
    step().querySelector("[data-close]").addEventListener("click", close);
  }

  function renderAuthorizeStep(chargeId, type) {
    const fields = {
      pin: `<label class="field-label">Card PIN<input id="auth-value" class="field-input" inputmode="numeric" maxlength="6"></label>`,
      otp: `<label class="field-label">One-time code (OTP)<input id="auth-value" class="field-input" inputmode="numeric" maxlength="8"></label>`,
      avs: `
        <label class="field-label">Country<input id="auth-country" class="field-input" placeholder="US"></label>
        <label class="field-label">City<input id="auth-city" class="field-input"></label>
        <label class="field-label">State<input id="auth-state" class="field-input"></label>
        <label class="field-label">Postal code<input id="auth-postal" class="field-input"></label>
        <label class="field-label">Address line 1<input id="auth-line1" class="field-input"></label>`,
    };
    step().innerHTML = `
      <p class="room-sub" style="margin:0 0 14px;">Your bank needs one more thing to confirm this payment.</p>
      ${fields[type] || `<p class="room-sub">Unsupported verification step (${escapeAttr(type)}).</p>`}
      <div class="modal-actions">
        <button class="btn btn-outline" data-close>Cancel</button>
        <button class="btn btn-primary" id="auth-submit" ${fields[type] ? "" : "disabled"}>Confirm</button>
      </div>`;
    step().querySelector("[data-close]").addEventListener("click", close);
    step().querySelector("#auth-submit")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `<span class="spin-loader"></span>`;
      try {
        let payload = { chargeId, type };
        if (type === "pin") payload.pin = step().querySelector("#auth-value").value.trim();
        else if (type === "otp") payload.code = step().querySelector("#auth-value").value.trim();
        else if (type === "avs") {
          payload.address = {
            country: step().querySelector("#auth-country").value.trim(),
            city: step().querySelector("#auth-city").value.trim(),
            state: step().querySelector("#auth-state").value.trim(),
            postalCode: step().querySelector("#auth-postal").value.trim(),
            line1: step().querySelector("#auth-line1").value.trim(),
          };
        }
        const result = await submitChargeAuthorization(payload);
        handleChargeResult({ chargeId, status: result.status, nextAction: result.nextAction });
      } catch (err) {
        toast(err.message || String(err));
        btn.disabled = false;
        btn.textContent = "Confirm";
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Settings + legal pages
// ---------------------------------------------------------------------------
function renderSettings() {
  root().innerHTML = roomShell("Settings", "Account, privacy and trust controls.", `
    <div class="card" style="padding:8px 20px;">
      <div class="settings-row" data-legal="privacy">${Icon.shield(20)}<span>Privacy Policy</span></div>
      <div class="settings-row" data-legal="terms">${Icon.gavel(20)}<span>Terms of Service</span></div>
      <div class="settings-row" data-legal="security">${Icon.lock(20)}<span>Security</span></div>
      <div class="settings-row" id="help-row">${Icon.help(20)}<span>Help &amp; Support</span></div>
    </div>
  `);
  root().querySelectorAll("[data-legal]").forEach((row) =>
    row.addEventListener("click", () => renderLegal(row.dataset.legal))
  );
  el("#help-row").addEventListener("click", () =>
    openModal({ title: "Wyte AI Support", body: "Add your support email or help center URL before launch." })
  );
}

function legalHTML(key, standalone = false) {
  const doc = LEGAL[key];
  return `
    ${standalone ? `<button class="back-link" data-close-legal>${Icon.close(16)} Close</button>` : ""}
    <div class="room" style="padding:0;">
      ${Icon[doc.icon](42)}
      <div class="room-title" style="margin-top:16px;font-size:28px;">${doc.title}</div>
      ${doc.sections.map((s) => `<div class="legal-section"><h3>${s.title}</h3><p>${s.body}</p></div>`).join("")}
    </div>`;
}

function renderLegal(key) {
  root().innerHTML = `<div class="room"><button class="back-link" id="legal-back">${Icon.chevronLeft(16)} Back to Settings</button>${legalHTML(key)}</div>`;
  el("#legal-back").addEventListener("click", () => navigate("settings"));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
boot();
