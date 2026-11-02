# freetube-vim-navigation

Vimium-style hints for [FreeTube](https://github.com/FreeTubeApp/FreeTube), kept as a small overlay you apply onto each new source release. No upstream PR.

This is **not** a patch of `/usr/lib/freetube/app.asar`. Arch `freetube-bin` / CachyOS binary packages cannot pick it up. You need a **source** build (AUR `freetube`, nixpkgs `freetube`).

## Keys

| Key | Action |
| --- | --- |
| `f` | Link hints (skipped on `#/watch/…` so player fullscreen still works) |
| `Alt+f` | Link hints everywhere |
| `v` | Hints on video cards → open in the configured external player |
| `Esc` | Cancel hints |

Toggle: Settings → General → Enable Vimium-style keyboard hints (on by default after the overlay is applied).

`j` / `k` / `t` / player shortcuts are left alone.

## Apply onto a source tree

```bash
python3 scripts/apply.py /path/to/FreeTube-0.25.3-beta
python3 scripts/apply.py --check /path/to/FreeTube-0.25.3-beta
```

The script copies `overlay/src/renderer/vim-navigation/` and inserts short marked hooks into:

- `src/renderer/App.vue`
- `src/renderer/store/modules/settings.js`
- `src/renderer/components/GeneralSettings/GeneralSettings.vue`
- `static/locales/en-US.yaml`

It is idempotent. If a new tag moves those anchors, the script fails loudly — update `scripts/apply.py`, do not hand-edit FreeTube.

## Arch (PKGBUILD)

Use a source package, not `freetube-bin`. In `prepare()`:

```bash
python "$HOME/Projects/freetube-vim-navigation/scripts/apply.py" "$srcdir/FreeTube-$pkgver-beta"
```

See `packaging/arch/prepare.snippet`. After a version bump, run `apply.py --check` on the new tarball before `makepkg`.

## NixOS

```nix
nixpkgs.overlays = [
  (import /home/tyusha/Projects/freetube-vim-navigation/packaging/nixos/overlay.nix)
];
```

Then rebuild `freetube`. nixpkgs may lag behind GitHub tags; the overlay still applies as long as the hook files exist.

## New FreeTube release

1. Unpack the new tag.
2. `python3 scripts/apply.py --check <tree>`
3. If it fails, adjust anchors in `scripts/apply.py` only.
4. Apply, build, install.

Do not maintain a fork of the whole FreeTube repo unless you want to. The overlay is the fork.
