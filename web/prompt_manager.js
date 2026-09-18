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
.pm-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 16px;
}
.pm-backup-btn {
    background: transparent;
    border: none;
    color: var(--descrip-text, #999);
    opacity: 0.45;
    cursor: pointer;
    font-size: 13px;
    padding: 0 4px;
    line-height: 1;
    transition: opacity 0.15s ease;
}
.pm-backup-btn:hover { opacity: 1; }
.pm-backup-menu {
    position: absolute;
    top: 20px;
    right: 6px;
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
.pm-card-delete {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0,0,0,0.35);
    border: none;
    color: #ddd;
    width: 16px;
    height: 16px;
    line-height: 14px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    opacity: 0.55;
}
.pm-card-delete:hover { opacity: 1; background: #c0392b; }
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
    if (!widget || widget.type === "hidden") return;
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
}

function setupPromptManagerWidget(node) {
    const modeWidget = node.widgets.find((w) => w.name === "mode");
    const groupIdWidget = node.widgets.find((w) => w.name === "group_id");
    const promptIdWidget = node.widgets.find((w) => w.name === "prompt_id");
    const promptTextWidget = node.widgets.find((w) => w.name === "prompt_text");

    [modeWidget, groupIdWidget, promptIdWidget, promptTextWidget].forEach((w) => hideWidget(node, w));

    const state = {
        groups: [],
        groupId: groupIdWidget.value || "",
        promptId: promptIdWidget.value || "",
        mode: modeWidget.value || MODE_FIXED,
        addingPrompt: false,
        backupMenuOpen: false,
    };

    const root = el("div", "pm-root");
    const toolbar = el("div", "pm-toolbar");
    const backupBtn = el("button", "pm-backup-btn", "\u{1F4BE}");
    backupBtn.title = "Backup do grupo";
    backupBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.backupMenuOpen = !state.backupMenuOpen;
        render();
    });
    toolbar.appendChild(backupBtn);
    root.appendChild(toolbar);

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
            const res = await api.fetchApi("/prompt_manager/groups/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            const group = await res.json();
            await loadGroups(group.id);
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
        if (!(await pmConfirm("Excluir este prompt?"))) return;
        await api.fetchApi(`/prompt_manager/groups/${group.id}/prompts/${prompt.id}`, { method: "DELETE" });
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

    function renderCard(group, prompt) {
        const card = el("div", "pm-card" + (prompt.id === state.promptId ? " pm-selected" : ""));
        card.title = prompt.text;
        card.addEventListener("click", () => selectPrompt(prompt));

        const del = el("button", "pm-card-delete", "×");
        del.title = "Excluir prompt";
        del.addEventListener("click", (ev) => {
            ev.stopPropagation();
            deletePrompt(group, prompt);
        });
        card.appendChild(del);

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
        const group = currentGroup();

        const downloadBtn = el("button", "", "⬇ Baixar backup do grupo");
        if (!group) downloadBtn.disabled = true;
        downloadBtn.addEventListener("click", () => {
            if (!group) return;
            const url = api.apiURL(`/prompt_manager/groups/${group.id}/backup`);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${group.name}.promptgroup.json`;
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

        body.appendChild(groupRow);

        const modeBar = el("div", "pm-mode-bar");
        for (const mode of [MODE_FIXED, MODE_RANDOM, MODE_SEQUENTIAL]) {
            const btn = el("button", "pm-mode-btn" + (mode === state.mode ? " pm-active" : ""), MODE_LABELS[mode]);
            btn.addEventListener("click", () => setMode(mode));
            modeBar.appendChild(btn);
        }
        body.appendChild(modeBar);

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
            for (const prompt of group.prompts) {
                grid.appendChild(renderCard(group, prompt));
            }
            grid.appendChild(renderAddCard());
            content.appendChild(grid);
        }
        body.appendChild(content);

        root.querySelectorAll(".pm-backup-menu").forEach((m) => m.remove());
        if (state.backupMenuOpen) {
            root.appendChild(renderBackupMenu());
        }
    }

    document.addEventListener("click", (ev) => {
        if (!root.contains(ev.target) && state.backupMenuOpen) {
            state.backupMenuOpen = false;
            render();
        }
    });

    node.addDOMWidget("prompt_manager_ui", "prompt_manager", root, {
        getMinHeight: () => 420,
        hideOnZoom: false,
    });

    if (node.size[0] < 420) node.size[0] = 420;
    if (node.size[1] < 480) node.size[1] = 480;

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
