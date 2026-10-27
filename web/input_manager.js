import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "InputManager";
const DEFAULT_DIR = "input";
const DEFAULT_THUMB = 140;
const MIN_THUMB = 70;
const MAX_THUMB = 260;
const SORT_DEFAULT_ORDER = { date: "desc", name: "asc", size: "desc" };
const SORT_LABELS = { date: "Date", name: "Name", size: "File size" };

const CSS_TEXT = `
.im-root {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--comfy-menu-bg, #202020);
    color: var(--input-text, #ddd);
    font-family: var(--font-family, sans-serif);
    font-size: 12px;
    border-radius: 6px;
    box-sizing: border-box;
    padding: 6px;
    overflow: hidden;
}
.im-root * { box-sizing: border-box; }
.im-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.im-check { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--input-text, #ddd); cursor: pointer; user-select: none; }
.im-badge {
    position: absolute; top: 4px; left: 4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
    background: #3b8bff; color: #fff; font-size: 11px; font-weight: 600; line-height: 18px; text-align: center; display: none;
}
.im-cell.im-picked .im-badge { display: block; }
.im-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--descrip-text, #888); }
.im-spacer { flex: 1; }
.im-select, .im-btn {
    background: var(--comfy-input-bg, #2a2a2a); color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444); border-radius: 4px; padding: 3px 8px; font-size: 11px; font-family: inherit;
}
.im-select { min-width: 150px; max-width: 260px; }
.im-btn { cursor: pointer; }
.im-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.im-btn:disabled { opacity: 0.5; cursor: default; }
.im-btn.im-danger { border-color: #a33; }
.im-btn.im-danger:hover:not(:disabled) { background: rgba(220,60,60,0.35); }
.im-btn.im-primary { background: #3b6fd8; border-color: #3b6fd8; color: #fff; }
.im-slider-wrap { display: flex; align-items: center; gap: 6px; color: var(--descrip-text, #999); font-size: 10px; }
.im-slider-wrap input { width: 110px; }
.im-main { flex: 1; min-height: 0; display: flex; gap: 8px; }
.im-pane {
    border: 1px solid var(--border-color, #3a3a3a); border-radius: 4px; background: rgba(0,0,0,0.15); min-height: 0;
}
.im-gallery { flex: 1; overflow-y: auto; padding: 6px; }
.im-grid { display: grid; gap: 6px; }
.im-cell {
    position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; cursor: pointer;
    border: 2px solid transparent; background: rgba(255,255,255,0.05);
}
.im-cell:hover { border-color: rgba(255,255,255,0.35); }
.im-cell.im-selected { border-color: #3b8bff; }
.im-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.im-root.im-blur .im-cell img,
.im-root.im-blur .im-preview-box img { filter: blur(20px) saturate(0.8); }
.im-star {
    position: absolute; top: 4px; right: 4px; z-index: 2; width: 24px; height: 24px; border: none; border-radius: 12px;
    background: rgba(0,0,0,0.55); color: #fff; font-size: 14px; line-height: 24px; text-align: center; padding: 0; cursor: pointer;
    opacity: 0; transition: none;
}
.im-cell:hover .im-star { opacity: 1; }
.im-cell.im-fav .im-star { opacity: 1; color: #f2c94c; }
.im-star:hover { background: rgba(0,0,0,0.8); }
.im-cell.im-fav { box-shadow: 0 0 0 1px rgba(242,201,76,0.55); }
.im-group-title {
    grid-column: 1 / -1; font-size: 10px; letter-spacing: 0.05em; color: var(--descrip-text, #999);
    padding: 2px 2px 0; text-transform: uppercase;
}
.im-preview-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.im-lockbtn { padding: 1px 8px; font-size: 13px; line-height: 1.3; }
.im-lockbtn.im-on { background: #c9811a; border-color: #c9811a; color: #fff; }
.im-cell .im-lock-mark {
    position: absolute; right: 4px; bottom: 4px; z-index: 2; width: 22px; height: 22px; border-radius: 11px;
    background: #c9811a; color: #fff; font-size: 12px; line-height: 22px; text-align: center; display: none;
}
.im-cell.im-locked .im-lock-mark { display: block; }
.im-root.im-lockon .im-cell:not(.im-locked) { cursor: not-allowed; }
.im-root.im-lockon .im-cell.im-locked { border-color: #c9811a; }
.im-pin {
    position: absolute; left: 4px; bottom: 4px; z-index: 3; width: 22px; height: 22px; border: none; border-radius: 11px;
    background: rgba(0,0,0,0.55); color: #fff; font-size: 12px; line-height: 22px; text-align: center; padding: 0; cursor: pointer;
    display: none; opacity: 0.6;
}
.im-root.im-multi .im-pin { display: block; }
.im-root.im-multi .im-cell:hover .im-pin { opacity: 1; }
.im-pin:hover { background: rgba(0,0,0,0.8); }
.im-cell.im-pinned .im-pin { opacity: 1; background: #2f9e5b; }
.im-cell.im-pinned { border-color: #2f9e5b; }
.im-pinbar { display: none; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 10px; color: var(--descrip-text, #999); }
.im-pinchip {
    cursor: pointer; padding: 1px 7px; border-radius: 10px; background: #2f9e5b; color: #fff; max-width: 150px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.im-pinchip-x { margin-left: 4px; opacity: 0.85; }
.im-root.im-min .im-grid { grid-template-columns: 1fr !important; gap: 2px; }
.im-root.im-min .im-cell {
    aspect-ratio: auto; height: 28px; display: flex; align-items: center; gap: 6px; padding: 0 8px; border-width: 1px; border-radius: 3px;
}
.im-root.im-min .im-cell .im-cell-name {
    position: static; opacity: 1; background: none; flex: 1; min-width: 0; font-size: 12px; padding: 0; transition: none;
}
.im-root.im-min .im-badge { position: static; flex-shrink: 0; margin: 0; }
.im-root.im-min .im-star, .im-root.im-min .im-pin, .im-root.im-min .im-cell .im-lock-mark {
    position: static; flex-shrink: 0; opacity: 0.7; transform: none;
}
.im-root.im-min .im-cell:hover .im-star, .im-root.im-min .im-cell:hover .im-pin { opacity: 1; }
.im-root.im-min .im-cell.im-fav .im-star, .im-root.im-min .im-cell.im-pinned .im-pin { opacity: 1; }
.im-btn.im-active { background: #3b6fd8; border-color: #3b6fd8; color: #fff; }
.im-cell .im-cell-name {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 4px; font-size: 9px;
    background: rgba(0,0,0,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    opacity: 0; transition: opacity 0.15s;
}
.im-cell:hover .im-cell-name { opacity: 1; }
.im-empty { padding: 16px; color: var(--descrip-text, #888); font-style: italic; }
.im-note { padding: 4px 6px; color: var(--descrip-text, #888); font-size: 10px; }
.im-preview { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 6px; }
.im-preview-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--descrip-text, #888); }
.im-preview-box { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255,255,255,0.04); overflow: hidden; }
.im-paint-wrap { position: relative; flex-shrink: 0; }
.im-paint-wrap img { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-drag: none; }
.im-paint-wrap canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0.55; cursor: crosshair; touch-action: none; }
.im-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.im-tools .im-btn { padding: 2px 7px; }
.im-tools .im-btn.im-active { background: #3b6fd8; border-color: #3b6fd8; color: #fff; }
.im-tools input[type=range] { flex: 1; min-width: 60px; }
.im-tools .im-layer-row { display: flex; gap: 4px; width: 100%; }
.im-tools .im-layer-row .im-btn { flex: 1; }
.im-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.im-actions .im-confirm { font-size: 11px; color: var(--input-text, #ddd); }
.im-tools-hint { font-size: 10px; color: var(--descrip-text, #888); }
.im-preview-info { font-size: 11px; color: var(--descrip-text, #aaa); word-break: break-all; }
.im-root.im-dragging::after {
    content: "Drop images to upload to this folder";
    position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center;
    background: rgba(59,111,216,0.28); border: 2px dashed #3b8bff; border-radius: 6px; font-size: 14px; color: #fff; pointer-events: none;
}
.im-status { font-size: 11px; color: var(--descrip-text, #aaa); }
.im-status.im-error { color: #ff7b72; }
.im-lightbox {
    position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.88);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px;
    font-family: var(--font-family, sans-serif); color: #eee; font-size: 13px;
}
.im-lb-stage {
    flex: 1 1 auto; width: 100%; min-height: 0; overflow: hidden; position: relative;
    display: flex; align-items: center; justify-content: center; cursor: zoom-in; touch-action: none;
}
.im-lb-stage.im-zoomed { cursor: grab; }
.im-lb-stage.im-panning { cursor: grabbing; }
.im-lb-stage img {
    max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; box-shadow: 0 8px 40px rgba(0,0,0,0.6);
    transform-origin: center center; will-change: transform; user-select: none; -webkit-user-drag: none;
}
.im-lb-zoom { display: flex; align-items: center; gap: 6px; }
.im-lb-zoom .im-btn { min-width: 30px; }
.im-lb-pct { min-width: 52px; text-align: center; font-size: 12px; color: #ddd; }
.im-lb-hint { font-size: 10px; color: #999; }
.im-lightbox-bar { display: flex; align-items: center; gap: 10px; max-width: 94vw; }
.im-lightbox-name { max-width: 50vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.im-lightbox-err { color: #ff7b72; }
`;

