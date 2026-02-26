# 🔔 Настройка автообновлений FLOWMODE

## 📋 Обзор

Автообновления реализованы через **Tauri Updater** с использованием GitHub Releases.

---

## 🚀 Быстрый старт

### 1. Генерация ключей подписи

```bash
chmod +x scripts/generate-signing-keys.sh
./scripts/generate-signing-keys.sh
```

Или вручную:

```bash
pnpm tauri signer generate
```

**Важно:** Запомните пароль — он понадобится для CI/CD.

---

### 2. Настройка `tauri.conf.json`

После генерации ключей:

1. Откройте `src-tauri/signer.key.pub`
2. Скопируйте содержимое
3. Вставьте в `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/flowmode/releases/latest/download/latest.json"
      ],
      "pubkey": "СКОПИРУЙТЕ_СЮДА_ПУБЛИЧНЫЙ_КЛЮЧ"
    }
  }
}
```

**Замените `YOUR_USERNAME` на ваш GitHub username!**

---

### 3. Настройка переменных окружения

Создайте файл `.env` (для локальной разработки) или добавьте в CI/CD:

```bash
# Пароль от приватного ключа
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your_password_here

# Приватный ключ (для CI/CD)
TAURI_SIGNING_PRIVATE_KEY=$(cat src-tauri/signer.key.priv)
```

---

## 📦 Публикация обновлений

### Шаг 1: Измените версию

В `src-tauri/tauri.conf.json`:

```json
{
  "version": "0.2.0"
}
```

### Шаг 2: Создайте тег Git

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

### Шаг 3: Запустите CI/CD

GitHub Actions автоматически создаст релиз с артефактами.

---

## 🔄 Как это работает

1. **При запуске** приложение проверяет `latest.json` на GitHub
2. **Если версия новее**, показывается уведомление
3. **Пользователь** нажимает «Установить»
4. **Приложение** загружает и устанавливает обновление
5. **После установки** требуется перезапуск

---

## 📁 Структура `latest.json`

Файл создаётся автоматически при сборке:

```json
{
  "version": "v0.2.0",
  "notes": "Новые функции:\n- Шифрование данных\n- ADHD-режим",
  "pub_date": "2026-02-26T12:00:00Z",
  "platforms": {
    "linux-x86_64": {
      "url": "https://github.com/.../flowmode_0.2.0_amd64.deb",
      "signature": "..."
    }
  }
}
```

---

## 🛠 GitHub Actions Workflow

Создайте `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

---

## 🔐 Секреты GitHub

Добавьте в Settings → Secrets and variables → Actions:

| Secret | Значение |
|--------|----------|
| `TAURI_SIGNING_PRIVATE_KEY` | Содержимое `signer.key.priv` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Пароль от ключа |
| `GITHUB_TOKEN` | Автоматически предоставляется |

---

## 🧪 Тестирование

### Локальная проверка

1. Запустите приложение: `pnpm tauri dev`
2. Проверьте консоль на наличие ошибок updater
3. Убедитесь, что проверка обновлений работает

### Проверка в production

1. Создайте тестовый релиз с более высокой версией
2. Установите старую версию приложения
3. Запустите и проверьте уведомление

---

## ⚠️ Возможные проблемы

### «Updater не инициализирован»

- Проверьте, что `plugins.updater.active: true`
- Убедитесь, что `pubkey` корректно скопирован

### «Неверная подпись»

- Пересоздайте ключи
- Проверьте `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### GitHub 404 при загрузке

- Проверьте `endpoints` URL
- Убедитесь, что релиз публичный

---

## 📚 Ссылки

- [Tauri Updater Docs](https://v2.tauri.app/plugin/updater/)
- [Tauri Sign Guide](https://v2.tauri.app/distribute/signing/linux/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
