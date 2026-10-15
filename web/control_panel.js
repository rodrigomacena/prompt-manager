import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "ControlPanel";
const POLL_MS = 400;

const CSS_TEXT = `
.cp-root {
    position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 8px;
    background: var(--comfy-menu-bg, #202020); color: var(--input-text, #ddd);
    font-family: var(--font-family, sans-serif); font-size: 15px; border-radius: 6px;
    padding: 8px; box-sizing: border-box; overflow: hidden; touch-action: manipulation;
}
.cp-root * { box-sizing: border-box; }
.cp-bar { display: flex; gap: 8px; align-items: center; }
.cp-bar .cp-spacer { flex: 1; }
.cp-btn {
    min-height: 40px; padding: 6px 14px; font-size: 15px; border-radius: 8px; cursor: pointer;
    border: 1px solid var(--border-color, #4a4a4a); background: var(--comfy-input-bg, #2d2d2d); color: var(--input-text, #ddd);
}
.cp-btn:hover { filter: brightness(1.2); }
.cp-btn.cp-primary { background: #2f6fd8; border-color: #2f6fd8; color: #fff; font-weight: 600; }
.cp-btn.cp-on { background: #c9811a; border-color: #c9811a; color: #fff; }
.cp-btn.cp-small { min-height: 34px; min-width: 38px; padding: 2px 10px; }
.cp-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; -webkit-overflow-scrolling: touch; }
.cp-empty { padding: 24px 12px; text-align: center; color: var(--descrip-text, #999); line-height: 1.5; }
.cp-row {
    border: 1px solid var(--border-color, #3a3a3a); border-radius: 10px; background: rgba(0,0,0,0.18);
    padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;
}
.cp-row.cp-missing { border-color: #a33; opacity: 0.8; }
.cp-head { display: flex; align-items: center; gap: 8px; }
.cp-label { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-src { font-size: 11px; color: var(--descrip-text, #888); font-weight: 400; margin-left: 6px; }
.cp-label-input { flex: 1; min-width: 0; min-height: 36px; font-size: 16px; padding: 4px 8px; border-radius: 6px;
    border: 1px solid var(--border-color, #555); background: var(--comfy-input-bg, #111); color: var(--input-text, #ddd); }
.cp-ctl { display: flex; align-items: center; gap: 8px; }
.cp-ctl > .cp-grow { flex: 1; min-width: 0; }
.cp-num, .cp-sel, .cp-text {
    min-height: 44px; font-size: 16px; padding: 6px 10px; border-radius: 8px; width: 100%;
    border: 1px solid var(--border-color, #555); background: var(--comfy-input-bg, #111); color: var(--input-text, #ddd);
}
.cp-num { text-align: center; width: 110px; flex-shrink: 0; }
.cp-text { min-height: 90px; resize: vertical; line-height: 1.35; font-family: inherit; }
.cp-range { width: 100%; height: 36px; margin: 0; accent-color: #2f6fd8; }
.cp-switch { position: relative; width: 62px; height: 34px; border-radius: 17px; background: #555; cursor: pointer; flex-shrink: 0; transition: background 0.15s; }
.cp-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 14px; background: #fff; transition: left 0.15s; }
.cp-switch.cp-checked { background: #2f6fd8; }
.cp-switch.cp-checked::after { left: 31px; }
.cp-switch.cp-disabled, .cp-disabled { opacity: 0.45; pointer-events: none; }
.cp-note { font-size: 12px; color: var(--descrip-text, #999); }
.cp-edit { display: flex; gap: 6px; }
.cp-preview { flex-shrink: 0; display: none; align-items: center; gap: 8px; }
.cp-preview.cp-show { display: flex; }
.cp-preview img { height: 64px; max-width: 120px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color, #444); }
.cp-picker { position: absolute; inset: 0; z-index: 5; display: none; flex-direction: column; gap: 8px; padding: 8px; background: var(--comfy-menu-bg, #202020); }
.cp-picker.cp-show { display: flex; }
.cp-picker-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; -webkit-overflow-scrolling: touch; }
.cp-pick-row {
    display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 12px; cursor: pointer;
    border: 1px solid var(--border-color, #3a3a3a); border-radius: 10px; background: rgba(0,0,0,0.18);
}
.cp-pick-row:hover { background: rgba(255,255,255,0.06); }
.cp-pick-row.cp-added { border-color: #2f6fd8; background: rgba(47,111,216,0.18); }
.cp-pick-row.cp-linked { opacity: 0.45; cursor: not-allowed; }
.cp-pick-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-pick-val { max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--descrip-text, #999); font-size: 12px; }
.cp-check { width: 24px; height: 24px; border-radius: 6px; border: 2px solid #777; flex-shrink: 0; text-align: center; line-height: 20px; font-size: 16px; color: #fff; }
.cp-added .cp-check { background: #2f6fd8; border-color: #2f6fd8; }
`;

