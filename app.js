const CSV_URL =
  new URLSearchParams(window.location.search).get("csv") ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8Y_oUGMr7Va9oOsiGIJIuCip20ieVmritCf67ThHu-aDLKEH0e-6NyZL8AAAuPz0oXS0rJSGNGKXr/pub?output=csv";

const STORAGE_KEY = "chop_ton_stage_contributions_v1";
const STRUCTURE_EDITS_KEY = "chop_ton_stage_structure_edits_v1";
const ACCOUNT_PROFILE_KEY = "chop_ton_stage_account_profile_v1";
const TRACKING_BY_USER_KEY = "chop_ton_stage_tracking_by_user_v1";
const SUPABASE_MIGRATION_DONE_KEY = "chop_ton_stage_supabase_migration_done_v1";
const API_BASE = "/api";
const APP_CONFIG = window.CHOP_CONFIG || {};
const SUPABASE_URL = typeof APP_CONFIG.supabaseUrl === "string" ? APP_CONFIG.supabaseUrl.trim() : "";
const SUPABASE_ANON_KEY = typeof APP_CONFIG.supabaseAnonKey === "string" ? APP_CONFIG.supabaseAnonKey.trim() : "";
const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const SECTEUR_PUBLICS = {
  "Petite enfance": ["Enfants 0-3 ans", "Enfants 0-6 ans", "Familles"],
  "Protection de l'enfance": ["Enfants", "Adolescents", "Familles"],
  "Personnes âgées": ["Personnes âgées"],
  Handicap: ["Enfants", "Adolescents", "Adultes", "Personnes âgées"],
  "Précarité/Exclusion": ["Adultes", "Familles", "Tous publics"],
  "Santé mentale": ["Adolescents", "Adultes", "Tous publics"],
  Addictions: ["Adolescents", "Adultes", "Tous publics"],
  Insertion: ["Adolescents", "Adultes"],
  Logement: ["Adultes", "Familles", "Tous publics"],
  Justice: ["Adolescents", "Adultes"],
};

const TYPE_STRUCTURES = [
  "MECS",
  "CHRS",
  "EHPAD",
  "IME",
  "ITEP",
  "ESAT",
  "Foyer de vie",
  "Foyer d'hébergement",
  "MAS",
  "FAM",
  "SAVS",
  "SAMSAH",
  "CSAPA",
  "CAARUD",
  "Centre social",
  "Mairie/CCAS",
  "Conseil Départemental",
  "Association",
  "Crèche/Multi-accueil",
  "PMI",
  "ASE",
  "PJJ",
  "SPIP",
  "Autre",
];

const PUBLIC_CATEGORIES = ["adultes", "mineurs", "petite enfance"];

const state = {
  remoteData: [],
  localContribs: loadLocalContributions(),
  structureEdits: loadStructureEdits(),
  accountProfile: loadAccountProfile(),
  trackingByUser: loadTrackingByUser(),
  sessionPseudo: null,
  accountMode: "login",
  activeStructureId: null,
  contribReturnStructureId: null,
  routeApplied: false,
  contributionMode: "experience",
  editingStructureId: null,
};

const el = {
  homeView: document.getElementById("homeView"),
  searchView: document.getElementById("searchView"),
  detailView: document.getElementById("detailView"),
  personalView: document.getElementById("personalView"),
  connectedView: document.getElementById("connectedView"),
  accountView: document.getElementById("accountView"),
  contribView: document.getElementById("contribView"),
  structureCount: document.getElementById("structureCount"),
  goSearch: document.getElementById("goSearch"),
  goContribute: document.getElementById("goContribute"),
  goAddStructure: document.getElementById("goAddStructure"),
  goSpreadsheet: document.getElementById("goSpreadsheet"),
  goPersonal: document.getElementById("goPersonal"),
  goAccount: document.getElementById("goAccount"),
  backFromSearch: document.getElementById("backFromSearch"),
  backFromPersonal: document.getElementById("backFromPersonal"),
  backFromAccount: document.getElementById("backFromAccount"),
  backFromContrib: document.getElementById("backFromContrib"),
  detailToSearch: document.getElementById("detailToSearch"),
  detailToHome: document.getElementById("detailToHome"),
  detailEditStructure: document.getElementById("detailEditStructure"),
  detailAddContact: document.getElementById("detailAddContact"),
  detailAddExperience: document.getElementById("detailAddExperience"),
  detailName: document.getElementById("detailName"),
  detailAssociation: document.getElementById("detailAssociation"),
  detailBadges: document.getElementById("detailBadges"),
  detailMeta: document.getElementById("detailMeta"),
  detailTexts: document.getElementById("detailTexts"),
  detailTrackingControls: document.getElementById("detailTrackingControls"),
  detailContacts: document.getElementById("detailContacts"),
  detailExperiences: document.getElementById("detailExperiences"),
  personalMeta: document.getElementById("personalMeta"),
  personalInterestedResults: document.getElementById("personalInterestedResults"),
  personalAppliedResults: document.getElementById("personalAppliedResults"),
  connectedPseudo: document.getElementById("connectedPseudo"),
  connectedToSearch: document.getElementById("connectedToSearch"),
  connectedToPersonal: document.getElementById("connectedToPersonal"),
  accountStatus: document.getElementById("accountStatus"),
  accountModeCreateBtn: document.getElementById("accountModeCreateBtn"),
  accountModeLoginBtn: document.getElementById("accountModeLoginBtn"),
  accountCreateBlock: document.getElementById("accountCreateBlock"),
  accountLoginBlock: document.getElementById("accountLoginBlock"),
  accountPseudoCreate: document.getElementById("accountPseudoCreate"),
  accountPinCreate: document.getElementById("accountPinCreate"),
  createAccountBtn: document.getElementById("createAccountBtn"),
  accountPseudoLogin: document.getElementById("accountPseudoLogin"),
  accountPinLogin: document.getElementById("accountPinLogin"),
  unlockAccountBtn: document.getElementById("unlockAccountBtn"),
  lockAccountBtn: document.getElementById("lockAccountBtn"),
  deleteAccountBtn: document.getElementById("deleteAccountBtn"),
  resetFilters: document.getElementById("resetFilters"),
  filterTypeStructure: document.getElementById("filterTypeStructure"),
  filterSecteur: document.getElementById("filterSecteur"),
  filterPublicCategory: document.getElementById("filterPublicCategory"),
  filterLocation: document.getElementById("filterLocation"),
  filterKeyword: document.getElementById("filterKeyword"),
  results: document.getElementById("results"),
  resultMeta: document.getElementById("resultMeta"),
  contribForm: document.getElementById("contribForm"),
  contribStatus: document.getElementById("contribStatus"),
  contribStructureDetails: document.getElementById("contribStructureDetails"),
  contribContactDetails: document.getElementById("contribContactDetails"),
  contribStageDetails: document.getElementById("contribStageDetails"),
  contribSubmitBtn: document.getElementById("contribSubmitBtn"),
  contribTypeStructure: document.getElementById("contribTypeStructure"),
  contribSecteur: document.getElementById("contribSecteur"),
  contribPublic: document.getElementById("contribPublic"),
  otherTypeWrap: document.getElementById("otherTypeWrap"),
  otherTypeInput: document.getElementById("otherTypeInput"),
  dureeHint: document.getElementById("dureeHint"),
};

init();

function init() {
  bindNavigation();
  setupStaticSelects();
  bindSearchFilters();
  bindContributionForm();
  bindAccountActions();
  setContributionMode("experience");
  renderAccountState();
  loadRemoteCsv();
  syncSharedState();
}

