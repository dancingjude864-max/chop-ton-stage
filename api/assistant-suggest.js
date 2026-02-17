const TYPE_STRUCTURES = [
  "MECS", "CHRS", "EHPAD", "IME", "ITEP", "ESAT", "Foyer de vie", "Foyer d'hébergement",
  "MAS", "FAM", "SAVS", "SAMSAH", "CSAPA", "CAARUD", "Centre social", "Mairie/CCAS",
  "Conseil Départemental", "Association", "Crèche/Multi-accueil", "PMI", "ASE", "PJJ", "SPIP", "Autre",
];

const ASSISTANT_SECTEUR_KEYWORDS = {
  "Petite enfance": ["petite enfance", "creche", "multi-accueil", "pmi"],
  "Protection de l'enfance": ["protection de l'enfance", "ase", "mecs", "enfance"],
  "Personnes âgées": ["ehpad", "personnes agees", "ehpa", "geronto"],
  Handicap: ["handicap", "ime", "itep", "esat", "samsah", "savs", "mas", "fam"],
  "Précarité/Exclusion": ["chrs", "precarite", "exclusion", "sans-abri"],
  "Santé mentale": ["psychiatr", "sante mentale", "cmp", "hopital de jour"],
  Addictions: ["addiction", "csapa", "caarud"],
  Insertion: ["insertion", "mission locale"],
  Logement: ["logement", "hebergement", "residence sociale", "foyer"],
  Justice: ["pjj", "spip", "justice"],
};

function clean(v) {
  return (v || "").toString().trim();
}

function normalize(v) {
  return clean(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function safeJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function heuristicSuggestions(input, combinedText, addressFeature) {
  const suggestions = {};
  const type = TYPE_STRUCTURES.find((t) => combinedText.includes(normalize(t)));
  if (type && !clean(input.typeStructure)) {
    suggestions.typeStructure = { value: type, confidence: 0.62, reason: "Type détecté dans les sources publiques." };
  }

  const secteur = Object.entries(ASSISTANT_SECTEUR_KEYWORDS).find(([, kws]) =>
    kws.some((kw) => combinedText.includes(normalize(kw)))
  )?.[0];
  if (secteur && !clean(input.secteur)) {
    suggestions.secteur = { value: secteur, confidence: 0.6, reason: "Secteur probable via mots-clés." };
  }

  const props = addressFeature?.properties || {};
  if (!clean(input.ville) && clean(props.city)) {
    suggestions.ville = { value: clean(props.city), confidence: 0.72, reason: "Ville proposée par l'API adresse." };
  }
  if (!clean(input.departement) && clean(props.postcode)) {
    suggestions.departement = { value: clean(props.postcode).slice(0, 2), confidence: 0.72, reason: "Département issu du code postal." };
  }

  return suggestions;
}

async function maybeOpenAiRefine(input, webSummary, baseSuggestions) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return baseSuggestions;

  try {
    const prompt = `Tu aides à compléter un formulaire de structure sociale en France.\nRetourne strictement un JSON avec les clés optionnelles typeStructure, secteur, ville, departement.\nChaque clé doit être un objet: {"value": "...", "confidence": 0..1, "reason": "..."}.\nN'invente rien si doute.\n\nSaisie:\n${JSON.stringify(input)}\n\nRésumé web:\n${webSummary}\n\nSuggestions de base:\n${JSON.stringify(baseSuggestions)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Tu renvoies uniquement du JSON valide." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return baseSuggestions;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return baseSuggestions;
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") return baseSuggestions;

    const merged = { ...baseSuggestions };
    ["typeStructure", "secteur", "ville", "departement"].forEach((field) => {
      const s = parsed[field];
      if (!s || typeof s !== "object") return;
      const value = clean(s.value);
      const confidence = Number(s.confidence);
      if (!value || !Number.isFinite(confidence)) return;
      merged[field] = {
        value,
        confidence: Math.max(0, Math.min(1, confidence)),
        reason: clean(s.reason) || "Suggestion IA",
      };
    });
    return merged;
  } catch {
    return baseSuggestions;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const input = req.body || {};
    const nomStructure = clean(input.nomStructure);
    const ville = clean(input.ville);
    const departement = clean(input.departement);
    const association = clean(input.association);

    if (!nomStructure) {
      res.status(400).json({ error: "nomStructure is required" });
      return;
    }

    const query = [nomStructure, ville, departement, association].filter(Boolean).join(" ");
    const [wiki, ddg, addr] = await Promise.allSettled([
      safeJson(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`),
      safeJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`),
      safeJson(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`),
    ]);

    const wikiItems = wiki.status === "fulfilled" ? (wiki.value?.query?.search || []).slice(0, 3) : [];
    const ddgData = ddg.status === "fulfilled" ? ddg.value : {};
    const addressFeature = addr.status === "fulfilled" ? (addr.value?.features || [])[0] : null;

    const wikiText = wikiItems.map((i) => `${clean(i.title)} ${clean(i.snippet)}`).join(" ");
    const ddgText = `${clean(ddgData?.Heading)} ${clean(ddgData?.AbstractText)}`;
    const webSummary = `${wikiText} ${ddgText}`.trim();
    const combined = normalize(webSummary);

    let suggestions = heuristicSuggestions(input, combined, addressFeature);
    suggestions = await maybeOpenAiRefine(input, webSummary, suggestions);

    res.status(200).json({
      query,
      suggestions,
      sources: {
        wikipediaResults: wikiItems.length,
        duckduckgoHeading: clean(ddgData?.Heading),
        addressHit: Boolean(addressFeature),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "assistant_failed", message: clean(error?.message) });
  }
};
