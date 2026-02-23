#!/bin/bash
# Скрипт для установки системных зависимостей и генерации иконок

echo "🔧 Установка системных зависимостей для Tauri..."

# Определяем дистрибутив
if [ -f /etc/debian_version ]; then
    echo "📦 Debian/Ubuntu detected"
    sudo apt update
    sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libgdk-pixbuf2.0-dev pkg-config build-essential
elif [ -f /etc/fedora-release ]; then
    echo "📦 Fedora detected"
    sudo dnf install -y webkit2gtk4.1-devel gtk3-devel libayatana-appindicator3-devel librsvg2-devel libsoup3-devel javascriptcore4.1-devel pkg-config gcc-c++
elif [ -f /etc/arch-release ]; then
    echo "📦 Arch Linux detected"
    sudo pacman -S --noconfirm webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg libsoup3 javascriptcoregtk-4.1 pkgconf base-devel
else
    echo "⚠️ Неизвестный дистрибутив. Пожалуйста, установите зависимости вручную."
    exit 1
fi

echo "✅ Зависимости установлены!"

# Генерация иконок из SVG
echo "🎨 Генерация иконок..."

if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 32 -h 32 src-tauri/icons/app.svg -o src-tauri/icons/32x32.png
    rsvg-convert -w 128 -h 128 src-tauri/icons/app.svg -o src-tauri/icons/128x128.png
    rsvg-convert -w 256 -h 256 src-tauri/icons/app.svg -o src-tauri/icons/128x128@2x.png
    rsvg-convert -w 512 -h 512 src-tauri/icons/app.svg -o src-tauri/icons/icon.png
    echo "✅ Иконки сгенерированы!"
else
    echo "⚠️ rsvg-convert не найден. Установите librsvg2-bin для генерации иконок."
fi

echo "🎉 Готово!"
