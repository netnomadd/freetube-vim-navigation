# freetube-vim-navigation

**English** | [Русский](README.ru.md)

Vimium-style keyboard navigation for [FreeTube](https://github.com/FreeTubeApp/FreeTube). It is a small overlay applied onto each source release, not a FreeTube fork and not an upstream PR.

It does **not** patch an installed `app.asar`. Binary packages (`freetube-bin` and similar) cannot use it. You need a source build.

Tested against FreeTube **0.26.0**.

## Keys

Inactive in text fields, except Escape.

| Key | Action |
| --- | --- |
| `f` or `Alt+f` | Hint labels on visible links, buttons, tabs, menus, and inputs |
| Type the label | Activate that control (focus a field instead of clicking it) |
| `v` | Hints on video cards / the watch page → open in the configured external player |
| `j` / `k` | Scroll the page down / up |
| `Ctrl+d` / `Ctrl+u` | Half-page down / up |
| `gg` / `G` | Top / bottom |
| `Esc` | Cancel hints, or blur the focused field |
| `Shift+F` | Left for the player (fullscreen) |

On a watch page, `f` is hints, not fullscreen. Player seek with the arrow keys is unchanged; `j`/`k` scroll the page.

Collapsed “…more” description links are not hinted. Comment actions such as “Click to view comments” are.

Hint letters: `asdfjklghn`. Click, scroll, or resize cancels the overlay.

Toggle: **Settings → General → Enable Vimium-style keyboard hints** (on after apply).

## Apply onto a source tree

```bash
python3 scripts/apply.py /path/to/FreeTube-0.26.0-beta
python3 scripts/apply.py --check /path/to/FreeTube-0.26.0-beta
```

The script copies `overlay/src/renderer/vim-navigation/` and inserts marked hooks into:

- `src/renderer/App.vue`
- `src/renderer/store/modules/settings.js`
- `src/renderer/components/GeneralSettings/GeneralSettings.vue`
- `static/locales/en-US.yaml`

It is idempotent. If a new tag moves those anchors, the script fails instead of producing a half-patched tree. Fix `scripts/apply.py`, do not hand-edit FreeTube.

## Arch

A source package lives in [tyusha/pkgbuilds](https://gitlab.com/tyusha/pkgbuilds) as `freetube-vim`. It clones this repository and runs `apply.py` in `prepare()`.

To patch any other source PKGBUILD (AUR `freetube`, not `freetube-bin`):

```bash
python "$HOME/git/freetube-vim-navigation/scripts/apply.py" "$srcdir/FreeTube-$pkgver-beta"
```

See `packaging/arch/prepare.snippet`. After a version bump, run `apply.py --check` on the new tarball before `makepkg`.

## NixOS

```nix
nixpkgs.overlays = [
  (import /path/to/freetube-vim-navigation/packaging/nixos/overlay.nix)
];
```

Then rebuild `freetube`. nixpkgs may lag behind GitHub tags; the overlay still applies as long as the hook files exist.

## New FreeTube release

1. Unpack the new tag.
2. `python3 scripts/apply.py --check <tree>`
3. If it fails, update anchors in `scripts/apply.py` only.
4. Apply, build, install.

## License

[AGPL-3.0-or-later](LICENSE), same as FreeTube.