function bindNavigation() {
  el.goSearch.addEventListener("click", () => {
    clearStructureParamInUrl();
    showView("search");
    renderResults();
  });
  el.goContribute.addEventListener("click", () => {
    clearStructureParamInUrl();
    setContributionMode("experience");
    state.editingStructureId = null;
    setContribReturnTarget(null);
    showView("contrib");
  });
  el.goAddStructure.addEventListener("click", () => {
    clearStructureParamInUrl();
    state.editingStructureId = null;
    setContribReturnTarget(null);
    state.contributionMode = "new_structure";
    setContributionMode("new_structure");
    el.contribForm.reset();
    el.otherTypeWrap.classList.add("hidden");
    el.otherTypeInput.required = false;
    setupContribPublicFilter(el.contribPublic, "");
    showView("contrib");
    el.contribStatus.textContent = "Renseignez les informations de la structure puis enregistrez.";
    el.contribStatus.className = "text-sm text-emerald-700";
  });
  el.goSpreadsheet.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("structure");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `./tableur-local.html${suffix}`;
  });
  el.goPersonal.addEventListener("click", () => {
    showView("personal");
    renderPersonalView();
  });
  el.goAccount.addEventListener("click", () => {
    showView("account");
    renderAccountState();
  });
  el.backFromSearch.addEventListener("click", () => {
    clearStructureParamInUrl();
    showView("home");
  });
  el.backFromPersonal.addEventListener("click", () => {
    showView("home");
  });
  el.backFromAccount.addEventListener("click", () => {
    showView("home");
  });
  el.connectedToSearch.addEventListener("click", () => {
    clearStructureParamInUrl();
    showView("search");
    renderResults();
  });
  el.connectedToPersonal.addEventListener("click", () => {
    showView("personal");
    renderPersonalView();
  });
  el.backFromContrib.addEventListener("click", () => {
    if (state.contribReturnStructureId) {
      const structureId = state.contribReturnStructureId;
      const url = new URL(window.location.href);
      url.searchParams.set("structure", structureId);
      history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      openStructureDetail(structureId);
      return;
    }
    clearStructureParamInUrl();
    showView("home");
  });
  el.detailToSearch.addEventListener("click", () => {
    clearStructureParamInUrl();
    showView("search");
    renderResults();
  });
  el.detailToHome.addEventListener("click", () => {
    clearStructureParamInUrl();
    showView("home");
  });
  el.detailAddExperience.addEventListener("click", () => {
    const group = findStructureGroupById(state.activeStructureId);
    if (!group) return;
    state.contributionMode = "add_experience";
    state.editingStructureId = group.id;
    setContribReturnTarget(group.id);
    setContributionMode("add_experience");
    prefillContributionForm(group.primary);
    showView("contrib");
    el.contribStatus.textContent = "Ajoutez votre expérience pour cette structure.";
    el.contribStatus.className = "text-sm text-slate-600";
  });
  el.detailEditStructure.addEventListener("click", () => {
    const group = findStructureGroupById(state.activeStructureId);
    if (!group) return;
    state.contributionMode = "edit_structure";
    state.editingStructureId = group.id;
    setContribReturnTarget(group.id);
    setContributionMode("edit_structure");
    prefillContributionForm(group.primary);
    showView("contrib");
    el.contribStatus.textContent = "Mode modification: mettez à jour les informations de la structure puis enregistrez.";
    el.contribStatus.className = "text-sm text-cyan-700";
  });
  el.detailAddContact.addEventListener("click", () => {
    const group = findStructureGroupById(state.activeStructureId);
    if (!group) return;
    state.contributionMode = "add_contact";
    state.editingStructureId = group.id;
    setContribReturnTarget(group.id);
    setContributionMode("add_contact");
    prefillContributionForm(group.primary);
    showView("contrib");
    el.contribStatus.textContent = "Ajoutez un contact pour cette structure.";
    el.contribStatus.className = "text-sm text-emerald-700";
  });

  el.resetFilters.addEventListener("click", () => {
    el.filterTypeStructure.value = "";
    el.filterSecteur.value = "";
    el.filterLocation.value = "";
    el.filterPublicCategory.value = "";
    el.filterKeyword.value = "";
    renderResults();
  });

  el.detailContacts.addEventListener("click", onDetailContactsClick);
}

function showView(view) {
  el.homeView.classList.toggle("hidden", view !== "home");
  el.searchView.classList.toggle("hidden", view !== "search");
  el.detailView.classList.toggle("hidden", view !== "detail");
  el.personalView.classList.toggle("hidden", view !== "personal");
  el.connectedView.classList.toggle("hidden", view !== "connected");
  el.accountView.classList.toggle("hidden", view !== "account");
  el.contribView.classList.toggle("hidden", view !== "contrib");
}

function setContribReturnTarget(structureId) {
  state.contribReturnStructureId = structureId || null;
  el.backFromContrib.textContent = state.contribReturnStructureId ? "Retour fiche structure" : "Retour accueil";
}

function bindAccountActions() {
  el.accountModeCreateBtn.addEventListener("click", () => {
    setAccountMode("create");
  });
  el.accountModeLoginBtn.addEventListener("click", () => {
    setAccountMode("login");
  });

  el.createAccountBtn.addEventListener("click", async () => {
    const pseudo = clean(el.accountPseudoCreate.value);
    const pin = clean(el.accountPinCreate.value);
    if (!pseudo || !pin) {
      setAccountStatus("Pseudo et PIN requis.", true);
      return;
    }
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from("user_accounts").insert([{ pseudo, pin }]);
        if (error) {
          const message = clean(error.message).toLowerCase();
          if (message.includes("duplicate") || message.includes("unique")) {
            setAccountStatus("Ce pseudo existe déjà. Utilisez Connexion.", true);
            return;
          }
          throw error;
        }
      }
      state.accountProfile = { pseudo, pin };
      state.sessionPseudo = pseudo;
      state.trackingByUser[pseudo] = await loadTrackingForPseudo(pseudo);
      saveAccountProfile(state.accountProfile);
      saveTrackingByUser(state.trackingByUser);
      el.accountPseudoCreate.value = "";
      el.accountPinCreate.value = "";
      el.accountPseudoLogin.value = pseudo;
      setAccountMode("login");
      setAccountStatus(`Compte créé: ${pseudo}`);
      renderAccountState();
      renderResults();
      if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
    } catch (error) {
      console.error(error);
      setAccountStatus("Impossible de créer le compte pour le moment.", true);
    }
  });

  el.unlockAccountBtn.addEventListener("click", async () => {
    const pseudo = clean(el.accountPseudoLogin.value);
    const pin = clean(el.accountPinLogin.value);
    if (!pseudo || !pin) {
      setAccountStatus("Pseudo et PIN requis pour la connexion.", true);
      return;
    }
    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from("user_accounts")
          .select("pseudo")
          .eq("pseudo", pseudo)
          .eq("pin", pin)
          .limit(1);
        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) {
          setAccountStatus("Pseudo ou PIN incorrect.", true);
          return;
        }
      } else {
        if (!state.accountProfile || pseudo !== state.accountProfile.pseudo || pin !== state.accountProfile.pin) {
          setAccountStatus("Pseudo ou PIN incorrect.", true);
          return;
        }
      }
      state.accountProfile = { pseudo, pin };
      state.sessionPseudo = pseudo;
      state.trackingByUser[pseudo] = await loadTrackingForPseudo(pseudo);
      saveAccountProfile(state.accountProfile);
      saveTrackingByUser(state.trackingByUser);
      el.accountPinLogin.value = "";
      setAccountMode("login");
      setAccountStatus(`Connecté en tant que ${state.sessionPseudo}.`);
      renderAccountState();
      renderResults();
      if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
      if (!el.personalView.classList.contains("hidden")) renderPersonalView();
      el.connectedPseudo.textContent = `Vous êtes connecté en tant que ${state.sessionPseudo}.`;
      showView("connected");
    } catch (error) {
      console.error(error);
      setAccountStatus("Impossible de se connecter pour le moment.", true);
    }
  });

  el.lockAccountBtn.addEventListener("click", () => {
    state.sessionPseudo = null;
    setAccountStatus("Compte déconnecté.");
    renderAccountState();
    renderResults();
    if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
  });

  el.deleteAccountBtn.addEventListener("click", async () => {
    if (!state.accountProfile) return;
    const pseudo = state.accountProfile.pseudo;
    try {
      if (supabaseClient) {
        await supabaseClient.from("user_tracking").delete().eq("pseudo", pseudo);
        await supabaseClient.from("user_accounts").delete().eq("pseudo", pseudo);
      }
    } catch (error) {
      console.error(error);
    }
    delete state.trackingByUser[pseudo];
    state.accountProfile = null;
    state.sessionPseudo = null;
    el.accountPseudoLogin.value = "";
    el.accountPinLogin.value = "";
    saveTrackingByUser(state.trackingByUser);
    saveAccountProfile(null);
    setAccountStatus("Compte supprimé.");
    renderAccountState();
    renderResults();
    if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
  });
}

function renderAccountState() {
  const isUnlocked = isTrackingEnabled();
  setAccountMode(state.accountMode || "login");
  if (state.accountProfile?.pseudo && !clean(el.accountPseudoLogin.value)) {
    el.accountPseudoLogin.value = state.accountProfile.pseudo;
  }

  if (isUnlocked) {
    el.accountStatus.textContent = `Compte actif: ${state.sessionPseudo}`;
  } else {
    el.accountStatus.textContent = "Créez un compte ou connectez-vous avec un compte existant.";
  }
}

function setAccountMode(mode) {
  state.accountMode = mode === "create" ? "create" : "login";
  const isCreate = state.accountMode === "create";
  el.accountCreateBlock.classList.toggle("hidden", !isCreate);
  el.accountLoginBlock.classList.toggle("hidden", isCreate);

  if (isCreate) {
    el.accountModeCreateBtn.className =
      "rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800";
    el.accountModeLoginBtn.className =
      "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700";
  } else {
    el.accountModeCreateBtn.className =
      "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700";
    el.accountModeLoginBtn.className =
      "rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800";
  }
}

function setAccountStatus(message, isError = false) {
  el.accountStatus.textContent = message;
  el.accountStatus.className = isError ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-slate-700";
}

