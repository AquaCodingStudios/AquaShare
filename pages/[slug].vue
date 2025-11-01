<script setup lang="ts">
import 'highlight.js/styles/github-dark.css'
const route = useRoute()
const apiBase = useRuntimeConfig().public.apiBase

const { data, error } = await useFetch(apiBase + '/gists/' + route.params.slug)

onMounted(async () => {
  if (!data.value) return
  const core = await import('highlight.js/lib/core')
  const js = await import('highlight.js/lib/languages/javascript')
  const json = await import('highlight.js/lib/languages/json')
  const java = await import('highlight.js/lib/languages/java')
  core.default.registerLanguage('javascript', js.default)
  core.default.registerLanguage('json', json.default)
  core.default.registerLanguage('java', java.default)
  await nextTick()
  document.querySelectorAll('pre code').forEach((el) =>
      core.default.highlightElement(el as HTMLElement)
  )
})
</script>

<template>
  <div class="view">
    <div class="view-inner" v-if="error">
      <div class="view-panel">
        <p>Could not load gist.</p>
      </div>
    </div>

    <div class="view-inner" v-else-if="data">
      <div class="view-panel">
        <div class="view-head">
          <div>
            <h1>{{ data.title }}</h1>
            <p>Language: {{ data.language }}</p>
          </div>
        </div>

        <div class="gist-box">
          <pre><code :class="data.language">{{ data.code }}</code></pre>
        </div>

        <p class="view-small">short link: {{ data.shortUrl }}</p>
      </div>
    </div>

    <div class="view-inner" v-else>
      <div class="view-panel">
        <p>Loading…</p>
      </div>
    </div>
  </div>
</template>