let stylesInjected = false;
function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement("style");
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function hideWidget(widget) {
    if (!widget) return;
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
    widget.draw = () => {};
    widget.options = widget.options || {};
    widget.options.surfaces = { canvas: "never", vueNode: "never", panel: "never" };
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function joinPath(dir, name) {
    return dir ? `${dir}/${name}` : name;
}

async function apiJson(path, options) {
    const res = await api.fetchApi(path, options);
    let data = {};
    try {
        data = await res.json();
    } catch (e) {
        data = {};
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

function imageUrl(kind, path, mtime) {
    return api.apiURL(`/input_manager/${kind}?path=${encodeURIComponent(path)}&v=${Math.floor(mtime || 0)}`);
}

function setupInputManagerWidget(node) {
    const directoryWidget = node.widgets.find((w) => w.name === "directory");
    const imageWidget = node.widgets.find((w) => w.name === "image");
    const maskWidget = node.widgets.find((w) => w.name === "mask_id");
    const keepWidget = node.widgets.find((w) => w.name === "keep_id");
    const imagesWidget = node.widgets.find((w) => w.name === "images");
    const layoutWidget = node.widgets.find((w) => w.name === "layout");
    hideWidget(directoryWidget);
    hideWidget(imageWidget);
    hideWidget(maskWidget);
    hideWidget(keepWidget);
    hideWidget(imagesWidget);
    hideWidget(layoutWidget);

    if (!node.properties) node.properties = {};
    if (node.properties.thumbSize === undefined) node.properties.thumbSize = DEFAULT_THUMB;
    if (!SORT_DEFAULT_ORDER[node.properties.sortBy]) node.properties.sortBy = "date";
    if (node.properties.sortOrder !== "asc" && node.properties.sortOrder !== "desc") {
        node.properties.sortOrder = SORT_DEFAULT_ORDER[node.properties.sortBy];
    }

    const state = {
        dir: directoryWidget.value || DEFAULT_DIR,
        selected: imageWidget.value || "",
        sortBy: node.properties.sortBy,
        sortOrder: node.properties.sortOrder,
        multi: node.properties.multi === true,
        locked: node.properties.locked === true,
        minimized: node.properties.minimized === true,
        pinned: Array.isArray(node.properties.pinned) ? node.properties.pinned.filter((x) => typeof x === "string") : [],
        selectedList: [],
        layout: layoutWidget.value === "vertical" ? "vertical" : "horizontal",
        layer: "mask",
        brush: Number(node.properties.brushSize) || 30,
        erasing: false,
        thumbSize: Number(node.properties.thumbSize) || DEFAULT_THUMB,
        dirs: [],
        images: [],
        truncated: 0,
        error: "",
    };
    let loadToken = 0;

    const root = el("div", "im-root");

    const header = el("div", "im-header");
    header.appendChild(el("div", "im-title", "Input Manager"));
    const dirSelect = el("select", "im-select");
    header.appendChild(dirSelect);
    const sortWrap = el("div", "im-slider-wrap");
    sortWrap.appendChild(el("span", null, "Sort"));
    const sortSelect = el("select", "im-select");
    sortSelect.style.minWidth = "0";
    for (const [value, label] of Object.entries(SORT_LABELS)) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        sortSelect.appendChild(opt);
    }
    const orderBtn = el("button", "im-btn");
    sortWrap.appendChild(sortSelect);
    sortWrap.appendChild(orderBtn);
    header.appendChild(sortWrap);
    const multiLabel = el("label", "im-check");
    const multiBox = el("input");
    multiBox.type = "checkbox";
    multiLabel.appendChild(multiBox);
    multiLabel.appendChild(el("span", null, "Multi-image"));
    multiLabel.title = "Ctrl+click (or tap) several pictures to join them into one output image";
    const layoutSelect = el("select", "im-select");
    layoutSelect.style.minWidth = "0";
    for (const [value, label] of [["horizontal", "Side by side"], ["vertical", "Stacked"]]) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        layoutSelect.appendChild(opt);
    }
    header.appendChild(multiLabel);
    header.appendChild(layoutSelect);
    header.appendChild(el("div", "im-spacer"));
    const sliderWrap = el("div", "im-slider-wrap");
    sliderWrap.appendChild(el("span", null, "Thumbs"));
    const slider = el("input");
    slider.type = "range";
    slider.min = String(MIN_THUMB);
    slider.max = String(MAX_THUMB);
    slider.step = "10";
    slider.value = String(state.thumbSize);
    sliderWrap.appendChild(slider);
    header.appendChild(sliderWrap);
    const status = el("div", "im-status");
    header.insertBefore(status, sliderWrap);
    const uploadBtn = el("button", "im-btn im-primary", "⬆ Upload");
    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    const refreshBtn = el("button", "im-btn", "⟳ Refresh");
    const blurBtn = el("button", "im-btn", "🙈 Blur");
    blurBtn.title = "Blur the thumbnails and the preview (double-click a picture to see it clearly)";
    const minBtn = el("button", "im-btn", "▤ Minimize");
    header.appendChild(uploadBtn);
    header.appendChild(blurBtn);
    header.appendChild(minBtn);
    header.appendChild(refreshBtn);
    header.appendChild(fileInput);
    root.appendChild(header);

    const main = el("div", "im-main");
    const gallery = el("div", "im-pane im-gallery");
    const grid = el("div", "im-grid");
    const note = el("div", "im-note");
    gallery.appendChild(grid);
    gallery.appendChild(note);
    const preview = el("div", "im-pane im-preview");
    const previewHead = el("div", "im-preview-head");
    previewHead.appendChild(el("div", "im-preview-title", "Preview"));
    const lockBtn = el("button", "im-btn im-lockbtn", "🔓");
    previewHead.appendChild(lockBtn);
    preview.appendChild(previewHead);
    const pinBar = el("div", "im-pinbar");
    preview.appendChild(pinBar);
    const previewBox = el("div", "im-preview-box");
    const previewInfo = el("div", "im-preview-info");
    preview.appendChild(previewBox);
    const tools = el("div", "im-tools");
    const drawBtn = el("button", "im-btn im-active", "🖌 Draw");
    const eraseBtn = el("button", "im-btn", "Erase");
    const layerRow = el("div", "im-layer-row");
    const layerMaskBtn = el("button", "im-btn im-active", "Mask");
    const layerKeepBtn = el("button", "im-btn", "Keep");
    layerRow.appendChild(layerMaskBtn);
    layerRow.appendChild(layerKeepBtn);
    const clearMaskBtn = el("button", "im-btn", "Clear");
    const toolsHint = el("div", "im-tools-hint");
    const brushSlider = el("input");
    brushSlider.type = "range";
    brushSlider.min = "4";
    brushSlider.max = "150";
    brushSlider.value = String(state.brush);
    brushSlider.title = "Brush size";
    tools.appendChild(layerRow);
    tools.appendChild(drawBtn);
    tools.appendChild(eraseBtn);
    tools.appendChild(brushSlider);
    tools.appendChild(clearMaskBtn);
    tools.appendChild(toolsHint);
    preview.appendChild(tools);
    const actions = el("div", "im-actions");
    preview.appendChild(actions);
    preview.appendChild(previewInfo);
    main.appendChild(gallery);
    main.appendChild(preview);
    root.appendChild(main);

    function applyGridSize() {
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${state.thumbSize}px, 1fr))`;
    }

    function renderDirSelect() {
        dirSelect.innerHTML = "";
        const dirs = state.dirs.includes(state.dir) ? state.dirs : [state.dir, ...state.dirs];
        for (const d of dirs) {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d || "(ComfyUI root)";
            if (d === state.dir) opt.selected = true;
            dirSelect.appendChild(opt);
        }
    }

    function findImage(path) {
        return state.images.find((i) => i.path === path) || null;
    }

    const layers = {
        mask: { key: "mask", color: "#ff2a2a", widget: maskWidget, id: maskWidget.value || "", canvas: null, ctx: null, timer: null, version: 0 },
        keep: { key: "keep", color: "#22dd77", widget: keepWidget, id: keepWidget.value || "", canvas: null, ctx: null, timer: null, version: 0 },
    };
    const LAYER_HINTS = {
        mask: "Mask: paint the area for the mask output. No paint = the image's own transparency.",
        keep: "Keep: paint what to keep. The cropped_image output keeps only this area and makes the rest transparent.",
    };
    let previewKey = "";

    function randomId() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    function setLayerId(layer, id) {
        layer.id = id;
        layer.widget.value = id;
    }

    async function postMask(fields) {
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) {
            if (k === "file") form.append(k, v, "mask.png");
            else form.append(k, v);
        }
        await apiJson("/input_manager/mask", { method: "POST", body: form });
    }

    async function discardLayer(layer) {
        clearTimeout(layer.timer);
        layer.timer = null;
        layer.version++;
        const old = layer.id;
        setLayerId(layer, "");
        if (old) {
            try {
                await postMask({ id: old, clear: "1" });
            } catch (e) {
                console.error("InputManager: failed to remove mask", e);
            }
        }
    }

    function discardAllLayers() {
        return Promise.all([discardLayer(layers.mask), discardLayer(layers.keep)]);
    }

    function layerIsEmpty(layer) {
        const probe = document.createElement("canvas");
        probe.width = Math.min(layer.canvas.width, 512);
        probe.height = Math.min(layer.canvas.height, 512);
        const pctx = probe.getContext("2d");
        pctx.drawImage(layer.canvas, 0, 0, probe.width, probe.height);
        const px = pctx.getImageData(0, 0, probe.width, probe.height).data;
        for (let i = 3; i < px.length; i += 4) if (px[i] > 0) return false;
        return true;
    }

    async function saveLayerNow(layer) {
        layer.timer = null;
        if (!layer.canvas || !state.selected) return;
        const version = ++layer.version;
        if (layerIsEmpty(layer)) {
            await discardLayer(layer);
            return;
        }
        const id = layer.id || randomId();
        const blob = await new Promise((resolve) => layer.canvas.toBlob(resolve, "image/png"));
        if (!blob || version !== layer.version) return;
        try {
            await postMask({ id, file: blob });
            if (version === layer.version) setLayerId(layer, id);
        } catch (e) {
            setStatus(e.message, true);
        }
    }

    function scheduleLayerSave(layer) {
        clearTimeout(layer.timer);
        layer.timer = setTimeout(() => saveLayerNow(layer), 400);
    }

    function attachPainting(layer, wrap) {
        const canvas = layer.canvas;
        let drawing = false;
        let last = null;
        const toCanvas = (ev) => {
            const r = canvas.getBoundingClientRect();
            return [((ev.clientX - r.left) * canvas.width) / r.width, ((ev.clientY - r.top) * canvas.height) / r.height];
        };
        const stroke = (from, to) => {
            const ctx = layer.ctx;
            const scale = canvas.width / (wrap.clientWidth || 1);
            ctx.globalCompositeOperation = state.erasing ? "destination-out" : "source-over";
            ctx.strokeStyle = layer.color;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = state.brush * scale;
            ctx.beginPath();
            ctx.moveTo(from[0], from[1]);
            ctx.lineTo(to[0], to[1]);
            ctx.stroke();
        };
        canvas.addEventListener("pointerdown", (ev) => {
            if (ev.button !== 0) return;
            ev.preventDefault();
            ev.stopPropagation();
            try {
                canvas.setPointerCapture(ev.pointerId);
            } catch (e) {
                // pointer capture is only a convenience while dragging outside the canvas
            }
            drawing = true;
            last = toCanvas(ev);
            stroke(last, last);
        });
        canvas.addEventListener("pointermove", (ev) => {
            if (!drawing) return;
            ev.stopPropagation();
            const pt = toCanvas(ev);
            stroke(last, pt);
            last = pt;
        });
        const end = (ev) => {
            if (!drawing) return;
            drawing = false;
            ev.stopPropagation();
            scheduleLayerSave(layer);
        };
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", end);
    }

    function fitPaintWrap(wrap, img) {
        const boxW = previewBox.clientWidth;
        const boxH = previewBox.clientHeight;
        if (!boxW || !boxH || !img.naturalWidth) return 0;
        const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight, 1e6);
        const w = Math.max(1, Math.floor(img.naturalWidth * scale));
        const h = Math.max(1, Math.floor(img.naturalHeight * scale));
        wrap.style.width = w + "px";
        wrap.style.height = h + "px";
        return w;
    }

    function updateTools() {
        const on = !!state.selected && !isJoined();
        for (const b of [drawBtn, eraseBtn, clearMaskBtn, brushSlider, layerMaskBtn, layerKeepBtn]) b.disabled = !on;
        drawBtn.classList.toggle("im-active", !state.erasing);
        eraseBtn.classList.toggle("im-active", state.erasing);
        layerMaskBtn.classList.toggle("im-active", state.layer === "mask");
        layerKeepBtn.classList.toggle("im-active", state.layer === "keep");
        toolsHint.textContent = LAYER_HINTS[state.layer];
        for (const layer of Object.values(layers)) {
            if (layer.canvas) {
                layer.canvas.style.pointerEvents = state.layer === layer.key ? "auto" : "none";
                layer.canvas.style.zIndex = state.layer === layer.key ? "2" : "1";
            }
        }
        tools.style.display = on ? "" : "none";
    }

    function renderPreview(force) {
        updateTools();
        const info = findImage(state.selected);
        const joinedKey = isJoined() ? `join:${state.layout}:${state.selectedList.map((x) => x + ":" + ((findImage(x) || {}).mtime || 0)).join("|")}` : "";
        const key = joinedKey || (state.selected ? `${state.selected}:${info ? info.mtime : 0}` : "");
        if (!force && key === previewKey && previewBox.firstChild) return;
        previewKey = key;
        previewBox.innerHTML = "";
        previewInfo.textContent = "";
        for (const layer of Object.values(layers)) {
            layer.canvas = null;
            layer.ctx = null;
        }
        if (isJoined()) {
            const joined = document.createElement("img");
            joined.style.maxWidth = "100%";
            joined.style.maxHeight = "100%";
            joined.style.objectFit = "contain";
            joined.src = api.apiURL(
                `/input_manager/stitch?data=${encodeURIComponent(JSON.stringify({ images: state.selectedList, layout: state.layout }))}&max=1024&v=${Date.now()}`
            );
            joined.addEventListener("load", () => {
                previewInfo.textContent = `${state.selectedList.length} images joined ${state.layout === "vertical" ? "stacked" : "side by side"}, in click order. Painting is off while several images are joined.`;
            });
            joined.addEventListener("error", () => {
                previewBox.innerHTML = "";
                previewBox.appendChild(el("div", "im-empty", "These images could not be joined."));
            });
            previewBox.appendChild(joined);
            return;
        }
        if (!state.selected) {
            previewBox.appendChild(el("div", "im-empty", "Click a thumbnail to choose the output image. Double-click to enlarge."));
            return;
        }
        const wrap = el("div", "im-paint-wrap");
        const img = document.createElement("img");
        img.draggable = false;
        img.src = imageUrl("image", state.selected, info ? info.mtime : 0);
        wrap.appendChild(img);
        const canvases = {};
        for (const layer of Object.values(layers)) {
            const canvas = document.createElement("canvas");
            canvases[layer.key] = canvas;
            wrap.appendChild(canvas);
        }
        img.addEventListener("load", () => {
            previewInfo.textContent = `${state.selected}\n${img.naturalWidth} × ${img.naturalHeight}${info ? " · " + formatSize(info.size) : ""}`;
            previewInfo.style.whiteSpace = "pre-wrap";
            fitPaintWrap(wrap, img);
            for (const layer of Object.values(layers)) {
                const canvas = canvases[layer.key];
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                layer.canvas = canvas;
                layer.ctx = canvas.getContext("2d");
                attachPainting(layer, wrap);
                if (layer.id) {
                    const m = new Image();
                    m.addEventListener("load", () => {
                        if (layer.canvas === canvas) layer.ctx.drawImage(m, 0, 0, canvas.width, canvas.height);
                    });
                    m.src = api.apiURL(`/input_manager/mask?id=${layer.id}&v=${Date.now()}`);
                }
            }
            updateTools();
        });
        img.addEventListener("error", () => {
            previewBox.innerHTML = "";
            previewBox.appendChild(el("div", "im-empty", "The selected image could not be loaded."));
        });
        previewBox.appendChild(wrap);
    }

    new ResizeObserver(() => {
        const wrap = previewBox.querySelector(".im-paint-wrap");
        const img = wrap && wrap.querySelector("img");
        if (wrap && img) fitPaintWrap(wrap, img);
    }).observe(previewBox);

    function isJoined() {
        return state.multi && state.selectedList.length >= 2;
    }

    function updateSelectionClasses() {
        confirmingDelete = false;
        renderActions();
        for (const cell of grid.children) {
            const index = state.selectedList.indexOf(cell.dataset.path);
            const picked = index >= 0;
            cell.classList.toggle("im-selected", picked);
            cell.classList.toggle("im-picked", picked && state.selectedList.length >= 2);
            const badge = cell.querySelector(".im-badge");
            if (badge) badge.textContent = picked ? String(index + 1) : "";
        }
    }

    function notifyLocked() {
        const name = state.selected ? state.selected.split("/").pop() : "";
        setStatus(`Locked on ${name}. Unlock 🔒 to change the picture.`, true);
    }

    function updateLockUi() {
        const on = state.locked && !!state.selected;
        lockBtn.textContent = on ? "🔒" : "🔓";
        lockBtn.classList.toggle("im-on", on);
        lockBtn.disabled = !state.selected && !state.locked;
        lockBtn.title = on
            ? "Locked: this picture is always the output, whatever you click. Click to unlock."
            : state.selected
              ? "Lock this picture as the output so a stray click can't change it"
              : "Select a picture first, then lock it";
        root.classList.toggle("im-lockon", on);
        for (const cell of grid.children) cell.classList.toggle("im-locked", on && state.selectedList.includes(cell.dataset.path));
    }

    function dropLock() {
        state.locked = false;
        node.properties.locked = false;
        updateLockUi();
    }

    lockBtn.addEventListener("click", () => {
        if (state.locked) dropLock();
        else if (state.selected) {
            state.locked = true;
            node.properties.locked = true;
            updateLockUi();
        }
    });

    // Pinned pictures (Multi-image mode) are always part of the selection, first in the join order.
    function withPins(list) {
        if (!state.multi || !state.pinned.length) return list;
        return [...state.pinned, ...list.filter((x) => !state.pinned.includes(x))];
    }

    function savePins() {
        node.properties.pinned = [...state.pinned];
    }

    function updatePinUi() {
        root.classList.toggle("im-multi", state.multi);
        for (const cell of grid.children) {
            if (!cell.dataset || !cell.dataset.path) continue;
            const pinned = state.multi && state.pinned.includes(cell.dataset.path);
            cell.classList.toggle("im-pinned", pinned);
            const button = cell.querySelector(".im-pin");
            if (button) {
                button.textContent = pinned ? "🔒" : "🔓";
                button.title = pinned
                    ? "Locked: always part of the selection. Click to unlock."
                    : "Lock this picture: it stays selected and is joined with whatever else you pick";
            }
        }
        pinBar.textContent = "";
        const show = state.multi && state.pinned.length > 0;
        pinBar.style.display = show ? "flex" : "none";
        if (!show) return;
        pinBar.appendChild(el("span", null, "Always selected:"));
        for (const path of state.pinned) {
            const chip = el("span", "im-pinchip", path.split("/").pop());
            chip.title = path + " (click to unlock)";
            chip.appendChild(el("span", "im-pinchip-x", "✕"));
            chip.addEventListener("click", () => togglePin(path));
            pinBar.appendChild(chip);
        }
    }

    function togglePin(path) {
        if (state.pinned.includes(path)) {
            state.pinned = state.pinned.filter((x) => x !== path);
            savePins();
            updatePinUi();
            return;
        }
        if (state.locked) {
            notifyLocked();
            return;
        }
        state.pinned = [...state.pinned, path];
        savePins();
        setSelection(state.selectedList);
        updatePinUi();
    }

    function unpinPaths(paths) {
        const kept = state.pinned.filter((x) => !paths.includes(x));
        if (kept.length === state.pinned.length) return;
        state.pinned = kept;
        savePins();
        updatePinUi();
    }

    function setSelection(list, force) {
        if (state.locked && !force) {
            notifyLocked();
            return;
        }
        list = withPins(list);
        const primary = list[0] || "";
        if (primary !== state.selected || list.length >= 2) discardAllLayers();
        state.selectedList = list;
        state.selected = primary;
        imageWidget.value = primary;
        syncImagesWidget();
        directoryWidget.value = state.dir;
        updateSelectionClasses();
        renderPreview();
        updateLockUi();
    }

    function syncImagesWidget() {
        imagesWidget.value = JSON.stringify(state.multi && state.selectedList.length >= 2 ? state.selectedList : []);
    }

    function select(path) {
        setSelection(path ? [path] : []);
    }

    function onCellClick(ev, path) {
        const additive = ev.ctrlKey || ev.metaKey || ev.shiftKey || (state.multi && ev.pointerType === "touch");
        if (!additive) {
            select(path);
            return;
        }
        if (state.multi && state.pinned.includes(path)) {
            setStatus(`${path.split("/").pop()} is locked in the selection. Click its 🔒 to unlock it first.`, true);
            return;
        }
        const list = state.selectedList.includes(path) ? state.selectedList.filter((x) => x !== path) : [...state.selectedList, path];
        setSelection(list);
    }

    function renderGrid() {
        grid.innerHTML = "";
        note.textContent = "";
        if (state.error) {
            grid.appendChild(el("div", "im-empty", state.error));
            return;
        }
        if (!state.images.length) {
            grid.appendChild(el("div", "im-empty", "No images in this folder."));
            return;
        }
        const hasFavorites = state.images.some((i) => i.favorite);
        const hasOthers = state.images.some((i) => !i.favorite);
        let lastGroup = null;
        for (const info of state.images) {
            if (hasFavorites && hasOthers && lastGroup !== info.favorite) {
                grid.appendChild(el("div", "im-group-title", info.favorite ? "★ Favorites" : "Others"));
            }
            lastGroup = info.favorite;
            const path = info.path;
            const index = state.selectedList.indexOf(path);
            const cell = el(
                "div",
                "im-cell" + (info.favorite ? " im-fav" : "") + (index >= 0 ? " im-selected" : "") + (index >= 0 && state.selectedList.length >= 2 ? " im-picked" : "")
            );
            cell.dataset.path = path;
            if (!state.minimized) {
                const img = document.createElement("img");
                img.loading = "lazy";
                img.decoding = "async";
                img.alt = info.name;
                img.src = imageUrl("thumb", path, info.mtime);
                cell.appendChild(img);
            }
            const foreign = info.favorite && info.dir !== state.dir;
            cell.appendChild(el("div", "im-cell-name", foreign ? `${info.dir || "."}/${info.name}` : info.name));
            cell.appendChild(el("div", "im-badge", index >= 0 ? String(index + 1) : ""));
            cell.appendChild(el("div", "im-lock-mark", "🔒"));
            const pin = el("button", "im-pin", "🔓");
            pin.addEventListener("click", (ev) => {
                ev.stopPropagation();
                togglePin(path);
            });
            pin.addEventListener("dblclick", (ev) => ev.stopPropagation());
            cell.appendChild(pin);
            const star = el("button", "im-star", info.favorite ? "★" : "☆");
            star.title = info.favorite ? "Remove from favorites" : "Add to favorites (favorites always come first)";
            star.addEventListener("click", (ev) => {
                ev.stopPropagation();
                setFavorite([path], !info.favorite);
            });
            star.addEventListener("dblclick", (ev) => ev.stopPropagation());
            cell.appendChild(star);
            cell.title = info.path;
            cell.addEventListener("click", (ev) => onCellClick(ev, path));
            cell.addEventListener("dblclick", () => {
                if (!state.multi && !state.locked) select(path);
                openLightbox(path);
            });
            grid.appendChild(cell);
        }
        updateLockUi();
        updatePinUi();
        if (state.truncated) note.textContent = `Showing the newest ${state.images.length} of ${state.images.length + state.truncated} images.`;
    }

    async function loadImages() {
        const token = ++loadToken;
        try {
            const data = await apiJson(
                `/input_manager/list?dir=${encodeURIComponent(state.dir)}&sort=${state.sortBy}&order=${state.sortOrder}`
            );
            if (token !== loadToken) return;
            state.images = data.images;
            state.truncated = data.truncated ? data.total - data.images.length : 0;
            state.error = "";
        } catch (e) {
            if (token !== loadToken) return;
            state.images = [];
            state.truncated = 0;
            state.error = e.message;
        }
        renderGrid();
        renderPreview();
        renderActions();
    }

    async function loadDirs() {
        try {
            const data = await apiJson("/input_manager/dirs");
            state.dirs = data.dirs;
        } catch (e) {
            console.error("InputManager: failed to load folders", e);
        }
        renderDirSelect();
    }

    function openLightbox(path) {
        const info = findImage(path);
        const overlay = el("div", "im-lightbox");
        const img = document.createElement("img");
        img.draggable = false;
        img.src = imageUrl("image", path, info ? info.mtime : 0);
        const stage = el("div", "im-lb-stage");
        stage.appendChild(img);
        const zoomRow = el("div", "im-lb-zoom");
        const zoomOut = el("button", "im-btn", "−");
        zoomOut.title = "Zoom out (-)";
        const pct = el("span", "im-lb-pct", "Fit");
        const zoomIn = el("button", "im-btn", "+");
        zoomIn.title = "Zoom in (+)";
        const fitBtn = el("button", "im-btn", "Fit");
        fitBtn.title = "Fit to screen (0)";
        const actualBtn = el("button", "im-btn", "1:1");
        actualBtn.title = "Actual pixels (1)";
        zoomRow.appendChild(zoomOut);
        zoomRow.appendChild(pct);
        zoomRow.appendChild(zoomIn);
        zoomRow.appendChild(fitBtn);
        zoomRow.appendChild(actualBtn);
        zoomRow.appendChild(el("span", "im-lb-hint", "Scroll or pinch to zoom · drag to move · double-click to toggle"));
        const bar = el("div", "im-lightbox-bar");
        const name = el("div", "im-lightbox-name", path);
        const err = el("div", "im-lightbox-err");
        const delBtn = el("button", "im-btn im-danger", "🗑 Delete");
        const closeBtn = el("button", "im-btn", "Close");
        bar.appendChild(name);
        bar.appendChild(delBtn);
        bar.appendChild(closeBtn);
        overlay.appendChild(stage);
        overlay.appendChild(zoomRow);
        overlay.appendChild(bar);
        overlay.appendChild(err);

        // ---- zoom and pan: scale is relative to the fitted picture, the transform origin is its centre
        const MAX_SCALE = 32;
        let scale = 1;
        let tx = 0;
        let ty = 0;

        const clampPan = () => {
            const rect = stage.getBoundingClientRect();
            const w = img.clientWidth * scale;
            const h = img.clientHeight * scale;
            const maxX = w > rect.width ? (w - rect.width) / 2 + 80 : 0;
            const maxY = h > rect.height ? (h - rect.height) / 2 + 80 : 0;
            tx = Math.max(-maxX, Math.min(maxX, tx));
            ty = Math.max(-maxY, Math.min(maxY, ty));
        };
        const applyTransform = () => {
            if (scale <= 1.0001) {
                scale = 1;
                tx = 0;
                ty = 0;
            }
            clampPan();
            img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
            stage.classList.toggle("im-zoomed", scale > 1);
            const shown = img.naturalWidth ? Math.round(((scale * img.clientWidth) / img.naturalWidth) * 100) : 100;
            pct.textContent = scale === 1 ? `Fit (${shown}%)` : `${shown}%`;
        };
        const zoomAt = (factor, clientX, clientY) => {
            const rect = stage.getBoundingClientRect();
            const px = clientX - (rect.left + rect.width / 2);
            const py = clientY - (rect.top + rect.height / 2);
            const next = Math.max(1, Math.min(MAX_SCALE, scale * factor));
            const k = next / scale;
            tx = px - (px - tx) * k;
            ty = py - (py - ty) * k;
            scale = next;
            applyTransform();
        };
        const centre = () => {
            const rect = stage.getBoundingClientRect();
            return [rect.left + rect.width / 2, rect.top + rect.height / 2];
        };
        const actualScale = () => (img.clientWidth ? Math.max(img.naturalWidth / img.clientWidth, 1) : 1);
        const toggleZoom = (clientX, clientY) => {
            if (scale > 1.05) {
                scale = 1;
                applyTransform();
            } else {
                zoomAt(Math.max(actualScale(), 2.5), clientX, clientY);
            }
        };

        zoomIn.addEventListener("click", () => zoomAt(1.4, ...centre()));
        zoomOut.addEventListener("click", () => zoomAt(1 / 1.4, ...centre()));
        fitBtn.addEventListener("click", () => {
            scale = 1;
            applyTransform();
        });
        actualBtn.addEventListener("click", () => {
            scale = 1;
            zoomAt(actualScale(), ...centre());
        });
        img.addEventListener("load", applyTransform);
        img.addEventListener("dblclick", (ev) => toggleZoom(ev.clientX, ev.clientY));
        stage.addEventListener(
            "wheel",
            (ev) => {
                ev.preventDefault();
                zoomAt(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0018)), ev.clientX, ev.clientY);
            },
            { passive: false }
        );

        const pointers = new Map();
        let dragMoved = 0;
        let lastPinch = 0;
        stage.addEventListener("pointerdown", (ev) => {
            pointers.set(ev.pointerId, [ev.clientX, ev.clientY]);
            try {
                stage.setPointerCapture(ev.pointerId);
            } catch (e) {
                // capture is only a convenience while dragging
            }
            dragMoved = 0;
            if (pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                lastPinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
            }
        });
        stage.addEventListener("pointermove", (ev) => {
            const before = pointers.get(ev.pointerId);
            if (!before) return;
            const dx = ev.clientX - before[0];
            const dy = ev.clientY - before[1];
            pointers.set(ev.pointerId, [ev.clientX, ev.clientY]);
            dragMoved += Math.abs(dx) + Math.abs(dy);
            if (pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
                if (lastPinch > 0) zoomAt(dist / lastPinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
                lastPinch = dist;
            } else if (scale > 1) {
                stage.classList.add("im-panning");
                tx += dx;
                ty += dy;
                applyTransform();
            }
        });
        const endPointer = (ev) => {
            pointers.delete(ev.pointerId);
            lastPinch = 0;
            if (!pointers.size) stage.classList.remove("im-panning");
        };
        stage.addEventListener("pointerup", endPointer);
        stage.addEventListener("pointercancel", endPointer);
        stage.addEventListener("click", (ev) => {
            if (ev.target === stage && dragMoved < 5) close();
        });
        window.addEventListener("resize", applyTransform);

        const close = () => {
            window.removeEventListener("resize", applyTransform);
            document.removeEventListener("keydown", onKey, true);
            overlay.remove();
        };
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                ev.stopPropagation();
                close();
                return;
            }
            const inField = ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName || "");
            if (inField || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            if (ev.key === "+" || ev.key === "=") zoomAt(1.4, ...centre());
            else if (ev.key === "-" || ev.key === "_") zoomAt(1 / 1.4, ...centre());
            else if (ev.key === "0") {
                scale = 1;
                applyTransform();
            } else if (ev.key === "1") {
                scale = 1;
                zoomAt(actualScale(), ...centre());
            } else return;
            ev.preventDefault();
            ev.stopPropagation();
        };
        document.addEventListener("keydown", onKey, true);

        closeBtn.addEventListener("click", close);
        let downTarget = null;
        overlay.addEventListener("mousedown", (ev) => (downTarget = ev.target));
        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay && downTarget === overlay) close();
        });

        delBtn.addEventListener("click", () => {
            bar.innerHTML = "";
            bar.appendChild(el("div", "im-lightbox-name", "Delete this image permanently?"));
            const yes = el("button", "im-btn im-danger", "Yes, delete");
            const no = el("button", "im-btn", "Cancel");
            bar.appendChild(yes);
            bar.appendChild(no);
            no.addEventListener("click", () => {
                bar.innerHTML = "";
                bar.appendChild(name);
                bar.appendChild(delBtn);
                bar.appendChild(closeBtn);
            });
            yes.addEventListener("click", async () => {
                yes.disabled = true;
                try {
                    await apiJson("/input_manager/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path }),
                    });
                } catch (e) {
                    err.textContent = e.message;
                    yes.disabled = false;
                    return;
                }
                unpinPaths([path]);
                if (state.selectedList.includes(path)) {
                    dropLock();
                    setSelection(state.selectedList.filter((x) => x !== path), true);
                }
                close();
                await loadImages();
            });
        });

        document.body.appendChild(overlay);
        closeBtn.focus();
    }

    let confirmingDelete = false;

    async function setFavorite(paths, favorite) {
        try {
            await apiJson("/input_manager/favorite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paths, favorite }),
            });
        } catch (e) {
            setStatus(e.message, true);
            return;
        }
        await loadImages();
    }

    function renderActions() {
        actions.innerHTML = "";
        const count = state.selectedList.length;
        if (!count) return;
        if (!confirmingDelete) {
            const allFavorite = state.selectedList.every((p) => (findImage(p) || {}).favorite);
            const fav = el("button", "im-btn", allFavorite ? "★ Unfavorite" : "☆ Favorite");
            fav.title = allFavorite ? "Remove the selected picture(s) from favorites" : "Pin the selected picture(s) to the top";
            fav.addEventListener("click", () => setFavorite([...state.selectedList], !allFavorite));
            actions.appendChild(fav);
            const del = el("button", "im-btn im-danger", count > 1 ? `🗑 Delete ${count} selected` : "🗑 Delete selected");
            del.title = "Delete the selected picture(s) from disk";
            del.addEventListener("click", () => {
                confirmingDelete = true;
                renderActions();
            });
            actions.appendChild(del);
            if (count > 1) actions.appendChild(el("span", "im-confirm", "Ctrl+click adds or removes pictures."));
            return;
        }
        actions.appendChild(el("span", "im-confirm", `Delete ${count} picture${count > 1 ? "s" : ""} permanently?`));
        const yes = el("button", "im-btn im-danger", "Yes, delete");
        const no = el("button", "im-btn", "Cancel");
        no.addEventListener("click", () => {
            confirmingDelete = false;
            renderActions();
        });
        yes.addEventListener("click", async () => {
            yes.disabled = true;
            no.disabled = true;
            const paths = [...state.selectedList];
            const failed = [];
            for (const path of paths) {
                try {
                    await apiJson("/input_manager/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path }),
                    });
                } catch (e) {
                    failed.push(path);
                }
            }
            confirmingDelete = false;
            unpinPaths(paths.filter((x) => !failed.includes(x)));
            if (state.selectedList.some((x) => paths.includes(x) && !failed.includes(x))) {
                dropLock();
                setSelection(failed, true);
            }
            await loadImages();
            const done = paths.length - failed.length;
            setStatus(failed.length ? `Deleted ${done}; ${failed.length} could not be deleted.` : `Deleted ${done} picture${done > 1 ? "s" : ""}.`, failed.length > 0);
        });
        actions.appendChild(yes);
        actions.appendChild(no);
    }

    let statusTimer = null;
    function setStatus(text, isError) {
        status.textContent = text;
        status.classList.toggle("im-error", !!isError);
        clearTimeout(statusTimer);
        if (text) statusTimer = setTimeout(() => (status.textContent = ""), 6000);
    }

    async function uploadFiles(fileList) {
        const files = [...fileList].filter((f) => f.type.startsWith("image/") || /.(png|jpe?g|webp|bmp|gif)$/i.test(f.name));
        if (!files.length) {
            setStatus("No image files to upload.", true);
            return;
        }
        uploadBtn.disabled = true;
        setStatus(`Uploading ${files.length} file(s)...`);
        const form = new FormData();
        form.append("dir", state.dir);
        for (const f of files) form.append("file", f, f.name);
        try {
            const data = await apiJson("/input_manager/upload", { method: "POST", body: form });
            await loadImages();
            if (data.saved.length) select(data.saved[data.saved.length - 1]);
            setStatus(data.errors.length ? `Uploaded ${data.saved.length}; ${data.errors.length} skipped.` : `Uploaded ${data.saved.length} image(s).`, data.errors.length > 0);
        } catch (e) {
            setStatus(e.message, true);
        }
        uploadBtn.disabled = false;
    }

    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        const files = [...fileInput.files];
        fileInput.value = "";
        if (files.length) uploadFiles(files);
    });

    const hasFiles = (ev) => ev.dataTransfer && [...ev.dataTransfer.types].includes("Files");
    let dragDepth = 0;
    root.addEventListener("dragenter", (ev) => {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragDepth++;
        root.classList.add("im-dragging");
    });
    root.addEventListener("dragover", (ev) => {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.dataTransfer.dropEffect = "copy";
    });
    root.addEventListener("dragleave", (ev) => {
        if (!hasFiles(ev)) return;
        ev.stopPropagation();
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) root.classList.remove("im-dragging");
    });
    root.addEventListener("drop", (ev) => {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragDepth = 0;
        root.classList.remove("im-dragging");
        uploadFiles(ev.dataTransfer.files);
    });

    drawBtn.addEventListener("click", () => {
        state.erasing = false;
        updateTools();
    });
    eraseBtn.addEventListener("click", () => {
        state.erasing = true;
        updateTools();
    });
    brushSlider.addEventListener("input", () => {
        state.brush = Number(brushSlider.value);
        node.properties.brushSize = state.brush;
    });
    layerMaskBtn.addEventListener("click", () => {
        state.layer = "mask";
        updateTools();
    });
    layerKeepBtn.addEventListener("click", () => {
        state.layer = "keep";
        updateTools();
    });
    clearMaskBtn.addEventListener("click", async () => {
        const layer = layers[state.layer];
        if (!layer.canvas) return;
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        await discardLayer(layer);
    });

    function updateMultiUi() {
        multiBox.checked = state.multi;
        updatePinUi();
        layoutSelect.style.display = state.multi ? "" : "none";
        layoutSelect.value = state.layout;
    }
    multiBox.addEventListener("change", () => {
        state.multi = multiBox.checked;
        node.properties.multi = state.multi;
        updateMultiUi();
        syncImagesWidget();
        updateSelectionClasses();
        renderPreview(true);
        if (state.multi && state.pinned.length) setSelection(state.selectedList);
    });
    layoutSelect.addEventListener("change", () => {
        state.layout = layoutSelect.value;
        layoutWidget.value = state.layout;
        renderPreview();
    });
    updateMultiUi();

    function updateSortUi() {
        sortSelect.value = state.sortBy;
        orderBtn.textContent = state.sortOrder === "asc" ? "↑" : "↓";
        const names = { date: ["oldest first", "newest first"], name: ["A to Z", "Z to A"], size: ["smallest first", "largest first"] }[state.sortBy];
        orderBtn.title = state.sortOrder === "asc" ? names[0] : names[1];
    }
    sortSelect.addEventListener("change", () => {
        state.sortBy = sortSelect.value;
        state.sortOrder = SORT_DEFAULT_ORDER[state.sortBy];
        node.properties.sortBy = state.sortBy;
        node.properties.sortOrder = state.sortOrder;
        updateSortUi();
        loadImages();
    });
    orderBtn.addEventListener("click", () => {
        state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
        node.properties.sortOrder = state.sortOrder;
        updateSortUi();
        loadImages();
    });
    updateSortUi();

    dirSelect.addEventListener("change", async () => {
        state.dir = dirSelect.value;
        directoryWidget.value = state.dir;
        const keep = state.selected && ((findImage(state.selected) || {}).favorite || state.selected.startsWith(state.dir ? state.dir + "/" : ""));
        if (state.selected && !keep && !state.locked) select("");
        await loadImages();
    });
    function applyMinimized() {
        const on = state.minimized;
        root.classList.toggle("im-min", on);
        minBtn.classList.toggle("im-active", on);
        minBtn.textContent = on ? "▦ Thumbnails" : "▤ Minimize";
        minBtn.title = on
            ? "Show the thumbnails again"
            : "Minimize: replace the thumbnails by a light list of names (nothing is downloaded or drawn), to speed up a slow browser or iPad";
        sliderWrap.style.display = on ? "none" : "";
    }
    minBtn.addEventListener("click", () => {
        state.minimized = !state.minimized;
        node.properties.minimized = state.minimized;
        applyMinimized();
        renderGrid();
    });
    function applyBlur() {
        const on = node.properties.blur === true;
        root.classList.toggle("im-blur", on);
        blurBtn.classList.toggle("im-active", on);
        blurBtn.textContent = on ? "👁 Show" : "🙈 Blur";
    }
    blurBtn.addEventListener("click", () => {
        node.properties.blur = node.properties.blur !== true;
        applyBlur();
    });
    applyBlur();
    applyMinimized();

    slider.addEventListener("input", () => {
        state.thumbSize = Number(slider.value);
        node.properties.thumbSize = state.thumbSize;
        applyGridSize();
    });
    refreshBtn.addEventListener("click", async () => {
        await loadDirs();
        await loadImages();
    });

    node.addDOMWidget("input_manager_ui", "input_manager", root, {
        getMinHeight: () => 440,
        hideOnZoom: false,
    });
    if (node.size[0] < 900) node.size[0] = 900;
    if (node.size[1] < 540) node.size[1] = 540;

    function refreshFromWidgets() {
        state.dir = directoryWidget.value || DEFAULT_DIR;
        state.selected = imageWidget.value || "";
        state.multi = node.properties.multi === true;
        state.locked = node.properties.locked === true;
        state.minimized = node.properties.minimized === true;
        applyMinimized();
        state.pinned = Array.isArray(node.properties.pinned) ? node.properties.pinned.filter((x) => typeof x === "string") : [];
        state.layout = layoutWidget.value === "vertical" ? "vertical" : "horizontal";
        let joinedList = [];
        try {
            const parsed = JSON.parse(imagesWidget.value || "[]");
            if (Array.isArray(parsed)) joinedList = parsed.filter((x) => typeof x === "string");
        } catch (e) {
            joinedList = [];
        }
        state.selectedList = joinedList.length >= 2 ? joinedList : state.selected ? [state.selected] : [];
        updateMultiUi();
        layers.mask.id = maskWidget.value || "";
        layers.keep.id = keepWidget.value || "";
        state.brush = Number(node.properties.brushSize) || 30;
        brushSlider.value = String(state.brush);
        previewKey = "";
        state.thumbSize = Number(node.properties.thumbSize) || DEFAULT_THUMB;
        applyBlur();
        if (SORT_DEFAULT_ORDER[node.properties.sortBy]) state.sortBy = node.properties.sortBy;
        if (node.properties.sortOrder === "asc" || node.properties.sortOrder === "desc") state.sortOrder = node.properties.sortOrder;
        updateSortUi();
        slider.value = String(state.thumbSize);
        applyGridSize();
        renderDirSelect();
        loadImages();
    }
    node._imRefreshFromWidgets = refreshFromWidgets;

    state.selectedList = state.selected ? [state.selected] : [];
    applyGridSize();
    renderDirSelect();
    renderPreview();
    loadDirs();
    loadImages();
}

app.registerExtension({
    name: "PromptManager.InputManager",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            injectStyles();
            setupInputManagerWidget(this);
            return result;
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const result = onConfigure ? onConfigure.apply(this, arguments) : undefined;
            if (this._imRefreshFromWidgets) this._imRefreshFromWidgets();
            return result;
        };
    },
});
