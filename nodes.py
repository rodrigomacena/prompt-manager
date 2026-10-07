import random

from . import storage

MODE_FIXED = "fixed"
MODE_RANDOM = "random"
MODE_SEQUENTIAL = "sequential"


class PromptManagerNode:
    CATEGORY = "utils/prompt"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "run"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "mode": ([MODE_FIXED, MODE_RANDOM, MODE_SEQUENTIAL], {"default": MODE_FIXED}),
                "group_id": ("STRING", {"default": "", "multiline": False}),
                "prompt_id": ("STRING", {"default": "", "multiline": False}),
                "prompt_text": ("STRING", {"default": "", "multiline": True}),
                "prefix": ("STRING", {"default": "", "multiline": True}),
            },
        }

    def run(self, mode, group_id, prompt_id, prompt_text, prefix):
        db = storage.load_db()
        group = storage.get_group(db, group_id) if group_id else None

        if mode == MODE_RANDOM:
            text = random.choice(group["prompts"])["text"] if group and group["prompts"] else prompt_text
        elif mode == MODE_SEQUENTIAL:
            nxt = storage.get_next_sequential(group_id) if group and group["prompts"] else None
            text = nxt["text"] if nxt else prompt_text
        else:
            text = prompt_text

        return (_combine(prefix, text),)

    @classmethod
    def IS_CHANGED(cls, mode, group_id, prompt_id, prompt_text, prefix):
        if mode in (MODE_RANDOM, MODE_SEQUENTIAL):
            return float("nan")
        return f"{group_id}:{prompt_id}:{prompt_text}:{prefix}"


def _combine(prefix, text):
    prefix = (prefix or "").strip()
    text = text or ""
    if not prefix:
        return text
    if not text:
        return prefix
    return f"{prefix}\n\n{text}"


class ModelManagerNode:
    """UI-only node: the explorer/downloader lives entirely in the frontend."""

    CATEGORY = "utils/models"
    RETURN_TYPES = ()
    FUNCTION = "run"
    OUTPUT_NODE = False

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    def run(self):
        return ()


NODE_CLASS_MAPPINGS = {
    "PromptManager": PromptManagerNode,
    "ModelManager": ModelManagerNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptManager": "Prompt Manager",
    "ModelManager": "Model Manager",
}