function isTrackingEnabled() {
  return Boolean(state.accountProfile && state.sessionPseudo && state.sessionPseudo === state.accountProfile.pseudo);
}

function currentTrackingMap() {
  if (!isTrackingEnabled()) return {};
  const map = state.trackingByUser[state.sessionPseudo];
  return map && typeof map === "object" ? map : {};
}

function getTrackingStatus(structureId) {
  const map = currentTrackingMap();
  return map[structureId] || "";
}

async function setTrackingStatus(structureId, status) {
  if (!isTrackingEnabled()) return false;
  const pseudo = state.sessionPseudo;
  if (!pseudo) return false;
  if (supabaseClient) {
    if (!status) {
      const { error } = await supabaseClient
        .from("user_tracking")
        .delete()
        .eq("pseudo", pseudo)
        .eq("structure_id", structureId);
      if (error) return false;
    } else {
      const { error } = await supabaseClient
        .from("user_tracking")
        .upsert([{ pseudo, structure_id: structureId, status }], { onConflict: "pseudo,structure_id" });
      if (error) return false;
    }
  }
  if (!state.trackingByUser[state.sessionPseudo]) state.trackingByUser[state.sessionPseudo] = {};
  if (!status) delete state.trackingByUser[state.sessionPseudo][structureId];
  else state.trackingByUser[state.sessionPseudo][structureId] = status;
  saveTrackingByUser(state.trackingByUser);
  return true;
}

function renderTrackingControls(structureId, context) {
  if (!isTrackingEnabled()) {
    if (context === "search") return "";
    return `
      <div data-track-control class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Créez/ouvrez un compte pour marquer cette structure (Intéressé ou J'ai candidaté).
      </div>
    `;
  }
  const status = getTrackingStatus(structureId);
  const interestedChecked = status === "interesse" ? "checked" : "";
  const appliedChecked = status === "candidate" ? "checked" : "";
  const suffix = context === "detail" ? "d" : "r";
  return `
    <div data-track-control class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p class="mb-2 text-xs font-semibold text-slate-700">Suivi candidature</p>
      <div class="flex flex-wrap gap-4 text-sm">
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" data-track-input data-track-structure-id="${escapeHtml(structureId)}" data-track-value="interesse" ${interestedChecked} />
          Intéressé
        </label>
        <label class="inline-flex items-center gap-2">
          <input type="checkbox" data-track-input data-track-structure-id="${escapeHtml(structureId)}" data-track-value="candidate" ${appliedChecked} />
          J'ai candidaté
        </label>
      </div>
    </div>
  `;
}

async function onTrackingChange(event) {
  const input = event.target.closest("[data-track-input]");
  if (!input) return;
  const structureId = clean(input.getAttribute("data-track-structure-id"));
  const value = clean(input.getAttribute("data-track-value"));
  if (!structureId || !value) return;
  if (!isTrackingEnabled()) {
    renderResults();
    if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
    return;
  }

  const checked = Boolean(input.checked);
  if (checked) await setTrackingStatus(structureId, value);
  else if (getTrackingStatus(structureId) === value) await setTrackingStatus(structureId, "");
  renderResults();
  if (!el.detailView.classList.contains("hidden") && state.activeStructureId) openStructureDetail(state.activeStructureId);
  if (!el.personalView.classList.contains("hidden")) renderPersonalView();
}

async function loadTrackingForPseudo(pseudo) {
  if (!supabaseClient || !pseudo) {
    const map = state.trackingByUser[pseudo];
    return map && typeof map === "object" ? map : {};
  }
  const { data, error } = await supabaseClient
    .from("user_tracking")
    .select("structure_id,status")
    .eq("pseudo", pseudo);
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => {
    const sid = clean(row.structure_id);
    const status = clean(row.status);
    if (!sid || !status) return;
    map[sid] = status;
  });
  return map;
}

function renderPersonalView() {
  if (!isTrackingEnabled()) {
    el.personalMeta.textContent = "Connectez votre compte pour accéder à votre suivi.";
    const msg =
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Aucun compte connecté.</div>';
    el.personalInterestedResults.innerHTML = msg;
    el.personalAppliedResults.innerHTML = msg;
    return;
  }

  const tracking = currentTrackingMap();
  const entries = Object.entries(tracking);
  if (!entries.length) {
    el.personalMeta.textContent = `Compte: ${state.sessionPseudo}`;
    const msg =
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Aucune structure suivie pour le moment.</div>';
    el.personalInterestedResults.innerHTML = msg;
    el.personalAppliedResults.innerHTML = msg;
    return;
  }

  const groups = getStructureGroups();
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  const items = entries
    .map(([id, status]) => ({ id, status, group: byId[id] || null }))
    .sort((a, b) => a.status.localeCompare(b.status));
  const interestedItems = items.filter((item) => item.status === "interesse");
  const appliedItems = items.filter((item) => item.status === "candidate");

  el.personalMeta.textContent = `${items.length} structure(s) suivie(s) • ${interestedItems.length} intéressé(es) • ${appliedItems.length} candidatures • Compte: ${state.sessionPseudo}`;

  const renderList = (list, emptyText) => {
    if (!list.length) {
      return `<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">${escapeHtml(emptyText)}</div>`;
    }
    return list
      .map((item) => {
        const label = item.status === "candidate" ? "J'ai candidaté" : "Intéressé";
        const name = item.group?.primary?.nomStructure || "Structure introuvable";
        const city = item.group?.primary?.ville || "-";
        return `
        <article class="rounded-xl border border-slate-200 bg-white p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-900">${escapeHtml(name)}</p>
              <p class="text-xs text-slate-600">${escapeHtml(city)} • ${escapeHtml(label)}</p>
            </div>
            <button data-open-structure="${escapeHtml(item.id)}" class="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100">
              Ouvrir la fiche
            </button>
            <button
              data-remove-tracking-id="${escapeHtml(item.id)}"
              class="rounded-lg border border-red-400/50 px-2 py-1 text-sm text-red-300 hover:bg-red-500/10"
              title="Retirer de la liste"
              aria-label="Retirer de la liste"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"></path>
              </svg>
            </button>
          </div>
        </article>
      `;
      })
      .join("");
  };

  el.personalInterestedResults.innerHTML = renderList(interestedItems, "Aucune structure marquée comme intéressé.");
  el.personalAppliedResults.innerHTML = renderList(appliedItems, "Aucune candidature enregistrée.");
}