let stylesInjected = false;
function injectStyles() {
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

const TEXT_TYPES = new Set(["text", "customtext", "string"]);
const NUMBER_TYPES = new Set(["number", "slider", "knob"]);

// The Prompt Manager hides its own widgets behind a custom UI; these three are meant to be edited from outside.
const PM_EXPOSED = { prompt_text: ["text", "Prompt"], prefix: ["text", "Prefix"], mode: ["combo", "Mode"] };

function pmExposed(node, w) {
    return !!(node && node._pmRefreshFromWidgets && w && PM_EXPOSED[w.name]);
}

function displayName(node, w) {
    return pmExposed(node, w) ? PM_EXPOSED[w.name][1] : w.label || w.name;
}

function widgetKind(w, node) {
    if (!w) return null;
    if (pmExposed(node, w)) return PM_EXPOSED[w.name][0];
    if (w.type === "combo") return "combo";
    if (w.type === "toggle") return "toggle";
    if (w.type === "button") return "button";
    if (NUMBER_TYPES.has(w.type)) return "number";
    if (TEXT_TYPES.has(w.type)) return "text";
    return null;
}

function isHidden(w, node) {
    if (pmExposed(node, w)) return false;
    return !!(w.hidden || (w.options && w.options.hidden) || w.type === "converted-widget");
}

function isLinked(node, w) {
    const inputs = node.inputs || [];
    return inputs.some((i) => i.widget && i.widget.name === w.name && i.link != null);
}

function usableWidgets(node) {
    return (node.widgets || []).filter((w) => w.name && widgetKind(w, node) && !isHidden(w, node));
}

function findWidget(item) {
    const node = app.graph && app.graph.getNodeById ? app.graph.getNodeById(item.n) : null;
    if (!node) return { node: null, widget: null };
    const widget = (node.widgets || []).find((w) => w.name === item.w) || null;
    return { node, widget };
}

function comboValues(w, node) {
    const v = w.options && w.options.values;
    try {
        const list = typeof v === "function" ? v(w, node) : v;
        return Array.isArray(list) ? list : Object.keys(list || {});
    } catch (e) {
        return [];
    }
}

function numberSpec(w) {
    const o = w.options || {};
    const min = Number.isFinite(o.min) ? o.min : null;
    const max = Number.isFinite(o.max) ? o.max : null;
    let step = Number.isFinite(o.step2) ? o.step2 : Number.isFinite(o.step) ? o.step / 10 : 1;
    if (!(step > 0)) step = 1;
    const decimals = (n) => (String(n).includes(".") ? String(n).split(".")[1].length : 0);
    let precision = Number.isFinite(o.precision) ? o.precision : decimals(step);
    if (Number.isFinite(o.round) && o.round > 0) precision = Math.max(precision, decimals(o.round));
    const slider = min !== null && max !== null && max - min <= 100000 && (max - min) / step <= 100000;
    return { min, max, step, precision, slider };
}

function formatNumber(v, precision) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(precision) : "";
}

