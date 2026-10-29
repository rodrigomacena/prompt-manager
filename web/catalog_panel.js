import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const CATEGORY_ORDER = [
    "Swimwear", "Dresses", "One-Pieces", "Formal & Business", "Tops", "Bottoms", "Activewear",
    "Lingerie", "Sleepwear", "Sexy Costumes", "Uniforms", "Fantasy & Cosplay", "Traditional & Cultural",
    "Style Looks", "Outerwear", "Legwear", "Shoes", "Accessories",
];
const POSE_ORDER = [
    "Standing", "Sitting", "Lying Down", "Kneeling", "Crouching & Squatting", "Leaning", "Walking & Motion", "Dancing",
    "Yoga & Stretching", "Action & Sports", "Sensual - Standing", "Sensual - Sitting", "Sensual - Lying",
    "Sensual - Kneeling & Crawling", "Pin-Up & Boudoir", "Bedroom & Bed", "Sofa & Chairs", "Beach & Pool", "Urban & Street",
    "Home & Windows", "Hands & Arms", "Sensual - Teasing Gestures", "Head & Gaze", "View & Angle", "+18",
];
const ENV_ORDER = [
    "Home & Interior", "Luxury & Hotels", "Bathroom & Spa", "Cafés, Bars & Restaurants", "Work, Study & Studios",
    "Studio Backdrops", "Beach & Coast", "Forests & Woods", "Mountains & Canyons", "Lakes, Rivers & Waterfalls",
    "Fields & Gardens", "Desert & Savanna", "Snow & Ice", "Jungle & Tropics", "City & Street", "Transport",
    "Culture & Historic", "Fantasy & Sci-Fi", "Time of Day", "Weather & Sky", "Season", "Atmosphere & Details",
];
const LIGHT_ORDER = [
    "Natural Daylight", "Golden & Blue Hour", "Window & Indoor Light", "Studio Lighting", "Dramatic & Cinematic",
    "Neon & Colored", "Warm & Cozy", "Night & Low Light", "Weather & Atmosphere", "Light Direction & Quality",
    "Color & Direction Combos", "Special Effects", "Mood & Style",
];
const OUTFIT_CFG = {
    key: "outfit",
    base: "/outfit_builder",
    noun: "piece",
    nouns: "pieces",
    order: CATEGORY_ORDER,
    unknownRank: CATEGORY_ORDER.indexOf("Style Looks") + 0.5,
    hasColor: true,
    hasPlural: true,
    hasPronoun: true,
    conflicts: true,
    pickHint: "Pick pieces below…",
    emptyHint: "Nothing picked yet. Tap pieces below to build the outfit.",
    randomHint: "Fixed: every picked piece. Random: one piece per category each run (📌 pinned pieces always stay).",
    leadPlaceholder: "Start of the sentence (empty = automatic)",
    textPlaceholder: "Text in the prompt (empty = name in lowercase)",
    sepTitle: "How to join the outfit to the prompt",
};
const POSE_CFG = {
    key: "pose",
    base: "/pose_builder",
    noun: "pose",
    nouns: "poses",
    order: POSE_ORDER,
    unknownRank: POSE_ORDER.indexOf("Home & Windows") + 0.5,
    hasColor: false,
    hasPlural: false,
    hasPronoun: true,
    conflicts: false,
    pickHint: "Pick poses below…",
    emptyHint: "Nothing picked yet. Tap poses below; they are joined into one sentence.",
    randomHint: "Fixed: every picked pose. Random: one pose per category each run (📌 pinned poses always stay).",
    leadPlaceholder: "Start of the sentence, e.g. The model is (empty = automatic)",
    textPlaceholder: "Text in the prompt, e.g. sitting with {poss} legs crossed (empty = name in lowercase)",
    sepTitle: "How to join the pose to the prompt",
};
const ENV_CFG = {
    key: "env",
    base: "/environment_builder",
    noun: "place",
    nouns: "environments",
    order: ENV_ORDER,
    unknownRank: ENV_ORDER.indexOf("Fantasy & Sci-Fi") + 0.5,
    hasColor: false,
    hasPlural: false,
    hasPronoun: false,
    conflicts: false,
    pickHint: "Pick places and details below…",
    emptyHint: "Nothing picked yet. Pick a place, then add time of day, weather or atmosphere.",
    randomHint: "Fixed: every picked item. Random: one item per category each run (📌 pinned items always stay).",
    leadPlaceholder: 'Start of the sentence (empty = "The scene is set in")',
    textPlaceholder: "Text in the prompt, e.g. a cozy cabin by the lake (empty = name in lowercase)",
    sepTitle: "How to join the environment to the prompt",
};
const LIGHT_CFG = {
    key: "light",
    base: "/lighting_builder",
    noun: "lighting",
    nouns: "lighting types",
    order: LIGHT_ORDER,
    unknownRank: LIGHT_ORDER.indexOf("Mood & Style") + 0.5,
    hasColor: false,
    hasPlural: false,
    hasPronoun: false,
    conflicts: false,
    pickHint: "Pick lighting below…",
    emptyHint: "Nothing picked yet. Tap lighting types below; they are joined into one sentence.",
    randomHint: "Fixed: every picked lighting. Random: one lighting per category each run (📌 pinned ones always stay).",
    leadPlaceholder: 'Start of the sentence (empty = "The lighting is")',
    textPlaceholder: "Text in the prompt, e.g. soft window light (empty = name in lowercase)",
    sepTitle: "How to join the lighting to the prompt",
};
const FULL_BODY = new Set(["Dresses", "One-Pieces"]);
const SPLIT_BODY = new Set(["Tops", "Bottoms"]);
const PRONOUNS = ["She", "He", "They", "(none)"];
const SEPARATORS = ["space", "new paragraph"];
const COLOR_HINTS = [
    "black", "white", "red", "pink", "hot pink", "blue", "navy", "light blue", "green", "olive green", "emerald green",
    "yellow", "orange", "purple", "lavender", "burgundy", "beige", "cream", "brown", "gray", "silver", "gold", "rose gold",
    "nude", "turquoise", "teal", "satin", "silk", "lace", "leather", "denim", "latex", "velvet", "sheer", "sequined",
    "floral", "striped", "polka dot", "red satin", "black lace", "black leather", "white lace",
];

