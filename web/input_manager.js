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
.im-header { display: flex; align-items: center; gap: 8px; }
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
.im-lightbox img { max-width: 94vw; max-height: 78vh; object-fit: contain; border-radius: 4px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
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
    hideWidget(directoryWidget);
    hideWidget(imageWidget);
    hideWidget(maskWidget);
    hideWidget(keepWidget);

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
    header.appendChild(uploadBtn);
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
    preview.appendChild(el("div", "im-preview-title", "Preview"));
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
        return state.images.find((i) => joinPath(state.dir, i.name) === path) || null;
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
            canvas.setPointerCapture(ev.pointerId);
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
        const on = !!state.selected;
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
        const key = state.selected ? `${state.selected}:${info ? info.mtime : 0}` : "";
        if (!force && key === previewKey && previewBox.firstChild) return;
        previewKey = key;
        previewBox.innerHTML = "";
        previewInfo.textContent = "";
        for (const layer of Object.values(layers)) {
            layer.canvas = null;
            layer.ctx = null;
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

    function updateSelectionClasses() {
        for (const cell of grid.children) {
            cell.classList.toggle("im-selected", cell.dataset.path === state.selected);
        }
    }

    function select(path) {
        if (path !== state.selected) discardAllLayers();
        state.selected = path;
        imageWidget.value = path;
        directoryWidget.value = state.dir;
        updateSelectionClasses();
        renderPreview();
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
        for (const info of state.images) {
            const path = joinPath(state.dir, info.name);
            const cell = el("div", "im-cell" + (path === state.selected ? " im-selected" : ""));
            cell.dataset.path = path;
            const img = document.createElement("img");
            img.loading = "lazy";
            img.decoding = "async";
            img.alt = info.name;
            img.src = imageUrl("thumb", path, info.mtime);
            cell.appendChild(img);
            cell.appendChild(el("div", "im-cell-name", info.name));
            cell.title = info.name;
            cell.addEventListener("click", () => select(path));
            cell.addEventListener("dblclick", () => {
                select(path);
                openLightbox(path);
            });
            grid.appendChild(cell);
        }
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
        img.src = imageUrl("image", path, info ? info.mtime : 0);
        const bar = el("div", "im-lightbox-bar");
        const name = el("div", "im-lightbox-name", path);
        const err = el("div", "im-lightbox-err");
        const delBtn = el("button", "im-btn im-danger", "🗑 Delete");
        const closeBtn = el("button", "im-btn", "Close");
        bar.appendChild(name);
        bar.appendChild(delBtn);
        bar.appendChild(closeBtn);
        overlay.appendChild(img);
        overlay.appendChild(bar);
        overlay.appendChild(err);

        const close = () => {
            document.removeEventListener("keydown", onKey, true);
            overlay.remove();
        };
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                ev.stopPropagation();
                close();
            }
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
                if (state.selected === path) select("");
                close();
                await loadImages();
            });
        });

        document.body.appendChild(overlay);
        closeBtn.focus();
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
        if (state.selected && !state.selected.startsWith(state.dir ? state.dir + "/" : "")) select("");
        await loadImages();
    });
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
        layers.mask.id = maskWidget.value || "";
        layers.keep.id = keepWidget.value || "";
        state.brush = Number(node.properties.brushSize) || 30;
        brushSlider.value = String(state.brush);
        previewKey = "";
        state.thumbSize = Number(node.properties.thumbSize) || DEFAULT_THUMB;
        if (SORT_DEFAULT_ORDER[node.properties.sortBy]) state.sortBy = node.properties.sortBy;
        if (node.properties.sortOrder === "asc" || node.properties.sortOrder === "desc") state.sortOrder = node.properties.sortOrder;
        updateSortUi();
        slider.value = String(state.thumbSize);
        applyGridSize();
        renderDirSelect();
        loadImages();
    }
    node._imRefreshFromWidgets = refreshFromWidgets;

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
