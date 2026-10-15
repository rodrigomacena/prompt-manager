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
- **Prefix Presets**: the **📑 Prefix Presets** button next to the Prefix label opens a simple list of saved prefix titles. Click a title to put its text in the Prefix box; hover a row for ✎ (edit) and ✕ (delete, with confirmation). **＋ New prefix** asks for a title and the prompt text (both required; the prompt starts filled with what is currently in the Prefix box). Presets are separate from the prompt groups, saved on the server and included in the backup/restore file.
- **AI enrichment (OpenRouter)**: two modes. "Enrich selected" sends the selected prompt to any OpenRouter model to expand it, with an optional custom instruction (e.g. "expand into 2 paragraphs, add more environment detail"). "Ask for a prompt" ignores any selection and writes a brand new prompt from a description you type. Either way, the result previews with the choice to discard it, use it as an unsaved preview, or save it as a new prompt in the active group.
- **Image to prompt**: upload or paste an image (never saved to disk, only sent to the AI; browsers only allow the Paste button on `https` or `localhost`, so on a plain `http` server hover over the node and press Ctrl+V instead) and convert it into a prompt with the Image Recognition model set in the gear menu, with its own optional instructions (e.g. "describe only the scenery"). Once you have a result, a "Save prompt" button adds it straight into the active group and a "Replace Prompt with this text" button puts it into the Prompt field (unsaved). A "Clear image & text" button resets the process.
- **Backup & restore**: a gear icon next to the group controls backs up or restores every group at once as a `.json` file, and holds the OpenRouter API key and both model choices (Enrichment model, Image Recognition model), saved together with one button.

## Model Manager node

A second node in this package, **Model Manager** (category `utils/models`), manages the files under ComfyUI's `models` folder. It has no inputs or outputs; it is just a panel on the canvas:

- **Explorer**: a folder tree on the left and the selected folder's subfolders and files (with sizes) on the right. It opens inside the `loras` folder by default (the models root if there is none).
- **Favorite folders**: press the ☆ next to the path above the file list to pin the open folder; pinned folders appear in a **Favorites** section at the top of the left menu, one click away from any depth (hover one and press ✕ to unpin). They are saved on the server (in the Prompt Manager settings file), so they follow you across browsers and workflows; a favorite whose folder no longer exists is hidden.
- **Scan workflow**: the **🔍 Scan workflow** button lists every model file the open workflow uses (loader nodes, including ones inside subgraphs, found by their file-name widgets such as `.safetensors`, `.ckpt`, `.gguf`...) with a check for each: **✓** installed in the models folder, **!** a file with that name exists but at a different path, **✗** not found. Each row shows the node that uses it and has a **Copy name** button; **Copy missing names** copies all the ✗ names at once. Muted/bypassed nodes are labelled, and nothing is downloaded: it only reports.
- **Rename / Move / Delete**: each file has a Rename button (type the new name; the extension is kept out of the initial selection), a Move button (pick a destination folder) and a Delete button (asks for confirmation). Everything is confined to the models folder, and renaming or moving never overwrites an existing file.
- **Upload from your computer**: the ⬆ Upload here button (or dragging files onto the node) sends files straight into the folder currently open in the explorer. Large files are streamed to disk with a progress bar, speed and a Cancel button; an unfinished upload leaves nothing behind. Existing files are never overwritten, and scripts/executables (`.py`, `.sh`, `.bat`, `.exe`, `.dll`...) are refused.
- **Download to your computer**: tick the files you want in the open folder (or **Select all**) and click **⬇ Download zip**. The server streams a zip of them straight to your browser (stored, not recompressed, so even multi-GB models start immediately and use no extra disk space or memory); the browser's download manager shows the progress. One file gives `<name>.zip`, several give `<folder>_<n>_files.zip`.
- **Civitai downloader**: enter a Civitai model *version* ID (the number in `civitai.com/api/download/models/<id>`), click **CivitAI Download**; the file is saved in the folder currently open in the explorer (shown under the fields), exactly like Hugging Face downloads. The file name comes from Civitai's `Content-Disposition` header (like `wget --content-disposition`). A progress bar shows downloaded size, percentage and speed, with a Cancel button; partial files are removed on cancel or failure.
- **Hugging Face downloader**: paste a link to a file (`.../resolve/main/<file>` or the `.../blob/main/<file>` page link, public or gated) and click **HF Download**; the file is saved in the folder currently open in the explorer, which is shown under the field. Only `huggingface.co` links are accepted, and the same progress bar and Cancel button are used.
- **Tokens**: the 🔑 Tokens button stores your Civitai and Hugging Face tokens in the local Prompt Manager settings file (never in the repository). The Civitai token is appended as `?token=` on Civitai downloads; the Hugging Face token is sent as a Bearer header only to huggingface.co (never to the CDN it redirects to).

## Input Manager node

A third node, **Input Manager** (category `utils/image`), is an image gallery that doubles as an image loader:

