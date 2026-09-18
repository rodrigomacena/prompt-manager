import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "PromptManager";

const MODE_FIXED = "fixed";
const MODE_RANDOM = "random";
const MODE_SEQUENTIAL = "sequential";

const MODE_LABELS = {
    [MODE_FIXED]: "Escolhido",
    [MODE_RANDOM]: "Aleatório",
    [MODE_SEQUENTIAL]: "Sequencial",
};

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
.pm-backup-btn {
    opacity: 0.5;
    transition: opacity 0.15s ease;
}
.pm-backup-btn:hover { opacity: 1; }
.pm-backup-menu {
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
    min-width: 190px;
    overflow: hidden;
}
.pm-backup-menu button {
    background: transparent;
    border: none;
    color: var(--input-text, #ddd);
    text-align: left;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 11px;
}
.pm-backup-menu button:hover { background: rgba(255,255,255,0.08); }
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
    background: var(--comfy-input-bg, #333);
    color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    padding: 3px 4px;
    font-size: 12px;
    min-width: 0;
}
.pm-icon-btn {
    background: var(--comfy-input-bg, #333);
    border: 1px solid var(--border-color, #444);
    color: var(--input-text, #ddd);
    border-radius: 4px;
    cursor: pointer;
    width: 22px;
    height: 22px;
    line-height: 1;
    font-size: 13px;
    flex: 0 0 auto;
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
.pm-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    padding: 6px;
    background: rgba(0,0,0,0.15);
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

    const state = {
        groups: [],
        groupId: groupIdWidget.value || "",
        promptId: promptIdWidget.value || "",
        mode: modeWidget.value || MODE_FIXED,
        prefix: prefixWidget.value || "",
        addingPrompt: false,
        backupMenuOpen: false,
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
                const cancelBtn = el("button", "pm-secondary-btn", "Cancelar");
                cancelBtn.addEventListener("click", () => finish(mode === "prompt" ? null : false));
                actions.appendChild(cancelBtn);
            }
            const okBtn = el("button", "pm-primary-btn", mode === "alert" ? "OK" : mode === "confirm" ? "Confirmar" : "Salvar");
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
            header.appendChild(el("div", "pm-view-title", "Prompt completo"));
            const closeBtn = el("button", "pm-view-close", "×");
            closeBtn.title = "Fechar";
            closeBtn.addEventListener("click", close);
            header.appendChild(closeBtn);
            box.appendChild(header);

            box.appendChild(el("div", "pm-view-text", prompt.text));

            const starsRow = el("div", "pm-stars");
            renderStars(starsRow, prompt.rating, () => {});
            box.appendChild(starsRow);

            const actions = el("div", "pm-modal-actions pm-modal-actions-split");

            const leftGroup = el("div", "pm-editor-buttons");
            const deleteBtn = el("button", "pm-secondary-btn", "Excluir");
            deleteBtn.addEventListener("click", async () => {
                if (await deletePrompt(group, prompt)) close();
            });
            leftGroup.appendChild(deleteBtn);

            const rightGroup = el("div", "pm-editor-buttons");
            const editBtn = el("button", "pm-secondary-btn", "Editar");
            editBtn.addEventListener("click", renderEdit);
            const copyBtn = el("button", "pm-secondary-btn", "Copiar");
            copyBtn.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(prompt.text);
                    copyBtn.textContent = "Copiado!";
                    setTimeout(() => (copyBtn.textContent = "Copiar"), 1200);
                } catch (e) {
                    console.error("PromptManager: falha ao copiar", e);
                }
            });
            const closeBtn2 = el("button", "pm-primary-btn", "Fechar");
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

            box.appendChild(el("div", "pm-view-title", "Editar prompt"));

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
            const cancelBtn = el("button", "pm-secondary-btn", "Cancelar");
            cancelBtn.addEventListener("click", renderView);
            const saveBtn = el("button", "pm-primary-btn", "Salvar");
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
            console.error("PromptManager: falha ao restaurar backup", e);
            await pmAlert("Não foi possível restaurar o backup. Verifique o arquivo.");
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
            console.error("PromptManager: falha ao carregar grupos", e);
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

    async function createGroup() {
        const name = await pmPrompt("Nome do novo grupo:");
        if (!name || !name.trim()) return;
        const res = await api.fetchApi("/prompt_manager/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) {
            await pmAlert("Não foi possível criar o grupo.");
            return;
        }
        const group = await res.json();
        await loadGroups(group.id);
    }

    async function renameGroup() {
        const group = currentGroup();
        if (!group) return;
        const name = await pmPrompt("Renomear grupo:", group.name);
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
        if (!(await pmConfirm(`Excluir o grupo "${group.name}" e todos os seus prompts?`))) return;
        await api.fetchApi(`/prompt_manager/groups/${group.id}`, { method: "DELETE" });
        await loadGroups();
    }

    async function deletePrompt(group, prompt) {
        if (!(await pmConfirm("Excluir este prompt?"))) return false;
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
        card.title = "Adicionar prompt";
        card.addEventListener("click", () => {
            state.addingPrompt = true;
            render();
        });
        return card;
    }

    function renderEditor(group) {
        const panel = el("div", "pm-editor");
        const textarea = document.createElement("textarea");
        textarea.placeholder = "Digite o prompt...";
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
        const cancelBtn = el("button", "pm-secondary-btn", "Cancelar");
        cancelBtn.addEventListener("click", () => {
            state.addingPrompt = false;
            render();
        });
        const saveBtn = el("button", "pm-primary-btn", "Salvar");
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

    function renderBackupMenu() {
        const menu = el("div", "pm-backup-menu");

        const downloadBtn = el("button", "", "⬇ Baixar backup de todos os grupos");
        if (!state.groups.length) downloadBtn.disabled = true;
        downloadBtn.addEventListener("click", () => {
            const url = api.apiURL("/prompt_manager/backup");
            const a = document.createElement("a");
            a.href = url;
            a.download = "prompt_manager_backup.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            state.backupMenuOpen = false;
            render();
        });
        menu.appendChild(downloadBtn);

        const restoreBtn = el("button", "", "⬆ Restaurar backup...");
        restoreBtn.addEventListener("click", () => {
            state.backupMenuOpen = false;
            render();
            fileInput.click();
        });
        menu.appendChild(restoreBtn);

        return menu;
    }

    function render() {
        body.innerHTML = "";

        const groupRow = el("div", "pm-row");
        const select = document.createElement("select");
        select.className = "pm-select";
        if (!state.groups.length) {
            const opt = document.createElement("option");
            opt.textContent = "Nenhum grupo";
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
        renameBtn.title = "Renomear grupo";
        renameBtn.addEventListener("click", renameGroup);
        groupRow.appendChild(renameBtn);

        const newBtn = el("button", "pm-icon-btn", "+");
        newBtn.title = "Novo grupo";
        newBtn.addEventListener("click", createGroup);
        groupRow.appendChild(newBtn);

        const delBtn = el("button", "pm-icon-btn", "🗑");
        delBtn.title = "Excluir grupo";
        delBtn.addEventListener("click", deleteGroup);
        groupRow.appendChild(delBtn);

        const backupBtn = el("button", "pm-icon-btn pm-backup-btn", "\u{1F4BE}");
        backupBtn.title = "Backup de todos os grupos";
        backupBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            state.backupMenuOpen = !state.backupMenuOpen;
            render();
        });
        groupRow.appendChild(backupBtn);

        if (state.backupMenuOpen) {
            groupRow.appendChild(renderBackupMenu());
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
        prefixRow.appendChild(el("div", "pm-prefix-label", "Prefixo (sempre inserido antes do prompt)"));
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

        const content = el("div", "pm-content");
        const group = currentGroup();

        if (!group) {
            const empty = el("div", "pm-empty");
            empty.appendChild(el("div", null, "Crie um grupo para começar a guardar seus prompts."));
            const createBtn = el("button", "pm-primary-btn", "+ Criar grupo");
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
        body.appendChild(content);
    }

    document.addEventListener("click", (ev) => {
        if (!root.contains(ev.target) && state.backupMenuOpen) {
            state.backupMenuOpen = false;
            render();
        }
    });

    node.addDOMWidget("prompt_manager_ui", "prompt_manager", root, {
        getMinHeight: () => 470,
        hideOnZoom: false,
    });

    if (node.size[0] < 420) node.size[0] = 420;
    if (node.size[1] < 530) node.size[1] = 530;

    syncWidgets();
    loadGroups(state.groupId || undefined);
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
