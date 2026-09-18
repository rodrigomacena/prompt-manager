import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "PromptManager";

const MODE_FIXED = "fixed";
const MODE_RANDOM = "random";
const MODE_SEQUENTIAL = "sequential";

const MODE_LABELS = {
    [MODE_FIXED]: "Fixed",
    [MODE_RANDOM]: "Random",
    [MODE_SEQUENTIAL]: "Sequential",
};

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_VISION_MODEL = "openai/gpt-4o-mini";
const MAX_IMAGE_DIMENSION = 1536;

function modelOptionLabel(m) {
    const namePart = m.name && m.name !== m.id ? m.name : m.id;
    const pricePart = m.price ? ` — ${m.price}` : "";
    const idPart = m.name && m.name !== m.id ? ` (${m.id})` : "";
    return `${namePart}${pricePart}${idPart}`;
}

function buildModelSelect(models, currentValue) {
    const select = document.createElement("select");
    if (!models.some((m) => m.id === currentValue)) {
        const opt = document.createElement("option");
        opt.value = currentValue;
        opt.textContent = currentValue;
        select.appendChild(opt);
    }
    for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = modelOptionLabel(m);
        if (m.id === currentValue) opt.selected = true;
        select.appendChild(opt);
    }
    return select;
}

async function fileToResizedDataUrl(file, maxDim = MAX_IMAGE_DIMENSION, quality = 0.85) {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
}