const CSS_TEXT = `
.ob-root {
    position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px;
    background: var(--comfy-menu-bg, #202020); color: var(--input-text, #ddd);
    font-family: var(--font-family, sans-serif); font-size: 12px; border-radius: 6px;
    padding: 6px; box-sizing: border-box; overflow: hidden;
}
.ob-root * { box-sizing: border-box; }
.ob-bar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ob-spacer { flex: 1; }
.ob-btn, .ob-select {
    background: var(--comfy-input-bg, #2d2d2d); color: var(--input-text, #ddd); border: 1px solid var(--border-color, #4a4a4a);
    border-radius: 4px; padding: 4px 9px; font-size: 12px; font-family: inherit; cursor: pointer;
}
.ob-btn:hover { border-color: #7a7a7a; }
.ob-btn.ob-primary { background: var(--p-primary-color, #5b8dee); border-color: var(--p-primary-color, #5b8dee); color: #fff; }
.ob-btn.ob-on { background: #c9811a; border-color: #c9811a; color: #fff; }
.ob-btn:disabled { opacity: 0.45; cursor: default; }
.ob-input {
    background: var(--comfy-input-bg, #232323); color: var(--input-text, #ddd); border: 1px solid var(--border-color, #444);
    border-radius: 4px; padding: 4px 6px; font-size: 12px; font-family: inherit; min-width: 0;
}
.ob-output { border: 1px solid var(--border-color, #3a3a3a); border-radius: 6px; background: rgba(0,0,0,0.2); padding: 6px 8px; }
.ob-output-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--descrip-text, #888); margin-bottom: 2px; }
.ob-output-text { line-height: 1.4; word-break: break-word; min-height: 17px; }
.ob-output-text.ob-empty { color: var(--descrip-text, #888); font-style: italic; }
.ob-options { display: none; gap: 8px; align-items: center; flex-wrap: wrap; padding: 4px 2px; }
.ob-options.ob-show { display: flex; }
.ob-options label { display: flex; align-items: center; gap: 4px; color: var(--descrip-text, #aaa); }
.ob-warn { color: #e0a53a; font-size: 11px; display: none; }
.ob-warn.ob-show { display: block; }
.ob-chips { display: flex; flex-wrap: wrap; gap: 5px; max-height: 120px; overflow-y: auto; padding: 2px; min-height: 24px; }
.ob-chip {
    display: flex; align-items: center; gap: 4px; border: 1px solid #2f6fd8; background: rgba(47,111,216,0.18);
    border-radius: 14px; padding: 2px 4px 2px 9px;
}
.ob-chip.ob-pinned { border-color: #c9811a; background: rgba(201,129,26,0.2); }
.ob-chip-name { white-space: nowrap; }
.ob-chip-color { width: 92px; border: none; border-bottom: 1px dashed #777; background: transparent; color: var(--input-text, #ddd); font-size: 11px; padding: 1px 2px; }
.ob-chip-color:focus { outline: none; border-bottom-color: #5b8dee; }
.ob-chip-x, .ob-chip-pin { cursor: pointer; padding: 0 4px; color: var(--descrip-text, #aaa); user-select: none; }
.ob-chip-x:hover { color: #ff7b72; }
.ob-chip-pin { opacity: 0.55; }
.ob-chip-pin.ob-on { opacity: 1; }
.ob-hint { color: var(--descrip-text, #888); font-size: 11px; padding: 3px 2px; }
.ob-cats { display: flex; align-items: center; gap: 4px; }
.ob-catselect { flex: 1; min-width: 0; }
.ob-catstep { padding: 3px 9px; }
.ob-cat { padding: 2px 9px; border-radius: 12px; border: 1px solid var(--border-color, #4a4a4a); cursor: pointer; font-size: 11px; background: var(--comfy-input-bg, #2d2d2d); }
.ob-cat:hover { border-color: #7a7a7a; }
.ob-cat.ob-active { background: var(--p-primary-color, #5b8dee); border-color: var(--p-primary-color, #5b8dee); color: #fff; }
.ob-cat-n { opacity: 0.65; margin-left: 4px; }
.ob-grid { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; padding: 2px; }
.ob-item {
    position: relative; display: flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 6px; cursor: pointer;
    border: 1px solid var(--border-color, #444); background: var(--comfy-input-bg, #2a2a2a); user-select: none;
}
.ob-item:hover { border-color: #7a7a7a; }
.ob-item.ob-selected { border-color: #2f6fd8; background: rgba(47,111,216,0.28); }
.ob-item-cat { font-size: 10px; color: var(--descrip-text, #888); }
.ob-item-act { color: var(--descrip-text, #aaa); padding: 0 2px; }
.ob-item-act:hover { color: #fff; }
.ob-item-del:hover { color: #ff7b72; }
.ob-form { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px; border: 1px solid var(--border-color, #444); border-radius: 6px; background: rgba(0,0,0,0.2); }
.ob-status { color: #ff7b72; font-size: 11px; min-height: 14px; }
.ob-overlay { position: absolute; inset: 0; z-index: 10; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; }
.ob-box { width: min(440px, 92%); max-height: 88%; display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--comfy-menu-bg, #262626); border: 1px solid var(--border-color, #555); border-radius: 8px; }
.ob-box h4 { margin: 0; font-size: 13px; font-weight: 600; }
.ob-presets { overflow-y: auto; display: flex; flex-direction: column; gap: 4px; min-height: 40px; }
.ob-preset { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid var(--border-color, #444); border-radius: 6px; cursor: pointer; background: var(--comfy-input-bg, #2a2a2a); }
.ob-preset:hover { border-color: #7a7a7a; }
.ob-preset-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ob-preset-n { font-size: 10px; color: var(--descrip-text, #888); }
`;