async function onPersonalResultsClick(event) {
  const removeBtn = event.target.closest("[data-remove-tracking-id]");
  if (removeBtn) {
    const structureIdToRemove = clean(removeBtn.getAttribute("data-remove-tracking-id"));
    if (!structureIdToRemove) return;
    await setTrackingStatus(structureIdToRemove, "");
    renderPersonalView();
    if (!el.searchView.classList.contains("hidden")) renderResults();
    if (!el.detailView.classList.contains("hidden") && state.activeStructureId) {
      openStructureDetail(state.activeStructureId);
    }
    return;
  }

  const btn = event.target.closest("[data-open-structure]");
  if (!btn) return;
  const structureId = clean(btn.getAttribute("data-open-structure"));
  if (!structureId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("structure", structureId);
  history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  openStructureDetail(structureId);
}

function setupStaticSelects() {
  fillSelect(el.filterTypeStructure, ["", ...TYPE_STRUCTURES], "Tous");
  fillSelect(el.contribTypeStructure, ["", ...TYPE_STRUCTURES], "Sélectionner");

  const secteurs = ["", ...Object.keys(SECTEUR_PUBLICS)];
  fillSelect(el.filterSecteur, secteurs, "Tous");
  fillSelect(el.contribSecteur, secteurs, "Sélectionner");

  setupContribPublicFilter(el.contribPublic, "");

  el.contribTypeStructure.addEventListener("change", () => {
    const isOther = el.contribTypeStructure.value === "Autre";
    el.otherTypeWrap.classList.toggle("hidden", !isOther);
    el.otherTypeInput.required = isOther;
  });

  el.contribSecteur.addEventListener("change", () => {
    setupContribPublicFilter(el.contribPublic, el.contribSecteur.value);
  });

  [...el.contribForm.querySelectorAll('input[name="gratification"]')].forEach((radio) => {
    radio.addEventListener("change", updateDurationFieldState);
  });
}

function bindSearchFilters() {
  el.filterTypeStructure.addEventListener("change", renderResults);
  el.filterSecteur.addEventListener("change", renderResults);
  el.filterPublicCategory.addEventListener("change", renderResults);
  el.filterLocation.addEventListener("input", renderResults);
  el.filterKeyword.addEventListener("input", renderResults);
  el.results.addEventListener("click", onResultsClick);
  el.results.addEventListener("change", onTrackingChange);
  el.detailTrackingControls.addEventListener("change", onTrackingChange);
  el.personalView.addEventListener("click", onPersonalResultsClick);
}

function bindContributionForm() {
  el.contribForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isEditMode = state.contributionMode === "edit_structure";
    const isNewStructureMode = state.contributionMode === "new_structure";
    const isAddExperienceMode = state.contributionMode === "add_experience";
    const isAddContactMode = state.contributionMode === "add_contact";
    const submitMode = state.contributionMode;
    const submitStructureId = state.editingStructureId;
    const postes = [...el.contribForm.querySelectorAll('input[name="postes"]:checked')].map((i) => i.value);
    if ((state.contributionMode === "experience" || isAddContactMode) && postes.length === 0) {
      el.contribStatus.textContent = "Sélectionnez au moins une fonction/poste.";
      el.contribStatus.className = "text-sm text-red-700";
      return;
    }

    const data = new FormData(el.contribForm);
    const baseRecord =
      (isAddContactMode || isAddExperienceMode) && state.editingStructureId
        ? findStructureGroupById(state.editingStructureId)?.primary || null
        : null;
    if ((isAddContactMode || isAddExperienceMode) && !baseRecord) {
      el.contribStatus.textContent = "Impossible de retrouver la structure sélectionnée.";
      el.contribStatus.className = "text-sm text-red-700";
      return;
    }
    const validationError = validateContributionForm({
      mode: state.contributionMode,
      data,
      postes,
      baseRecord,
    });
    if (validationError) {
      el.contribStatus.textContent = validationError;
      el.contribStatus.className = "text-sm text-red-700";
      return;
    }
    const typeStructure =
      data.get("typeStructure") === "Autre" ? data.get("typeStructureAutre")?.toString().trim() : data.get("typeStructure");

    const entry = {
      structureId: (isAddContactMode || isAddExperienceMode) ? clean(submitStructureId) : "",
      secteur: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.secteur) : clean(data.get("secteur")),
      typeStructure: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.typeStructure) : clean(typeStructure),
      association: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.association) : clean(data.get("association")),
      departement: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.departement) : clean(data.get("departement")),
      nomStructure: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.nomStructure) : clean(data.get("nomStructure")),
      email: (isEditMode || isNewStructureMode || isAddExperienceMode) ? "" : clean(data.get("email")),
      telephone: (isEditMode || isNewStructureMode || isAddExperienceMode) ? "" : clean(data.get("telephone")),
      poste: (isEditMode || isNewStructureMode || isAddExperienceMode) ? "" : postes.join(", "),
      genre: (isEditMode || isNewStructureMode || isAddExperienceMode) ? "" : clean(data.get("genre")),
      gratification: isAddContactMode ? clean(baseRecord?.gratification) : clean(data.get("gratification")),
      ville: normalizeVilleByDepartement(
        (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.ville) : clean(data.get("ville")),
        (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.departement) : clean(data.get("departement"))
      ),
      typePublic: (isAddContactMode || isAddExperienceMode) ? clean(baseRecord?.typePublic) : clean(data.get("typePublic")),
      duree: isAddContactMode ? clean(baseRecord?.duree) : clean(data.get("duree")),
      diplome: isAddContactMode ? clean(baseRecord?.diplome) : clean(data.get("diplome")),
      missions: isAddContactMode ? clean(baseRecord?.missions) : "",
      ambiance: isAddContactMode ? clean(baseRecord?.ambiance) : clean(data.get("ambiance")),
      conseils: isAddContactMode ? clean(baseRecord?.conseils) : clean(data.get("conseils")),
      source: "Contribution étudiante",
    };

    let savedRemotely = false;
    if (state.contributionMode === "edit_structure" && state.editingStructureId) {
      if (supabaseClient) {
        savedRemotely = await persistStructureRecord(state.editingStructureId, entry);
        if (savedRemotely) {
          const idx = state.remoteData.findIndex((r) => makeStructureId(r) === state.editingStructureId);
          if (idx >= 0) state.remoteData[idx] = { ...state.remoteData[idx], ...entry, structureId: state.editingStructureId, source: "Google Sheet" };
        }
      } else {
        state.structureEdits[state.editingStructureId] = {
          secteur: entry.secteur,
          typeStructure: entry.typeStructure,
          association: entry.association,
          departement: entry.departement,
          nomStructure: entry.nomStructure,
          ville: entry.ville,
          typePublic: entry.typePublic,
        };
        savedRemotely = await persistStructureEdit(
          state.editingStructureId,
          state.structureEdits[state.editingStructureId]
        );
        saveStructureEdits(state.structureEdits);
      }
    } else if (state.contributionMode === "new_structure") {
      const structureId = makeStructureId(entry);
      const structureRecord = { ...entry, structureId, source: "Google Sheet" };
      if (supabaseClient) {
        savedRemotely = await persistStructureRecord(structureId, structureRecord);
      } else {
        savedRemotely = false;
      }
      state.remoteData.push(structureRecord);
    } else {
      state.localContribs.unshift(entry);
      savedRemotely = await persistContribution(entry);
      saveLocalContributions(state.localContribs);
    }

    el.contribForm.reset();
    el.otherTypeWrap.classList.add("hidden");
    el.otherTypeInput.required = false;
    setupContribPublicFilter(el.contribPublic, "");

    if (state.contributionMode === "edit_structure") {
      el.contribStatus.textContent = savedRemotely
        ? "Modifications enregistrées dans la base en ligne."
        : "Modifications enregistrées seulement sur cet appareil.";
      el.contribStatus.className = "text-sm text-green-700";
    } else if (state.contributionMode === "new_structure") {
      el.contribStatus.textContent = savedRemotely
        ? "Structure ajoutée dans la base en ligne."
        : "Structure ajoutée seulement sur cet appareil.";
      el.contribStatus.className = "text-sm text-green-700";
    } else if (state.contributionMode === "add_contact") {
      el.contribStatus.textContent = savedRemotely
        ? "Contact ajouté et enregistré dans la base en ligne."
        : "Contact ajouté seulement sur cet appareil.";
      el.contribStatus.className = "text-sm text-green-700";
    } else if (state.contributionMode === "add_experience") {
      el.contribStatus.textContent = savedRemotely
        ? "Expérience ajoutée et enregistrée dans la base en ligne."
        : "Expérience ajoutée seulement sur cet appareil.";
      el.contribStatus.className = "text-sm text-green-700";
    } else {
      el.contribStatus.textContent = savedRemotely
        ? "Contribution enregistrée dans la base en ligne."
        : "Contribution enregistrée seulement sur cet appareil.";
      el.contribStatus.className = "text-sm text-green-700";
    }
    state.contributionMode = "experience";
    state.editingStructureId = null;
    setContributionMode("experience");
    await syncSharedState();
    updateCount();

    if ((submitMode === "add_contact" || submitMode === "edit_structure" || submitMode === "add_experience") && submitStructureId) {
      openStructureDetail(submitStructureId);
      el.contribStatus.textContent = "";
      showView("detail");
    } else if (submitMode === "new_structure") {
      const newStructureId = makeStructureId(entry);
      openStructureDetail(newStructureId);
      el.contribStatus.textContent = "";
      showView("detail");
    }
  });
}

function validateContributionForm({ mode, data, postes, baseRecord }) {
  const isExperience = mode === "experience";
  const isEdit = mode === "edit_structure";
  const isNewStructure = mode === "new_structure";
  const isAddContact = mode === "add_contact";
  const isAddExperience = mode === "add_experience";

  const get = (name) => clean(data.get(name));
  const isTwoDigitDept = (value) => /^[0-9]{2}$/.test(value);
  const hasTypeStructure =
    get("typeStructure") && (get("typeStructure") !== "Autre" || clean(data.get("typeStructureAutre")));

  if (isExperience || isEdit || isNewStructure) {
    if (!get("nomStructure")) return "Le nom de la structure est requis.";
    if (!get("ville")) return "La ville est requise.";
    if (!isTwoDigitDept(get("departement"))) return "Le département doit contenir 2 chiffres.";
    if (!hasTypeStructure) return "Le type de structure est requis.";
    if (!get("secteur")) return "Le secteur est requis.";
    if (!get("typePublic")) return "Le type de public est requis.";
  }

  if (isExperience) {
    if (!get("genre")) return "Renseignez le genre du contact.";
    if (!postes.length) return "Sélectionnez au moins une fonction/poste.";
    if (!get("diplome")) return "Le diplôme associé est requis.";
    if (!get("gratification")) return "Indiquez si le stage est gratifié.";
    const isAlternance = normalizeForSearch(get("gratification")) === "alternance";
    if (!isAlternance) {
      const duree = Number(get("duree"));
      if (!Number.isFinite(duree) || duree < 1 || duree > 52) return "La durée doit être entre 1 et 52 semaines.";
    }
  }

  if (isAddContact) {
    if (!baseRecord) return "Impossible de retrouver la structure sélectionnée.";
    if (!get("genre")) return "Renseignez le genre du contact.";
    if (!postes.length) return "Sélectionnez au moins une fonction/poste.";
  }

  if (isAddExperience) {
    if (!baseRecord) return "Impossible de retrouver la structure sélectionnée.";
    if (!get("diplome")) return "Le diplôme associé est requis.";
    if (!get("gratification")) return "Indiquez si le stage est gratifié.";
    const isAlternance = normalizeForSearch(get("gratification")) === "alternance";
    if (!isAlternance) {
      const duree = Number(get("duree"));
      if (!Number.isFinite(duree) || duree < 1 || duree > 52) return "La durée doit être entre 1 et 52 semaines.";
    }
  }

  return "";
}

