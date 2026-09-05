<script setup lang="ts">
import { ref } from "vue";
import { ComicStrip } from "@toonstrip/vue";
import { makeStrips } from "../../strips.js";

const STRIPS = makeStrips("Vue");

const which = ref<keyof typeof STRIPS>("intro");
function toggle() {
  which.value = which.value === "intro" ? "punchline" : "intro";
}
</script>

<template>
  <main style="max-width: 720px; margin: 2rem auto; font-family: system-ui, sans-serif">
    <h1>toonstrip + Vue</h1>
    <p>
      <code>@toonstrip/vue</code>'s <code>&lt;ComicStrip&gt;</code> component, embedded in a
      plain Vite + Vue app. The button below switches the <code>document</code> prop between
      two different strips — open devtools' Elements panel and watch the same
      <code>&lt;comic-strip&gt;</code> node update in place instead of being removed and
      re-created.
    </p>
    <button type="button" @click="toggle">
      Show the {{ which === "intro" ? "punchline" : "intro" }}
    </button>
    <ComicStrip :document="STRIPS[which]" :packs="['/packs/comic-chat/']" />
  </main>
</template>
