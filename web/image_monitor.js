import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "ImageMonitor";

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
            return result;
        };
    },
});
