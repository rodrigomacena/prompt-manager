# Prompt Manager

Custom node for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) to save your favorite prompts organized into groups, browse them visually in a grid, rate them with stars, optionally enrich them with AI, and reuse them as a text output in your workflow.

## Features

- **Prompt groups**: organize prompts into named groups (e.g. "Portrait", "Landscape").
- **Visual grid**: a group's prompts show up as cards in a grid, ranked by star rating, with an editable "Prompt" panel on the right.
- **Freeform Prompt field**: the right-hand "Prompt" box is fully editable — pick a saved prompt to load it there, or just type any text directly and run the node, with or without a group/prompt selected. Edits show a "Not saved yet" badge and, when a saved prompt is selected, a "Replace saved prompt" button to persist them. A "Save prompt" button above the AI box opens a dialog showing the text and asking only for a title, then saves it as a new prompt in the active group.
- **Star rating (1–5)**: click the stars on a card to rate it.
- **Add / edit / delete prompts**: a "+" card adds a prompt with an optional title (shown on the card above a shorter text snippet) plus the full text; double-clicking a card opens the full prompt with Edit and Delete actions. Groups can be renamed or deleted too.
- **Output mode**: choose between `Fixed` (the manually selected prompt), `Random` (picks a prompt from the group on every run) or `Sequential` (cycles through the group's prompts in order, one per run).
- **Prefix**: a text box always prepended to the node's output, separated from the prompt by a blank line (`prefix\n\nprompt`).
- **AI enrichment (OpenRouter)**: two modes. "Enrich selected" sends the selected prompt to any OpenRouter model to expand it, with an optional custom instruction (e.g. "expand into 2 paragraphs, add more environment detail"). "Ask for a prompt" ignores any selection and writes a brand new prompt from a description you type. Either way, the result previews with the choice to discard it, use it as an unsaved preview, or save it as a new prompt in the active group.
- **Image to prompt**: upload or paste an image (never saved to disk, only sent to the AI) and convert it into a prompt with the Image Recognition model set in the gear menu, with its own optional instructions (e.g. "describe only the scenery"). Once you have a result, a "Save prompt" button adds it straight into the active group and a "Replace Prompt with this text" button puts it into the Prompt field (unsaved). A "Clear image & text" button resets the process.
- **Backup & restore**: a gear icon next to the group controls backs up or restores every group at once as a `.json` file, and holds the OpenRouter API key and both model choices (Enrichment model, Image Recognition model), saved together with one button.

## Installation

1. Copy (or clone) this folder into `ComfyUI/custom_nodes/`:

   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/rodrigomacena/prompt-manager.git
   ```

2. Restart ComfyUI.
3. The node appears in the menu as **Prompt Manager** (category `utils/prompt`).

No extra Python dependencies beyond what ComfyUI already ships (`aiohttp`).

## Storage

Groups and prompts are saved to `user/default/PromptManager/prompt_manager_db.json` inside ComfyUI's data directory (via `folder_paths.get_user_directory()`), so they persist across node updates. The OpenRouter API key is stored there too, locally, and is never echoed back by the settings endpoint. A full backup is a standalone `.json` file:

```json
{
  "groups": [
    {
      "name": "Portrait",
      "prompts": [
        { "text": "closeup portrait, soft light...", "rating": 5 }
      ]
    }
  ]
}
```

## Output

The node has a single `STRING` output with the prompt text produced by the selected mode (with the prefix prepended, if set).

## AI enrichment

Set an OpenRouter API key and pick a model from the gear menu (the full OpenRouter model catalog is fetched live). With a prompt selected, "Enrich with AI" sends it — plus any optional instructions you type — to that model and shows the result. "Use this text" only updates the preview (nothing is saved yet); "Replace saved prompt" persists it to the stored prompt.

## Testing status

Manually tested against a real ComfyUI Desktop instance (node loads without errors). Verified flows: create/rename/delete group, add/rate/edit/delete prompt, prompt selection, switching between Fixed/Random/Sequential modes (synced to the hidden widgets Python reads), prefix, full-group backup/restore (with and without overwrite), AI enrichment end-to-end against the real OpenRouter API, and image-to-prompt (upload, convert, replace Prompt) against a real vision model.

## License

MIT — see [LICENSE](LICENSE).