async function loadRemoteCsv() {
  try {
    const supabaseStructures = await loadStructuresFromSupabase();
    if (supabaseClient) {
      state.remoteData = supabaseStructures || [];
      updateCount();
      applyInitialRoute();
      if (!el.searchView.classList.contains("hidden")) renderResults();
      return;
    }

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Échec de chargement CSV (${response.status})`);

    const raw = await response.text();
    const rows = parseCsv(raw);

    if (rows.length < 2) {
      throw new Error("CSV vide ou sans lignes de données.");
    }

    const hasHeader = rows[0][0]?.toLowerCase().includes("secteur");
    const dataRows = hasHeader ? rows.slice(1) : rows;

    state.remoteData = dataRows.map(toRecord).filter((item) => item.nomStructure);

    updateCount();
    applyInitialRoute();
    if (!el.searchView.classList.contains("hidden")) renderResults();
  } catch (error) {
    console.error(error);
    el.structureCount.textContent = "Impossible de charger le CSV publié.";
    applyInitialRoute();
  }
}

async function loadStructuresFromSupabase() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient
    .from("structures")
    .select(`
      structure_id,
      secteur,
      type_structure,
      association,
      departement,
      nom_structure,
      email_contact,
      telephone_contact,
      poste_contact,
      genre_contact,
      gratification,
      ville,
      type_public,
      duree_stage,
      diplome_associe,
      missions,
      ambiance,
      conseils
    `)
    .order("nom_structure", { ascending: true })
    .limit(50000);
  if (error) {
    console.error(error);
    return null;
  }
  return (data || [])
    .map((row) => ({
      structureId: clean(row.structure_id),
      secteur: clean(row.secteur),
      typeStructure: clean(row.type_structure),
      association: clean(row.association),
      departement: clean(row.departement),
      nomStructure: clean(row.nom_structure),
      email: clean(row.email_contact),
      telephone: clean(row.telephone_contact),
      poste: clean(row.poste_contact),
      genre: clean(row.genre_contact),
      gratification: clean(row.gratification),
      ville: normalizeVilleByDepartement(clean(row.ville), clean(row.departement)),
      typePublic: clean(row.type_public),
      duree: clean(row.duree_stage),
      diplome: clean(row.diplome_associe),
      missions: clean(row.missions),
      ambiance: clean(row.ambiance),
      conseils: clean(row.conseils),
      source: "Google Sheet",
    }))
    .filter((item) => item.nomStructure);
}

async function syncSharedState() {
  let [sharedContribs, sharedEdits] = await Promise.all([
    loadSharedContributions(),
    loadSharedStructureEdits(),
  ]);
  await migrateLocalToSupabaseIfNeeded(sharedContribs, sharedEdits);
  await backfillLocalDataToSupabase(sharedContribs, sharedEdits);
  [sharedContribs, sharedEdits] = await Promise.all([
    loadSharedContributions(),
    loadSharedStructureEdits(),
  ]);

  let changed = false;
  if (sharedContribs || state.localContribs.length) {
    state.localContribs = mergeUniqueContributions(sharedContribs || [], state.localContribs || []);
    saveLocalContributions(state.localContribs);
    changed = true;
  }
  if (sharedEdits || Object.keys(state.structureEdits || {}).length) {
    state.structureEdits = mergeStructureEdits(sharedEdits || {}, state.structureEdits || {});
    saveStructureEdits(state.structureEdits);
    changed = true;
  }

  if (!changed) return;
  updateCount();
  if (!el.searchView.classList.contains("hidden")) renderResults();
  if (!el.personalView.classList.contains("hidden")) renderPersonalView();
  if (!el.detailView.classList.contains("hidden") && state.activeStructureId) {
    openStructureDetail(state.activeStructureId);
  }
}

async function migrateLocalToSupabaseIfNeeded(sharedContribs, sharedEdits) {
  if (!supabaseClient) return;
  if (localStorage.getItem(SUPABASE_MIGRATION_DONE_KEY) === "1") return;

  const localContribs = Array.isArray(state.localContribs) ? state.localContribs : [];
  const localEdits = state.structureEdits && typeof state.structureEdits === "object" ? state.structureEdits : {};
  const sharedContribCount = Array.isArray(sharedContribs) ? sharedContribs.length : 0;
  const sharedEditCount = sharedEdits && typeof sharedEdits === "object" ? Object.keys(sharedEdits).length : 0;

  const shouldMigrateContribs = sharedContribCount === 0 && localContribs.length > 0;
  const shouldMigrateEdits = sharedEditCount === 0 && Object.keys(localEdits).length > 0;
  if (!shouldMigrateContribs && !shouldMigrateEdits) {
    localStorage.setItem(SUPABASE_MIGRATION_DONE_KEY, "1");
    return;
  }

  try {
    if (shouldMigrateContribs) {
      const rows = localContribs
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({ entry }));
      if (rows.length) {
        const { error } = await supabaseClient.from("contributions").insert(rows);
        if (error) throw error;
      }
    }

    if (shouldMigrateEdits) {
      const rows = Object.entries(localEdits)
        .filter(([structureId, edit]) => clean(structureId) && edit && typeof edit === "object")
        .map(([structureId, edit]) => ({ structure_id: structureId, edit }));
      if (rows.length) {
        const { error } = await supabaseClient
          .from("structure_edits")
          .upsert(rows, { onConflict: "structure_id" });
        if (error) throw error;
      }
    }

    localStorage.setItem(SUPABASE_MIGRATION_DONE_KEY, "1");
  } catch (error) {
    console.error("Migration locale vers Supabase échouée:", error);
  }
}

async function backfillLocalDataToSupabase(sharedContribs, sharedEdits) {
  if (!supabaseClient) return;

  const localContribs = Array.isArray(state.localContribs) ? state.localContribs : [];
  const remoteContribs = Array.isArray(sharedContribs) ? sharedContribs : [];
  const remoteKeys = new Set(remoteContribs.map(contributionFingerprint));
  const contribsToPush = localContribs.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const key = contributionFingerprint(entry);
    return key && !remoteKeys.has(key);
  });

  if (contribsToPush.length) {
    const rows = contribsToPush.map((entry) => ({ entry }));
    const { error } = await supabaseClient.from("contributions").insert(rows);
    if (error) {
      console.error("Backfill contributions failed:", error);
    }
  }

  const localEdits = state.structureEdits && typeof state.structureEdits === "object" ? state.structureEdits : {};
  const remoteEditMap = sharedEdits && typeof sharedEdits === "object" ? sharedEdits : {};
  const editsToPush = Object.entries(localEdits)
    .filter(([structureId, edit]) => {
      if (!clean(structureId) || !edit || typeof edit !== "object") return false;
      return !remoteEditMap[structureId];
    })
    .map(([structureId, edit]) => ({ structure_id: structureId, edit }));

  if (editsToPush.length) {
    const { error } = await supabaseClient
      .from("structure_edits")
      .upsert(editsToPush, { onConflict: "structure_id" });
    if (error) {
      console.error("Backfill structure edits failed:", error);
    }
  }
}

function mergeUniqueContributions(remoteEntries, localEntries) {
  const merged = [];
  const seen = new Set();
  [...(remoteEntries || []), ...(localEntries || [])].forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const key = contributionFingerprint(entry);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  });
  return merged;
}

function contributionFingerprint(entry) {
  if (!entry || typeof entry !== "object") return "";
  return normalizeForSearch([
    clean(entry.structureId),
    clean(entry.secteur),
    clean(entry.typeStructure),
    clean(entry.association),
    clean(entry.departement),
    clean(entry.nomStructure),
    clean(entry.email),
    clean(entry.telephone),
    clean(entry.poste),
    clean(entry.genre),
    clean(entry.gratification),
    clean(entry.ville),
    clean(entry.typePublic),
    clean(entry.duree),
    clean(entry.diplome),
    clean(entry.ambiance),
    clean(entry.conseils),
    clean(entry.source),
  ].join("|"));
}

function mergeStructureEdits(remoteEdits, localEdits) {
  return { ...(remoteEdits || {}), ...(localEdits || {}) };
}

function toRecord(cols) {
  const departement = clean(cols[3]);
  const rawVille = clean(cols[10]);
  const ville = normalizeVilleByDepartement(rawVille, departement);
  return {
    secteur: clean(cols[0]),
    typeStructure: clean(cols[1]),
    association: clean(cols[2]),
    departement,
    nomStructure: clean(cols[4]),
    email: clean(cols[5]),
    telephone: clean(cols[6]),
    poste: clean(cols[7]),
    genre: normalizeGenre(cols[8]),
    gratification: normalizeOuiNon(cols[9]),
    ville,
    typePublic: clean(cols[11]),
    duree: clean(cols[12]),
    diplome: clean(cols[13]),
    missions: clean(cols[14]),
    ambiance: clean(cols[15]),
    conseils: clean(cols[16]),
    source: "Google Sheet",
  };
}

function allRecords() {
  return [...state.remoteData, ...state.localContribs];
}

function renderResults() {
  const typeStructure = el.filterTypeStructure.value.trim().toLowerCase();
  const secteur = el.filterSecteur.value.trim().toLowerCase();
  const selectedPublicCategory = el.filterPublicCategory.value.trim().toLowerCase();
  const location = el.filterLocation.value.trim().toLowerCase();
  const keyword = normalizeForSearch(el.filterKeyword.value);
  const structureGroups = getStructureGroups();

  const filtered = structureGroups.filter((group) => {
    const item = group.primary;
    const itemType = clean(item?.typeStructure).toLowerCase();
    const itemSecteur = clean(item?.secteur).toLowerCase();
    const itemPublic = clean(item?.typePublic);
    const itemVille = clean(item?.ville);
    const itemDept = clean(item?.departement);

    const passType = !typeStructure || itemType === typeStructure;
    const passSecteur = !secteur || itemSecteur === secteur;
    const itemPublicCategories = classifyPublicCategories(itemPublic);
    const passPublic =
      !selectedPublicCategory || itemPublicCategories.includes(selectedPublicCategory);
    const loc = `${itemVille} ${itemDept}`.toLowerCase();
    const passLocation = !location || loc.includes(location);
    const passKeyword = !keyword || group.keywordText.includes(keyword);

    return passType && passSecteur && passPublic && passLocation && passKeyword;
  });

  const filteredEntries = filtered.reduce((sum, group) => sum + group.records.length, 0);
  const totalEntries = allRecords().length;
  el.resultMeta.textContent = `${filtered.length} structure(s) (${filteredEntries} entrée(s) contacts) sur ${structureGroups.length} structure(s) (${totalEntries} entrée(s) contacts).`;

  if (filtered.length === 0) {
    el.results.innerHTML = '<div class="rounded-xl border border-indigo-300/45 bg-slate-950/70 p-4 text-sm text-slate-200">Aucun résultat pour ces filtres.</div>';
    if (!el.personalView.classList.contains("hidden")) renderPersonalView();
    return;
  }

  el.results.innerHTML = filtered.map(renderCard).join("");
  if (!el.personalView.classList.contains("hidden")) renderPersonalView();
}

function renderCard(item) {
  const structure = item.primary;
  const tags = [
    badge(structure.typeStructure, "bg-cyan-500/20 text-cyan-200"),
    badge(structure.secteur, "bg-violet-500/20 text-violet-200"),
    badge(structure.typePublic, "bg-emerald-500/20 text-emerald-200"),
    badge(structure.diplome, "bg-fuchsia-500/20 text-fuchsia-200"),
  ]
    .filter(Boolean)
    .join("");

  return `
    <article
      data-structure-id="${escapeHtml(item.id)}"
      class="structure-card rounded-2xl border border-indigo-300/55 bg-slate-950/80 p-4 shadow-lg shadow-indigo-950/40 transition hover:border-fuchsia-300/70 hover:shadow-indigo-900/50 cursor-pointer"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="text-lg font-bold text-slate-100">${escapeHtml(structure.nomStructure)}</h3>
          <p class="text-sm text-slate-300">${escapeHtml(structure.association || "Association/Fondation non renseignée")}</p>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">${tags}</div>

      <div class="mt-4 grid gap-4 text-sm">
        <div>
          <p><span class="font-semibold">Localisation:</span> ${escapeHtml(structure.ville || "-")} (${escapeHtml(structure.departement || "-")})</p>
          <p><span class="font-semibold">Gratification:</span> ${escapeHtml(structure.gratification || "-")}</p>
          <p><span class="font-semibold">Contacts:</span> ${escapeHtml(item.contactAvailability)}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-2 text-sm text-slate-200">
        ${paragraph("Missions", structure.missions)}
        ${paragraph("Ambiance", structure.ambiance)}
        ${paragraph("Conseils", structure.conseils)}
      </div>

      <div class="mt-4">${renderTrackingControls(item.id, "search")}</div>
    </article>
  `;
}

function paragraph(title, value) {
  if (!value) return "";
  return `<p><span class="font-semibold">${title}:</span> ${escapeHtml(value)}</p>`;
}

function badge(text, classes) {
  const value = clean(text);
  if (!value) return "";
  return `<span class="rounded-full px-2 py-1 text-xs font-medium ${classes}">${escapeHtml(value)}</span>`;
}

function setupContribPublicFilter(selectEl, secteurValue) {
  const publics = secteurValue ? SECTEUR_PUBLICS[secteurValue] || [] : [];

  selectEl.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = "Sélectionner";
  selectEl.appendChild(first);

  publics.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    selectEl.appendChild(opt);
  });

  selectEl.disabled = publics.length === 0;
}

function classifyPublicCategories(typePublicValue) {
  const value = clean(typePublicValue).toLowerCase();
  if (!value) return [];

  const categories = [];
  if (matchesPublicCategory(value, "petite enfance")) categories.push("petite enfance");
  if (matchesPublicCategory(value, "mineurs")) categories.push("mineurs");
  if (matchesPublicCategory(value, "adultes")) categories.push("adultes");

  return categories.filter((category) => PUBLIC_CATEGORIES.includes(category));
}

function matchesPublicCategory(value, category) {
  if (category === "petite enfance") {
    return /(petite enfance|0-3|0–3|0-6|0–6|tout[- ]petits?|cr[eè]che)/i.test(value);
  }
  if (category === "mineurs") {
    return /(mineurs?|enfants?|adolescents?|jeunes?|jeunesse)/i.test(value);
  }
  if (category === "adultes") {
    return /(adultes?|personnes? [aâ]g[ée]es?|familles?|tous publics?)/i.test(value);
  }
  return false;
}

function fillSelect(selectEl, options, firstText) {
  selectEl.innerHTML = "";
  options.forEach((value, index) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = index === 0 ? firstText : value;
    selectEl.appendChild(opt);
  });
}

function updateCount() {
  const structureCount = getStructureGroups().length;
  const entryCount = allRecords().length;
  el.structureCount.textContent = `${structureCount} structure(s) • ${entryCount} entrée(s) contacts`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      i += 1;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = [];
      value = "";
      i += 1;
      continue;
    }

    value += char;
    i += 1;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeGenre(value) {
  const v = clean(value).toLowerCase();
  if (["mme", "madame", "madame."].includes(v)) return "Madame";
  if (["mr", "m.", "monsieur", "mr."].includes(v)) return "Monsieur";
  if (["neutre"].includes(v)) return "Neutre";
  return clean(value);
}

function normalizeOuiNon(value) {
  const v = clean(value).toLowerCase();
  if (["oui", "yes", "y"].includes(v)) return "Oui";
  if (["non", "no", "n"].includes(v)) return "Non";
  return clean(value);
}

function clean(value) {
  return (value || "").toString().trim();
}

function normalizeVilleByDepartement(ville, departement) {
  const dep = clean(departement);
  if (dep === "75") return "Paris";
  return clean(ville);
}

function searchableRecordText(item) {
  return [
    item.secteur,
    item.typeStructure,
    item.association,
    item.departement,
    item.nomStructure,
    item.email,
    item.telephone,
    item.poste,
    item.genre,
    item.gratification,
    item.ville,
    item.typePublic,
    item.duree,
    item.diplome,
    item.missions,
    item.ambiance,
    item.conseils,
    item.source,
  ]
    .map(clean)
    .join(" ");
}

function normalizeForSearch(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function makeStructureId(item) {
  const linkedId = clean(item?.structureId);
  if (linkedId) return linkedId;
  return normalizeForSearch(
    [item.nomStructure, item.ville, item.departement, item.association].map(clean).join("|")
  ).replace(/[^a-z0-9]+/g, "-");
}

function makeStructureBaseId(item) {
  return normalizeForSearch([item?.nomStructure, item?.ville, item?.departement].map(clean).join("|")).replace(
    /[^a-z0-9]+/g,
    "-"
  );
}

function findStructureGroupById(structureId) {
  if (!structureId) return null;
  return getStructureGroups().find((group) => group.id === structureId) || null;
}

function getStructureUrl(item) {
  const params = new URLSearchParams(window.location.search);
  params.set("structure", makeStructureId(item));
  return `${window.location.pathname}?${params.toString()}`;
}

function onResultsClick(event) {
  if (event.target.closest("[data-track-control]")) return;
  const card = event.target.closest(".structure-card");
  if (!card) return;
  const structureId = clean(card.getAttribute("data-structure-id"));
  if (!structureId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("structure", structureId);
  history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  openStructureDetail(structureId);
}

function clearStructureParamInUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("structure")) return;
  url.searchParams.delete("structure");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function applyInitialRoute() {
  if (state.routeApplied) return;
  state.routeApplied = true;
  const structureId = clean(new URLSearchParams(window.location.search).get("structure"));
  if (structureId) {
    openStructureDetail(structureId);
    return;
  }
}

function openStructureDetail(structureId) {
  const group = findStructureGroupById(structureId);
  const record = group?.primary || null;
  state.activeStructureId = structureId;
  showView("detail");

  if (!record) {
    el.detailName.textContent = "Structure introuvable";
    el.detailAssociation.textContent = "Cette structure n'a pas été trouvée.";
    el.detailBadges.innerHTML = "";
    el.detailMeta.innerHTML = "";
    el.detailTexts.innerHTML = "";
    el.detailTrackingControls.innerHTML = "";
    el.detailContacts.innerHTML = "";
    el.detailExperiences.innerHTML =
      '<div class="rounded-xl border border-indigo-400/30 bg-slate-900/70 p-3 text-sm text-slate-300">Aucune expérience disponible.</div>';
    return;
  }

  const badges = [
    badge(record.typeStructure, "bg-cyan-500/20 text-cyan-200"),
    badge(record.secteur, "bg-violet-500/20 text-violet-200"),
    badge(record.typePublic, "bg-emerald-500/20 text-emerald-200"),
    badge(record.diplome, "bg-fuchsia-500/20 text-fuchsia-200"),
  ]
    .filter(Boolean)
    .join("");

  el.detailName.textContent = record.nomStructure;
  el.detailAssociation.textContent = record.association || "Association/Fondation non renseignée";
  el.detailBadges.innerHTML = badges;
  el.detailMeta.innerHTML = `
    <div>
      <p><span class="font-semibold">Localisation:</span> ${escapeHtml(record.ville || "-")} (${escapeHtml(record.departement || "-")})</p>
      <p><span class="font-semibold">Gratification:</span> ${escapeHtml(record.gratification || "-")}</p>
      <p><span class="font-semibold">Durée:</span> ${escapeHtml(record.duree || "-")} semaine(s)</p>
    </div>
    <div></div>
  `;
  el.detailTexts.innerHTML = `
    ${paragraph("Missions", record.missions)}
    ${paragraph("Ambiance", record.ambiance)}
    ${paragraph("Conseils", record.conseils)}
  `;
  el.detailTrackingControls.innerHTML = renderTrackingControls(structureId, "detail");

  renderContactsForStructure(group);
  renderExperiencesForStructure(structureId);
}

function renderExperiencesForStructure(structureId) {
  const group = findStructureGroupById(structureId);
  const currentBaseId = group ? makeStructureBaseId(group.primary) : "";
  const experiences = state.localContribs.filter((entry) => {
    if (clean(entry.structureId) === structureId) return true;
    if (makeStructureId(entry) === structureId) return true;
    if (currentBaseId && makeStructureBaseId(entry) === currentBaseId) return true;
    return false;
  });
  if (!experiences.length) {
    el.detailExperiences.innerHTML =
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Aucune expérience étudiante ajoutée pour le moment.</div>';
    return;
  }

  el.detailExperiences.innerHTML = experiences
    .map(
      (exp) => `
      <article class="rounded-xl border border-slate-200 bg-white p-3">
        <p class="text-sm text-slate-700"><span class="font-semibold">Diplôme:</span> ${escapeHtml(exp.diplome || "-")}</p>
        <p class="text-sm text-slate-700"><span class="font-semibold">Gratification:</span> ${escapeHtml(exp.gratification || "-")}</p>
        <p class="text-sm text-slate-700"><span class="font-semibold">Durée:</span> ${escapeHtml(exp.duree || "-")} semaine(s)</p>
        ${paragraph("Missions", exp.missions)}
        ${paragraph("Ambiance", exp.ambiance)}
        ${paragraph("Conseils", exp.conseils)}
      </article>
    `
    )
    .join("");
}

function getStructureGroups() {
  const map = new Map();
  allRecords().forEach((record) => {
    const id = makeStructureId(record);
    if (!map.has(id)) map.set(id, { id, records: [] });
    map.get(id).records.push(record);
  });

  return [...map.values()].map((group) => {
    const rawPrimary = pickPrimaryRecord(group.records);
    const edit = state.structureEdits[group.id] || null;
    const primary = edit ? { ...rawPrimary, ...edit } : rawPrimary;
    const contacts = extractContacts(group.records, edit);
    return {
      id: group.id,
      records: group.records,
      primary,
      contacts,
      keywordText: normalizeForSearch(group.records.map((r) => searchableRecordText(r)).join(" ")),
      sourceSummary: edit || group.records.some((r) => r.source === "Contribution étudiante")
        ? "Google Sheet + contributions"
        : "Google Sheet",
      contactAvailability: getContactAvailabilityLabel(contacts),
    };
  });
}

function pickPrimaryRecord(records) {
  return records.find((r) => r.source === "Google Sheet") || records[0];
}

function extractContacts(records, edit) {
  const seen = new Set();
  const contacts = [];
  const sourceRecords = edit ? [...records, { ...records[0], ...edit }] : records;
  sourceRecords.forEach((record) => {
    const contact = {
      genre: clean(record.genre),
      poste: clean(record.poste),
      email: clean(record.email),
      telephone: clean(record.telephone),
      isContribution: clean(record.source) === "Contribution étudiante",
      contributionId: clean(record._contributionId),
    };
    if (!contact.genre && !contact.poste && !contact.email && !contact.telephone) return;
    const key = normalizeForSearch([contact.genre, contact.poste, contact.email, contact.telephone].join("|"));
    if (seen.has(key)) return;
    seen.add(key);
    contacts.push(contact);
  });
  return contacts;
}

function getContactAvailabilityLabel(contacts) {
  const hasEmail = contacts.some((c) => c.email);
  const hasTel = contacts.some((c) => c.telephone);
  if (hasEmail && hasTel) return "email et téléphone renseignés";
  if (hasEmail) return "email renseigné, téléphone non renseigné";
  if (hasTel) return "téléphone renseigné, email non renseigné";
  return "email et téléphone non renseignés";
}

function renderContactsForStructure(group) {
  const contacts = group?.contacts || [];
  if (!contacts.length) {
    el.detailContacts.innerHTML =
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Aucun contact renseigné pour cette structure.</div>';
    return;
  }

  el.detailContacts.innerHTML = contacts
    .map(
      (contact) => `
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-slate-500">Contact</p>
        <p class="mt-1 text-sm text-slate-900"><span class="font-semibold">Genre:</span> ${escapeHtml(contact.genre || "-")}</p>
        <p class="text-sm text-slate-900"><span class="font-semibold">Fonction:</span> ${escapeHtml(contact.poste || "-")}</p>
        <p class="mt-2 text-sm text-slate-900"><span class="font-semibold">Email:</span> ${contact.email ? `<a class="text-cyan-700 hover:underline" href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : "-"}</p>
        <p class="text-sm text-slate-900"><span class="font-semibold">Téléphone:</span> ${contact.telephone ? `<a class="text-cyan-700 hover:underline" href="tel:${escapeHtml(contact.telephone)}">${escapeHtml(contact.telephone)}</a>` : "-"}</p>
        ${
          contact.isContribution && contact.contributionId
            ? `<button data-delete-contact-id="${escapeHtml(contact.contributionId)}" class="mt-3 rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50">Supprimer ce contact</button>`
            : ""
        }
      </article>
    `
    )
    .join("");
}

async function onDetailContactsClick(event) {
  const btn = event.target.closest("[data-delete-contact-id]");
  if (!btn) return;
  const contributionId = clean(btn.getAttribute("data-delete-contact-id"));
  if (!contributionId) return;
  const confirmed = window.confirm("Supprimer ce contact ajouté par contribution ?");
  if (!confirmed) return;

  const ok = await deleteContributionById(contributionId);
  if (!ok) {
    window.alert("Impossible de supprimer ce contact pour le moment.");
    return;
  }

  state.localContribs = state.localContribs.filter((entry) => clean(entry._contributionId) !== contributionId);
  saveLocalContributions(state.localContribs);
  updateCount();
  if (state.activeStructureId) openStructureDetail(state.activeStructureId);
}

function prefillContributionForm(record) {
  const setValue = (name, value) => {
    const input = el.contribForm.elements[name];
    if (!input) return;
    input.value = value || "";
  };

  setValue("nomStructure", record.nomStructure);
  setValue("association", record.association);
  setValue("ville", record.ville);
  setValue("departement", record.departement);
  setValue("secteur", record.secteur);

  if (TYPE_STRUCTURES.includes(record.typeStructure)) {
    setValue("typeStructure", record.typeStructure);
  } else {
    setValue("typeStructure", "");
  }
  el.otherTypeWrap.classList.add("hidden");
  el.otherTypeInput.required = false;
  setValue("typeStructureAutre", "");

  setupContribPublicFilter(el.contribPublic, record.secteur);
  const publicOptionExists = [...el.contribPublic.options].some((opt) => opt.value === record.typePublic);
  setValue("typePublic", publicOptionExists ? record.typePublic : "");

  if (state.contributionMode === "edit_structure" || state.contributionMode === "add_contact") {
    setValue("diplome", "");
    setValue("duree", "");
    setValue("ambiance", "");
    setValue("conseils", "");
    const checkedRadio = el.contribForm.querySelector('input[name="gratification"]:checked');
    if (checkedRadio) checkedRadio.checked = false;
  }
  updateDurationFieldState();
}

function setContributionMode(mode) {
  if (mode === "edit_structure") state.contributionMode = "edit_structure";
  else if (mode === "new_structure") state.contributionMode = "new_structure";
  else if (mode === "add_contact") state.contributionMode = "add_contact";
  else if (mode === "add_experience") state.contributionMode = "add_experience";
  else state.contributionMode = "experience";

  const isEdit = state.contributionMode === "edit_structure";
  const isNewStructure = state.contributionMode === "new_structure";
  const isAddContact = state.contributionMode === "add_contact";
  const isAddExperience = state.contributionMode === "add_experience";
  const isExperience = state.contributionMode === "experience" || isAddExperience;

  el.contribStructureDetails.classList.toggle("hidden", isAddContact || isAddExperience);
  el.contribContactDetails.classList.toggle("hidden", isEdit || isNewStructure || isAddExperience);
  el.contribStageDetails.classList.toggle("hidden", !isExperience);
  el.contribSubmitBtn.textContent = isEdit
    ? "Enregistrer les modifications"
    : isNewStructure
      ? "Enregistrer la structure"
    : isAddContact
      ? "Enregistrer le contact"
      : isAddExperience
        ? "Enregistrer l'expérience"
      : "Enregistrer ma contribution";

  const structureFieldNames = [
    "nomStructure",
    "association",
    "ville",
    "departement",
    "typeStructure",
    "typeStructureAutre",
    "secteur",
    "typePublic",
  ];
  structureFieldNames.forEach((name) => {
    const fields = [...el.contribForm.querySelectorAll(`[name="${name}"]`)];
    fields.forEach((field) => {
      if ("disabled" in field) field.disabled = isAddContact || isAddExperience;
    });
  });

  const contactFieldNames = ["genre", "email", "telephone", "postes"];
  contactFieldNames.forEach((name) => {
    const fields = [...el.contribForm.querySelectorAll(`[name="${name}"]`)];
    fields.forEach((field) => {
      if ("required" in field && name === "genre") field.required = !isEdit;
      if ("disabled" in field) field.disabled = isEdit;
      if (isEdit) {
        if (field.type === "checkbox" || field.type === "radio") field.checked = false;
        else if ("value" in field) field.value = "";
      }
    });
  });

  const stageFieldNames = ["diplome", "duree", "gratification"];
  stageFieldNames.forEach((name) => {
    const fields = [...el.contribForm.querySelectorAll(`[name="${name}"]`)];
    fields.forEach((field) => {
      if ("disabled" in field) field.disabled = !isExperience;
      if (name === "gratification") {
        field.required = isExperience;
      } else if ("required" in field) {
        field.required = isExperience;
      }
      if (!isExperience) {
        if (field.type === "checkbox" || field.type === "radio") field.checked = false;
        else if ("value" in field) field.value = "";
      }
    });
  });

  updateDurationFieldState();
}

function updateDurationFieldState() {
  const durationInput = el.contribForm.querySelector('input[name="duree"]');
  if (!durationInput) return;

  const isStageSectionVisible = !el.contribStageDetails.classList.contains("hidden");
  if (!isStageSectionVisible) {
    durationInput.disabled = true;
    durationInput.required = false;
    durationInput.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
    durationInput.classList.remove("bg-white");
    if (el.dureeHint) el.dureeHint.textContent = "";
    return;
  }

  const gratification = clean(el.contribForm.querySelector('input[name="gratification"]:checked')?.value);
  const isAlternance = normalizeForSearch(gratification) === "alternance";
  durationInput.disabled = isAlternance;
  durationInput.required = !isAlternance;
  if (isAlternance) {
    durationInput.value = "";
    durationInput.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
    durationInput.classList.remove("bg-white");
    if (el.dureeHint) el.dureeHint.textContent = "Durée non requise pour une alternance.";
  } else {
    durationInput.classList.remove("bg-slate-100", "text-slate-400", "cursor-not-allowed");
    durationInput.classList.add("bg-white");
    if (el.dureeHint) el.dureeHint.textContent = "";
  }
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadLocalContributions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalContributions(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadStructureEdits() {
  try {
    const raw = localStorage.getItem(STRUCTURE_EDITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStructureEdits(edits) {
  localStorage.setItem(STRUCTURE_EDITS_KEY, JSON.stringify(edits));
}

function loadAccountProfile() {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const pseudo = clean(parsed.pseudo);
    const pin = clean(parsed.pin);
    if (!pseudo || !pin) return null;
    return { pseudo, pin };
  } catch {
    return null;
  }
}

function saveAccountProfile(profile) {
  if (!profile) {
    localStorage.removeItem(ACCOUNT_PROFILE_KEY);
    return;
  }
  localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(profile));
}

function loadTrackingByUser() {
  try {
    const raw = localStorage.getItem(TRACKING_BY_USER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveTrackingByUser(trackingByUser) {
  localStorage.setItem(TRACKING_BY_USER_KEY, JSON.stringify(trackingByUser || {}));
}

async function loadSharedContributions() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("contributions")
      .select("id,entry")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) throw error;
    return (data || [])
      .map((row) => {
        const entry = row?.entry;
        if (!entry || typeof entry !== "object") return null;
        return { ...entry, _contributionId: clean(row.id) };
      })
      .filter(Boolean);
  }

  try {
    const payload = await apiGet(`${API_BASE}/contributions`);
    return Array.isArray(payload?.contributions) ? payload.contributions : null;
  } catch {
    return null;
  }
}

async function loadSharedStructureEdits() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("structure_edits")
      .select("structure_id,edit");
    if (error) throw error;
    const edits = {};
    (data || []).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const structureId = clean(row.structure_id);
      if (!structureId) return;
      if (!row.edit || typeof row.edit !== "object") return;
      edits[structureId] = row.edit;
    });
    return edits;
  }

  try {
    const payload = await apiGet(`${API_BASE}/structure-edits`);
    return payload?.structureEdits && typeof payload.structureEdits === "object"
      ? payload.structureEdits
      : null;
  } catch {
    return null;
  }
}

