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
            },
        }

    def run(self, mode, group_id, prompt_id, prompt_text):
        db = storage.load_db()
        group = storage.get_group(db, group_id) if group_id else None

        if mode == MODE_RANDOM:
            if group and group["prompts"]:
                return (random.choice(group["prompts"])["text"],)
            return (prompt_text,)

        if mode == MODE_SEQUENTIAL:
            if group and group["prompts"]:
                nxt = storage.get_next_sequential(group_id)
                if nxt:
                    return (nxt["text"],)
            return (prompt_text,)

        return (prompt_text,)

    @classmethod
    def IS_CHANGED(cls, mode, group_id, prompt_id, prompt_text):
        if mode in (MODE_RANDOM, MODE_SEQUENTIAL):
            return float("nan")
        return f"{group_id}:{prompt_id}:{prompt_text}"


NODE_CLASS_MAPPINGS = {
    "PromptManager": PromptManagerNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptManager": "Prompt Manager",
}
