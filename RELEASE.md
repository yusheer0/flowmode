# Release Guide (FLOWMODE)

Этот файл описывает актуальный процесс выпуска релизов для проекта `flowmode` с автосборкой через GitHub Actions и автообновлением Tauri.

## 1) Подготовка релиза

1. Убедиться, что `main` в стабильном состоянии.
2. Обновить версию приложения в `src-tauri/tauri.conf.json`:
   - поле `version` должно быть новым (например, `0.2.7`).
3. Обновить `CHANGELOG.md`:
   - добавить секцию формата `## [0.2.7] - YYYY-MM-DD`;
   - записать изменения релиза.

Важно: workflow берет текст релиза именно из секции `## [X.Y.Z]` в `CHANGELOG.md`.
Если секция не найдена, GitHub релиз будет создан с fallback-текстом.

## 2) Локальная проверка перед пушем

Выполнить минимум:

```powershell
pnpm install
pnpm build
pnpm test
```

При необходимости проверить Rust-часть:

```powershell
cd src-tauri
cargo check
```

## 3) Коммит и push

1. Закоммитить изменения (версия + changelog + код, если есть).
2. Запушить в `main`.

Пример:

```powershell
git add .
git commit -m "Release v0.2.7"
git push
```

## 4) Создание тега релиза

Релизный workflow запускается **только** по тегу формата `v*`.

```powershell
git tag v0.2.7
git push origin v0.2.7
```

После этого запустится `.github/workflows/release.yml` и соберет артефакты для:
- Windows
- Linux
- macOS

## 5) Проверка GitHub Release

Проверить страницу релиза:
- должен появиться релиз `FLOWMODE v0.2.7`;
- должны быть бинарные файлы и подписи (`.sig`);
- должен присутствовать `latest.json` (нужен для автообновления).

## 6) Проверка автообновления в приложении

В `src-tauri/tauri.conf.json` должен быть корректный endpoint:

`https://github.com/yusheer0/flowmode/releases/latest/download/latest.json`

Проверить вручную, что URL доступен:

```powershell
Invoke-WebRequest -UseBasicParsing "https://github.com/yusheer0/flowmode/releases/latest/download/latest.json"
```

Ожидается `StatusCode: 200`.

## 7) Обязательные GitHub Secrets

Для подписи и updater должны быть настроены:
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Если ключи отсутствуют/неверные, релиз может собраться некорректно или без валидного обновления.

## 8) Частые проблемы

### 8.1 В релизе неверное описание

Причина: в `CHANGELOG.md` нет секции нужной версии.
Решение: добавить `## [X.Y.Z]`, пересоздать/перевыпустить тег.

### 8.2 Приложение пишет "Ошибка проверки обновлений"

Проверить:
1. что `latest.json` реально доступен по URL;
2. что endpoint в `tauri.conf.json` корректный;
3. что релиз опубликован (не draft);
4. что приложение собрано с актуальным `pubkey`.

### 8.3 Пользователь на старой версии не видит обновление

Выполнить ручную проверку URL `latest.json` и убедиться, что новая версия выше текущей.

## 9) Короткий чеклист релиза

- [ ] Версия обновлена в `src-tauri/tauri.conf.json`
- [ ] Добавлена секция `## [X.Y.Z]` в `CHANGELOG.md`
- [ ] `pnpm build` и `pnpm test` успешны
- [ ] Изменения запушены в `main`
- [ ] Создан и запушен тег `vX.Y.Z`
- [ ] На GitHub есть релиз с артефактами и `latest.json`
- [ ] Автообновление проверено из приложения
