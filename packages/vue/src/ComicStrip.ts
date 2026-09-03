/**
 * `<ComicStrip>` — the Vue wrapper (dev plan §13.3), same pattern as
 * `@toonstrip/react`. Mounts `@toonstrip/element`'s `<comic-strip>` custom
 * element via a template ref and pushes `document`/`packs` onto it as DOM
 * properties whenever they change — no rendering logic of its own.
 *
 * A render function (not an SFC `<template>`) creates the `comic-strip` host
 * tag, the same reason `@toonstrip/react` uses `createElement` instead of
 * JSX: it sidesteps needing `compilerOptions.isCustomElement` just for this
 * one tag. `class`/`style` bindings on `<ComicStrip>` fall through to the
 * rendered root element automatically (Vue's single-root attribute
 * inheritance), so they aren't declared as props here.
 *
 * The side-effect import below registers the element eagerly at module load
 * — fine for this package's target (a client-rendered Vue app); a
 * server-rendering wrapper is what would need to guard against importing
 * this on the server, not this package.
 */
import "@toonstrip/element";
import type { ComicStripElement } from "@toonstrip/element";
import type { ComicStripDocument } from "@toonstrip/schema";
import { defineComponent, h, onMounted, ref, watch, type PropType } from "vue";

export interface ComicStripProps {
  /** The strip to render (dev plan §3). Re-set on the element whenever this changes. */
  document: ComicStripDocument;
  /** Base URLs of registered asset packs, searched in order. Default `[]`. */
  packs?: string[];
}

export const ComicStrip = defineComponent({
  name: "ComicStrip",
  props: {
    document: { type: Object as PropType<ComicStripDocument>, required: true },
    packs: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup(props) {
    const el = ref<ComicStripElement | null>(null);

    const syncDocument = () => {
      if (el.value) el.value.document = props.document;
    };
    const syncPacks = () => {
      if (el.value) el.value.packs = props.packs ?? [];
    };

    onMounted(() => {
      syncDocument();
      syncPacks();
    });
    watch(() => props.document, syncDocument);
    watch(() => props.packs, syncPacks);

    return () => h("comic-strip", { ref: el });
  },
});
