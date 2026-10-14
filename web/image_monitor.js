import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "ImageMonitor";

function channelOf(node) {
    const widget = node.widgets && node.widgets.find((w) => w.name === "channel");
    const raw = widget && widget.value ? String(widget.value).trim() : "main";
    return /^[A-Za-z0-9_-]{1,40}$/.test(raw) ? raw : "main";
}

function viewerUrl(node) {
    const widget = node.widgets && node.widgets.find((w) => w.name === "channel");
    const raw = widget && widget.value ? String(widget.value).trim() : "main";
    const channel = /^[A-Za-z0-9_-]{1,40}$/.test(raw) ? raw : "main";
    return api.apiURL(`/image_monitor/viewer?channel=${encodeURIComponent(channel)}`);
}

app.registerExtension({
    name: "PromptManager.ImageMonitor",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
            this.addWidget(
                "button",
                "🖥 Open monitor window",
                null,
                () => window.open(viewerUrl(this), `image-monitor-${this.id}`),
                { serialize: false }
            );
            const applyButton = this.addWidget(
                "button",
                "🔒 Apply password now",
                null,
                async () => {
                    const pw = this.widgets.find((w) => w.name === "password");
                    const password = pw && pw.value ? String(pw.value) : "";
                    try {
                        const res = await api.fetchApi("/image_monitor/password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ channel: channelOf(this), password }),
                        });
                        const data = await res.json();
                        applyButton.name = data.protected ? "🔒 Password active ✓" : "🔓 No password (open)";
                    } catch (e) {
                        applyButton.name = "⚠ Could not apply";
                    }
                    this.setDirtyCanvas(true, true);
                    setTimeout(() => {
                        applyButton.name = "🔒 Apply password now";
                        this.setDirtyCanvas(true, true);
                    }, 2500);
                },
                { serialize: false }
            );
            return result;
        };
    },
});
