#!/usr/bin/env python3
"""Copy the vim-navigation overlay into a FreeTube source tree and insert hooks.

Idempotent: safe to run twice. Uses marker comments, not a version-locked diff,
so a new FreeTube tag usually only needs this script if a hook anchor disappeared.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

MARKER = "freetube-vim-navigation"
ROOT = Path(os.environ.get("FREETUBE_VIM_OVERLAY", Path(__file__).resolve().parents[1]))
OVERLAY = ROOT / "overlay"


class HookError(RuntimeError):
    pass


def already_marked(text: str) -> bool:
    return MARKER in text


def first_existing(src: Path, candidates: list[str]) -> Path:
    for rel in candidates:
        path = src / rel
        if path.is_file():
            return path
    raise HookError("none of these files exist:\n  " + "\n  ".join(candidates))


def replace_once(path: Path, old: str, new: str, *, required: bool = True) -> bool:
    text = path.read_text(encoding="utf-8")
    if already_marked(text) and new.strip() in text:
        return False
    if old not in text:
        if required:
            raise HookError(f"{path}: expected to find:\n{old}")
        return False
    if text.count(old) != 1:
        raise HookError(f"{path}: anchor is not unique ({text.count(old)} matches)")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    return True


def copy_overlay(src: Path) -> None:
    overlay_mod = OVERLAY / "src" / "renderer" / "vim-navigation"
    if not overlay_mod.is_dir():
        raise HookError(
            f"overlay module missing: {overlay_mod}\n"
            "The vim-navigation git checkout has no overlay/ tree "
            "(often because overlay/src/ was ignored). Commit overlay/ and rebuild."
        )
    dest = src / "src" / "renderer" / "vim-navigation"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(overlay_mod, dest, dirs_exist_ok=True)


def hook_settings(src: Path) -> None:
    path = first_existing(src, ["src/renderer/store/modules/settings.js"])
    text = path.read_text(encoding="utf-8")
    if "enableVimNavigation" in text:
        return
    anchors = [
        "  openDeepLinksInNewWindow: false,\n",
        "  openDeepLinksInNewWindow: true,\n",
        "  playNextVideo: false,\n",
    ]
    insertion = "  enableVimNavigation: true,\n"
    for anchor in anchors:
        if anchor in text:
            replace_once(path, anchor, insertion + anchor)
            return
    raise HookError(f"{path}: could not find a settings state anchor")


def hook_app(src: Path) -> None:
    path = first_existing(src, ["src/renderer/App.vue", "src/renderer/App.js"])
    text = path.read_text(encoding="utf-8")

    import_line = (
        f"import {{ installVimNavigation, uninstallVimNavigation }} from './vim-navigation/index.js' // {MARKER}\n"
    )
    if "from './vim-navigation/index.js'" not in text:
        import_anchors = [
            "import store from './store/index'\n",
            "import store from './store/index.js'\n",
        ]
        for anchor in import_anchors:
            if anchor in text:
                replace_once(path, anchor, anchor + import_line)
                break
        else:
            raise HookError(f"{path}: could not find store import")

    text = path.read_text(encoding="utf-8")
    mount_call = f"  installVimNavigation(store) // {MARKER}\n"
    if "installVimNavigation(store)" not in text:
        mount_anchors = [
            "  document.addEventListener('keydown', handleKeyboardShortcuts)\n",
            "  document.addEventListener('keydown', this.handleKeyboardShortcuts)\n",
        ]
        for anchor in mount_anchors:
            if anchor in text:
                replace_once(path, anchor, anchor + mount_call)
                break
        else:
            raise HookError(f"{path}: could not find keydown listener in onMounted")

    text = path.read_text(encoding="utf-8")
    unmount_call = f"  uninstallVimNavigation() // {MARKER}\n"
    if "uninstallVimNavigation()" not in text:
        unmount_anchors = [
            "  document.removeEventListener('keydown', handleKeyboardShortcuts)\n",
            "  document.removeEventListener('keydown', this.handleKeyboardShortcuts)\n",
        ]
        for anchor in unmount_anchors:
            if anchor in text:
                replace_once(path, anchor, unmount_call + anchor)
                break
        else:
            raise HookError(f"{path}: could not find keydown cleanup in onBeforeUnmount")


def hook_general_settings(src: Path) -> None:
    path = first_existing(
        src,
        [
            "src/renderer/components/GeneralSettings/GeneralSettings.vue",
            "src/renderer/components/general-settings/general-settings.vue",
        ],
    )
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return

    toggle = f"""        <FtToggleSwitch
          v-if="USING_ELECTRON"
          :label="t('Settings.General Settings.Enable VIM Navigation')"
          :default-value="enableVimNavigation"
          :compact="true"
          :tooltip="t('Tooltips.General Settings.Enable VIM Navigation')"
          @change="updateEnableVimNavigation"
        />
        <!-- {MARKER} -->