function pushValue(node, widget, value) {
    widget.value = value;
    if (node._pmRefreshFromWidgets) {
        // the Prompt Manager keeps its own copy of these values; let it re-read them (debounced while typing)
        clearTimeout(node._cpRefreshTimer);
        node._cpRefreshTimer = setTimeout(() => node._pmRefreshFromWidgets(), 350);
    }
    try {
        if (widget.callback) widget.callback(value, app.canvas, node, [0, 0], null);
    } catch (e) {
        console.error("ControlPanel: widget callback failed", e);
    }
    try {
        if (app.canvas) app.canvas.setDirty(true, true);
        const wf = app.extensionManager && app.extensionManager.workflow && app.extensionManager.workflow.activeWorkflow;
        if (wf && wf.changeTracker && wf.changeTracker.checkState) wf.changeTracker.checkState();
    } catch (e) {
        /* the change tracker is optional */
    }
}

function previewValue(w) {
    const v = w.value;
    if (v === undefined || v === null) return "";
    return String(v).replace(/\s+/g, " ").slice(0, 60);
}

function setupControlPanel(node) {
    const state = {
        items: Array.isArray(node.properties.items) ? node.properties.items : [],
        edit: false,
        pickNode: null,
        search: "",
        rows: [],
    };

    const root = el("div", "cp-root");
    const bar = el("div", "cp-bar");
    const queueBtn = el("button", "cp-btn cp-primary", "▶ Queue");
    const addBtn = el("button", "cp-btn", "＋ Add control");
    const editBtn = el("button", "cp-btn", "✎ Edit");
    bar.append(queueBtn, el("div", "cp-spacer"), addBtn, editBtn);
    const list = el("div", "cp-list");
    const preview = el("div", "cp-preview");
    const previewImg = el("img");
    const previewNote = el("span", "cp-note", "Last image");
    preview.append(previewImg, previewNote);
    const picker = el("div", "cp-picker");
    root.append(bar, list, preview, picker);

    function save() {
        node.properties.items = state.items.map((i) => ({ n: i.n, w: i.w, label: i.label || "" }));
    }

    // ---------------------------------------------------------------- rows

    function buildControl(item, node2, widget, row) {
        const kind = widgetKind(widget, node2);
        const linked = isLinked(node2, widget);
        const box = el("div", "cp-ctl");
        let sync = () => {};
        const set = (v) => pushValue(node2, widget, v);

        if (kind === "number") {
            const spec = numberSpec(widget);
            const minus = el("button", "cp-btn cp-small", "−");
            const plus = el("button", "cp-btn cp-small", "+");
            const input = el("input", "cp-num");
            input.type = "number";
            input.inputMode = spec.precision > 0 ? "decimal" : "numeric";
            input.step = String(spec.step);
            if (spec.min !== null) input.min = String(spec.min);
            if (spec.max !== null) input.max = String(spec.max);
            const clamp = (v) => {
                let n = Number(v);
                if (!Number.isFinite(n)) return null;
                if (spec.min !== null) n = Math.max(spec.min, n);
                if (spec.max !== null) n = Math.min(spec.max, n);
                const f = 10 ** spec.precision;
                return Math.round(n * f) / f;
            };
            const commit = (v) => {
                const n = clamp(v);
                if (n === null) return;
                set(n);
                sync();
            };
            minus.addEventListener("click", () => commit(Number(widget.value) - spec.step));
            plus.addEventListener("click", () => commit(Number(widget.value) + spec.step));
            input.addEventListener("change", () => commit(input.value));
            const parts = [];
            let range = null;
            if (spec.slider) {
                range = el("input", "cp-range cp-grow");
                range.type = "range";
                range.min = String(spec.min);
                range.max = String(spec.max);
                range.step = String(spec.step);
                range.addEventListener("input", () => {
                    const n = clamp(range.value);
                    if (n === null) return;
                    set(n);
                    input.value = formatNumber(n, spec.precision);
                });
                parts.push(range);
            } else {
                box.appendChild(el("div", "cp-grow"));
            }
            if (/seed/i.test(widget.name)) {
                const dice = el("button", "cp-btn cp-small", "🎲");
                dice.title = "Random value";
                dice.addEventListener("click", () => {
                    const top = Math.min(spec.max === null ? Number.MAX_SAFE_INTEGER : spec.max, Number.MAX_SAFE_INTEGER);
                    commit(Math.floor(Math.random() * top));
                });
                parts.push(dice);
            }
            box.append(minus, ...(range ? [range] : []), input, plus, ...parts.filter((p) => p !== range));
            sync = () => {
                if (document.activeElement !== input) input.value = formatNumber(widget.value, spec.precision);
                if (range && document.activeElement !== range) range.value = String(widget.value);
            };
        } else if (kind === "combo") {
            const prev = el("button", "cp-btn cp-small", "◀");
            const next = el("button", "cp-btn cp-small", "▶");
            const select = el("select", "cp-sel");
            let shown = null;
            const fill = () => {
                const values = comboValues(widget, node2);
                const key = JSON.stringify(values);
                if (key === shown) return;
                shown = key;
                select.textContent = "";
                for (const v of values) {
                    const opt = el("option", "", String(v));
                    opt.value = String(v);
                    select.appendChild(opt);
                }
            };
            const step = (d) => {
                const values = comboValues(widget, node2);
                if (!values.length) return;
                let i = values.findIndex((v) => String(v) === String(widget.value));
                i = (i + d + values.length) % values.length;
                set(values[i]);
                sync();
            };
            select.addEventListener("change", () => {
                const values = comboValues(widget, node2);
                const found = values.find((v) => String(v) === select.value);
                set(found === undefined ? select.value : found);
            });
            prev.addEventListener("click", () => step(-1));
            next.addEventListener("click", () => step(1));
            select.classList.add("cp-grow");
            box.append(prev, select, next);
            sync = () => {
                fill();
                if (document.activeElement !== select) select.value = String(widget.value);
            };
        } else if (kind === "toggle") {
            const sw = el("div", "cp-switch");
            sw.setAttribute("role", "switch");
            sw.addEventListener("click", () => {
                set(!widget.value);
                sync();
            });
            row.head.appendChild(sw);
            sync = () => sw.classList.toggle("cp-checked", !!widget.value);
            sync();
            return { box: null, sync, linked };
        } else if (kind === "text") {
            const ta = el("textarea", "cp-text");
            ta.addEventListener("input", () => set(ta.value));
            box.appendChild(ta);
            sync = () => {
                if (document.activeElement !== ta && ta.value !== String(widget.value ?? "")) ta.value = String(widget.value ?? "");
            };
        } else if (kind === "button") {
            const b = el("button", "cp-btn cp-grow", displayName(node2, widget));
            b.addEventListener("click", () => {
                try {
                    if (widget.callback) widget.callback(widget.value, app.canvas, node2, [0, 0], null);
                } catch (e) {
                    console.error("ControlPanel: button failed", e);
                }
            });
            box.appendChild(b);
        }
        sync();
        return { box, sync, linked };
    }

    function moveItem(index, delta) {
        const j = index + delta;
        if (j < 0 || j >= state.items.length) return;
        const [it] = state.items.splice(index, 1);
        state.items.splice(j, 0, it);
        save();
        render();
    }

    function render() {
        state.rows = [];
        list.textContent = "";
        editBtn.classList.toggle("cp-on", state.edit);
        editBtn.textContent = state.edit ? "✓ Done" : "✎ Edit";
        if (!state.items.length) {
            const empty = el("div", "cp-empty");
            empty.textContent = "Nothing here yet. Press ＋ Add control, pick a node and tick the fields you want to change from this panel.";
            list.appendChild(empty);
            return;
        }
        state.items.forEach((item, index) => {
            const { node: src, widget } = findWidget(item);
            const row = el("div", "cp-row");
            row.head = el("div", "cp-head");
            row.appendChild(row.head);
            const defaultLabel = widget ? displayName(src, widget) : item.w;
            if (state.edit) {
                const input = el("input", "cp-label-input");
                input.value = item.label || "";
                input.placeholder = defaultLabel;
                input.addEventListener("change", () => {
                    item.label = input.value.trim();
                    save();
                });
                row.head.appendChild(input);
                const up = el("button", "cp-btn cp-small", "↑");
                const down = el("button", "cp-btn cp-small", "↓");
                const del = el("button", "cp-btn cp-small", "✕");
                up.addEventListener("click", () => moveItem(index, -1));
                down.addEventListener("click", () => moveItem(index, 1));
                del.addEventListener("click", () => {
                    state.items.splice(index, 1);
                    save();
                    render();
                });
                row.head.append(up, down, del);
            } else {
                const label = el("div", "cp-label", item.label || defaultLabel);
                if (src) label.appendChild(el("span", "cp-src", `${src.title || src.type} #${src.id}`));
                row.head.appendChild(label);
            }
            if (!src || !widget) {
                row.classList.add("cp-missing");
                row.appendChild(el("div", "cp-note", src ? `Field "${item.w}" no longer exists on that node.` : `Node #${item.n} was not found in this workflow.`));
                list.appendChild(row);
                return;
            }
            const built = buildControl(item, src, widget, row);
            if (built.box) row.appendChild(built.box);
            if (built.linked) {
                row.classList.add("cp-disabled");
                row.appendChild(el("div", "cp-note", "Connected to another node's output; edit it there."));
            }
            state.rows.push({ item, sync: built.sync });
            list.appendChild(row);
        });
    }

    function syncAll() {
        for (const r of state.rows) {
            try {
                r.sync();
            } catch (e) {
                /* a widget may have been rebuilt; the next render fixes it */
            }
        }
    }

    // ------------------------------------------------------------- picker

    function isAdded(n, w) {
        return state.items.some((i) => i.n === n && i.w === w);
    }

    function renderPicker() {
        picker.textContent = "";
        const top = el("div", "cp-bar");
        if (state.pickNode === null) {
            const search = el("input", "cp-label-input");
            search.placeholder = "Search nodes…";
            search.value = state.search;
            search.addEventListener("input", () => {
                state.search = search.value;
                renderPickerList();
            });
            const done = el("button", "cp-btn cp-primary", "Done");
            done.addEventListener("click", closePicker);
            top.append(search, done);
        } else {
            const back = el("button", "cp-btn", "← Nodes");
            back.addEventListener("click", () => {
                state.pickNode = null;
                renderPicker();
            });
            const done = el("button", "cp-btn cp-primary", "Done");
            done.addEventListener("click", closePicker);
            const src = app.graph.getNodeById(state.pickNode);
            top.append(back, el("div", "cp-label", src ? `${src.title || src.type} #${src.id}` : ""), done);
        }
        picker.appendChild(top);
        const body = el("div", "cp-picker-list");
        picker.appendChild(body);
        picker._body = body;
        renderPickerList();
    }

    function renderPickerList() {
        const body = picker._body;
        if (!body) return;
        body.textContent = "";
        if (state.pickNode === null) {
            const q = state.search.trim().toLowerCase();
            const nodes = (app.graph._nodes || [])
                .filter((n) => n !== node && usableWidgets(n).length)
                .filter((n) => !q || `${n.title || ""} ${n.type} ${n.id}`.toLowerCase().includes(q))
                .sort((a, b) => (a.title || a.type).localeCompare(b.title || b.type) || a.id - b.id);
            if (!nodes.length) body.appendChild(el("div", "cp-empty", "No nodes with editable fields found."));
            for (const n of nodes) {
                const count = state.items.filter((i) => i.n === n.id).length;
                const r = el("div", "cp-pick-row");
                r.appendChild(el("div", "cp-pick-name", `${n.title || n.type}  #${n.id}`));
                r.appendChild(el("div", "cp-pick-val", count ? `${count} added` : `${usableWidgets(n).length} fields`));
                r.appendChild(el("div", "", "›"));
                r.addEventListener("click", () => {
                    state.pickNode = n.id;
                    renderPicker();
                });
                body.appendChild(r);
            }
        } else {
            const src = app.graph.getNodeById(state.pickNode);
            if (!src) {
                body.appendChild(el("div", "cp-empty", "That node is gone."));
                return;
            }
            for (const w of usableWidgets(src)) {
                const linked = isLinked(src, w);
                const r = el("div", "cp-pick-row");
                r.classList.toggle("cp-added", isAdded(src.id, w.name));
                r.classList.toggle("cp-linked", linked);
                r.appendChild(el("div", "cp-check", isAdded(src.id, w.name) ? "✓" : ""));
                r.appendChild(el("div", "cp-pick-name", displayName(src, w)));
                r.appendChild(el("div", "cp-pick-val", linked ? "connected" : previewValue(w)));
                r.addEventListener("click", () => {
                    if (linked) return;
                    const at = state.items.findIndex((i) => i.n === src.id && i.w === w.name);
                    if (at >= 0) state.items.splice(at, 1);
                    else state.items.push({ n: src.id, w: w.name, label: "" });
                    save();
                    renderPickerList();
                });
                body.appendChild(r);
            }
        }
    }

    function openPicker() {
        state.pickNode = null;
        state.search = "";
        picker.classList.add("cp-show");
        renderPicker();
    }

    function closePicker() {
        picker.classList.remove("cp-show");
        render();
    }

    // ------------------------------------------------------------- wiring

    addBtn.addEventListener("click", openPicker);
    editBtn.addEventListener("click", () => {
        state.edit = !state.edit;
        render();
    });
    queueBtn.addEventListener("click", async () => {
        try {
            await app.queuePrompt(0, 1);
        } catch (e) {
            console.error("ControlPanel: could not queue", e);
        }
    });
    previewImg.addEventListener("click", () => previewImg.src && window.open(previewImg.src, "_blank"));

    const onExecuted = (ev) => {
        const images = ev.detail && ev.detail.output && ev.detail.output.images;
        if (!images || !images.length) return;
        const last = images[images.length - 1];
        const params = new URLSearchParams({ filename: last.filename, subfolder: last.subfolder || "", type: last.type || "output" });
        previewImg.src = api.apiURL(`/view?${params.toString()}&rand=${Date.now()}`);
        preview.classList.add("cp-show");
    };
    api.addEventListener("executed", onExecuted);

    const timer = setInterval(() => {
        if (!root.isConnected) return;
        syncAll();
    }, POLL_MS);

    const previousRemoved = node.onRemoved;
    node.onRemoved = function () {
        clearInterval(timer);
        api.removeEventListener("executed", onExecuted);
        return previousRemoved ? previousRemoved.apply(this, arguments) : undefined;
    };

    node._cpReload = () => {
        state.items = Array.isArray(node.properties.items) ? node.properties.items : [];
        render();
    };

    node.addDOMWidget("control_panel_ui", "control_panel", root, {
        getMinHeight: () => 260,
        hideOnZoom: false,
    });
    if (node.size[0] < 420) node.size[0] = 420;
    if (node.size[1] < 520) node.size[1] = 520;
    render();
}

app.registerExtension({
    name: "PromptManager.ControlPanel",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            injectStyles();
            setupControlPanel(this);
            return result;
        };
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const result = onConfigure ? onConfigure.apply(this, arguments) : undefined;
            if (this._cpReload) this._cpReload();
            return result;
        };
    },
});