async function persistContribution(entry) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from("contributions").insert([{ entry }]);
    return !error;
  }

  try {
    await apiPost(`${API_BASE}/contributions`, { contribution: entry });
    return true;
  } catch {
    return false;
  }
}

async function deleteContributionById(contributionId) {
  if (!contributionId) return false;
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from("contributions").delete().eq("id", contributionId);
  return !error;
}

async function persistStructureEdit(structureId, edit) {
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("structure_edits")
      .upsert([{ structure_id: structureId, edit }], { onConflict: "structure_id" });
    return !error;
  }

  try {
    await apiPost(`${API_BASE}/structure-edits`, { structureId, edit });
    return true;
  } catch {
    return false;
  }
}

async function persistStructureRecord(structureId, record) {
  if (!supabaseClient || !structureId) return false;
  const payload = {
    structure_id: clean(structureId),
    secteur: clean(record.secteur),
    type_structure: clean(record.typeStructure),
    association: clean(record.association),
    departement: clean(record.departement),
    nom_structure: clean(record.nomStructure),
    email_contact: clean(record.email),
    telephone_contact: clean(record.telephone),
    poste_contact: clean(record.poste),
    genre_contact: clean(record.genre),
    gratification: clean(record.gratification),
    ville: normalizeVilleByDepartement(clean(record.ville), clean(record.departement)),
    type_public: clean(record.typePublic),
    duree_stage: clean(record.duree),
    diplome_associe: clean(record.diplome),
    missions: clean(record.missions),
    ambiance: clean(record.ambiance),
    conseils: clean(record.conseils),
    source: "Google Sheet",
  };
  const { error } = await supabaseClient
    .from("structures")
    .upsert([payload], { onConflict: "structure_id" });
  return !error;
}

async function apiGet(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`API GET ${url} failed (${response.status})`);
  return response.json();
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`API POST ${url} failed (${response.status})`);
  return response.json();
}
