const CSV_URL =
  new URLSearchParams(window.location.search).get("csv") ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8Y_oUGMr7Va9oOsiGIJIuCip20ieVmritCf67ThHu-aDLKEH0e-6NyZL8AAAuPz0oXS0rJSGNGKXr/pub?output=csv";

const STORAGE_KEY = "chop_ton_stage_contributions_v1";
const STRUCTURE_EDITS_KEY = "chop_ton_stage_structure_edits_v1";
const API_BASE = "/api";
const APP_CONFIG = window.CHOP_CONFIG || {};
const SUPABASE_URL = typeof APP_CONFIG.supabaseUrl === "string" ? APP_CONFIG.supabaseUrl.trim() : "";
const SUPABASE_ANON_KEY = typeof APP_CONFIG.supabaseAnonKey === "string" ? APP_CONFIG.supabaseAnonKey.trim() : "";
const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const HEADERS = [
  "Secteur",
  "Type de structure",
  "Association/Fondation",
  "Département",
  "Nom de la structure",
  "Email du contact",
  "Téléphone du contact",
  "Poste du contact",
  "Genre du contact",
  "Gratification",
  "Ville",
  "Type de public",
  "Durée stage (semaines)",
  "Diplôme associé",
  "Source",
];

const el = {
  sheetFilter: document.getElementById("sheetFilter"),
  downloadCsv: document.getElementById("downloadCsv"),
  sheetMeta: document.getElementById("sheetMeta"),
  sheetHead: document.getElementById("sheetHead"),
  sheetBody: document.getElementById("sheetBody"),
};

const state = {
  rows: [],
};

init();

function init() {
  renderHeader();
  bindEvents();
  loadRows();
}

function bindEvents() {
  el.sheetFilter.addEventListener("input", renderRows);
  el.downloadCsv.addEventListener("click", downloadCsv);
}

async function loadRows() {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);
    const raw = await response.text();
    const parsed = parseCsv(raw);

    const hasHeader = parsed[0] && parsed[0][0] && parsed[0][0].toLowerCase().includes("secteur");
    const dataRows = hasHeader ? parsed.slice(1) : parsed;

    const remoteRows = dataRows.map(toRowObject).filter((row) => row[4]);
    const sharedContribs = await loadSharedContributions();
    const sharedEdits = await loadSharedStructureEdits();
    const localRows = (sharedContribs || loadLocalContributions()).map(toLocalTableRow);
    const edits = sharedEdits || loadStructureEdits();

    const merged = [...remoteRows, ...localRows].map((row) => applyStructureEdit(row, edits));
    state.rows = aggregateRowsByStructure(merged);
    renderRows();
  } catch (error) {
    console.error(error);
    el.sheetMeta.textContent = "Impossible de charger les données.";
  }
}

function renderHeader() {
  el.sheetHead.innerHTML = `<tr>${HEADERS.map((h) => `<th class="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">${escapeHtml(h)}</th>`).join("")}</tr>`;
}

function renderRows() {
  const q = normalizeForSearch(el.sheetFilter.value);
  const filtered = !q
    ? state.rows
    : state.rows.filter((row) => normalizeForSearch(row.join(" ")).includes(q));

  el.sheetMeta.textContent = `${filtered.length} ligne(s) affichée(s) sur ${state.rows.length}`;

  if (!filtered.length) {
    el.sheetBody.innerHTML = `<tr><td colspan="${HEADERS.length}" class="px-3 py-4 text-sm text-slate-600">Aucune ligne trouvée.</td></tr>`;
    return;
  }

  el.sheetBody.innerHTML = filtered
    .map(
      (row) =>
        `<tr class="odd:bg-white even:bg-slate-50">${row
          .map((cell) => `<td class="whitespace-pre-line border-b border-slate-100 px-3 py-2 align-top">${escapeHtml(cell)}</td>`)
          .join("")}</tr>`
    )
    .join("");
}

