import os
import random

from . import storage
from .image_monitor import push_images
from .outfit_builder import MODES, PRONOUNS, SEPARATORS, build_outfit, combine
from .pose_builder import build_pose
from .input_manager import (
    InputManagerError,
    load_image_tensor,
    load_painted_mask,
    mask_path,
    parse_image_list,
    pil_to_tensors,
    resolve_image,
    stitch_images,
)

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
            "optional": {
                "outfit_selection": ("STRING", {"default": "[]", "multiline": False}),
                "outfit_mode": (MODES, {"default": "fixed"}),
                "outfit_pronoun": (PRONOUNS, {"default": "She"}),
                "outfit_lead": ("STRING", {"default": "", "multiline": False}),
                "outfit_separator": (SEPARATORS, {"default": "space"}),
                "pose_selection": ("STRING", {"default": "[]", "multiline": False}),
                "pose_mode": (MODES, {"default": "fixed"}),
                "pose_pronoun": (PRONOUNS, {"default": "She"}),
                "pose_lead": ("STRING", {"default": "", "multiline": False}),
                "pose_separator": (SEPARATORS, {"default": "space"}),
            },
        }

    def run(
        self,
        mode,
        group_id,
        prompt_id,
        prompt_text,
        prefix,
        outfit_selection="[]",
        outfit_mode="fixed",
        outfit_pronoun="She",
        outfit_lead="",
        outfit_separator="space",
        pose_selection="[]",
        pose_mode="fixed",
        pose_pronoun="She",
        pose_lead="",
        pose_separator="space",
    ):
        db = storage.load_db()
        group = storage.get_group(db, group_id) if group_id else None

        if mode == MODE_RANDOM:
            text = random.choice(group["prompts"])["text"] if group and group["prompts"] else prompt_text
        elif mode == MODE_SEQUENTIAL:
            nxt = storage.get_next_sequential(group_id) if group and group["prompts"] else None
            text = nxt["text"] if nxt else prompt_text
        else:
            text = prompt_text

        combined = _combine(prefix, text)
        # nothing picked in the outfit / pose columns: the prompt is left exactly as it was
        outfit = build_outfit(outfit_selection, outfit_mode, outfit_pronoun, outfit_lead)
        if outfit:
            combined = combine(combined, outfit, outfit_separator)
        pose = build_pose(pose_selection, pose_mode, pose_pronoun, pose_lead)
        if pose:
            combined = combine(combined, pose, pose_separator)
        return (combined,)

    @classmethod
    def IS_CHANGED(
        cls,
        mode,
        group_id,
        prompt_id,
        prompt_text,
        prefix,
        outfit_selection="[]",
        outfit_mode="fixed",
        outfit_pronoun="She",
        outfit_lead="",
        outfit_separator="space",
        pose_selection="[]",
        pose_mode="fixed",
        pose_pronoun="She",
        pose_lead="",
        pose_separator="space",
    ):
        if mode in (MODE_RANDOM, MODE_SEQUENTIAL):
            return float("nan")
        if outfit_mode == "random" and outfit_selection not in ("", "[]"):
            return float("nan")
        if pose_mode == "random" and pose_selection not in ("", "[]"):
            return float("nan")
        return (
            f"{group_id}:{prompt_id}:{prompt_text}:{prefix}:{outfit_selection}:{outfit_pronoun}:{outfit_lead}:{outfit_separator}"
            f":{pose_selection}:{pose_pronoun}:{pose_lead}:{pose_separator}"
        )


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
                "images": ("STRING", {"default": "[]", "multiline": False}),
                "layout": (["horizontal", "vertical"], {"default": "horizontal"}),
            },
        }

    def run(self, directory, image, mask_id="", keep_id="", images="[]", layout="horizontal"):
        import torch

        joined = parse_image_list(images)
        if len(joined) >= 2:
            paths = [resolve_image(r) for r in joined]
            tensor, mask = pil_to_tensors(stitch_images(paths, layout))
            width, height = int(tensor.shape[2]), int(tensor.shape[1])
            cropped = torch.cat([tensor, (1.0 - mask).unsqueeze(-1)], dim=-1)
            return (tensor, mask, "+".join(os.path.basename(p) for p in paths), width, height, cropped)

        path = resolve_image(image)
        tensor, mask = load_image_tensor(path)
        width, height = int(tensor.shape[2]), int(tensor.shape[1])
        original_alpha = 1.0 - mask
        if mask_id:
            painted = load_painted_mask(mask_id, width, height)
            if painted is not None:
                mask = painted
        alpha = original_alpha
        rgb = tensor
        if keep_id:
            keep = load_painted_mask(keep_id, width, height)
            if keep is not None:
                alpha = original_alpha * keep
                # Also blank the RGB outside the kept area, so nodes that drop the alpha channel still lose it.
                rgb = tensor * (alpha > 0).to(tensor.dtype).unsqueeze(-1)
        cropped = torch.cat([rgb, alpha.unsqueeze(-1)], dim=-1)
        return (tensor, mask, os.path.basename(path), width, height, cropped)

    @classmethod
    def IS_CHANGED(cls, directory, image, mask_id="", keep_id="", images="[]", layout="horizontal"):
        try:
            joined = parse_image_list(images)
            if len(joined) >= 2:
                key = layout
                for rel in joined:
                    st = os.stat(resolve_image(rel))
                    key += f":{rel}:{st.st_mtime_ns}:{st.st_size}"
                return key
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
    def VALIDATE_INPUTS(cls, directory, image, mask_id="", keep_id="", images="[]", layout="horizontal"):
        if not image:
            return "Pick an image in the Input Manager gallery first"
        try:
            for rel in parse_image_list(images):
                resolve_image(rel)
            resolve_image(image)
        except InputManagerError as e:
            return str(e)
        return True


class ImageMonitorNode:
    CATEGORY = "utils/image"
    RETURN_TYPES = ()
    FUNCTION = "send"
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "channel": ("STRING", {"default": "main", "multiline": False}),
                "max_side": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 64}),
                "keep": ("INT", {"default": 50, "min": 1, "max": 500}),
                "password": ("STRING", {"default": "", "multiline": False}),
            },
        }

    def send(self, images, channel="main", max_side=0, keep=50, password=""):
        push_images(channel, images, max_side, keep, password)
        return ()

    @classmethod
    def IS_CHANGED(cls, images, channel="main", max_side=0, keep=50, password=""):
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "PromptManager": PromptManagerNode,
    "ModelManager": ModelManagerNode,
    "InputManager": InputManagerNode,
    "ImageMonitor": ImageMonitorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PromptManager": "Prompt Manager",
    "ModelManager": "Model Manager",
    "InputManager": "Input Manager",
    "ImageMonitor": "Image Monitor",
}
