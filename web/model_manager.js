import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "ModelManager";

const CSS_TEXT = `
.mm-root {
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
.mm-root * { box-sizing: border-box; }
.mm-header { display: flex; align-items: center; gap: 6px; }
.mm-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--descrip-text, #888); flex: 1; }
.mm-main { flex: 1; min-height: 0; display: flex; gap: 8px; }
.mm-pane {
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    background: rgba(0,0,0,0.15);
    overflow: auto;
    min-height: 0;
}
.mm-tree { width: 220px; flex-shrink: 0; padding: 4px; }
.mm-files { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.mm-crumb { padding: 6px 8px; border-bottom: 1px solid var(--border-color, #3a3a3a); color: var(--descrip-text, #999); word-break: break-all; }
.mm-list { flex: 1; overflow: auto; }
.mm-tree-row, .mm-row {
    display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 3px; cursor: pointer; white-space: nowrap;
}
.mm-tree-row:hover, .mm-row:hover { background: rgba(255,255,255,0.06); }
.mm-tree-row.mm-active { background: rgba(80,140,255,0.25); }
.mm-tree-label { overflow: hidden; text-overflow: ellipsis; }
.mm-caret { width: 12px; flex-shrink: 0; color: var(--descrip-text, #888); text-align: center; }
.mm-row { cursor: default; padding: 4px 8px; }
.mm-row.mm-folder { cursor: pointer; }
.mm-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.mm-size { color: var(--descrip-text, #888); min-width: 70px; text-align: right; }
.mm-empty { padding: 14px; color: var(--descrip-text, #888); font-style: italic; }
.mm-btn {
    background: var(--comfy-input-bg, #2a2a2a); color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444); border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 11px;
}
.mm-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.mm-btn:disabled { opacity: 0.5; cursor: default; }
.mm-btn.mm-primary { background: #3b6fd8; border-color: #3b6fd8; color: #fff; }
.mm-btn.mm-danger:hover:not(:disabled) { background: rgba(220,60,60,0.35); }
.mm-input, .mm-select {
    background: var(--comfy-input-bg, #232323); color: var(--input-text, #ddd);
    border: 1px solid var(--border-color, #444); border-radius: 4px; padding: 4px 6px; font-size: 11px; font-family: inherit;
}
.mm-download { border: 1px solid var(--border-color, #3a3a3a); border-radius: 4px; background: rgba(0,0,0,0.15); padding: 6px; display: flex; flex-direction: column; gap: 6px; }
.mm-dl-form { display: flex; align-items: center; gap: 6px; }
.mm-dl-form .mm-input { width: 150px; }
.mm-dl-form .mm-select { flex: 1; min-width: 0; }
.mm-token-panel { display: flex; flex-direction: column; gap: 4px; }
.mm-token-row { display: flex; align-items: center; gap: 6px; }
.mm-token-label { width: 90px; flex-shrink: 0; color: var(--descrip-text, #999); font-size: 11px; }
.mm-hf-form { display: flex; align-items: center; gap: 6px; }
.mm-hf-form .mm-input { flex: 1; min-width: 0; }
.mm-root.mm-dragging::after {
    content: "Drop files to upload to the open folder";
    position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center;
    background: rgba(59,111,216,0.28); border: 2px dashed #3b8bff; border-radius: 6px; font-size: 14px; color: #fff; pointer-events: none;
}
.mm-filebar { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-bottom: 1px solid var(--border-color, #3a3a3a); }
.mm-filebar .mm-check { display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; font-size: 11px; }
.mm-filebar .mm-zip-status { color: var(--descrip-text, #999); font-size: 10px; flex: 1; text-align: right; }
.mm-row input[type=checkbox] { margin: 0; cursor: pointer; flex-shrink: 0; }
.mm-hf-target { font-size: 10px; color: var(--descrip-text, #999); }
.mm-token-row .mm-input { flex: 1; }
.mm-dl-list { display: flex; flex-direction: column; gap: 4px; max-height: 90px; overflow: auto; }
.mm-dl-item { display: flex; flex-direction: column; gap: 2px; }
.mm-dl-top { display: flex; align-items: center; gap: 6px; }
.mm-dl-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-dl-meta { color: var(--descrip-text, #999); font-size: 10px; white-space: nowrap; }
.mm-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden; }
.mm-bar-fill { height: 100%; background: #3b6fd8; transition: width 0.4s linear; }
.mm-bar-fill.mm-indeterminate { width: 30% !important; animation: mm-slide 1.1s linear infinite; }
.mm-bar-fill.mm-done { background: #3fa35c; }
.mm-bar-fill.mm-err { background: #c0453f; }
@keyframes mm-slide { 0% { margin-left: -30%; } 100% { margin-left: 100%; } }
.mm-error { color: #ff7b72; font-size: 11px; }
.mm-modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mm-modal-box { background: var(--comfy-menu-bg, #252525); border: 1px solid var(--border-color, #555); border-radius: 6px; padding: 12px; width: 340px; max-width: 90%; display: flex; flex-direction: column; gap: 8px; }
.mm-modal-actions { display: flex; justify-content: flex-end; gap: 6px; }
.mm-modal-box .mm-select { width: 100%; }
.mm-modal-file { word-break: break-all; color: var(--descrip-text, #aaa); font-size: 11px; }
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

function formatSize(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

function joinPath(base, name) {
    return base ? `${base}/${name}` : name;
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

function postJson(path, body) {
    return apiJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function setupModelManagerWidget(node) {
    const state = {
        currentPath: "",
        expanded: new Set([""]),
        cache: new Map(),
        allFolders: [""],
        uploads: [],
        picked: new Set(),
        pickedFolder: "",
        hasToken: false,
        hasHfToken: false,
        tokenOpen: false,
        listError: "",
        dlError: "",
        downloads: [],
        dlFolder: "",
        modelId: "",
    };

    const root = el("div", "mm-root");

    const header = el("div", "mm-header");
    header.appendChild(el("div", "mm-title", "Model Manager"));
    const tokenBtn = el("button", "mm-btn", "🔑 Tokens");
    const refreshBtn = el("button", "mm-btn", "⟳ Refresh");
    const uploadBtn = el("button", "mm-btn mm-primary", "⬆ Upload here");
    uploadBtn.title = "Upload files from your computer into the open folder (or drag them onto this node)";
    const uploadInput = el("input");
    uploadInput.type = "file";
    uploadInput.multiple = true;
    uploadInput.style.display = "none";
    header.appendChild(uploadBtn);
    header.appendChild(tokenBtn);
    header.appendChild(refreshBtn);
    header.appendChild(uploadInput);
    root.appendChild(header);

    const tokenRow = el("div", "mm-token-panel");
    tokenRow.style.display = "none";
    function tokenField(label) {
        const row = el("div", "mm-token-row");
        const lab = el("span", "mm-token-label", label);
        const input = el("input", "mm-input");
        input.type = "password";
        input.autocomplete = "off";
        const save = el("button", "mm-btn mm-primary", "Save");
        row.appendChild(lab);
        row.appendChild(input);
        row.appendChild(save);
        tokenRow.appendChild(row);
        return { input, save };
    }
    const civitaiToken = tokenField("Civitai");
    const hfToken = tokenField("Hugging Face");
    root.appendChild(tokenRow);

    const main = el("div", "mm-main");
    const treePane = el("div", "mm-pane mm-tree");
    const filesPane = el("div", "mm-pane mm-files");
    const crumb = el("div", "mm-crumb");
    const list = el("div", "mm-list");
    const fileBar = el("div", "mm-filebar");
    const selectAllLabel = el("label", "mm-check");
    const selectAllBox = el("input");
    selectAllBox.type = "checkbox";
    selectAllLabel.appendChild(selectAllBox);
    selectAllLabel.appendChild(el("span", null, "Select all"));
    const zipBtn = el("button", "mm-btn mm-primary", "⬇ Download zip");
    const zipStatus = el("span", "mm-zip-status");
    fileBar.appendChild(selectAllLabel);
    fileBar.appendChild(zipBtn);
    fileBar.appendChild(zipStatus);
    fileBar.style.display = "none";
    filesPane.appendChild(crumb);
    filesPane.appendChild(fileBar);
    filesPane.appendChild(list);
    main.appendChild(treePane);
    main.appendChild(filesPane);
    root.appendChild(main);

    const dlBox = el("div", "mm-download");
    const dlForm = el("div", "mm-dl-form");
    const idInput = el("input", "mm-input");
    idInput.type = "text";
    idInput.placeholder = "Civitai model ID";
    idInput.inputMode = "numeric";
    const folderSelect = el("select", "mm-select");
    const dlBtn = el("button", "mm-btn mm-primary", "⬇ Download");
    dlForm.appendChild(idInput);
    dlForm.appendChild(folderSelect);
    dlForm.appendChild(dlBtn);
    const hfForm = el("div", "mm-hf-form");
    const hfInput = el("input", "mm-input");
    hfInput.type = "text";
    hfInput.placeholder = "Hugging Face file link (https://huggingface.co/.../resolve/main/model.safetensors)";
    const hfBtn = el("button", "mm-btn mm-primary", "⬇ Hugging Face");
    hfForm.appendChild(hfInput);
    hfForm.appendChild(hfBtn);
    const hfTarget = el("div", "mm-hf-target");
    const dlErr = el("div", "mm-error");
    dlErr.style.display = "none";
    const dlList = el("div", "mm-dl-list");
    dlBox.appendChild(dlForm);
    dlBox.appendChild(hfForm);
    dlBox.appendChild(hfTarget);
    dlBox.appendChild(dlErr);
    dlBox.appendChild(dlList);
    root.appendChild(dlBox);

    function showModal(build) {
        const overlay = el("div", "mm-modal-overlay");
        const box = el("div", "mm-modal-box");
        overlay.appendChild(box);
        const close = () => overlay.remove();
        let downTarget = null;
        overlay.addEventListener("mousedown", (ev) => (downTarget = ev.target));
        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay && downTarget === overlay) close();
        });
        build(box, close);
        root.appendChild(overlay);
    }

    function folderLabel(path) {
        return path ? path : "(models root)";
    }

    function folderOptions(select, selected) {
        select.innerHTML = "";
        for (const f of state.allFolders) {
            const opt = document.createElement("option");
            opt.value = f;
            opt.textContent = folderLabel(f);
            if (f === selected) opt.selected = true;
            select.appendChild(opt);
        }
    }

    async function loadDir(path, force) {
        if (!force && state.cache.has(path)) return state.cache.get(path);
        const data = await apiJson(`/model_manager/list?path=${encodeURIComponent(path)}`);
        state.cache.set(path, data);
        return data;
    }

    async function loadFolders() {
        try {
            const data = await apiJson("/model_manager/folders");
            state.allFolders = data.folders;
        } catch (e) {
            console.error("ModelManager: failed to load folders", e);
        }
        if (!state.allFolders.includes(state.dlFolder)) state.dlFolder = "";
        folderOptions(folderSelect, state.dlFolder);
    }

    async function openFolder(path) {
        if (path !== state.currentPath) state.picked.clear();
        state.currentPath = path;
        state.expanded.add(path);
        let p = path;
        while (p.includes("/")) {
            p = p.slice(0, p.lastIndexOf("/"));
            state.expanded.add(p);
        }
        await renderAll();
    }

    async function renderTreeNode(container, path, name, depth) {
        const row = el("div", "mm-tree-row" + (path === state.currentPath ? " mm-active" : ""));
        row.style.paddingLeft = 6 + depth * 12 + "px";
        const open = state.expanded.has(path);
        const caret = el("span", "mm-caret", open ? "▾" : "▸");
        row.appendChild(caret);
        row.appendChild(el("span", "mm-tree-label", "📁 " + name));
        caret.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            if (state.expanded.has(path)) state.expanded.delete(path);
            else state.expanded.add(path);
            await renderTree();
        });
        row.addEventListener("click", () => openFolder(path));
        container.appendChild(row);
        if (open) {
            let data;
            try {
                data = await loadDir(path);
            } catch (e) {
                return;
            }
            for (const f of data.folders) {
                await renderTreeNode(container, joinPath(path, f.name), f.name, depth + 1);
            }
        }
    }

    async function renderTree() {
        const frag = document.createDocumentFragment();
        const holder = el("div");
        frag.appendChild(holder);
        await renderTreeNode(holder, "", "models", 0);
        treePane.innerHTML = "";
        treePane.appendChild(frag);
    }

    async function renderFiles() {
        crumb.textContent = "models" + (state.currentPath ? "/" + state.currentPath : "");
        hfTarget.textContent = "Hugging Face downloads are saved in the open folder: models" + (state.currentPath ? "/" + state.currentPath : "");
        list.innerHTML = "";
        let data;
        try {
            data = await loadDir(state.currentPath, true);
        } catch (e) {
            list.appendChild(el("div", "mm-empty", e.message));
            return;
        }
        if (state.currentPath) {
            const up = el("div", "mm-row mm-folder");
            up.appendChild(el("span", "mm-name", "⬆ .."));
            up.addEventListener("click", () => openFolder(state.currentPath.includes("/") ? state.currentPath.slice(0, state.currentPath.lastIndexOf("/")) : ""));
            list.appendChild(up);
        }
        for (const f of data.folders) {
            const row = el("div", "mm-row mm-folder");
            row.appendChild(el("span", "mm-name", "📁 " + f.name));
            row.addEventListener("click", () => openFolder(joinPath(state.currentPath, f.name)));
            list.appendChild(row);
        }
        const names = new Set(data.files.map((f) => f.name));
        for (const n of [...state.picked]) if (!names.has(n)) state.picked.delete(n);
        for (const f of data.files) {
            const row = el("div", "mm-row");
            const pick = el("input");
            pick.type = "checkbox";
            pick.checked = state.picked.has(f.name);
            pick.addEventListener("change", () => {
                if (pick.checked) state.picked.add(f.name);
                else state.picked.delete(f.name);
                updateFileBar(data);
            });
            row.appendChild(pick);
            const name = el("span", "mm-name", "📄 " + f.name);
            name.title = f.name;
            row.appendChild(name);
            row.appendChild(el("span", "mm-size", formatSize(f.size)));
            const renameBtn = el("button", "mm-btn", "Rename");
            renameBtn.addEventListener("click", () => promptRename(f));
            const moveBtn = el("button", "mm-btn", "Move");
            moveBtn.addEventListener("click", () => promptMove(f));
            const delBtn = el("button", "mm-btn mm-danger", "Delete");
            delBtn.addEventListener("click", () => promptDelete(f));
            row.appendChild(renameBtn);
            row.appendChild(moveBtn);
            row.appendChild(delBtn);
            list.appendChild(row);
        }
        if (!data.folders.length && !data.files.length) {
            list.appendChild(el("div", "mm-empty", "This folder is empty."));
        }
        updateFileBar(data);
    }

    function updateFileBar(data) {
        const total = data.files.length;
        fileBar.style.display = total ? "" : "none";
        const count = state.picked.size;
        selectAllBox.checked = total > 0 && count === total;
        selectAllBox.indeterminate = count > 0 && count < total;
        zipBtn.disabled = count === 0;
        zipBtn.textContent = count ? `⬇ Download zip (${count})` : "⬇ Download zip";
        for (const box of list.querySelectorAll("input[type=checkbox]")) {
            const row = box.closest(".mm-row");
            const fileName = row && row.querySelector(".mm-name") ? row.querySelector(".mm-name").title : "";
            if (fileName) box.checked = state.picked.has(fileName);
        }
        pendingBar = data;
    }
    let pendingBar = null;
    let zipStatusTimer = null;
    function setZipStatus(text) {
        zipStatus.textContent = text;
        clearTimeout(zipStatusTimer);
        if (text) zipStatusTimer = setTimeout(() => (zipStatus.textContent = ""), 8000);
    }
    selectAllBox.addEventListener("change", () => {
        if (!pendingBar) return;
        state.picked.clear();
        if (selectAllBox.checked) for (const f of pendingBar.files) state.picked.add(f.name);
        updateFileBar(pendingBar);
    });
    zipBtn.addEventListener("click", async () => {
        if (!state.picked.size) return;
        zipBtn.disabled = true;
        setZipStatus("Preparing the zip...");
        try {
            const paths = [...state.picked].map((n) => joinPath(state.currentPath, n));
            const job = await postJson("/model_manager/zip-job", { paths });
            const a = document.createElement("a");
            a.href = api.apiURL(`/model_manager/zip/${job.token}`);
            a.download = job.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setZipStatus(`Download started: ${job.name} (${job.count} file${job.count === 1 ? "" : "s"}, ${formatSize(job.size)}). Check your browser's downloads.`);
        } catch (e) {
            setZipStatus(e.message);
        }
        if (pendingBar) updateFileBar(pendingBar);
    });

    async function renderAll() {
        await Promise.all([renderTree(), renderFiles()]);
    }

    function promptDelete(file) {
        const path = joinPath(state.currentPath, file.name);
        showModal((box, close) => {
            box.appendChild(el("div", null, "Delete this file permanently?"));
            box.appendChild(el("div", "mm-modal-file", `${path} (${formatSize(file.size)})`));
            const err = el("div", "mm-error");
            const actions = el("div", "mm-modal-actions");
            const cancel = el("button", "mm-btn", "Cancel");
            cancel.addEventListener("click", close);
            const ok = el("button", "mm-btn mm-primary", "Delete");
            ok.addEventListener("click", async () => {
                ok.disabled = true;
                try {
                    await postJson("/model_manager/delete", { path });
                    close();
                    await renderAll();
                } catch (e) {
                    err.textContent = e.message;
                    ok.disabled = false;
                }
            });
            actions.appendChild(cancel);
            actions.appendChild(ok);
            box.appendChild(err);
            box.appendChild(actions);
        });
    }

    function promptRename(file) {
        const path = joinPath(state.currentPath, file.name);
        showModal((box, close) => {
            box.appendChild(el("div", null, "Rename file:"));
            box.appendChild(el("div", "mm-modal-file", path));
            const input = el("input", "mm-input");
            input.type = "text";
            input.value = file.name;
            input.style.width = "100%";
            box.appendChild(input);
            const err = el("div", "mm-error");
            const actions = el("div", "mm-modal-actions");
            const cancel = el("button", "mm-btn", "Cancel");
            cancel.addEventListener("click", close);
            const ok = el("button", "mm-btn mm-primary", "Rename");
            const submit = async () => {
                const name = input.value.trim();
                if (!name || name === file.name) {
                    err.textContent = name ? "That is already the file name." : "Enter a file name.";
                    return;
                }
                ok.disabled = true;
                try {
                    await postJson("/model_manager/rename", { path, name });
                    close();
                    await renderAll();
                } catch (e) {
                    err.textContent = e.message;
                    ok.disabled = false;
                }
            };
            ok.addEventListener("click", submit);
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    submit();
                } else if (ev.key === "Escape") {
                    close();
                }
            });
            actions.appendChild(cancel);
            actions.appendChild(ok);
            box.appendChild(err);
            box.appendChild(actions);
            setTimeout(() => {
                input.focus();
                const dot = file.name.lastIndexOf(".");
                input.setSelectionRange(0, dot > 0 ? dot : file.name.length);
            }, 0);
        });
    }

    function promptMove(file) {
        const path = joinPath(state.currentPath, file.name);
        showModal((box, close) => {
            box.appendChild(el("div", null, "Move to folder:"));
            box.appendChild(el("div", "mm-modal-file", path));
            const select = el("select", "mm-select");
            folderOptions(select, state.currentPath);
            box.appendChild(select);
            const err = el("div", "mm-error");
            const actions = el("div", "mm-modal-actions");
            const cancel = el("button", "mm-btn", "Cancel");
            cancel.addEventListener("click", close);
            const ok = el("button", "mm-btn mm-primary", "Move");
            ok.addEventListener("click", async () => {
                if (select.value === state.currentPath) {
                    err.textContent = "Choose a different folder.";
                    return;
                }
                ok.disabled = true;
                try {
                    await postJson("/model_manager/move", { path, dest: select.value });
                    state.cache.delete(select.value);
                    close();
                    await renderAll();
                } catch (e) {
                    err.textContent = e.message;
                    ok.disabled = false;
                }
            });
            actions.appendChild(cancel);
            actions.appendChild(ok);
            box.appendChild(err);
            box.appendChild(actions);
        });
    }

    function renderDownloads() {
        dlList.innerHTML = "";
        const items = [...state.uploads, ...state.downloads];
        for (const d of items) {
            const item = el("div", "mm-dl-item");
            const top = el("div", "mm-dl-top");
            const name = el("span", "mm-dl-name", (d.source === "huggingface" ? "🤗 " : d.source === "upload" ? "⬆ " : "") + (d.filename || `Model ${d.model_id}`));
            name.title = `-> models/${d.folder}`;
            top.appendChild(name);
            const active = d.status === "starting" || d.status === "downloading";
            let meta;
            if (d.status === "starting") meta = "Starting...";
            else if (d.status === "downloading") {
                meta = d.total
                    ? `${formatSize(d.downloaded)} / ${formatSize(d.total)} (${Math.floor((d.downloaded / d.total) * 100)}%) · ${formatSize(d.speed)}/s`
                    : `${formatSize(d.downloaded)} · ${formatSize(d.speed)}/s`;
            } else if (d.status === "done") meta = `Done · ${formatSize(d.downloaded)}`;
            else if (d.status === "cancelled") meta = "Cancelled";
            else meta = d.error || "Failed";
            const metaEl = el("span", d.status === "error" ? "mm-error" : "mm-dl-meta", meta);
            top.appendChild(metaEl);
            if (active) {
                const cancel = el("button", "mm-btn", "Cancel");
                cancel.addEventListener("click", () => {
                    if (d.source === "upload") d._xhr.abort();
                    else postJson("/model_manager/download/cancel", { id: d.id }).then(pollDownloads);
                });
                top.appendChild(cancel);
            }
            item.appendChild(top);
            const bar = el("div", "mm-bar");
            const fill = el("div", "mm-bar-fill");
            if (d.status === "done") {
                fill.classList.add("mm-done");
                fill.style.width = "100%";
            } else if (d.status === "error" || d.status === "cancelled") {
                fill.classList.add("mm-err");
                fill.style.width = d.total ? Math.floor((d.downloaded / d.total) * 100) + "%" : "0%";
            } else if (d.total) {
                fill.style.width = Math.floor((d.downloaded / d.total) * 100) + "%";
            } else {
                fill.classList.add("mm-indeterminate");
            }
            bar.appendChild(fill);
            item.appendChild(bar);
            dlList.appendChild(item);
        }
        if (items.some((d) => d.status === "done" || d.status === "error" || d.status === "cancelled")) {
            const clear = el("button", "mm-btn", "Clear finished");
            clear.style.alignSelf = "flex-start";
            clear.addEventListener("click", async () => {
                state.uploads = state.uploads.filter((u) => u.status === "downloading");
                await postJson("/model_manager/download/clear", {});
                await pollDownloads();
            });
            dlList.appendChild(clear);
        }
    }

    let pollTimer = null;
    let knownDone = new Set();
    async function pollDownloads() {
        try {
            const data = await apiJson("/model_manager/downloads");
            state.downloads = data.downloads;
        } catch (e) {
            return;
        }
        let refresh = false;
        for (const d of state.downloads) {
            if (d.status === "done" && !knownDone.has(d.id)) {
                knownDone.add(d.id);
                refresh = true;
            }
        }
        renderDownloads();
        if (refresh) {
            state.cache.clear();
            await loadFolders();
            await renderAll();
        }
        const active = state.downloads.some((d) => d.status === "starting" || d.status === "downloading");
        if (active && !pollTimer) pollTimer = setInterval(pollDownloads, 1000);
        else if (!active && pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    dlBtn.addEventListener("click", async () => {
        dlErr.style.display = "none";
        const modelId = idInput.value.trim();
        if (!modelId) {
            dlErr.textContent = "Enter a Civitai model ID.";
            dlErr.style.display = "";
            return;
        }
        dlBtn.disabled = true;
        try {
            await postJson("/model_manager/download", { model_id: modelId, folder: folderSelect.value });
            state.dlFolder = folderSelect.value;
            idInput.value = "";
            await pollDownloads();
        } catch (e) {
            dlErr.textContent = e.message;
            dlErr.style.display = "";
        }
        dlBtn.disabled = false;
    });
    idInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") dlBtn.click();
    });

    let renderTimer = null;
    function scheduleDownloadsRender() {
        if (renderTimer) return;
        renderTimer = setTimeout(() => {
            renderTimer = null;
            renderDownloads();
        }, 250);
    }

    function uploadOne(file, folder) {
        const item = {
            id: "up" + Math.random().toString(16).slice(2),
            source: "upload",
            filename: file.name,
            folder,
            status: "downloading",
            downloaded: 0,
            total: file.size,
            speed: 0,
            error: "",
            _xhr: null,
        };
        state.uploads.unshift(item);
        renderDownloads();
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            item._xhr = xhr;
            const started = performance.now();
            const finish = (status, error) => {
                item.status = status;
                item.error = error || "";
                if (status === "done") item.downloaded = file.size;
                renderDownloads();
                resolve();
            };
            xhr.open("POST", api.apiURL("/model_manager/upload"));
            if (api.user) xhr.setRequestHeader("Comfy-User", api.user);
            xhr.upload.onprogress = (ev) => {
                item.downloaded = Math.min(ev.loaded, file.size);
                item.speed = ev.loaded / Math.max((performance.now() - started) / 1000, 0.001);
                scheduleDownloadsRender();
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) return finish("done");
                let message = `Upload failed (${xhr.status})`;
                try {
                    message = JSON.parse(xhr.responseText).error || message;
                } catch (e) {
                    // keep the generic message
                }
                finish("error", message);
            };
            xhr.onerror = () => finish("error", "Network error during upload");
            xhr.onabort = () => finish("cancelled");
            const form = new FormData();
            form.append("dir", folder);
            form.append("file", file, file.name);
            xhr.send(form);
        });
    }

    async function uploadFiles(fileList) {
        const files = [...fileList].filter((f) => f.size >= 0 && f.name);
        if (!files.length) return;
        const folder = state.currentPath;
        let existing = new Set();
        try {
            existing = new Set((await loadDir(folder, true)).files.map((f) => f.name));
        } catch (e) {
            existing = new Set();
        }
        for (const file of files) {
            if (existing.has(file.name)) {
                state.uploads.unshift({
                    id: "up" + Math.random().toString(16).slice(2),
                    source: "upload",
                    filename: file.name,
                    folder,
                    status: "error",
                    downloaded: 0,
                    total: file.size,
                    speed: 0,
                    error: `${file.name} already exists in that folder`,
                    _xhr: null,
                });
                renderDownloads();
                continue;
            }
            await uploadOne(file, folder);
            state.cache.delete(folder);
            if (state.currentPath === folder) await renderAll();
        }
    }

    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", () => {
        const files = [...uploadInput.files];
        uploadInput.value = "";
        if (files.length) uploadFiles(files);
    });
    const hasFiles = (ev) => ev.dataTransfer && [...ev.dataTransfer.types].includes("Files");
    let dragDepth = 0;
    root.addEventListener("dragenter", (ev) => {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragDepth++;
        root.classList.add("mm-dragging");
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
        if (!dragDepth) root.classList.remove("mm-dragging");
    });
    root.addEventListener("drop", (ev) => {
        if (!hasFiles(ev)) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragDepth = 0;
        root.classList.remove("mm-dragging");
        uploadFiles(ev.dataTransfer.files);
    });

    hfBtn.addEventListener("click", async () => {
        dlErr.style.display = "none";
        const url = hfInput.value.trim();
        if (!url) {
            dlErr.textContent = "Paste a Hugging Face file link.";
            dlErr.style.display = "";
            return;
        }
        hfBtn.disabled = true;
        try {
            await postJson("/model_manager/download-hf", { url, folder: state.currentPath });
            hfInput.value = "";
            await pollDownloads();
        } catch (e) {
            dlErr.textContent = e.message;
            dlErr.style.display = "";
        }
        hfBtn.disabled = false;
    });
    hfInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") hfBtn.click();
    });

    async function saveToken(field, key, stateKey) {
        const value = field.input.value.trim();
        if (!value) return;
        try {
            const data = await postJson("/model_manager/settings", { [key]: value });
            state.hasToken = data.has_token;
            state.hasHfToken = data.has_hf_token;
            field.input.value = "";
            updateTokenUi();
        } catch (e) {
            dlErr.textContent = e.message;
            dlErr.style.display = "";
        }
    }
    civitaiToken.save.addEventListener("click", () => saveToken(civitaiToken, "civitai_token"));
    hfToken.save.addEventListener("click", () => saveToken(hfToken, "hf_token"));

    function updateTokenUi() {
        tokenBtn.textContent = "🔑 Tokens" + (state.hasToken || state.hasHfToken ? " ✓" : "");
        civitaiToken.input.placeholder = state.hasToken ? "Token saved — paste a new one to replace it" : "Paste your Civitai API token";
        hfToken.input.placeholder = state.hasHfToken ? "Token saved — paste a new one to replace it" : "Paste your Hugging Face token (hf_...)";
    }
    tokenBtn.addEventListener("click", () => {
        state.tokenOpen = !state.tokenOpen;
        tokenRow.style.display = state.tokenOpen ? "" : "none";
    });

    refreshBtn.addEventListener("click", async () => {
        state.cache.clear();
        await loadFolders();
        await renderAll();
        await pollDownloads();
    });

    node.addDOMWidget("model_manager_ui", "model_manager", root, {
        getMinHeight: () => 500,
        hideOnZoom: false,
    });
    if (node.size[0] < 820) node.size[0] = 820;
    if (node.size[1] < 580) node.size[1] = 580;

    updateTokenUi();
    (async () => {
        try {
            const s = await apiJson("/model_manager/settings");
            state.hasToken = s.has_token;
            state.hasHfToken = s.has_hf_token;
            updateTokenUi();
        } catch (e) {
            console.error("ModelManager: failed to load settings", e);
        }
        await loadFolders();
        await renderAll();
        await pollDownloads();
    })();
}

app.registerExtension({
    name: "PromptManager.ModelManager",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            injectStyles();
            setupModelManagerWidget(this);
            return result;
        };
    },
});
