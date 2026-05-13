# Changelog

## [0.4.1] - 2026-05-13

### Description
EN / Drag-and-drop reordering for habits, notes (within a layer, separately for pinned vs normal), and vault items; vault order is stored in SQLite (`sort_order` migration) and synced via a new `vault_reorder` command. Regenerated launcher icons from `icon.png` (`icons:generate` no longer uses SVG; `app.svg` removed). Reorder grips, drop hints, and accessibility tweaks for list DnD.
RU / Перетаскивание для ручной сортировки привычек, заметок (внутри слоя, отдельно для закреплённых и обычных) и записей сейфа; порядок сейфа хранится в SQLite (миграция `sort_order`) и сохраняется командой `vault_reorder`. Обновлены иконки приложения из `icon.png` (скрипт `icons:generate` больше не опирается на SVG, `app.svg` удалён). Добавлены ручки перетаскивания, подсказки вставки и мелкие правки для удобства DnD в списках.

## [0.4.0] - 2026-05-11

### Description
EN / I've slightly redesigned the app (new app icon, fixed the app screen size, it's now responsive, and added a new "Habits" feature).
RU / Немного поредизайнил (новая иконка приложения, пофиксил размер экрана приложения, оно теперь адаптивное и добавил новый функционал "Привычки")