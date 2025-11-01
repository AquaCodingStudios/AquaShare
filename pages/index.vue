<script setup lang="ts">
import 'highlight.js/styles/github-dark.css'
const apiBase = useRuntimeConfig().public.apiBase
const router = useRouter()

const title = ref('')
const code = ref('// paste code here')
const lang = ref('plaintext')
const loading = ref(false)
const rendered = ref('')
let hl: any = null

async function loadHL() {
  if (hl) return hl
  const core = await import('highlight.js/lib/core')
  const js = await import('highlight.js/lib/languages/javascript')
  const ts = await import('highlight.js/lib/languages/typescript')
  const json = await import('highlight.js/lib/languages/json')
  const java = await import('highlight.js/lib/languages/java')
  core.default.registerLanguage('javascript', js.default)
  core.default.registerLanguage('typescript', ts.default)
  core.default.registerLanguage('json', json.default)
  core.default.registerLanguage('java', java.default)
  hl = core.default
  return hl
}

async function highlightNow(text: string, language: string) {
  const h = await loadHL()
  const safe = text.endsWith('\n') ? text + ' ' : text
  try {
    rendered.value = h.highlight(safe, { language: language || 'plaintext' }).value
  } catch (e) {
    rendered.value = h.highlightAuto(safe).value
  }
}

async function detectLanguage(c: string) {
  try {
    const res = await $fetch<{ language: string }>(apiBase + '/detect', {
      method: 'POST',
      body: { code: c }
    })
    lang.value = res.language || 'plaintext'
    await highlightNow(c, lang.value)
  } catch {
    lang.value = 'plaintext'
    await highlightNow(c, 'plaintext')
  }
}

watch(code, (val) => {
  detectLanguage(val)
}, { immediate: true })

onMounted(async () => {
  await detectLanguage(code.value)
})

async function createGist() {
  loading.value = true
  try {
    const res = await $fetch<{ slug: string }>(apiBase + '/gists', {
      method: 'POST',
      body: {
        title: title.value || 'Untitled',
        code: code.value,
        language: lang.value
      }
    })
    router.push('/' + res.slug)
  } catch {
    alert('Failed to create gist')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid">
    <section class="panel editor">
      <div class="field">
        <label>Title</label>
        <input v-model="title" placeholder="Snippet title">
      </div>
      <div class="field code-field">
        <label>Code</label>
        <div class="code-wrap">
          <pre class="code-pre"><code v-html="rendered"></code></pre>
          <textarea v-model="code" spellcheck="false"></textarea>
        </div>
        <p class="hint">Detected: {{ lang }}</p>
      </div>
      <div class="footer">
        <p class="hint">Ready to share.</p>
        <button class="primary" @click="createGist" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create link' }}
        </button>
      </div>
    </section>

    <section class="panel info">
      <h2>How it works</h2>
      <ul>
        <li>Paste your code</li>
        <li>We detect the language</li>
        <li>You get a short link</li>
      </ul>
    </section>
  </div>
</template>