const CSS_TEXT = `
.pm-root {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--comfy-menu-bg, #202020);
    color: var(--input-text, #ddd);
    font-family: var(--font-family, sans-serif);
    font-size: 12px;
    border-radius: 6px;
    box-sizing: border-box;
    padding: 6px;
    overflow: hidden;
}
.pm-settings-btn {
    opacity: 0.5;
    transition: opacity 0.15s ease;
}
.pm-settings-btn:hover { opacity: 1; }
.pm-settings-menu {
    position: absolute;
    background: var(--comfy-menu-bg, #2b2b2b);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-width: 230px;
    padding: 4px;
}
.pm-settings-menu button.pm-menu-item {
    background: transparent;
    border: none;
    color: var(--input-text, #ddd);
    text-align: left;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 11px;
    border-radius: 3px;
}
.pm-settings-menu button.pm-menu-item:hover { background: rgba(255,255,255,0.08); }
.pm-settings-divider {
    height: 1px;
    background: var(--border-color, #444);
    margin: 4px 2px;
}
.pm-settings-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--descrip-text, #888);
    padding: 4px 8px 2px;
}
.pm-settings-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 8px;
}
.pm-settings-field label {
    font-size: 10px;
    color: var(--descrip-text, #888);
}
.pm-settings-field input,
.pm-settings-field select {
    width: 100%;
    box-sizing: border-box;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 11px;
}
.pm-settings-field select {
    max-width: 100%;
}
.pm-settings-hint {
    font-size: 10px;
    color: var(--descrip-text, #888);
    padding: 0 8px;
}
.pm-settings-save {
    margin: 6px 8px 2px;
}
.pm-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 6px;
}
.pm-row {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
}
.pm-select {
    flex: 1;
    box-sizing: border-box;
    height: 24px;
    background: var(--comfy-input-bg, #333);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 0 4px;
    font-size: 12px;
    min-width: 0;
}
.pm-icon-btn {
    box-sizing: border-box;
    background: var(--comfy-input-bg, #333);
    border: 1px solid var(--border-color, #444);
    color: var(--input-text, #ddd);
    border-radius: 4px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    padding: 0;
    margin: 0;
    font-size: 13px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: normal;
    vertical-align: middle;
}
.pm-icon-btn:hover { background: rgba(255,255,255,0.12); }
.pm-mode-bar {
    display: flex;
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    overflow: hidden;
}
.pm-mode-btn {
    flex: 1;
    background: var(--comfy-input-bg, #2c2c2c);
    color: var(--descrip-text, #aaa);
    border: none;
    padding: 4px 2px;
    cursor: pointer;
    font-size: 11px;
    border-right: 1px solid var(--border-color, #444);
}
.pm-mode-btn:last-child { border-right: none; }
.pm-mode-btn.pm-active {
    background: var(--p-primary-color, #5b8dee);
    color: #fff;
}
.pm-main {
    flex: 1;
    display: flex;
    flex-direction: row;
    gap: 16px;
    min-height: 0;
}
.pm-content {
    flex: 1.3;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
}
.pm-right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
}
.pm-preview-box {
    flex: 1;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.pm-preview-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--descrip-text, #888);
}
.pm-preview-textarea {
    flex: 1;
    min-height: 60px;
    width: 100%;
    box-sizing: border-box;
    resize: none;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
    font-family: inherit;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 6px;
}
.pm-preview-badge {
    align-self: flex-start;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #f2c94c;
    background: rgba(242, 201, 76, 0.12);
    border: 1px solid rgba(242, 201, 76, 0.4);
    border-radius: 3px;
    padding: 1px 5px;
}
.pm-enrich-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color, #3a3a3a);
}
.pm-enrich-btn {
    width: 100%;
}
.pm-enrich-result {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
    color: var(--input-text, #ddd);
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    max-height: 160px;
    overflow-y: auto;
}
.pm-enrich-error {
    font-size: 10px;
    color: #e57373;
}
.pm-enrich-actions {
    display: flex;
    gap: 6px;
}
.pm-enrich-actions button { flex: 1; }
.pm-enrich-instructions {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 44px;
    max-height: 100px;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 11px;
    font-family: inherit;
}
.pm-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    color: var(--descrip-text, #888);
    text-align: center;
    padding: 10px;
}
.pm-primary-btn {
    background: var(--p-primary-color, #5b8dee);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 11px;
}
.pm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
    align-content: start;
}
.pm-card {
    position: relative;
    background: var(--comfy-input-bg, #2a2a2a);
    border: 2px solid var(--border-color, #444);
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 86px;
    transition: border-color 0.15s ease, transform 0.1s ease;
}
.pm-card:hover { border-color: #6a6a6a; }
.pm-card.pm-selected {
    border-color: var(--p-primary-color, #5b8dee);
    box-shadow: 0 0 0 1px var(--p-primary-color, #5b8dee) inset;
}
.pm-card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--input-text, #ddd);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.pm-card-text {
    font-size: 11px;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    word-break: break-word;
    white-space: pre-wrap;
    color: var(--input-text, #ddd);
}
.pm-card-text.pm-card-text-with-title {
    -webkit-line-clamp: 2;
    font-size: 10px;
    color: var(--descrip-text, #999);
    margin-top: 2px;
}
.pm-stars {
    display: flex;
    gap: 1px;
    margin-top: 4px;
}
.pm-star {
    cursor: pointer;
    font-size: 12px;
    color: #6a6a6a;
    user-select: none;
}
.pm-star.pm-star-filled { color: #f2c94c; }
.pm-add-card {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--border-color, #555);
    border-radius: 6px;
    min-height: 86px;
    cursor: pointer;
    color: var(--descrip-text, #999);
    font-size: 22px;
}
.pm-add-card:hover { color: var(--input-text, #ddd); border-color: #888; }
.pm-editor {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 6px;
    margin-bottom: 6px;
    background: rgba(0,0,0,0.2);
}
.pm-editor textarea {
    resize: vertical;
    min-height: 60px;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    font-family: inherit;
}
.pm-editor-title {
    box-sizing: border-box;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 12px;
    font-family: inherit;
}
.pm-editor-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.pm-editor-buttons {
    display: flex;
    gap: 6px;
}
.pm-secondary-btn {
    background: transparent;
    border: 1px solid var(--border-color, #555);
    color: var(--input-text, #ddd);
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 11px;
}
.pm-hint {
    color: var(--descrip-text, #888);
    font-size: 10px;
}
.pm-prefix-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.pm-prefix-label {
    font-size: 10px;
    color: var(--descrip-text, #888);
}
.pm-prefix-input {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 32px;
    max-height: 90px;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 11px;
    font-family: inherit;
}
.pm-modal-actions-split {
    justify-content: space-between;
}
.pm-modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    border-radius: 6px;
}
.pm-modal-box {
    background: var(--comfy-menu-bg, #2b2b2b);
    border: 1px solid var(--border-color, #444);
    border-radius: 6px;
    padding: 12px;
    width: 80%;
    max-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.5);
}
.pm-modal-message {
    font-size: 12px;
    color: var(--input-text, #ddd);
    white-space: pre-wrap;
}
.pm-modal-input {
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 5px 6px;
    font-size: 12px;
}
.pm-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
}
.pm-view-box {
    width: 90%;
    max-width: 360px;
    max-height: 85%;
}
.pm-view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}
.pm-view-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--input-text, #ddd);
}
.pm-view-subtitle {
    font-size: 12px;
    font-weight: 600;
    color: var(--input-text, #ddd);
}
.pm-view-close {
    background: transparent;
    border: none;
    color: var(--descrip-text, #999);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
}
.pm-view-close:hover { color: var(--input-text, #ddd); }
.pm-view-textarea {
    resize: vertical;
    min-height: 160px;
    background: var(--comfy-input-bg, #232323);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.5;
}
.pm-view-text {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    color: var(--input-text, #ddd);
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 8px;
    max-height: 320px;
    overflow-y: auto;
    user-select: text;
}
.pm-img2prompt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
    overflow-y: auto;
}
.pm-img2prompt-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 110px;
    max-height: 150px;
    border: 1px dashed var(--border-color, #555);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(0,0,0,0.2);
    flex: 0 0 auto;
}
.pm-img2prompt-preview img {
    max-width: 100%;
    max-height: 150px;
    object-fit: contain;
    display: block;
}
.pm-img2prompt-preview-empty {
    color: var(--descrip-text, #777);
    font-size: 11px;
    font-style: italic;
    text-align: center;
    padding: 10px;
}
.pm-img2prompt-buttons {
    display: flex;
    gap: 6px;
}
.pm-img2prompt-buttons button { flex: 1; }
.pm-img2prompt-result {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
    color: var(--input-text, #ddd);
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    max-height: 140px;
    overflow-y: auto;
}
.pm-img2prompt-error {
    font-size: 10px;
    color: #e57373;
}
.pm-img2prompt-divider {
    height: 1px;
    background: var(--border-color, #3a3a3a);
    margin: 2px 0;
}
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

function hideWidget(node, widget) {
    if (!widget) return;
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
    widget.draw = () => {};
    widget.options = widget.options || {};
    widget.options.surfaces = { canvas: "never", vueNode: "never", panel: "never" };
}

function setupPromptManagerWidget(node) {
    const modeWidget = node.widgets.find((w) => w.name === "mode");
    const groupIdWidget = node.widgets.find((w) => w.name === "group_id");
    const promptIdWidget = node.widgets.find((w) => w.name === "prompt_id");
    const promptTextWidget = node.widgets.find((w) => w.name === "prompt_text");
    const prefixWidget = node.widgets.find((w) => w.name === "prefix");

    [modeWidget, groupIdWidget, promptIdWidget, promptTextWidget, prefixWidget].forEach((w) => hideWidget(node, w));

    if (!node.properties) node.properties = {};
    if (node.properties.enrichInstructions === undefined) node.properties.enrichInstructions = "";
    if (node.properties.img2promptModel === undefined) node.properties.img2promptModel = DEFAULT_VISION_MODEL;
    if (node.properties.img2promptInstructions === undefined) node.properties.img2promptInstructions = "";

    const state = {
        groups: [],
        groupId: groupIdWidget.value || "",
        promptId: promptIdWidget.value || "",
        mode: modeWidget.value || MODE_FIXED,
        prefix: prefixWidget.value || "",
        enrichInstructions: node.properties.enrichInstructions || "",
        addingPrompt: false,
        settingsMenuOpen: false,
        settings: { hasApiKey: false, model: DEFAULT_MODEL },
        models: { loading: false, loaded: false, list: [] },
        enrich: { loading: false, error: "", result: "" },
        enrichMode: "existing",
        previewOverride: null,
        img2prompt: {
            imageDataUrl: null,
            model: node.properties.img2promptModel || DEFAULT_VISION_MODEL,
            instructions: node.properties.img2promptInstructions || "",
            loading: false,
            error: "",
            result: "",
            adjustText: "",
            adjusting: false,
            adjustError: "",
        },
    };

    const root = el("div", "pm-root");
    const body = el("div", "pm-body");
    root.appendChild(body);

    function showModal({ message, defaultValue, mode }) {
        return new Promise((resolve) => {
            const overlay = el("div", "pm-modal-overlay");
            const box = el("div", "pm-modal-box");
            box.appendChild(el("div", "pm-modal-message", message));

            let input = null;
            if (mode === "prompt") {
                input = document.createElement("input");
                input.type = "text";
                input.className = "pm-modal-input";
                input.value = defaultValue || "";
                box.appendChild(input);
            }

            const finish = (result) => {
                overlay.remove();
                resolve(result);
            };

            const actions = el("div", "pm-modal-actions");
            if (mode !== "alert") {
                const cancelBtn = el("button", "pm-secondary-btn", "Cancel");
                cancelBtn.addEventListener("click", () => finish(mode === "prompt" ? null : false));
                actions.appendChild(cancelBtn);
            }
            const okBtn = el("button", "pm-primary-btn", mode === "alert" ? "OK" : mode === "confirm" ? "Confirm" : "Save");
            okBtn.addEventListener("click", () => finish(mode === "prompt" ? (input ? input.value : "") : true));
            actions.appendChild(okBtn);
            box.appendChild(actions);

            if (input) {
                input.addEventListener("keydown", (ev) => {
                    if (ev.key === "Enter") {
                        ev.preventDefault();
                        finish(input.value);
                    } else if (ev.key === "Escape") {
                        finish(null);
                    }
                });
            }

            let overlayMouseDownTarget = null;
            overlay.addEventListener("mousedown", (ev) => {
                overlayMouseDownTarget = ev.target;
            });
            overlay.addEventListener("click", (ev) => {
                if (ev.target === overlay && overlayMouseDownTarget === overlay) {
                    finish(mode === "prompt" ? null : mode === "alert");
                }
            });

            overlay.appendChild(box);
            root.appendChild(overlay);
            setTimeout(() => (input ? (input.focus(), input.select()) : okBtn.focus()), 0);
        });
    }

    const pmPrompt = (message, defaultValue) => showModal({ message, defaultValue, mode: "prompt" });
    const pmConfirm = (message) => showModal({ message, mode: "confirm" });
    const pmAlert = (message) => showModal({ message, mode: "alert" });

    function showPromptViewModal(group, prompt) {
        const overlay = el("div", "pm-modal-overlay");
        const box = el("div", "pm-modal-box pm-view-box");
        overlay.appendChild(box);

        const close = () => overlay.remove();

        function renderView() {
            box.innerHTML = "";

            const header = el("div", "pm-view-header");
            header.appendChild(el("div", "pm-view-title", "Full prompt"));
            const closeBtn = el("button", "pm-view-close", "×");
            closeBtn.title = "Close";
            closeBtn.addEventListener("click", close);
            header.appendChild(closeBtn);
            box.appendChild(header);

            if (prompt.title) {
                box.appendChild(el("div", "pm-view-subtitle", prompt.title));
            }
            box.appendChild(el("div", "pm-view-text", prompt.text));

            const starsRow = el("div", "pm-stars");
            renderStars(starsRow, prompt.rating, () => {});
            box.appendChild(starsRow);

            const actions = el("div", "pm-modal-actions pm-modal-actions-split");

            const leftGroup = el("div", "pm-editor-buttons");
            const deleteBtn = el("button", "pm-secondary-btn", "Delete");
            deleteBtn.addEventListener("click", async () => {
                if (await deletePrompt(group, prompt)) close();
            });
            leftGroup.appendChild(deleteBtn);

            const rightGroup = el("div", "pm-editor-buttons");
            const editBtn = el("button", "pm-secondary-btn", "Edit");
            editBtn.addEventListener("click", renderEdit);
            const copyBtn = el("button", "pm-secondary-btn", "Copy");
            copyBtn.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(prompt.text);
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
                } catch (e) {
                    console.error("PromptManager: failed to copy", e);
                }
            });
            const closeBtn2 = el("button", "pm-primary-btn", "Close");
            closeBtn2.addEventListener("click", close);
            rightGroup.appendChild(editBtn);
            rightGroup.appendChild(copyBtn);
            rightGroup.appendChild(closeBtn2);

            actions.appendChild(leftGroup);
            actions.appendChild(rightGroup);
            box.appendChild(actions);
        }

        function renderEdit() {
            box.innerHTML = "";

            box.appendChild(el("div", "pm-view-title", "Edit prompt"));

            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.className = "pm-editor-title";
            titleInput.placeholder = "Title (optional)";
            titleInput.value = prompt.title || "";
            box.appendChild(titleInput);

            const textarea = document.createElement("textarea");
            textarea.className = "pm-view-textarea";
            textarea.value = prompt.text;
            box.appendChild(textarea);

            let draftRating = prompt.rating;
            const starsRow = el("div", "pm-stars");
            const updateStars = () => {
                renderStars(starsRow, draftRating, (r) => {
                    draftRating = r === draftRating ? 0 : r;
                    updateStars();
                });
            };
            updateStars();
            box.appendChild(starsRow);

            const actions = el("div", "pm-modal-actions");
            const cancelBtn = el("button", "pm-secondary-btn", "Cancel");
            cancelBtn.addEventListener("click", renderView);
            const saveBtn = el("button", "pm-primary-btn", "Save");
            saveBtn.addEventListener("click", async () => {
                const text = textarea.value.trim();
                if (!text) {
                    textarea.focus();
                    return;
                }
                const title = titleInput.value.trim();
                await updatePrompt(group, prompt, text, draftRating, title);
                prompt.text = text;
                prompt.rating = draftRating;
                prompt.title = title;
                renderView();
            });
            actions.appendChild(cancelBtn);
            actions.appendChild(saveBtn);
            box.appendChild(actions);

            setTimeout(() => textarea.focus(), 0);
        }

        let overlayMouseDownTarget = null;
        overlay.addEventListener("mousedown", (ev) => {
            overlayMouseDownTarget = ev.target;
        });
        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay && overlayMouseDownTarget === overlay) close();
        });

        root.appendChild(overlay);
        renderView();
    }

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await api.fetchApi("/prompt_manager/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            const groups = await res.json();
            await loadGroups(groups[0] ? groups[0].id : undefined);
        } catch (e) {
            console.error("PromptManager: failed to restore backup", e);
            await pmAlert("Could not restore the backup. Check the file.");
        }
    });
    root.appendChild(fileInput);

    const imageFileInput = el("input");
    imageFileInput.type = "file";
    imageFileInput.accept = "image/*";
    imageFileInput.style.display = "none";
    imageFileInput.addEventListener("change", async () => {
        const file = imageFileInput.files && imageFileInput.files[0];
        imageFileInput.value = "";
        if (!file) return;
        try {
            state.img2prompt.imageDataUrl = await fileToResizedDataUrl(file);
            state.img2prompt.error = "";
        } catch (e) {
            console.error("PromptManager: failed to read image file", e);
            state.img2prompt.error = "Could not read that image file.";
        }
        render();
    });
    root.appendChild(imageFileInput);

    function currentGroup() {
        return state.groups.find((g) => g.id === state.groupId) || null;
    }

    function syncWidgets() {
        const group = currentGroup();
        const prompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;
        modeWidget.value = state.mode;
        groupIdWidget.value = state.groupId;
        promptIdWidget.value = prompt ? prompt.id : "";
        promptTextWidget.value = state.previewOverride !== null ? state.previewOverride : prompt ? prompt.text : "";
        prefixWidget.value = state.prefix;
        if (!prompt) state.promptId = "";
    }

    function refreshFromWidgets() {
        state.groupId = groupIdWidget.value || "";
        state.promptId = promptIdWidget.value || "";
        state.mode = modeWidget.value || MODE_FIXED;
        state.prefix = prefixWidget.value || "";
        state.previewOverride = promptTextWidget.value || null;
        state.enrichInstructions = node.properties.enrichInstructions || "";
        state.img2prompt.model = node.properties.img2promptModel || DEFAULT_VISION_MODEL;
        state.img2prompt.instructions = node.properties.img2promptInstructions || "";
        render();
    }
    node._pmRefreshFromWidgets = refreshFromWidgets;

    async function loadGroups(selectGroupId) {
        try {
            const res = await api.fetchApi("/prompt_manager/groups");
            state.groups = await res.json();
        } catch (e) {
            console.error("PromptManager: failed to load groups", e);
        }
        if (selectGroupId !== undefined) {
            state.groupId = selectGroupId;
        } else if (!state.groups.find((g) => g.id === state.groupId)) {
            state.groupId = state.groups[0] ? state.groups[0].id : "";
        }
        state.addingPrompt = false;
        if (state.previewOverride !== null) {
            const group = currentGroup();
            const prompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;
            if (prompt && prompt.text === state.previewOverride) state.previewOverride = null;
        }
        syncWidgets();
        render();
    }

    async function loadSettings() {
        try {
            const res = await api.fetchApi("/prompt_manager/settings");
            const data = await res.json();
            state.settings.hasApiKey = !!data.has_api_key;
            state.settings.model = data.model || DEFAULT_MODEL;
        } catch (e) {
            console.error("PromptManager: failed to load settings", e);
        }
        render();
    }

    async function loadModels() {
        if (state.models.loaded || state.models.loading) return;
        state.models.loading = true;
        render();
        try {
            const res = await api.fetchApi("/prompt_manager/models");
            const data = await res.json();
            state.models.list = data.models || [];
            state.models.loaded = true;
        } catch (e) {
            console.error("PromptManager: failed to load models", e);
        }
        state.models.loading = false;
        render();
    }

    async function saveSettings(apiKey, model) {
        const body = {};
        if (apiKey !== undefined) body.api_key = apiKey;
        if (model !== undefined) body.model = model;
        const res = await api.fetchApi("/prompt_manager/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        state.settings.hasApiKey = !!data.has_api_key;
        state.settings.model = data.model || DEFAULT_MODEL;
        return res.ok;
    }

    async function enrichSelected() {
        const group = currentGroup();
        const prompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;
        const isNewMode = state.enrichMode === "new";
        if (isNewMode ? !state.enrichInstructions.trim() : !prompt) return;

        state.enrich = { loading: true, error: "", result: "" };
        render();
        try {
            const res = await api.fetchApi("/prompt_manager/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: isNewMode ? "" : prompt.text, instructions: state.enrichInstructions }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to enrich the prompt.");
            state.enrich = { loading: false, error: "", result: data.text };
        } catch (e) {
            state.enrich = { loading: false, error: e.message || String(e), result: "" };
        }
        render();
    }

    async function pasteImageFromClipboard() {
        state.img2prompt.error = "";
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find((t) => t.startsWith("image/"));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    state.img2prompt.imageDataUrl = await fileToResizedDataUrl(blob);
                    render();
                    return;
                }
            }
            state.img2prompt.error = "No image found on the clipboard.";
        } catch (e) {
            console.error("PromptManager: failed to paste image", e);
            state.img2prompt.error = "Could not read the clipboard. Try the Upload button instead.";
        }
        render();
    }

    async function convertImageToPrompt() {
        const img = state.img2prompt;
        if (!img.imageDataUrl || img.loading) return;

        state.img2prompt.loading = true;
        state.img2prompt.error = "";
        state.img2prompt.result = "";
        render();
        try {
            const res = await api.fetchApi("/prompt_manager/image-to-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: state.img2prompt.imageDataUrl,
                    model: state.img2prompt.model,
                    instructions: state.img2prompt.instructions,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to convert the image.");
            state.img2prompt.result = data.text;
        } catch (e) {
            state.img2prompt.error = e.message || String(e);
        }
        state.img2prompt.loading = false;
        render();
    }

    async function applyImageAdjustment() {
        const img = state.img2prompt;
        const instructions = (img.adjustText || "").trim();
        if (!img.result || !instructions || img.adjusting) return;

        state.img2prompt.adjusting = true;
        state.img2prompt.adjustError = "";
        render();
        try {
            const res = await api.fetchApi("/prompt_manager/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: img.result, instructions, model: img.model }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to adjust the prompt.");
            state.img2prompt.result = data.text;
            state.img2prompt.adjustText = "";
        } catch (e) {
            state.img2prompt.adjustError = e.message || String(e);
        }
        state.img2prompt.adjusting = false;
        render();
    }

    function clearImageToPrompt() {
        state.img2prompt.imageDataUrl = null;
        state.img2prompt.result = "";
        state.img2prompt.error = "";
        state.img2prompt.adjustText = "";
        state.img2prompt.adjustError = "";
        state.img2prompt.loading = false;
        state.img2prompt.adjusting = false;
        render();
    }

    async function createGroup() {
        const name = await pmPrompt("New group name:");
        if (!name || !name.trim()) return;
        const res = await api.fetchApi("/prompt_manager/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) {
            await pmAlert("Could not create the group.");
            return;
        }
        const group = await res.json();
        await loadGroups(group.id);
    }

    async function renameGroup() {
        const group = currentGroup();
        if (!group) return;
        const name = await pmPrompt("Rename group:", group.name);
        if (!name || !name.trim() || name.trim() === group.name) return;
        await api.fetchApi(`/prompt_manager/groups/${group.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
        });
        await loadGroups(group.id);
    }

    async function deleteGroup() {
        const group = currentGroup();
        if (!group) return;
        if (!(await pmConfirm(`Delete the group "${group.name}" and all its prompts?`))) return;
        await api.fetchApi(`/prompt_manager/groups/${group.id}`, { method: "DELETE" });
        await loadGroups();
    }

    async function deletePrompt(group, prompt) {
        if (!(await pmConfirm("Delete this prompt?"))) return false;
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts/${prompt.id}`, { method: "DELETE" });
        await loadGroups(group.id);
        return true;
    }

    async function updatePrompt(group, prompt, text, rating, title) {
        const body = { text, rating };
        if (title !== undefined) body.title = title;
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts/${prompt.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        await loadGroups(group.id);
    }

    async function rate(group, prompt, rating) {
        const newRating = rating === prompt.rating ? 0 : rating;
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts/${prompt.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: newRating }),
        });
        await loadGroups(group.id);
    }

    async function addPrompt(group, text, rating, title) {
        const res = await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, rating, title: title || "" }),
        });
        const prompt = await res.json();
        await loadGroups(group.id);
        return prompt;
    }

    async function saveImagePromptToGroup() {
        const group = currentGroup();
        const text = (state.img2prompt.result || "").trim();
        if (!group || !text) return;
        const prompt = await addPrompt(group, text, 0);
        state.promptId = prompt.id;
        state.enrich = { loading: false, error: "", result: "" };
        state.previewOverride = null;
        syncWidgets();
        render();
    }

    function selectPrompt(prompt) {
        state.promptId = prompt.id;
        state.enrich = { loading: false, error: "", result: "" };
        state.previewOverride = null;
        syncWidgets();
        render();
    }

    function setMode(mode) {
        state.mode = mode;
        syncWidgets();
        render();
    }

    function renderStars(container, rating, onRate) {
        container.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = el("span", "pm-star" + (i <= rating ? " pm-star-filled" : ""), i <= rating ? "★" : "☆");
            star.addEventListener("click", (ev) => {
                ev.stopPropagation();
                onRate(i);
            });
            container.appendChild(star);
        }
    }

    function sortedPrompts(group) {
        return [...group.prompts].sort((a, b) => b.rating - a.rating);
    }

    function renderCard(group, prompt) {
        const card = el("div", "pm-card" + (prompt.id === state.promptId ? " pm-selected" : ""));
        card.title = prompt.title ? `${prompt.title}\n\n${prompt.text}` : prompt.text;
        card.addEventListener("click", () => selectPrompt(prompt));
        card.addEventListener("dblclick", (ev) => {
            ev.stopPropagation();
            showPromptViewModal(group, prompt);
        });

        if (prompt.title) {
            card.appendChild(el("div", "pm-card-title", prompt.title));
            card.appendChild(el("div", "pm-card-text pm-card-text-with-title", prompt.text));
        } else {
            card.appendChild(el("div", "pm-card-text", prompt.text));
        }

        const stars = el("div", "pm-stars");
        renderStars(stars, prompt.rating, (r) => rate(group, prompt, r));
        card.appendChild(stars);

        return card;
    }

    function renderAddCard() {
        const card = el("div", "pm-add-card", "+");
        card.title = "Add prompt";
        card.addEventListener("click", () => {
            state.addingPrompt = true;
            render();
        });
        return card;
    }

    function renderEditor(group) {
        const panel = el("div", "pm-editor");
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "pm-editor-title";
        titleInput.placeholder = "Title (optional)";
        panel.appendChild(titleInput);

        const textarea = document.createElement("textarea");
        textarea.placeholder = "Type the prompt...";
        panel.appendChild(textarea);

        let draftRating = 0;
        const starsRow = el("div", "pm-stars");
        const updateStars = () => {
            renderStars(starsRow, draftRating, (r) => {
                draftRating = r === draftRating ? 0 : r;
                updateStars();
            });
        };
        updateStars();
        panel.appendChild(starsRow);

        const actions = el("div", "pm-editor-actions");
        const hint = el("span", "pm-hint", "");
        const buttons = el("div", "pm-editor-buttons");
        const cancelBtn = el("button", "pm-secondary-btn", "Cancel");
        cancelBtn.addEventListener("click", () => {
            state.addingPrompt = false;
            render();
        });
        const saveBtn = el("button", "pm-primary-btn", "Save");
        saveBtn.addEventListener("click", async () => {
            const text = textarea.value.trim();
            if (!text) {
                textarea.focus();
                return;
            }
            await addPrompt(group, text, draftRating, titleInput.value.trim());
        });
        buttons.appendChild(cancelBtn);
        buttons.appendChild(saveBtn);
        actions.appendChild(hint);
        actions.appendChild(buttons);
        panel.appendChild(actions);

        setTimeout(() => textarea.focus(), 0);
        return panel;
    }

    function renderSettingsMenu() {
        const menu = el("div", "pm-settings-menu");

        const downloadBtn = el("button", "pm-menu-item", "⬇ Download backup of all groups");
        if (!state.groups.length) downloadBtn.disabled = true;
        downloadBtn.addEventListener("click", () => {
            const url = api.apiURL("/prompt_manager/backup");
            const a = document.createElement("a");
            a.href = url;
            a.download = "prompt_manager_backup.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            state.settingsMenuOpen = false;
            render();
        });
        menu.appendChild(downloadBtn);

        const restoreBtn = el("button", "pm-menu-item", "⬆ Restore backup...");
        restoreBtn.addEventListener("click", () => {
            state.settingsMenuOpen = false;
            render();
            fileInput.click();
        });
        menu.appendChild(restoreBtn);

        menu.appendChild(el("div", "pm-settings-divider"));
        menu.appendChild(el("div", "pm-settings-title", "AI enrichment (OpenRouter)"));

        const keyField = el("div", "pm-settings-field");
        keyField.appendChild(el("label", null, "API key"));
        const keyInput = document.createElement("input");
        keyInput.type = "password";
        keyInput.placeholder = state.settings.hasApiKey ? "•••••••• (key saved)" : "sk-or-...";
        keyField.appendChild(keyInput);
        menu.appendChild(keyField);

        const modelField = el("div", "pm-settings-field");
        modelField.appendChild(el("label", null, `Enrichment model${state.models.list.length ? ` (${state.models.list.length} available)` : ""}`));

        const currentModel = state.settings.model || DEFAULT_MODEL;
        let modelSelect = null;
        if (state.models.loading && !state.models.list.length) {
            modelField.appendChild(el("div", "pm-settings-hint", "Loading models..."));
        } else {
            modelSelect = buildModelSelect(state.models.list, currentModel);
            modelField.appendChild(modelSelect);
        }
        menu.appendChild(modelField);

        const visionField = el("div", "pm-settings-field");
        const visionModels = state.models.list.filter((m) => m.vision);
        visionField.appendChild(el("label", null, `Image Recognition model${visionModels.length ? ` (${visionModels.length} available)` : ""}`));
        let visionSelect = null;
        if (state.models.loading && !state.models.list.length) {
            visionField.appendChild(el("div", "pm-settings-hint", "Loading models..."));
        } else {
            visionSelect = buildModelSelect(visionModels, state.img2prompt.model);
            visionField.appendChild(visionSelect);
        }
        menu.appendChild(visionField);

        const saveSettingsBtn = el("button", "pm-primary-btn pm-settings-save", "Save settings");
        saveSettingsBtn.addEventListener("click", async () => {
            saveSettingsBtn.textContent = "Saving...";
            const ok = await saveSettings(keyInput.value || undefined, modelSelect ? modelSelect.value : undefined);
            if (visionSelect) {
                state.img2prompt.model = visionSelect.value;
                node.properties.img2promptModel = visionSelect.value;
            }
            saveSettingsBtn.textContent = ok ? "Saved!" : "Failed";
            setTimeout(() => {
                state.settingsMenuOpen = false;
                render();
            }, 600);
        });
        menu.appendChild(saveSettingsBtn);

        return menu;
    }

    function renderImageToPromptPanel() {
        const img = state.img2prompt;
        const panel = el("div", "pm-img2prompt");
        panel.appendChild(el("div", "pm-preview-title", "Image to prompt"));

        const preview = el("div", "pm-img2prompt-preview");
        if (img.imageDataUrl) {
            const image = document.createElement("img");
            image.src = img.imageDataUrl;
            preview.appendChild(image);
        } else {
            preview.appendChild(el("div", "pm-img2prompt-preview-empty", "Upload or paste an image to get started. It is only sent to the AI, never saved."));
        }
        panel.appendChild(preview);

        const uploadRow = el("div", "pm-img2prompt-buttons");
        const uploadBtn = el("button", "pm-secondary-btn", "⬆ Upload");
        uploadBtn.addEventListener("click", () => imageFileInput.click());
        const pasteBtn = el("button", "pm-secondary-btn", "📋 Paste");
        pasteBtn.addEventListener("click", pasteImageFromClipboard);
        uploadRow.appendChild(uploadBtn);
        uploadRow.appendChild(pasteBtn);
        panel.appendChild(uploadRow);

        if (img.error) {
            panel.appendChild(el("div", "pm-img2prompt-error", img.error));
        }

        const instructionsField = document.createElement("textarea");
        instructionsField.className = "pm-enrich-instructions";
        instructionsField.placeholder = "Instructions (optional). E.g.: describe only the scenery in this image.";
        instructionsField.rows = 2;
        instructionsField.value = img.instructions;
        instructionsField.addEventListener("input", () => {
            state.img2prompt.instructions = instructionsField.value;
            node.properties.img2promptInstructions = instructionsField.value;
        });
        panel.appendChild(instructionsField);

        const convertBtn = el("button", "pm-primary-btn", img.loading ? "Converting..." : "Convert to prompt");
        convertBtn.disabled = !img.imageDataUrl || img.loading;
        convertBtn.addEventListener("click", convertImageToPrompt);
        panel.appendChild(convertBtn);

        if (img.result) {
            panel.appendChild(el("div", "pm-img2prompt-divider"));
            panel.appendChild(el("div", "pm-preview-title", "Result"));
            panel.appendChild(el("div", "pm-img2prompt-result", img.result));

            const activeGroup = currentGroup();
            const saveBtn = el("button", "pm-primary-btn", activeGroup ? `Save prompt to "${activeGroup.name}"` : "Save prompt");
            saveBtn.disabled = !activeGroup;
            saveBtn.title = activeGroup ? "" : "Select or create a group first";
            saveBtn.addEventListener("click", saveImagePromptToGroup);
            panel.appendChild(saveBtn);

            let adjustBtn;
            const adjustField = document.createElement("textarea");
            adjustField.className = "pm-enrich-instructions";
            adjustField.placeholder = "Ask the AI to fix something. E.g.: describe the light in more detail, add a dog...";
            adjustField.rows = 2;
            adjustField.value = img.adjustText;
            adjustField.addEventListener("input", () => {
                state.img2prompt.adjustText = adjustField.value;
                if (adjustBtn) adjustBtn.disabled = !adjustField.value.trim() || img.adjusting;
            });
            panel.appendChild(adjustField);

            if (img.adjustError) {
                panel.appendChild(el("div", "pm-img2prompt-error", img.adjustError));
            }

            adjustBtn = el("button", "pm-secondary-btn", img.adjusting ? "Adjusting..." : "Apply adjustment");
            adjustBtn.disabled = !img.adjustText.trim() || img.adjusting;
            adjustBtn.addEventListener("click", applyImageAdjustment);
            panel.appendChild(adjustBtn);
        }

        panel.appendChild(el("div", "pm-img2prompt-divider"));
        const clearBtn = el("button", "pm-secondary-btn", "Clear image & text");
        clearBtn.addEventListener("click", clearImageToPrompt);
        panel.appendChild(clearBtn);

        return panel;
    }

    function renderRightPanel(group, prompt) {
        const right = el("div", "pm-right");
        right.appendChild(el("div", "pm-preview-title", "Prompt"));

        const preview = el("div", "pm-preview-box");
        const hasOverride = state.previewOverride !== null;
        const baseText = hasOverride ? state.previewOverride : prompt ? prompt.text : "";

        const textarea = document.createElement("textarea");
        textarea.className = "pm-preview-textarea";
        textarea.placeholder = "Type a prompt here and run it directly — no need to select or save one.";
        textarea.value = baseText;

        const badge = el("div", "pm-preview-badge", "Not saved yet");
        badge.style.display = hasOverride ? "" : "none";

        const replaceBtn = el("button", "pm-primary-btn", "Replace saved prompt");
        replaceBtn.style.display = hasOverride && prompt ? "" : "none";
        replaceBtn.addEventListener("click", async () => {
            await updatePrompt(group, prompt, state.previewOverride, prompt.rating);
            state.previewOverride = null;
            render();
        });

        textarea.addEventListener("input", () => {
            state.previewOverride = textarea.value;
            promptTextWidget.value = state.previewOverride;
            badge.style.display = "";
            replaceBtn.style.display = prompt ? "" : "none";
        });

        preview.appendChild(textarea);
        preview.appendChild(badge);
        preview.appendChild(replaceBtn);
        right.appendChild(preview);

        const enrichBox = el("div", "pm-enrich-box");

        const enrichModeBar = el("div", "pm-mode-bar");
        const isNewMode = state.enrichMode === "new";
        const existingModeBtn = el("button", "pm-mode-btn" + (isNewMode ? "" : " pm-active"), "Enrich selected");
        existingModeBtn.addEventListener("click", () => {
            state.enrichMode = "existing";
            state.enrich = { loading: false, error: "", result: "" };
            render();
        });
        const newModeBtn = el("button", "pm-mode-btn" + (isNewMode ? " pm-active" : ""), "Ask for a prompt");
        newModeBtn.addEventListener("click", () => {
            state.enrichMode = "new";
            state.enrich = { loading: false, error: "", result: "" };
            render();
        });
        enrichModeBar.appendChild(existingModeBtn);
        enrichModeBar.appendChild(newModeBtn);
        enrichBox.appendChild(enrichModeBar);

        const canEnrich = isNewMode ? state.enrichInstructions.trim().length > 0 : !!prompt;
        const enrichBtn = el(
            "button",
            "pm-primary-btn pm-enrich-btn",
            state.enrich.loading ? "Generating..." : isNewMode ? "✨ Generate prompt" : "✨ Enrich with AI"
        );
        enrichBtn.disabled = !canEnrich || state.enrich.loading;
        enrichBtn.addEventListener("click", enrichSelected);
        enrichBox.appendChild(enrichBtn);

        const instructionsField = document.createElement("textarea");
        instructionsField.className = "pm-enrich-instructions";
        instructionsField.placeholder = isNewMode
            ? "Describe the prompt you want. E.g.: a fantasy castle at sunset, oil painting style..."
            : "Instructions for the AI (optional). E.g.: expand the prompt into 2 paragraphs, add more detail about the environment...";
        instructionsField.rows = 3;
        instructionsField.value = state.enrichInstructions;
        instructionsField.addEventListener("input", () => {
            state.enrichInstructions = instructionsField.value;
            node.properties.enrichInstructions = state.enrichInstructions;
            enrichBtn.disabled = (isNewMode && !instructionsField.value.trim()) || state.enrich.loading;
        });
        enrichBox.appendChild(instructionsField);

        if (state.enrich.error) {
            enrichBox.appendChild(el("div", "pm-enrich-error", state.enrich.error));
        }

        if (state.enrich.result) {
            enrichBox.appendChild(el("div", "pm-enrich-result", state.enrich.result));

            if (group) {
                const saveNewBtn = el("button", "pm-primary-btn", `Save as new prompt to "${group.name}"`);
                saveNewBtn.addEventListener("click", async () => {
                    const created = await addPrompt(group, state.enrich.result, 0);
                    state.promptId = created.id;
                    state.enrich = { loading: false, error: "", result: "" };
                    state.previewOverride = null;
                    syncWidgets();
                    render();
                });
                enrichBox.appendChild(saveNewBtn);
            }

            const enrichActions = el("div", "pm-enrich-actions");
            const discardBtn = el("button", "pm-secondary-btn", "Discard");
            discardBtn.addEventListener("click", () => {
                state.enrich = { loading: false, error: "", result: "" };
                render();
            });
            enrichActions.appendChild(discardBtn);
            const useBtn = el("button", "pm-primary-btn", "Use this text");
            useBtn.addEventListener("click", () => {
                state.previewOverride = state.enrich.result;
                state.enrich = { loading: false, error: "", result: "" };
                syncWidgets();
                render();
            });
            enrichActions.appendChild(useBtn);
            enrichBox.appendChild(enrichActions);
        }

        right.appendChild(enrichBox);
        return right;
    }

    function render() {
        body.innerHTML = "";

        const main = el("div", "pm-main");
        main.appendChild(renderImageToPromptPanel());

        const content = el("div", "pm-content");
        content.appendChild(el("div", "pm-preview-title", "Prompt Manager"));
        const group = currentGroup();
        const selectedPrompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;

        const groupRow = el("div", "pm-row");
        const select = document.createElement("select");
        select.className = "pm-select";
        if (!state.groups.length) {
            const opt = document.createElement("option");
            opt.textContent = "No group";
            opt.value = "";
            select.appendChild(opt);
        }
        for (const g of state.groups) {
            const opt = document.createElement("option");
            opt.value = g.id;
            opt.textContent = `${g.name} (${g.prompts.length})`;
            if (g.id === state.groupId) opt.selected = true;
            select.appendChild(opt);
        }
        select.addEventListener("change", () => {
            state.groupId = select.value;
            state.addingPrompt = false;
            syncWidgets();
            render();
        });
        groupRow.appendChild(select);

        const renameBtn = el("button", "pm-icon-btn", "✎");
        renameBtn.title = "Rename group";
        renameBtn.addEventListener("click", renameGroup);
        groupRow.appendChild(renameBtn);

        const newBtn = el("button", "pm-icon-btn", "+");
        newBtn.title = "New group";
        newBtn.addEventListener("click", createGroup);
        groupRow.appendChild(newBtn);

        const delBtn = el("button", "pm-icon-btn", "🗑");
        delBtn.title = "Delete group";
        delBtn.addEventListener("click", deleteGroup);
        groupRow.appendChild(delBtn);

        const settingsBtn = el("button", "pm-icon-btn pm-settings-btn", "⚙️");
        settingsBtn.title = "Settings (backup & AI)";
        settingsBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            state.settingsMenuOpen = !state.settingsMenuOpen;
            if (state.settingsMenuOpen) loadModels();
            render();
        });
        groupRow.appendChild(settingsBtn);

        content.appendChild(groupRow);

        const modeBar = el("div", "pm-mode-bar");
        for (const mode of [MODE_FIXED, MODE_RANDOM, MODE_SEQUENTIAL]) {
            const btn = el("button", "pm-mode-btn" + (mode === state.mode ? " pm-active" : ""), MODE_LABELS[mode]);
            btn.addEventListener("click", () => setMode(mode));
            modeBar.appendChild(btn);
        }
        content.appendChild(modeBar);

        const prefixRow = el("div", "pm-prefix-row");
        prefixRow.appendChild(el("div", "pm-prefix-label", "Prefix (always inserted before the prompt)"));
        const prefixInput = document.createElement("textarea");
        prefixInput.className = "pm-prefix-input";
        prefixInput.placeholder = "Ex: masterpiece, best quality";
        prefixInput.rows = 2;
        prefixInput.value = state.prefix;
        prefixInput.addEventListener("input", () => {
            state.prefix = prefixInput.value;
            prefixWidget.value = state.prefix;
        });
        prefixRow.appendChild(prefixInput);
        content.appendChild(prefixRow);

        if (!group) {
            const empty = el("div", "pm-empty");
            empty.appendChild(el("div", null, "Create a group to start saving your prompts."));
            const createBtn = el("button", "pm-primary-btn", "+ Create group");
            createBtn.addEventListener("click", createGroup);
            empty.appendChild(createBtn);
            content.appendChild(empty);
        } else {
            if (state.addingPrompt) {
                content.appendChild(renderEditor(group));
            }
            const grid = el("div", "pm-grid");
            for (const prompt of sortedPrompts(group)) {
                grid.appendChild(renderCard(group, prompt));
            }
            grid.appendChild(renderAddCard());
            content.appendChild(grid);
        }
        main.appendChild(content);
        main.appendChild(renderRightPanel(group, selectedPrompt));

        body.appendChild(main);

        root.querySelectorAll(".pm-settings-menu").forEach((m) => m.remove());
        if (state.settingsMenuOpen) {
            const menu = renderSettingsMenu();
            const rootRect = root.getBoundingClientRect();
            const btnRect = settingsBtn.getBoundingClientRect();
            menu.style.top = `${btnRect.bottom - rootRect.top + 4}px`;
            menu.style.right = `${rootRect.right - btnRect.right}px`;
            root.appendChild(menu);
        }
    }

    document.addEventListener("click", (ev) => {
        if (!root.contains(ev.target) && state.settingsMenuOpen) {
            state.settingsMenuOpen = false;
            render();
        }
    });

    node.addDOMWidget("prompt_manager_ui", "prompt_manager", root, {
        getMinHeight: () => 470,
        hideOnZoom: false,
    });

    if (node.size[0] < 920) node.size[0] = 920;
    if (node.size[1] < 560) node.size[1] = 560;

    syncWidgets();
    loadGroups(state.groupId || undefined);
    loadSettings();
    loadModels();
}

app.registerExtension({
    name: "PromptManager.UI",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            injectStyles();
            setupPromptManagerWidget(this);
            return result;
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const result = onConfigure ? onConfigure.apply(this, arguments) : undefined;
            if (this._pmRefreshFromWidgets) this._pmRefreshFromWidgets();
            return result;
        };
    },
});
