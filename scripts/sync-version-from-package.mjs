/**
 * Проставляет в Tauri конфигурации ту же версию, что и в корневом package.json.
 * Запуск: npm run sync-version
 * Полный релиз (sync + ci + vite build + tauri build): npm run release
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = path.join(root, 'package.json')
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml')
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json')

function normalizedLines(contents) {
  return contents.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

/** Текущая версия из секции [package] Cargo.toml */
function readCargoPackageVersion(contents) {
  const lines = normalizedLines(contents)
  let inPackage = false
  for (const line of lines) {
    if (/^\s*\[package\]\s*$/.test(line)) {
      inPackage = true
      continue
    }
    if (/^\s*\[/.test(line)) {
      inPackage = false
      continue
    }
    if (inPackage && /^\s*version\s*=\s*"/.test(line)) {
      const m = line.match(/version\s*=\s*"([^"]*)"/)
      return m?.[1] ?? null
    }
  }
  return null
}

function writeCargoPackageVersion(contents, newVersion) {
  const eol = contents.includes('\r\n') ? '\r\n' : '\n'
  const lines = normalizedLines(contents)
  let inPackage = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\[package\]\s*$/.test(line)) {
      inPackage = true
      continue
    }
    if (/^\s*\[/.test(line)) {
      inPackage = false
      continue
    }
    if (inPackage && /^\s*version\s*=\s*"/.test(line)) {
      lines[i] = line.replace(/^(\s*)version\s*=\s*"[^"]*"/, `$1version = "${newVersion}"`)
      let out = lines.join(eol)
      if (contents.endsWith(eol) && !out.endsWith(eol)) {
        out += eol
      }
      return out
    }
  }
  throw new Error('Не найдена строка version в секции [package] в Cargo.toml')
}

function main() {
  const pkgRaw = fs.readFileSync(pkgPath, 'utf8')
  const pkg = JSON.parse(pkgRaw)
  const version = pkg.version
  if (!version || typeof version !== 'string') {
    throw new Error('В package.json отсутствует поле version (строка)')
  }

  const cargoRaw = fs.readFileSync(cargoPath, 'utf8')
  const cargoVer = readCargoPackageVersion(cargoRaw)
  if (!cargoVer) {
    throw new Error('Не удалось прочитать version Cargo.toml')
  }
  if (cargoVer !== version) {
    fs.writeFileSync(cargoPath, writeCargoPackageVersion(cargoRaw, version), 'utf8')
    console.warn(`Cargo.toml → ${version}`)
  }

  const tauriRaw = fs.readFileSync(tauriConfPath, 'utf8')
  const tauriJson = JSON.parse(tauriRaw)
  if (tauriJson.version !== version) {
    tauriJson.version = version
    const out = `${JSON.stringify(tauriJson, null, 2)}\n`
    fs.writeFileSync(tauriConfPath, out, 'utf8')
    console.warn(`tauri.conf.json → ${version}`)
  }

  console.log(`Версия из package.json: ${version}`)
}

main()