- **Gallery**: pick any folder inside the ComfyUI directory (up to 3 levels deep; `models` and `custom_nodes` are left out) and see its images as thumbnails. The **Sort** menu orders them by date (default, newest first), name (natural order, so `img2` comes before `img10`) or file size, and the arrow button flips ascending/descending. A slider changes the thumbnail size. Thumbnails are cached under the ComfyUI user folder.
- **Output**: click a picture to make it the node's output — `image`, `mask` (from the alpha channel, like the stock Load Image), `filename`, the picture's `width` and `height` as integers, and `cropped_image`. A larger preview of the chosen picture is shown on the right.
- **Multi-image**: tick **Multi-image** and Ctrl+click (Cmd+click, Shift+click, or just tap on a touch screen) two or more pictures; numbered badges show the order. The `image` output becomes all of them glued together, either **Side by side** or **Stacked**, in click order. The pictures are scaled to the height (side by side) or width (stacked) of the first one, so nothing is cropped or distorted. `mask`, `cropped_image`, `width`, `height` and `filename` (names joined with `+`) describe the joined picture, and painting is turned off while two or more pictures are joined. A plain click still selects a single picture.
- **Mask drawing**: paint directly on the preview with the **Mask** layer (Draw / Erase, brush size, Clear). The painted area becomes the `mask` output (white = painted). If nothing is painted, `mask` falls back to the image's own transparency, like the stock Load Image. Painting is saved with the workflow and reset when you pick another image.
- **Keep layer and `cropped_image`**: switch to the **Keep** layer and paint what you want to keep. The `cropped_image` output is the selected image at its full size with everything outside the Keep area made transparent (it is a 4-channel RGBA `IMAGE`, like Join Image with Alpha). With nothing painted in Keep it returns the whole image. The picture data outside the Keep area is also blanked to black, so nodes that ignore the alpha channel still lose that part.
- **Upload**: the ⬆ Upload button (or dragging image files onto the node) saves the images into the folder currently open, never overwriting existing files (a `_1`, `_2`... suffix is added), and selects the last one uploaded.
- **Delete without opening**: click a picture to select it and press **🗑 Delete selected** under the preview; Ctrl+click (Cmd/Shift+click) adds or removes pictures so you can delete several at once ("Delete 3 selected"). It asks for confirmation first. Outside Multi-image mode the output stays the first picture picked and nothing is joined.
- **Favorite pictures**: click the ☆ on a thumbnail (it appears on hover), or select pictures and press **☆ Favorite** under the preview, to pin them. Favorites are pinned at the top of the gallery **in every folder**: favorite a picture in `input`, open `output`, and it is still there under a **★ Favorites** heading (with a gold outline and its folder shown on hover), followed by the open folder's other pictures under **Others**. The chosen sort applies inside each group. Press ★ / **★ Unfavorite** to unpin. They are saved on the server, a favorite whose file is missing is simply not shown (it stays in the list), and deleting a picture from the gallery removes it from the favorites.
- **Lock**: the **🔓** button next to the Preview title locks the selected picture as the output (it turns into **🔒** and the thumbnail gets an orange 🔒 mark). While locked, clicking any other thumbnail, Ctrl/Shift-clicking, double-clicking or changing folder does not change what is sent, which prevents accidents; a short message tells you it is locked. Click 🔒 again to unlock. Viewing in large size, favoriting and uploading keep working, deleting the locked picture releases the lock, and the lock is saved with the workflow.
- **Blur**: the **🙈 Blur** button in the header hides the thumbnails and the preview behind a heavy blur (the button turns into **👁 Show**). It is a display toggle only: selecting, outputs and uploads work as usual, double-clicking a picture still opens it clearly, and the choice is saved with the workflow.
- **Enlarge / delete**: double-click a picture to open it large over the whole screen, with a Delete button (asks for confirmation) and Close (or Esc).
- **Zoom**: in the enlarged view, scroll (or pinch on a touch screen / trackpad) to zoom in on the point under the cursor, drag to move around the zoomed picture, and double-click to jump between fit and a close-up. The controls under the picture have − / + , **Fit** and **1:1** (actual pixels), with the current percentage; the keyboard shortcuts are `+`, `-`, `0` (fit) and `1` (1:1). Clicking the empty area around the picture closes it; Esc too.
- The chosen folder, image and thumbnail size are saved with the workflow.

## Image Monitor node

A fourth node, **Image Monitor** (category `utils/image`), sends every image it receives to an always-open viewer window, so you can keep the results on a second monitor without dragging anything:

1. Connect any `IMAGE` output (for example the one that feeds Save Image) to **Image Monitor**.
2. Click **🖥 Open monitor window** on the node, or open `http://<your-server>/image_monitor/viewer?channel=main` in a browser on the other screen (F11 for fullscreen).
3. Run the workflow: the window swaps to the new picture by itself. The node always runs, even when the upstream result is cached.

Widgets: `channel` (a name, so several monitors can each follow their own node), `max_side` (downscale the longest side before sending, 0 = original) and `keep` (how many images each channel remembers, 1-500). The viewer shows the newest picture full-screen over black, with a history strip: ←/→ browse (which pauses **Live**; a "New image" badge appears and one click returns to the newest), Space toggles Live, **F** fullscreen, **M** fit/fill, **H** history, **B** blur, scroll/pinch to zoom and drag to move. The controls and the cursor hide themselves when idle, and the choices are remembered per channel. It reconnects by itself if the server restarts.

**Password.** Type one in the node's `password` widget (empty = open). Anyone who opens the monitor address of that channel then sees only a lock screen until they enter it; a wrong guess is refused, 8 failures in 5 minutes block that address for a while, and the unlock lasts 30 days on that browser (a 🔒 button in the viewer locks it again). The password applies every time the node runs, or immediately with the **🔒 Apply password now** button; changing it signs every viewer out. The server keeps only a salted hash, and the pictures, the list and the clear action all require the unlock (the live signal sent over the websocket carries no file names). Honest limits: the password is also stored in plain text in the workflow file (don't share workflows that contain it), the node shows it in plain text, and this protects the *monitor address* only. Someone who can already use your ComfyUI itself can queue prompts, so a public ComfyUI still needs its own protection (a password or a tunnel in front of it).

Images are stored under `user/ImageMonitor/<channel>/`.

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
