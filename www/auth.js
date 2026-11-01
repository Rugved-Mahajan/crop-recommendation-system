(function () {
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => window.I18N.t(k, v);
  const USERS_KEY = "ca_users", SESSION_KEY = "ca_session";
  let mode = "login";

  // ---------- storage helpers ----------
  function load(k, store) { try { return JSON.parse((store || localStorage).getItem(k)); } catch (e) { return null; } }
  function save(k, v, store) { try { (store || localStorage).setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  const getUsers = () => load(USERS_KEY) || {};

  // ---------- password hashing (PBKDF2 via Web Crypto) ----------
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function hash(pw, saltB64) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(saltB64), iterations: 150000 }, key, 256);
    return b64(bits);
  }
  const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

  // ---------- session ----------
  const currentUser = () => load(SESSION_KEY) || load(SESSION_KEY, sessionStorage);
  function startSession(username, remember) {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    save(SESSION_KEY, username, remember ? localStorage : sessionStorage);
    unlock(username);
  }
  function logout() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    lock();
  }
  function unlock(username) {
    const u = getUsers()[username];
    $("who").textContent = t("auth.hi", { name: (u && u.name) || username });
    document.body.classList.remove("locked");
    window.scrollTo({ top: 0 });
  }
  function lock() {
    document.body.classList.add("locked");
    $("aPass").value = ""; $("aPass2").value = "";
    setMode("login");
  }

  // ---------- UI ----------
  function msg(t) { const e = $("aErr"); e.textContent = t || ""; e.hidden = !t; }
  function setMode(m) {
    mode = m; msg("");
    const s = m === "signup";
    $("aTitle").textContent = s ? t("auth.create") : t("auth.welcome");
    $("aSub").textContent = s ? t("auth.subSignup") : t("auth.subLogin");
    $("aNameRow").hidden = !s; $("aPass2Row").hidden = !s;
    $("aSubmit").textContent = s ? t("auth.signup") : t("auth.login");
    $("aSwitchTxt").textContent = s ? t("auth.haveAcc") : t("auth.newHere");
    $("aSwitch").textContent = s ? t("auth.login") : t("auth.create");
    $("aPass").autocomplete = s ? "new-password" : "current-password";
  }

  async function submit(e) {
    e.preventDefault(); msg("");
    if (!(window.crypto && crypto.subtle)) { msg(t("auth.eSecure")); return; }
    const username = $("aUser").value.trim().toLowerCase(), pw = $("aPass").value, remember = $("aRemember").checked;
    if (!/^[a-z0-9_.-]{3,20}$/.test(username)) { msg(t("auth.eUser")); return; }
    if (pw.length < 6) { msg(t("auth.ePass")); return; }
    const btn = $("aSubmit"); btn.disabled = true;
    try {
      const users = getUsers();
      if (mode === "signup") {
        if (users[username]) { msg(t("auth.eTaken")); return; }
        if (pw !== $("aPass2").value) { msg(t("auth.eMatch")); return; }
        const salt = newSalt();
        users[username] = { name: $("aName").value.trim() || username, salt, hash: await hash(pw, salt), created: Date.now() };
        if (!save(USERS_KEY, users)) { msg(t("auth.eSave")); return; }
        startSession(username, remember);
      } else {
        const u = users[username];
        if (!u || (await hash(pw, u.salt)) !== u.hash) { msg(t("auth.eWrong")); return; }
        startSession(username, remember);
      }
    } catch (err) {
      msg(t("auth.eGeneric"));
    } finally { btn.disabled = false; }
  }

  $("aForm").addEventListener("submit", submit);
  $("aSwitch").addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
  $("aShow").addEventListener("change", (e) => { $("aPass").type = $("aPass2").type = e.target.checked ? "text" : "password"; });
  $("logoutBtn").addEventListener("click", logout);

  // re-translate when the language changes
  window.addEventListener("langchange", () => {
    setMode(mode);
    const cu2 = currentUser();
    if (cu2 && getUsers()[cu2] && !document.body.classList.contains("locked")) unlock(cu2);
  });

  // ---------- boot ----------
  setMode("login");
  const cu = currentUser();
  if (cu && getUsers()[cu]) unlock(cu); else lock();
})();
