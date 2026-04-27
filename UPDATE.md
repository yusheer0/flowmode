# Flowmode: как готовить новую версию и ставить тег

Эта инструкция основана на текущей конфигурации проекта:
- релизный workflow запускается только по тегам вида `v*` (`.github/workflows/release.yml`);
- текст релиза берется из секции соответствующей версии в `CHANGELOG.md`;
- версия должна быть синхронна в:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 1) Подготовка перед релизом

1. Переключиться на `main` и подтянуть изменения:
   - `git checkout main`
   - `git pull origin main`
2. Проверить, что нет лишних локальных изменений:
   - `git status`
3. Выбрать новую версию по SemVer:
   - `patch` для фиксов: `0.3.0 -> 0.3.1`
   - `minor` для нового функционала: `0.3.0 -> 0.4.0`
   - `major` для breaking changes: `0.3.0 -> 1.0.0`

## 2) Обновить версию в кодовой базе

Обнови одну и ту же версию во всех трех файлах:

1. `package.json` -> поле `"version"`
2. `src-tauri/Cargo.toml` -> `[package].version`
3. `src-tauri/tauri.conf.json` -> поле `"version"`

После этого добавь секцию в `CHANGELOG.md`:

- заголовок должен совпадать с версией, например:
  - `## [0.3.1] - 2026-04-27`
- ниже добавь описание изменений (`Added` / `Changed` / `Fixed` и т.д.).

Почему это важно: release workflow ищет секцию `## [<версия>]` для тега `v<версия>`. Если секции нет, релиз создастся с fallback-текстом.

## 3) Прогнать проверки локально

Минимальный набор проверок (совпадает с CI):

- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm test`
- `cd src-tauri`
- `cargo fmt --check`
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo test --all-targets --all-features`

## 4) Закоммитить релизные изменения

Пример:

- `git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md`
- `git commit -m "release: v0.3.1"`
- `git push origin main`

## 5) Создать и отправить тег

Используй только формат `vX.Y.Z` (например, `v0.3.1`), чтобы не конфликтовать с именами веток.

Рекомендуемый вариант (annotated tag):

- `git tag -a v0.3.1 -m "Release v0.3.1"`
- `git push origin v0.3.1`

После `git push` тега автоматически стартует GitHub Actions workflow `Release`, который собирает бинарники и публикует GitHub Release.

## 6) Проверить результат

1. Открыть Actions и убедиться, что workflow `Release` завершился успешно на всех платформах.
2. Открыть страницу Releases и проверить:
   - имя релиза;
   - описание (должно совпадать с секцией из `CHANGELOG.md`);
   - прикрепленные артефакты.

## Частые ошибки и как исправить

### Ошибка: `src refspec main matches more than one`

Причина: в репозитории одновременно существуют branch и tag с именем `main`.

Как избежать:
- не создавать теги с именами веток (`main`, `master`, `develop`);
- использовать только префикс `v` для релизов (`v0.3.1`).

Если нужно срочно пушнуть ветку явно:
- `git push origin refs/heads/main:refs/heads/main`

### Версии не совпадают между файлами

Если версии в `package.json`, `Cargo.toml`, `tauri.conf.json` разные, можно получить неконсистентный релиз и путаницу в UI/артефактах. Перед тегом всегда проверяй синхронность.
