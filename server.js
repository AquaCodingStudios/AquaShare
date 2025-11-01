import express from "express"
import cors from "cors"
import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { customAlphabet } from "nanoid"

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000"
const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 7)

const dbDir = path.resolve("./db")
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}
const db = new Database(path.join(dbDir, "gists.db"))
db.exec(`
    CREATE TABLE IF NOT EXISTS gists (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         slug TEXT UNIQUE NOT NULL,
                                         title TEXT NOT NULL,
                                         code TEXT NOT NULL,
                                         language TEXT NOT NULL,
                                         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`)

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }))
app.use(express.json({ limit: "4mb" }))

function score(re, code) {
    const m = code.match(re)
    return m ? m.length : 0
}

function detectFromCode(codeRaw) {
    const code = (codeRaw || "").toString()
    const trimmed = code.trim()
    if (!trimmed) return "plaintext"
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json"
    if (trimmed.startsWith("---") || /^\s*[a-zA-Z0-9_-]+:/.test(trimmed)) return "yaml"
    if (/<html[\s>]/i.test(trimmed) || /<!DOCTYPE html>/i.test(trimmed)) return "html"
    if (/<[a-zA-Z]+[\s>]/.test(trimmed) && /<\/[a-zA-Z]+>/.test(trimmed)) return "xml"
    if (/^\s*SELECT\s+/i.test(trimmed) || /^\s*INSERT\s+/i.test(trimmed) || /^\s*UPDATE\s+/i.test(trimmed) || /^\s*DELETE\s+/i.test(trimmed)) return "sql"
    if (/^\s*<?php/i.test(trimmed)) return "php"
    if (/^#!/.test(trimmed) && trimmed.includes("python")) return "python"
    if (/^#!/.test(trimmed) && (trimmed.includes("bash") || trimmed.includes("sh"))) return "shell"
    if (/^#!/.test(trimmed) && trimmed.toLowerCase().includes("powershell")) return "powershell"
    const s = {
        javascript:
            score(/function\s+[a-zA-Z0-9_]+\s*\(/g, code) +
            score(/=>/g, code) +
            score(/console\.log/g, code) +
            score(/import\s+.*from\s+['"][^'"]+['"]/g, code),
        typescript:
            score(/:\s*[A-Za-z0-9_<>\[\]]+/g, code) +
            score(/interface\s+[A-Za-z0-9_]+/g, code) +
            score(/type\s+[A-Za-z0-9_]+\s*=/g, code),
        jsx:
            score(/<\w+[^>]*>/g, code) +
            score(/export\s+default\s+function/g, code) +
            (code.includes("from 'react'") || code.includes('from "react"') ? 2 : 0),
        tsx:
            score(/<\w+[^>]*>/g, code) +
            score(/:\s*[A-Za-z0-9_<>\[\]]+/g, code),
        java:
            score(/public\s+class\s+[A-Za-z0-9_]+/g, code) +
            score(/public\s+static\s+void\s+main/g, code) +
            score(/import\s+java\./g, code),
        kotlin:
            score(/fun\s+[A-Za-z0-9_]+\s*\(/g, code) +
            score(/class\s+[A-Za-z0-9_]+\s*:/g, code) +
            score(/data\s+class\s+[A-Za-z0-9_]+/g, code),
        csharp:
            score(/using\s+System/g, code) +
            score(/namespace\s+[A-Za-z0-9_.]+/g, code) +
            score(/public\s+class\s+[A-Za-z0-9_]+/g, code),
        python:
            score(/def\s+[A-Za-z0-9_]+\s*\(/g, code) +
            score(/import\s+[A-Za-z0-9_.]+/g, code) +
            score(/self\./g, code),
        ruby:
            score(/def\s+[a-z0-9_]+/gi, code) +
            score(/end\s*$/gim, code) +
            score(/require\s+['"][^'"]+['"]/g, code),
        php:
            score(/<\?php/g, code) +
            score(/\$[A-Za-z0-9_]+/g, code) +
            score(/->/g, code),
        go:
            score(/package\s+main/g, code) +
            score(/func\s+[A-Za-z0-9_]+\s*\(/g, code) +
            score(/import\s+\(/g, code),
        rust:
            score(/fn\s+main\s*\(/g, code) +
            score(/use\s+[A-Za-z0-9_:]+/g, code) +
            score(/let\s+mut\s+[A-Za-z0-9_]+/g, code),
        swift:
            score(/import\s+SwiftUI/g, code) +
            score(/struct\s+[A-Za-z0-9_]+\s*:\s*View/g, code) +
            score(/func\s+[A-Za-z0-9_]+\(/g, code),
        shell:
            score(/^[A-Za-z0-9_]+\=.*/gm, code) +
            score(/echo\s+.+/g, code) +
            score(/^\s*for\s+\w+\s+in\s+/gm, code),
        powershell:
            score(/\$[A-Za-z0-9_]+\s*=/g, code) +
            score(/Write-Host/g, code) +
            score(/Get-[A-Za-z]+/g, code),
        yaml:
            score(/^[A-Za-z0-9_-]+:\s*/gm, code) +
            (code.includes("services:") ? 2 : 0),
        toml:
            score(/^[A-Za-z0-9_.]+\s*=\s*.+$/gm, code) +
            score(/^\[[A-Za-z0-9_.]+\]$/gm, code),
        dockerfile:
            score(/^FROM\s+/gim, code) +
            score(/^RUN\s+/gim, code) +
            score(/^CMD\s+/gim, code),
        sql:
            score(/^\s*SELECT\s+/gim, code) +
            score(/^\s*INSERT\s+/gim, code) +
            score(/^\s*CREATE\s+TABLE/gim, code),
        ini:
            score(/^\[[A-Za-z0-9_.-]+\]$/gm, code) +
            score(/^[A-Za-z0-9_.-]+\s*=\s*.+$/gm, code),
        css:
            score(/[.#][A-Za-z0-9_-]+\s*\{/g, code) +
            score(/:[a-z-]+\s*;/g, code),
        html:
            score(/<html[\s>]/g, code) +
            score(/<body[\s>]/g, code),
        xml:
            score(/<\w+[^>]*>/g, code) +
            score(/<\/\w+>/g, code)
    }
    const entries = Object.entries(s)
    entries.sort((a, b) => b[1] - a[1])
    const best = entries[0]
    if (!best || best[1] === 0) return "plaintext"
    return best[0]
}

app.post("/api/detect", (req, res) => {
    const { code } = req.body || {}
    const language = detectFromCode(code || "")
    res.json({ language })
})

app.post("/api/gists", (req, res) => {
    const body = req.body || {}
    const title = (body.title || "").trim() || "Untitled"
    const code = body.code || ""
    if (!code) return res.status(400).json({ message: "code required" })
    const detected = detectFromCode(code)
    const finalLang = body.language && body.language !== "auto" ? body.language : detected
    let slug = nanoid()
    let saved = false
    for (let i = 0; i < 5 && !saved; i++) {
        try {
            db.prepare("INSERT INTO gists (slug, title, code, language) VALUES (?, ?, ?, ?)").run(
                slug,
                title,
                code,
                finalLang
            )
            saved = true
        } catch {
            slug = nanoid()
        }
    }
    if (!saved) return res.status(500).json({ message: "failed to save gist" })
    res.json({
        slug,
        title,
        language: finalLang,
        shortUrl: process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL + "/" + slug : "http://localhost:3000/" + slug
    })
})

app.get("/api/gists/:slug", (req, res) => {
    const slug = req.params.slug
    const row = db.prepare("SELECT slug, title, code, language, created_at FROM gists WHERE slug = ?").get(slug)
    if (!row) return res.status(404).json({ message: "not found" })
    res.json({
        ...row,
        shortUrl: process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL + "/" + row.slug : "http://localhost:3000/" + row.slug
    })
})

app.listen(PORT, () => {
    process.stdout.write("AquaShare backend on http://localhost:" + PORT + "\n")
})