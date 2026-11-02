# freetube-vim-navigation

[English](README.md) | **Русский**

Клавиатурная навигация в стиле Vimium для [FreeTube](https://github.com/FreeTubeApp/FreeTube). Это небольшой оверлей, который накатывается на каждый исходный релиз: не форк всего FreeTube и не upstream PR.

Это **не** патч установленного `app.asar`. Бинарные пакеты (`freetube-bin` и аналоги) его не подхватят. Нужна сборка из исходников.

Проверено на FreeTube **0.26.0**.

## Клавиши

В полях ввода не действуют, кроме Escape.

| Клавиша | Действие |
| --- | --- |
| `f` или `Alt+f` | Хинты на видимых ссылках, кнопках, вкладках, пунктах меню и полях ввода |
| Набрать метку | Активировать элемент (поле ввода получает фокус, а не клик) |
| `v` | Хинты на карточках видео / на странице ролика → открыть во внешнем плеере |
| `j` / `k` | Прокрутка страницы вниз / вверх |
| `Ctrl+d` / `Ctrl+u` | На полстраницы вниз / вверх |
| `gg` / `G` | В начало / в конец |
| `Esc` | Снять хинты или убрать фокус с поля |
| `Shift+F` | Оставлено плееру (полноэкранный режим) |

На странице ролика `f` открывает хинты, а не fullscreen. Перемотка стрелками не меняется; `j`/`k` крутят страницу.

Ссылки из свёрнутого блока «…больше» в описании не подсвечиваются. Действия в комментариях («Нажмите, чтобы просмотреть комментарии» и т.п.) — подсвечиваются.

Буквы хинтов: `asdfjklghn`. Клик, прокрутка или изменение размера окна снимают оверлей.

Переключатель: **Настройки → Общие → Enable Vimium-style keyboard hints** (после apply включён).

## Накатить на дерево исходников

```bash
python3 scripts/apply.py /path/to/FreeTube-0.26.0-beta
python3 scripts/apply.py --check /path/to/FreeTube-0.26.0-beta
```

Скрипт копирует `overlay/src/renderer/vim-navigation/` и вставляет помеченные хуки в:

- `src/renderer/App.vue`
- `src/renderer/store/modules/settings.js`
- `src/renderer/components/GeneralSettings/GeneralSettings.vue`
- `static/locales/en-US.yaml`

Повторный запуск безопасен. Если в новом теге пропали якоря, скрипт падает, а не оставляет полупатченное дерево. Правится `scripts/apply.py`, а не исходники FreeTube вручную.

## Arch

Исходный пакет — `freetube-vim` в [tyusha/pkgbuilds](https://gitlab.com/tyusha/pkgbuilds). Он клонирует этот репозиторий и вызывает `apply.py` в `prepare()`.

Для любого другого source-PKGBUILD (AUR `freetube`, не `freetube-bin`):

```bash
python "$HOME/git/freetube-vim-navigation/scripts/apply.py" "$srcdir/FreeTube-$pkgver-beta"
```

См. `packaging/arch/prepare.snippet`. После bump версии сначала `apply.py --check` на новом tarball, потом `makepkg`.

## NixOS

```nix
nixpkgs.overlays = [
  (import /path/to/freetube-vim-navigation/packaging/nixos/overlay.nix)
];
```

Дальше пересобрать `freetube`. nixpkgs может отставать от тегов на GitHub; оверлей применится, пока на месте файлы с якорями.

## Новый релиз FreeTube

1. Распаковать новый тег.
2. `python3 scripts/apply.py --check <tree>`
3. Если упало — поправить якоря только в `scripts/apply.py`.
4. Накатить, собрать, поставить.

## Лицензия

[AGPL-3.0-or-later](LICENSE), как у FreeTube.