"""
    toggle_anchor = """        <FtToggleSwitch
          v-if="USING_ELECTRON"
          :label="t('Settings.General Settings.Open Deep Links In New Window')"
"""
    if toggle_anchor not in text:
        raise HookError(f"{path}: could not find Open Deep Links toggle")
    # Insert immediately after that toggle's closing tag block: find the first
    # following `/>` of that component by matching the unique tooltip line.
    tooltip_end = """          @change="updateOpenDeepLinksInNewWindow"
        />
"""
    if tooltip_end not in text:
        raise HookError(f"{path}: could not find Open Deep Links @change handler")
    replace_once(path, tooltip_end, tooltip_end + toggle)

    script = f"""
/** @type {{import('vue').ComputedRef<boolean>}} */
const enableVimNavigation = computed(() => store.getters.getEnableVimNavigation)

/**
 * @param {{boolean}} value
 */
function updateEnableVimNavigation(value) {{
  store.dispatch('updateEnableVimNavigation', value)
}}
// {MARKER}
"""
    script_anchor = """function updateOpenDeepLinksInNewWindow(value) {
  store.dispatch('updateOpenDeepLinksInNewWindow', value)
}
"""
    if script_anchor not in path.read_text(encoding="utf-8"):
        raise HookError(f"{path}: could not find updateOpenDeepLinksInNewWindow")
    replace_once(path, script_anchor, script_anchor + script)


def hook_locale(src: Path) -> None:
    path = first_existing(src, ["static/locales/en-US.yaml"])
    tooltip = (
        "    Enable VIM Navigation: "
        "f/Alt+f link hints, v external player, j/k scroll, gg/G top/bottom, "
        "Ctrl+d/u half-page. Shift+F fullscreen. Esc cancels or blurs. "
        "On a video page j/k scroll the page (arrows still seek).\n"
    )
    old_tooltip = (
        "    Enable VIM Navigation: "
        "Press f or Alt+f for link hints. Shift+F toggles player fullscreen. "
        "Press v to open a video in the external player. Esc cancels.\n"
    )
    text = path.read_text(encoding="utf-8")
    if old_tooltip in text:
        replace_once(path, old_tooltip, tooltip)
        text = path.read_text(encoding="utf-8")
    if "Enable VIM Navigation: Enable Vimium-style keyboard hints" in text:
        pass
    else:
        general_anchor = "    Open Deep Links In New Window: Open URLs Passed to FreeTube in a New Window\n"
        if general_anchor not in text:
            raise HookError(f"{path}: could not find General Settings locale string")
        replace_once(
            path,
            general_anchor,
            general_anchor + "    Enable VIM Navigation: Enable Vimium-style keyboard hints\n",
        )

    text = path.read_text(encoding="utf-8")
    if tooltip in text:
        return
    tooltip_anchor = (
        "    Open Deep Links In New Window: URLs passed to FreeTube, such as by redirect\n"
    )
    if tooltip_anchor not in text:
        return
    replace_once(path, tooltip_anchor, tooltip + tooltip_anchor)


HOOKS = [
    ("overlay files", copy_overlay),
    ("settings.js", hook_settings),
    ("App.vue", hook_app),
    ("GeneralSettings.vue", hook_general_settings),
    ("en-US.yaml", hook_locale),
]


def apply(src: Path) -> list[str]:
    if not (src / "src" / "renderer").is_dir():
        raise HookError(f"{src} does not look like a FreeTube source tree")
    done = []
    for name, fn in HOOKS:
        fn(src)
        done.append(name)
    return done


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Path to unpacked FreeTube sources")
    parser.add_argument("--check", action="store_true", help="Verify anchors without writing")
    args = parser.parse_args()
    src = args.source.resolve()

    if args.check:
        try:
            first_existing(src, ["src/renderer/App.vue", "src/renderer/App.js"])
            first_existing(src, ["src/renderer/store/modules/settings.js"])
            first_existing(
                src,
                [
                    "src/renderer/components/GeneralSettings/GeneralSettings.vue",
                    "src/renderer/components/general-settings/general-settings.vue",
                ],
            )
            first_existing(src, ["static/locales/en-US.yaml"])
        except HookError as exc:
            print(exc, file=sys.stderr)
            return 1
        print(f"anchors look present in {src}")
        return 0

    try:
        done = apply(src)
    except HookError as exc:
        print(f"apply failed: {exc}", file=sys.stderr)
        print(
            "Update scripts/apply.py anchors for this FreeTube version, then re-run.",
            file=sys.stderr,
        )
        return 1

    print("applied:", ", ".join(done))
    print(f"tree: {src}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