function aggregateRowsByStructure(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const id = makeStructureIdFromRow(row);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row);
  });

  return [...grouped.values()].map((structureRows) => {
    const contactColumns = buildAlignedContactColumns(structureRows);
    const source = structureRows.some((r) => normalizeForSearch(r[14]).includes("contribution"))
      ? "Google Sheet + contributions"
      : "Google Sheet";

    return [
      firstNonEmpty(structureRows, 0),
      firstNonEmpty(structureRows, 1),
      firstNonEmpty(structureRows, 2),
      firstNonEmpty(structureRows, 3),
      firstNonEmpty(structureRows, 4),
      contactColumns.emails,
      contactColumns.phones,
      contactColumns.postes,
      contactColumns.genres,
      firstNonEmpty(structureRows, 9),
      firstNonEmpty(structureRows, 10),
      firstNonEmpty(structureRows, 11),
      firstNonEmpty(structureRows, 12),
      firstNonEmpty(structureRows, 13),
      source,
    ];
  });
}

function firstNonEmpty(rows, index) {
  for (const row of rows) {
    const value = clean(row[index]);
    if (value) return value;
  }
  return "";
}

function buildAlignedContactColumns(rows) {
  const contacts = [];
  const seen = new Set();

  rows.forEach((row) => {
    const emailRaw = clean(row[5]);
    const phoneRaw = clean(row[6]);
    const posteRaw = clean(row[7]);
    const genreRaw = clean(row[8]);

    // Ignore rows that have no contact info at all.
    if (!emailRaw && !phoneRaw && !posteRaw && !genreRaw) return;

    const contact = {
      email: emailRaw || "----",
      phone: phoneRaw || "----",
      poste: posteRaw || "----",
      genre: genreRaw || "----",
    };

    const key = normalizeForSearch([contact.email, contact.phone, contact.poste, contact.genre].join("|"));
    if (seen.has(key)) return;
    seen.add(key);
    contacts.push(contact);
  });

  if (!contacts.length) {
    return { emails: "", phones: "", postes: "", genres: "" };
  }

  return {
    emails: contacts.map((c) => c.email).join("\n"),
    phones: contacts.map((c) => c.phone).join("\n"),
    postes: contacts.map((c) => c.poste).join("\n"),
    genres: contacts.map((c) => c.genre).join("\n"),
  };
}

function toRowObject(cols) {
  return [
    clean(cols[0]),
    clean(cols[1]),
    clean(cols[2]),
    clean(cols[3]),
    clean(cols[4]),
    clean(cols[5]),
    clean(cols[6]),
    clean(cols[7]),
    clean(cols[8]),
    clean(cols[9]),
    clean(cols[10]),
    clean(cols[11]),
    clean(cols[12]),
    clean(cols[13]),
    "Google Sheet",
  ];
}

function toLocalTableRow(entry) {
  return [
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
    "Contribution étudiante",
  ];
}

function applyStructureEdit(row, edits) {
  const id = makeStructureIdFromRow(row);
  const edit = edits[id];
  if (!edit) return row;

  const updated = [...row];
  updated[0] = clean(edit.secteur) || updated[0];
  updated[1] = clean(edit.typeStructure) || updated[1];
  updated[2] = clean(edit.association) || updated[2];
  updated[3] = clean(edit.departement) || updated[3];
  updated[4] = clean(edit.nomStructure) || updated[4];
  updated[10] = clean(edit.ville) || updated[10];
  updated[11] = clean(edit.typePublic) || updated[11];
  return updated;
}

function makeStructureIdFromRow(row) {
  return normalizeForSearch([row[4], row[10], row[3], row[2]].map(clean).join("|")).replace(/[^a-z0-9]+/g, "-");
}

function downloadCsv() {
  const csvContent = [HEADERS, ...state.rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tableur-local-chop-ton-stage-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const v = clean(value);
  if (v.includes(",") || v.includes("\n") || v.includes('"')) {
    return `"${v.replaceAll('"', '""')}"`;
  }
  return v;
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

async function loadSharedContributions() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("contributions")
      .select("entry")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) throw error;
    return (data || []).map((row) => row?.entry).filter((entry) => entry && typeof entry === "object");
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

async function apiGet(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`API GET ${url} failed (${response.status})`);
  return response.json();
}

function clean(value) {
  return (value || "").toString().trim();
}

function normalizeForSearch(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
