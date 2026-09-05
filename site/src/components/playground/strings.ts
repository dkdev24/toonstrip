/**
 * Plain-object shape of the `playground.*` dictionary slice (SITE_DEV_PLAN.md §13.2).
 * Built server-side in playground.astro from `en.json`/`ko.json` via `t()`, then passed
 * as a prop to the Playground island so the client bundle only ever carries one
 * language's strings. Mirrors the `playground` object shape in en.json/ko.json.
 */
export interface PlaygroundStrings {
  loading: string;
  pane: {
    configure: string;
    preview: string;
    collapseJson: string;
    expandJson: string;
    resizeConfigureJson: string;
    resizeEditorPreview: string;
  };
  strip: {
    tabLabel: string;
    assetPacks: string;
    assetPacksHint: string;
    presets: string;
    loadPreset: string;
    choosePreset: string;
    presetHint: string;
    resetToFirst: string;
    thisStrip: string;
    addPanel: string;
  };
  panel: {
    label: string;
    labelWithRoom: string;
    actionsAria: string;
    scene: string;
    backdrop: string;
    camera: string;
    roomTitle: string;
    roomTitlePlaceholder: string;
    dark: string;
    moveLeft: string;
    moveRight: string;
    duplicate: string;
    remove: string;
    removeConfirm: string;
    removePanel: string;
    cancel: string;
  };
  character: {
    title: string;
    none: string;
    add: string;
    choose: string;
    close: string;
    moveLeft: string;
    moveRight: string;
    remove: string;
    removeReassign: string;
    pose: string;
    angle: string;
    intensity: string;
    keepOnStage: string;
    emotion: string;
  };
  line: {
    title: string;
    none: string;
    speaker: string;
    balloon: string;
    moveUp: string;
    moveDown: string;
    remove: string;
    textPlaceholder: string;
    add: string;
    addCaption: string;
    charsCount: string;
  };
  preview: {
    containerWidth: string;
    widthPresetsAria: string;
    presetPhone: string;
    presetTablet: string;
    presetDesktop: string;
    presetFill: string;
    columnUnit: string;
    columnUnitPlural: string;
    darkSurface: string;
    darkSurfaceHint: string;
    undo: string;
    redo: string;
    presetsButton: string;
    loadPresetMenuLabel: string;
    share: string;
    shareLinkCopied: string;
    linkInAddressBar: string;
    export: string;
    rendering: string;
    downloadPng: string;
    transparentBackground: string;
    copyJson: string;
    copyAstro: string;
    copyHtml: string;
    copiedJson: string;
    copiedAstro: string;
    copiedHtml: string;
    exportFailed: string;
    clipboardBlocked: string;
    pngDownloaded: string;
    panelUnit: string;
    panelUnitPlural: string;
    packsLabel: string;
  };
  editor: {
    valid: string;
    problemUnit: string;
    problemUnitPlural: string;
    format: string;
    copy: string;
    linePrefix: string;
    documentAria: string;
  };
}
