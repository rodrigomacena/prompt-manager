import os
import random

from . import storage
from .input_manager import InputManagerError, load_image_tensor, load_painted_mask, mask_path, resolve_image

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


class InputManagerNode:
    CATEGORY = "utils/image"
    RETURN_TYPES = ("IMAGE", "MASK", "STRING", "INT", "INT", "IMAGE")
    RETURN_NAMES = ("image", "mask", "filename", "width", "height", "cropped_image")
    FUNCTION = "run"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "directory": ("STRING", {"default": "input", "multiline": False}),
                "image": ("STRING", {"default": "", "multiline": False}),
                "mask_id": ("STRING", {"default": "", "multiline": False}),
                "keep_id": ("STRING", {"default": "", "multiline": False}),
            },
        }

    def run(self, directory, image, mask_id="", keep_id=""):
        import torch

        path = resolve_image(image)
        tensor, mask = load_image_tensor(path)
        width, height = int(tensor.shape[2]), int(tensor.shape[1])
        original_alpha = 1.0 - mask
        if mask_id:
            painted = load_painted_mask(mask_id, width, height)
            if painted is not None:
                mask = painted
        alpha = original_alpha
        if keep_id:
            keep = load_painted_mask(keep_id, width, height)
            if keep is not None:
                alpha = original_alpha * keep
        cropped = torch.cat([tensor, alpha.unsqueeze(-1)], dim=-1)
        return (tensor, mask, os.path.basename(path), width, height, cropped)

    @classmethod
    def IS_CHANGED(cls, directory, image, mask_id="", keep_id=""):
        try:
            path = resolve_image(image)
            st = os.stat(path)
            key = f"{image}:{st.st_mtime_ns}:{st.st_size}"
            for extra in (mask_id, keep_id):
                if extra:
                    mst = os.stat(mask_path(extra))
                    key += f":{extra}:{mst.st_mtime_ns}:{mst.st_size}"
            return key
        except (InputManagerError, OSError):
            return image

    @classmethod
    def VALIDATE_INPUTS(cls, directory, image, mask_id="", keep_id=""):
        if not image:
            return "Pick an image in the Input Manager gallery first"
        try:
            resolve_image(image)
        except InputManagerError as e:
            return str(e)
        return True


NODE_CLASS_MAPPINGS = {
    "PromptManager": PromptManagerNode,
    "ModelManager": ModelManagerNode,
    "InputManager": InputManagerNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptManager": "Prompt Manager",
    "ModelManager": "Model Manager",
    "InputManager": "Input Manager",
}