let stylesInjected = false;
export function injectOutfitStyles() {
    if (stylesInjected) return;
    const style = document.createElement("style");
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
    stylesInjected = true;
}

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

function rank(cfg, category) {
    const i = cfg.order.indexOf(category);
    return i >= 0 ? i : cfg.unknownRank;
}

async function call(method, path, body) {
    const res = await api.fetchApi(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        /* empty body */
    }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
}

/**
 * Builds the outfit picker. `widgets` are the host node's (hidden) widgets that hold the values:
 * { selection, mode, pronoun, lead, separator }. opts.onPreview(text, info) is called whenever the
 * sentence is (re)computed; opts.showOutput = false hides the sentence box.
 */
function buildPanel(node, widgets, opts) {
    const cfg = opts.cfg;
    const selectionWidget = widgets.selection;
    const modeWidget = widgets.mode;
    const pronounWidget = widgets.pronoun || { value: "She" };
    const leadWidget = widgets.lead;
    const separatorWidget = widgets.separator;
    const AUTO_KEY = opts.autoKey || "autoResolve";
    const ID = `${node.id}-${cfg.key}`;
    if (!node.properties) node.properties = {};
    if (node.properties[AUTO_KEY] === undefined) node.properties[AUTO_KEY] = false;

    const state = {
        items: [],
        presets: [],
        selection: [],
        category: "All",
        search: "",
        edit: false,
        optionsOpen: false,
        form: null,
    };

    function readSelection() {
        try {
            const parsed = JSON.parse(selectionWidget.value || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    state.selection = readSelection();

    const root = el("div", "ob-root");
    const datalist = document.createElement("datalist");
    datalist.id = `ob-colors-${ID}`;
    for (const c of COLOR_HINTS) datalist.appendChild(Object.assign(document.createElement("option"), { value: c }));
    const catList = document.createElement("datalist");
    catList.id = `ob-cats-${ID}`;

    // ---- top bar
    const topBar = el("div", "ob-bar");
    const pronounSel = el("select", "ob-select");
    pronounSel.title = "Who is wearing it";
    for (const p of PRONOUNS) pronounSel.appendChild(Object.assign(el("option", "", p), { value: p }));
    const modeSel = el("select", "ob-select");
    modeSel.title = cfg.randomHint;
    modeSel.appendChild(Object.assign(el("option", "", "Fixed"), { value: "fixed" }));
    modeSel.appendChild(Object.assign(el("option", "", "🎲 Random"), { value: "random" }));
    const optionsBtn = el("button", "ob-btn", "⚙ Options");
    const presetsBtn = el("button", "ob-btn", "💾 Presets");
    const clearBtn = el("button", "ob-btn", "Clear all");
    if (cfg.hasPronoun) topBar.append(pronounSel);
    topBar.append(modeSel, el("div", "ob-spacer"), optionsBtn, presetsBtn, clearBtn);

    const options = el("div", "ob-options");
    const leadInput = el("input", "ob-input");
    leadInput.placeholder = cfg.leadPlaceholder;
    leadInput.style.flex = "1";
    leadInput.style.minWidth = "180px";
    const sepSel = el("select", "ob-select");
    sepSel.title = cfg.sepTitle;
    for (const s of SEPARATORS) sepSel.appendChild(Object.assign(el("option", "", `Join: ${s}`), { value: s }));
    const autoLabel = el("label");
    const autoBox = document.createElement("input");
    autoBox.type = "checkbox";
    autoLabel.append(autoBox, document.createTextNode("Auto-resolve dress vs top/bottom"));
    options.append(leadInput, sepSel);
    if (cfg.conflicts) options.append(autoLabel);

    const output = el("div", "ob-output");
    const outputTitle = el("div", "ob-output-title", "Output");
    const outputText = el("div", "ob-output-text ob-empty", cfg.pickHint);
    output.append(outputTitle, outputText);

    const warn = el("div", "ob-warn");
    const chips = el("div", "ob-chips");

    // ---- catalog
    const catBar = el("div", "ob-bar");
    const search = el("input", "ob-input");
    search.placeholder = `Search ${cfg.nouns}…`;
    search.style.flex = "1";
    const editBtn = el("button", "ob-btn", "✎ Edit list");
    catBar.append(search, editBtn);
    const cats = el("div", "ob-cats");
    const catPrev = el("button", "ob-btn ob-catstep", "◀");
    catPrev.title = "Previous category";
    const catNext = el("button", "ob-btn ob-catstep", "▶");
    catNext.title = "Next category";
    const catSelect = el("select", "ob-select ob-catselect");
    catSelect.title = "Category (● marks the ones with something picked)";
    cats.append(catPrev, catSelect, catNext);
    const status = el("div", "ob-status");
    const grid = el("div", "ob-grid");

    if (opts.showOutput === false) output.style.display = "none";
    root.append(datalist, catList, topBar, options, output, warn, chips, catBar, cats, status, grid);

    function flash(message) {
        status.textContent = message || "";
        if (message) setTimeout(() => status.textContent === message && (status.textContent = ""), 5000);
    }

    // ---- modal helpers
    function overlay(build) {
        const layer = el("div", "ob-overlay");
        const box = el("div", "ob-box");
        layer.appendChild(box);
        const close = () => layer.remove();
        layer.addEventListener("pointerdown", (ev) => {
            if (ev.target === layer) close();
        });
        build(box, close);
        root.appendChild(layer);
        return close;
    }

    function askText(message, value, placeholder) {
        return new Promise((resolve) => {
            let done = false;
            const finish = (v, close) => {
                if (done) return;
                done = true;
                close();
                resolve(v);
            };
            overlay((box, close) => {
                box.appendChild(el("h4", "", message));
                const input = el("input", "ob-input");
                input.value = value || "";
                input.placeholder = placeholder || "";
                const row = el("div", "ob-bar");
                const ok = el("button", "ob-btn ob-primary", "Save");
                const cancel = el("button", "ob-btn", "Cancel");
                ok.addEventListener("click", () => finish(input.value.trim() || null, close));
                cancel.addEventListener("click", () => finish(null, close));
                input.addEventListener("keydown", (ev) => {
                    if (ev.key === "Enter") finish(input.value.trim() || null, close);
                    if (ev.key === "Escape") finish(null, close);
                    ev.stopPropagation();
                });
                row.append(el("div", "ob-spacer"), cancel, ok);
                box.append(input, row);
                setTimeout(() => input.focus(), 30);
            });
        });
    }

    function confirmBox(message) {
        return new Promise((resolve) => {
            overlay((box, close) => {
                box.appendChild(el("h4", "", message));
                const row = el("div", "ob-bar");
                const ok = el("button", "ob-btn ob-primary", "Yes");
                const cancel = el("button", "ob-btn", "Cancel");
                ok.addEventListener("click", () => {
                    close();
                    resolve(true);
                });
                cancel.addEventListener("click", () => {
                    close();
                    resolve(false);
                });
                row.append(el("div", "ob-spacer"), cancel, ok);
                box.appendChild(row);
            });
        });
    }

    // ---- state <-> widgets
    let previewTimer = null;
    let previewSeq = 0;

    function schedulePreview() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(async () => {
            const seq = ++previewSeq;
            if (!state.selection.length) {
                outputText.textContent = cfg.pickHint;
                outputText.classList.add("ob-empty");
                if (opts.onPreview) opts.onPreview("", { random: modeWidget.value === "random", count: 0 });
                return;
            }
            try {
                const data = await call("POST", `${cfg.base}/preview`, {
                    selection: state.selection,
                    mode: modeWidget.value,
                    pronoun: pronounWidget.value,
                    lead: leadWidget.value || "",
                });
                if (seq !== previewSeq) return;
                outputText.textContent = data.outfit || "";
                outputText.classList.toggle("ob-empty", !data.outfit);
                if (opts.onPreview) opts.onPreview(data.outfit || "", { random: modeWidget.value === "random", count: state.selection.length });
            } catch (e) {
                outputText.textContent = "Could not build the preview: " + e.message;
            }
        }, 200);
    }

    function commit() {
        selectionWidget.value = JSON.stringify(state.selection);
        if (app.canvas) app.canvas.setDirty(true, true);
        schedulePreview();
    }

    function syncControls() {
        pronounSel.value = pronounWidget.value || "She";
        modeSel.value = modeWidget.value || "fixed";
        leadInput.value = leadWidget.value || "";
        sepSel.value = separatorWidget.value || "space";
        autoBox.checked = node.properties[AUTO_KEY] === true;
        outputTitle.textContent = modeSel.value === "random" ? "Output (preview — random picks change at every run)" : "Output";
    }

    pronounSel.addEventListener("change", () => {
        pronounWidget.value = pronounSel.value;
        commit();
    });
    modeSel.addEventListener("change", () => {
        modeWidget.value = modeSel.value;
        syncControls();
        renderChips();
        commit();
    });
    leadInput.addEventListener("input", () => {
        leadWidget.value = leadInput.value;
        commit();
    });
    sepSel.addEventListener("change", () => {
        separatorWidget.value = sepSel.value;
        commit();
    });
    autoBox.addEventListener("change", () => {
        node.properties[AUTO_KEY] = autoBox.checked;
        renderChips();
    });
    optionsBtn.addEventListener("click", () => {
        state.optionsOpen = !state.optionsOpen;
        options.classList.toggle("ob-show", state.optionsOpen);
        optionsBtn.classList.toggle("ob-on", state.optionsOpen);
    });
    function clearSelection() {
        state.selection = [];
        commit();
        renderChips();
        renderGrid();
    }
    clearBtn.addEventListener("click", clearSelection);

    // ---- selection logic
    const isSelected = (id) => state.selection.some((e) => e.id === id);

    function toggleItem(item) {
        const at = state.selection.findIndex((e) => e.id === item.id);
        if (at >= 0) {
            state.selection.splice(at, 1);
        } else {
            if (cfg.conflicts && node.properties[AUTO_KEY]) {
                if (FULL_BODY.has(item.category)) {
                    state.selection = state.selection.filter((e) => !FULL_BODY.has(e.category) && !SPLIT_BODY.has(e.category));
                } else if (SPLIT_BODY.has(item.category)) {
                    state.selection = state.selection.filter((e) => !FULL_BODY.has(e.category));
                }
            }
            const entry = { id: item.id, name: item.name, text: item.text, category: item.category, pin: false };
            if (cfg.hasPlural) entry.plural = !!item.plural;
            if (cfg.hasColor) entry.color = "";
            state.selection.push(entry);
        }
        commit();
        renderChips();
        renderGrid();
    }

    function conflictMessage() {
        if (!cfg.conflicts) return "";
        const full = state.selection.filter((e) => FULL_BODY.has(e.category)).length;
        const split = state.selection.filter((e) => SPLIT_BODY.has(e.category)).length;
        if (full > 1) return "⚠ More than one dress / one-piece is picked.";
        if (full && split) return "⚠ A dress / one-piece together with a top or bottom.";
        return "";
    }

    function renderChips() {
        renderCats();
        chips.textContent = "";
        const random = modeSel.value === "random";
        const sorted = [...state.selection].sort((a, b) => rank(cfg, a.category) - rank(cfg, b.category));
        if (!sorted.length) chips.appendChild(el("div", "ob-hint", cfg.emptyHint));
        for (const entry of sorted) {
            const chip = el("div", "ob-chip" + (random && entry.pin ? " ob-pinned" : ""));
            chip.title = entry.category;
            chip.appendChild(el("span", "ob-chip-name", entry.name));
            if (cfg.hasColor) {
                const color = el("input", "ob-chip-color");
                color.placeholder = "color / material";
                color.setAttribute("list", datalist.id);
                color.value = entry.color || "";
                color.addEventListener("input", () => {
                    entry.color = color.value;
                    commit();
                });
                chip.appendChild(color);
            }
            if (random) {
                const pin = el("span", "ob-chip-pin" + (entry.pin ? " ob-on" : ""), "📌");
                pin.title = "Pinned: always included in random mode";
                pin.addEventListener("click", () => {
                    entry.pin = !entry.pin;
                    commit();
                    renderChips();
                });
                chip.appendChild(pin);
            }
            const x = el("span", "ob-chip-x", "✕");
            x.title = "Remove";
            x.addEventListener("click", () => {
                state.selection = state.selection.filter((e) => e !== entry);
                commit();
                renderChips();
                renderGrid();
            });
            chip.appendChild(x);
            chips.appendChild(chip);
        }
        const msg = node.properties[AUTO_KEY] ? "" : conflictMessage();
        warn.textContent = msg;
        warn.classList.toggle("ob-show", !!msg);
    }

    // ---- catalog
    function categories() {
        const seen = [];
        for (const item of state.items) if (!seen.includes(item.category)) seen.push(item.category);
        return seen;
    }

    function renderCats() {
        catList.textContent = "";
        const all = categories();
        for (const c of all) catList.appendChild(Object.assign(document.createElement("option"), { value: c }));
        if (state.category !== "All" && !all.includes(state.category)) state.category = "All";
        const picked = new Map();
        for (const e of state.selection) picked.set(e.category, (picked.get(e.category) || 0) + 1);
        catSelect.textContent = "";
        const add = (value, label) => catSelect.appendChild(Object.assign(el("option", "", label), { value }));
        add("All", `All · ${state.items.length}${state.selection.length ? ` (${state.selection.length} picked)` : ""}`);
        for (const c of all) {
            const n = picked.get(c) || 0;
            add(c, `${n ? "● " : ""}${c} · ${state.items.filter((i) => i.category === c).length}${n ? ` (${n} picked)` : ""}`);
        }
        catSelect.value = state.category;
    }

    function stepCategory(delta) {
        const list = ["All", ...categories()];
        const i = list.indexOf(state.category);
        state.category = list[(i + delta + list.length) % list.length];
        renderCats();
        renderGrid();
    }
    catSelect.addEventListener("change", () => {
        state.category = catSelect.value;
        renderCats();
        renderGrid();
    });
    catPrev.addEventListener("click", () => stepCategory(-1));
    catNext.addEventListener("click", () => stepCategory(1));

    function openForm(item) {
        state.form = item ? { ...item, isNew: false } : { id: "", name: "", category: state.category === "All" ? "" : state.category, text: "", plural: null, isNew: true };
        renderGrid();
    }

    function renderForm() {
        const f = state.form;
        const box = el("div", "ob-form");
        const name = el("input", "ob-input");
        name.placeholder = cfg.hasPlural ? "Name (e.g. Silk Robe)" : "Name (e.g. Hands on Hips)";
        name.value = f.name;
        const category = el("input", "ob-input");
        category.placeholder = "Category";
        category.setAttribute("list", catList.id);
        category.value = f.category;
        const text = el("input", "ob-input");
        text.placeholder = cfg.textPlaceholder;
        text.value = f.isNew ? f.text : f.text;
        text.style.minWidth = "220px";
        const plural = el("select", "ob-select");
        plural.title = "Plural pieces get no 'a/an' (jeans, boots…)";
        for (const [v, l] of [["auto", "Plural: auto"], ["no", "Singular"], ["yes", "Plural"]]) plural.appendChild(Object.assign(el("option", "", l), { value: v }));
        plural.value = f.isNew || f.plural === null ? "auto" : f.plural ? "yes" : "no";
        const save = el("button", "ob-btn ob-primary", f.isNew ? `Add ${cfg.noun}` : "Save");
        const cancel = el("button", "ob-btn", "Cancel");
        cancel.addEventListener("click", () => {
            state.form = null;
            renderGrid();
        });
        save.addEventListener("click", async () => {
            const body = {
                name: name.value.trim(),
                category: category.value.trim(),
                text: text.value.trim(),
                plural: plural.value === "auto" ? null : plural.value === "yes",
            };
            if (!body.name) {
                flash("A name is required.");
                return;
            }
            try {
                if (f.isNew) await call("POST", `${cfg.base}/items`, body);
                else await call("PUT", `${cfg.base}/items/${f.id}`, body);
                state.form = null;
                await loadCatalog();
            } catch (e) {
                flash(e.message);
            }
        });
        for (const field of [name, category, text]) field.addEventListener("keydown", (ev) => ev.stopPropagation());
        box.append(name, category, text);
        if (cfg.hasPlural) box.append(plural);
        box.append(save, cancel);
        return box;
    }

    function renderGrid() {
        grid.textContent = "";
        editBtn.classList.toggle("ob-on", state.edit);
        editBtn.textContent = state.edit ? "✓ Done editing" : "✎ Edit list";
        if (state.edit && !state.form) {
            const bar = el("div", "ob-bar");
            bar.style.width = "100%";
            const add = el("button", "ob-btn ob-primary", `＋ New ${cfg.noun}`);
            add.addEventListener("click", () => openForm(null));
            const restore = el("button", "ob-btn", "↺ Restore missing defaults");
            restore.title = `Adds back shipped ${cfg.nouns} you deleted. Your own ${cfg.nouns} and edits stay.`;
            restore.addEventListener("click", async () => {
                try {
                    const data = await call("POST", `${cfg.base}/restore`);
                    state.items = data.items;
                    flash(data.added ? `${data.added} ${cfg.noun}(s) restored.` : "Nothing was missing.");
                    renderCats();
                    renderGrid();
                } catch (e) {
                    flash(e.message);
                }
            });
            bar.append(add, restore);
            grid.appendChild(bar);
        }
        if (state.form) grid.appendChild(renderForm());
        const q = state.search.trim().toLowerCase();
        const shown = state.items.filter(
            (i) => (state.category === "All" || i.category === state.category) && (!q || `${i.name} ${i.text} ${i.category}`.toLowerCase().includes(q))
        );
        if (!shown.length) grid.appendChild(el("div", "ob-hint", `No ${cfg.nouns} match.`));
        for (const item of shown) {
            const cell = el("div", "ob-item" + (isSelected(item.id) ? " ob-selected" : ""));
            cell.appendChild(el("span", "", item.name));
            if (state.category === "All") cell.appendChild(el("span", "ob-item-cat", item.category));
            if (state.edit) {
                const pen = el("span", "ob-item-act", "✎");
                pen.title = `Edit this ${cfg.noun}`;
                pen.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    openForm(item);
                });
                const del = el("span", "ob-item-act ob-item-del", "✕");
                del.title = `Delete this ${cfg.noun} from the list`;
                del.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    if (!(await confirmBox(`Delete "${item.name}" from the list?`))) return;
                    try {
                        await call("DELETE", `${cfg.base}/items/${item.id}`);
                        await loadCatalog();
                    } catch (e) {
                        flash(e.message);
                    }
                });
                cell.append(pen, del);
            } else {
                cell.addEventListener("click", () => toggleItem(item));
            }
            grid.appendChild(cell);
        }
    }

    async function loadCatalog() {
        try {
            state.items = (await call("GET", `${cfg.base}/catalog`)).items;
        } catch (e) {
            flash("Could not load the list: " + e.message);
        }
        renderCats();
        renderGrid();
    }

    search.addEventListener("input", () => {
        state.search = search.value;
        renderGrid();
    });
    search.addEventListener("keydown", (ev) => ev.stopPropagation());
    editBtn.addEventListener("click", () => {
        state.edit = !state.edit;
        state.form = null;
        renderGrid();
    });

    // ---- presets
    presetsBtn.addEventListener("click", async () => {
        try {
            state.presets = await call("GET", `${cfg.base}/presets`);
        } catch (e) {
            flash(e.message);
        }
        let closeFn = null;
        const draw = (box) => {
            box.textContent = "";
            box.appendChild(el("h4", "", "Outfit presets"));
            const list = el("div", "ob-presets");
            if (!state.presets.length) list.appendChild(el("div", "ob-hint", "No presets yet. Build an outfit and save it below."));
            for (const preset of state.presets) {
                const row = el("div", "ob-preset");
                row.appendChild(el("span", "ob-preset-title", preset.title));
                row.appendChild(el("span", "ob-preset-n", `${preset.selection.length} pcs`));
                const rename = el("span", "ob-item-act", "✎");
                rename.title = "Rename";
                const update = el("span", "ob-item-act", "⟳");
                update.title = "Replace this preset with the current outfit";
                const del = el("span", "ob-item-act ob-item-del", "✕");
                del.title = "Delete";
                row.addEventListener("click", () => {
                    state.selection = preset.selection.map((e) => ({ ...e }));
                    commit();
                    renderChips();
                    renderGrid();
                    closeFn();
                });
                rename.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    const title = await askText("Rename preset", preset.title);
                    if (!title) return;
                    try {
                        preset.title = (await call("PUT", `${cfg.base}/presets/${preset.id}`, { title })).title;
                    } catch (e) {
                        flash(e.message);
                    }
                    draw(box);
                });
                update.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    if (!state.selection.length) return flash(`Pick some ${cfg.nouns} first.`);
                    if (!(await confirmBox(`Replace "${preset.title}" with the current outfit?`))) return;
                    try {
                        preset.selection = (await call("PUT", `${cfg.base}/presets/${preset.id}`, { selection: state.selection })).selection;
                    } catch (e) {
                        flash(e.message);
                    }
                    draw(box);
                });
                del.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    if (!(await confirmBox(`Delete preset "${preset.title}"?`))) return;
                    try {
                        await call("DELETE", `${cfg.base}/presets/${preset.id}`);
                        state.presets = state.presets.filter((p) => p.id !== preset.id);
                    } catch (e) {
                        flash(e.message);
                    }
                    draw(box);
                });
                row.append(rename, update, del);
                list.appendChild(row);
            }
            box.appendChild(list);
            const bar = el("div", "ob-bar");
            const save = el("button", "ob-btn ob-primary", "＋ Save current outfit…");
            save.disabled = !state.selection.length;
            save.addEventListener("click", async () => {
                const title = await askText("Name this outfit", "", "e.g. Beach day");
                if (!title) return;
                try {
                    state.presets.push(await call("POST", `${cfg.base}/presets`, { title, selection: state.selection }));
                } catch (e) {
                    flash(e.message);
                }
                draw(box);
            });
            const close = el("button", "ob-btn", "Close");
            close.addEventListener("click", () => closeFn());
            bar.append(save, el("div", "ob-spacer"), close);
            box.appendChild(bar);
        };
        closeFn = overlay((box) => draw(box));
    });

    // ---- lifecycle
    function refresh() {
        state.selection = readSelection();
        syncControls();
        options.classList.toggle("ob-show", state.optionsOpen);
        renderChips();
        renderGrid();
        schedulePreview();
    }

    syncControls();
    renderChips();
    loadCatalog();
    schedulePreview();
    return { root, refresh, clear: clearSelection };
}

export function createOutfitPanel(node, widgets, opts = {}) {
    return buildPanel(node, widgets, { ...opts, cfg: OUTFIT_CFG });
}

export function createPosePanel(node, widgets, opts = {}) {
    return buildPanel(node, widgets, { ...opts, cfg: POSE_CFG });
}

export function createEnvironmentPanel(node, widgets, opts = {}) {
    return buildPanel(node, widgets, { ...opts, cfg: ENV_CFG });
}

export function createLightingPanel(node, widgets, opts = {}) {
    return buildPanel(node, widgets, { ...opts, cfg: LIGHT_CFG });
}
