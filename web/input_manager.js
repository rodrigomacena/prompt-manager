import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "InputManager";
const DEFAULT_DIR = "input";
const DEFAULT_THUMB = 140;
const MIN_THUMB = 70;
const MAX_THUMB = 260;

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
.im-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
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
    hideWidget(directoryWidget);
    hideWidget(imageWidget);

    if (!node.properties) node.properties = {};
    if (node.properties.thumbSize === undefined) node.properties.thumbSize = DEFAULT_THUMB;

    const state = {
        dir: directoryWidget.value || DEFAULT_DIR,
        selected: imageWidget.value || "",
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
    header.appendChild(el("div", "im-spacer"));
    const sliderWrap = el("div", "im-slider-wrap");
    sliderWrap.appendChild(el("span", null, "Size"));
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

    function renderPreview() {
        previewBox.innerHTML = "";
        previewInfo.textContent = "";
        if (!state.selected) {
            previewBox.appendChild(el("div", "im-empty", "Click a thumbnail to choose the output image. Double-click to enlarge."));
            return;
        }
        const info = findImage(state.selected);
        const img = document.createElement("img");
        img.src = imageUrl("image", state.selected, info ? info.mtime : 0);
        img.addEventListener("load", () => {
            previewInfo.textContent = `${state.selected}\n${img.naturalWidth} × ${img.naturalHeight}${info ? " · " + formatSize(info.size) : ""}`;
            previewInfo.style.whiteSpace = "pre-wrap";
        });
        img.addEventListener("error", () => {
            previewBox.innerHTML = "";
            previewBox.appendChild(el("div", "im-empty", "The selected image could not be loaded."));
        });
        img.addEventListener("dblclick", () => openLightbox(state.selected));
        previewBox.appendChild(img);
    }

    function updateSelectionClasses() {
        for (const cell of grid.children) {
            cell.classList.toggle("im-selected", cell.dataset.path === state.selected);
        }
    }

    function select(path) {
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
            const data = await apiJson(`/input_manager/list?dir=${encodeURIComponent(state.dir)}`);
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
        state.thumbSize = Number(node.properties.thumbSize) || DEFAULT_THUMB;
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
