# nixpkgs.overlays = [ (import /path/to/freetube-vim-navigation/packaging/nixos/overlay.nix) ];
#
# Rebuilds nixpkgs.freetube from source and runs scripts/apply.py in postPatch.
# If a new FreeTube release changes hook anchors, apply.py exits non-zero
# and the build fails instead of producing a silent unpatched binary.

let
  vimnav = ../..;
in
final: prev: {
  freetube = prev.freetube.overrideAttrs (old: {
    nativeBuildInputs = (old.nativeBuildInputs or [ ]) ++ [ final.python3 ];
    postPatch =
      (old.postPatch or "")
      + ''
        python3 ${vimnav}/scripts/apply.py .
      '';
  });
}
