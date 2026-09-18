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

function modelOptionLabel(m) {
    const namePart = m.name && m.name !== m.id ? m.name : m.id;
    const pricePart = m.price ? ` — ${m.price}` : "";
    const idPart = m.name && m.name !== m.id ? ` (${m.id})` : "";
    return `${namePart}${pricePart}${idPart}`;
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
    top: 100%;
    right: 0;
    margin-top: 4px;
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
    gap: 6px;
    min-height: 0;
}
.pm-content {
    flex: 1.3;
    min-height: 0;
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
}
.pm-preview-box {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
}
.pm-preview-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--descrip-text, #888);
}
.pm-preview-text {
    flex: 1;
    min-height: 60px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
    color: var(--input-text, #ddd);
}
.pm-preview-empty {
    color: var(--descrip-text, #777);
    font-style: italic;
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
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
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
    height: 100%;
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
        previewOverride: null,
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

            overlay.addEventListener("click", (ev) => {
                if (ev.target === overlay) finish(mode === "prompt" ? null : mode === "alert");
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
                await updatePrompt(group, prompt, text, draftRating);
                prompt.text = text;
                prompt.rating = draftRating;
                renderView();
            });
            actions.appendChild(cancelBtn);
            actions.appendChild(saveBtn);
            box.appendChild(actions);

            setTimeout(() => textarea.focus(), 0);
        }

        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay) close();
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

    function currentGroup() {
        return state.groups.find((g) => g.id === state.groupId) || null;
    }

    function syncWidgets() {
        const group = currentGroup();
        const prompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;
        modeWidget.value = state.mode;
        groupIdWidget.value = state.groupId;
        promptIdWidget.value = prompt ? prompt.id : "";
        promptTextWidget.value = prompt ? prompt.text : "";
        prefixWidget.value = state.prefix;
        if (!prompt) state.promptId = "";
    }

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
        if (!prompt) return;

        state.enrich = { loading: true, error: "", result: "" };
        render();
        try {
            const res = await api.fetchApi("/prompt_manager/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: prompt.text, instructions: state.enrichInstructions }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to enrich the prompt.");
            state.enrich = { loading: false, error: "", result: data.text };
        } catch (e) {
            state.enrich = { loading: false, error: e.message || String(e), result: "" };
        }
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

    async function updatePrompt(group, prompt, text, rating) {
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts/${prompt.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, rating }),
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

    async function addPrompt(group, text, rating) {
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, rating }),
        });
        await loadGroups(group.id);
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
        card.title = prompt.text;
        card.addEventListener("click", () => selectPrompt(prompt));
        card.addEventListener("dblclick", (ev) => {
            ev.stopPropagation();
            showPromptViewModal(group, prompt);
        });

        card.appendChild(el("div", "pm-card-text", prompt.text));

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
            await addPrompt(group, text, draftRating);
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
        modelField.appendChild(el("label", null, `Model${state.models.list.length ? ` (${state.models.list.length} available)` : ""}`));

        const currentModel = state.settings.model || DEFAULT_MODEL;
        let modelSelect = null;
        if (state.models.loading && !state.models.list.length) {
            modelField.appendChild(el("div", "pm-settings-hint", "Loading models..."));
        } else {
            modelSelect = document.createElement("select");
            if (!state.models.list.some((m) => m.id === currentModel)) {
                const opt = document.createElement("option");
                opt.value = currentModel;
                opt.textContent = currentModel;
                modelSelect.appendChild(opt);
            }
            for (const m of state.models.list) {
                const opt = document.createElement("option");
                opt.value = m.id;
                opt.textContent = modelOptionLabel(m);
                if (m.id === currentModel) opt.selected = true;
                modelSelect.appendChild(opt);
            }
            modelField.appendChild(modelSelect);
        }
        menu.appendChild(modelField);

        const saveSettingsBtn = el("button", "pm-primary-btn pm-settings-save", "Save settings");
        saveSettingsBtn.addEventListener("click", async () => {
            saveSettingsBtn.textContent = "Saving...";
            const ok = await saveSettings(keyInput.value || undefined, modelSelect ? modelSelect.value : undefined);
            saveSettingsBtn.textContent = ok ? "Saved!" : "Failed";
            setTimeout(() => {
                state.settingsMenuOpen = false;
                render();
            }, 600);
        });
        menu.appendChild(saveSettingsBtn);

        return menu;
    }

    function renderRightPanel(group, prompt) {
        const right = el("div", "pm-right");

        const preview = el("div", "pm-preview-box");
        preview.appendChild(el("div", "pm-preview-title", "Selected prompt"));
        const hasOverride = state.previewOverride !== null;
        if (prompt) {
            preview.appendChild(el("div", "pm-preview-text", hasOverride ? state.previewOverride : prompt.text));
        } else {
            preview.appendChild(el("div", "pm-preview-text pm-preview-empty", "No prompt selected."));
        }
        if (hasOverride) {
            preview.appendChild(el("div", "pm-preview-badge", "Not saved yet"));
            const replaceBtn = el("button", "pm-primary-btn", "Replace saved prompt");
            replaceBtn.addEventListener("click", async () => {
                await updatePrompt(group, prompt, state.previewOverride, prompt.rating);
                state.previewOverride = null;
                render();
            });
            preview.appendChild(replaceBtn);
        }
        right.appendChild(preview);

        const enrichBox = el("div", "pm-enrich-box");
        const enrichBtn = el("button", "pm-primary-btn pm-enrich-btn", state.enrich.loading ? "Generating..." : "✨ Enrich with AI");
        enrichBtn.disabled = !prompt || state.enrich.loading;
        enrichBtn.addEventListener("click", enrichSelected);
        enrichBox.appendChild(enrichBtn);

        const instructionsField = document.createElement("textarea");
        instructionsField.className = "pm-enrich-instructions";
        instructionsField.placeholder = "Instructions for the AI (optional). E.g.: expand the prompt into 2 paragraphs, add more detail about the environment...";
        instructionsField.rows = 3;
        instructionsField.value = state.enrichInstructions;
        instructionsField.addEventListener("input", () => {
            state.enrichInstructions = instructionsField.value;
            node.properties.enrichInstructions = state.enrichInstructions;
        });
        enrichBox.appendChild(instructionsField);

        if (state.enrich.error) {
            enrichBox.appendChild(el("div", "pm-enrich-error", state.enrich.error));
        }

        if (state.enrich.result) {
            enrichBox.appendChild(el("div", "pm-enrich-result", state.enrich.result));
            const enrichActions = el("div", "pm-enrich-actions");
            const useBtn = el("button", "pm-primary-btn", "Use this text");
            useBtn.addEventListener("click", () => {
                state.previewOverride = state.enrich.result;
                state.enrich = { loading: false, error: "", result: "" };
                render();
            });
            const discardBtn = el("button", "pm-secondary-btn", "Discard");
            discardBtn.addEventListener("click", () => {
                state.enrich = { loading: false, error: "", result: "" };
                render();
            });
            enrichActions.appendChild(discardBtn);
            enrichActions.appendChild(useBtn);
            enrichBox.appendChild(enrichActions);
        }

        right.appendChild(enrichBox);
        return right;
    }

    function render() {
        body.innerHTML = "";

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

        if (state.settingsMenuOpen) {
            groupRow.appendChild(renderSettingsMenu());
        }

        body.appendChild(groupRow);

        const modeBar = el("div", "pm-mode-bar");
        for (const mode of [MODE_FIXED, MODE_RANDOM, MODE_SEQUENTIAL]) {
            const btn = el("button", "pm-mode-btn" + (mode === state.mode ? " pm-active" : ""), MODE_LABELS[mode]);
            btn.addEventListener("click", () => setMode(mode));
            modeBar.appendChild(btn);
        }
        body.appendChild(modeBar);

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
        body.appendChild(prefixRow);

        const main = el("div", "pm-main");

        const content = el("div", "pm-content");
        const group = currentGroup();
        const selectedPrompt = group ? group.prompts.find((p) => p.id === state.promptId) : null;

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

    if (node.size[0] < 640) node.size[0] = 640;
    if (node.size[1] < 530) node.size[1] = 530;

    syncWidgets();
    loadGroups(state.groupId || undefined);
    loadSettings();
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
    },
});
