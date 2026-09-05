(function() {
  "use strict";
  const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
  const FONT_KEYS = ["serif", "ridi", "sans", "rounded", "mono"];
  const ALIGN_KEYS = ["left", "center"];
  const TEXTURE_KEYS = ["none", "grain", "stars"];
  const MAX_CORNER_RADIUS = 120;
  const DEFAULT_STYLE = {
    background: {
      kind: "solid",
      color1: "#414B4B",
      color2: "#263131",
      texture: "grain"
    },
    overlay: 0.08,
    cornerRadius: 0,
    font: "serif",
    fontSize: 24,
    lineHeight: 1.65,
    textColor: "#FFFFFF",
    align: "left",
    padding: 76
  };
  const preset = (id, name, background, overrides = {}) => ({
    id,
    name,
    builtin: true,
    style: {
      ...DEFAULT_STYLE,
      ...overrides,
      background
    }
  });
  const BUILTIN_PRESETS = [
    preset(
      "builtin-ridi",
      "리디",
      { kind: "gradient", color1: "#211B2D", color2: "#48415F", texture: "stars" },
      { overlay: 0.01, cornerRadius: 0, font: "ridi", fontSize: 24, lineHeight: 1.65, textColor: "#FFFFFF", align: "left", padding: 42 }
    ),
    preset(
      "builtin-charcoal",
      "차콜",
      { kind: "solid", color1: "#414B4B", color2: "#263131", texture: "grain" }
    ),
    preset(
      "builtin-paper",
      "크림",
      { kind: "solid", color1: "#F2EDE2", color2: "#DED4C3", texture: "none" },
      { textColor: "#2C2925", overlay: 0 }
    ),
    preset(
      "builtin-ivory",
      "아이보리",
      { kind: "solid", color1: "#FAF9F5", color2: "#FAF9F5", texture: "none" },
      { textColor: "#2C2925", overlay: 0 }
    ),
    preset(
      "builtin-forest",
      "숲",
      { kind: "gradient", color1: "#0F3D3E", color2: "#163020", texture: "grain" },
      { overlay: 0.06 }
    ),
    preset(
      "builtin-midnight",
      "밤하늘",
      { kind: "gradient", color1: "#020617", color2: "#172554", texture: "stars" },
      { overlay: 0.04 }
    ),
    preset(
      "builtin-rose",
      "장미",
      { kind: "gradient", color1: "#4C1D3D", color2: "#9D174D", texture: "grain" },
      { overlay: 0.1, align: "center" }
    )
  ];
  function cloneStyle(style) {
    return {
      ...style,
      background: { ...style.background }
    };
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function color(value, fallback) {
    return typeof value === "string" && COLOR_PATTERN.test(value) ? value.toUpperCase() : fallback.toUpperCase();
  }
  function normalizeStyle(value, fallback = DEFAULT_STYLE) {
    if (!value || typeof value !== "object") return cloneStyle(fallback);
    const raw = value;
    const rawBackground = raw.background && typeof raw.background === "object" ? raw.background : {};
    const background = rawBackground;
    const rawTexture = rawBackground.texture;
    const texture = rawTexture === "paper" ? "none" : rawTexture;
    return {
      background: {
        kind: background.kind === "gradient" ? "gradient" : "solid",
        color1: color(background.color1, fallback.background.color1),
        color2: color(background.color2, fallback.background.color2),
        texture: TEXTURE_KEYS.includes(texture) ? texture : fallback.background.texture
      },
      overlay: clamp(Number.isFinite(raw.overlay) ? Number(raw.overlay) : fallback.overlay, 0, 0.85),
      cornerRadius: Math.round(
        clamp(Number.isFinite(raw.cornerRadius) ? Number(raw.cornerRadius) : fallback.cornerRadius, 0, MAX_CORNER_RADIUS)
      ),
      font: FONT_KEYS.includes(raw.font) ? raw.font : fallback.font,
      fontSize: clamp(Number.isFinite(raw.fontSize) ? Number(raw.fontSize) : fallback.fontSize, 14, 72),
      lineHeight: clamp(Number.isFinite(raw.lineHeight) ? Number(raw.lineHeight) : fallback.lineHeight, 1.1, 2.2),
      textColor: color(raw.textColor, fallback.textColor),
      align: ALIGN_KEYS.includes(raw.align) ? raw.align : fallback.align,
      padding: clamp(Number.isFinite(raw.padding) ? Number(raw.padding) : fallback.padding, 40, 120)
    };
  }
  function normalizePresetName(name) {
    return name.trim().replace(/\s+/g, " ");
  }
  function validatePresetName(name, presets, excludeId) {
    const normalized = normalizePresetName(name);
    if (!normalized) return { ok: false, message: "프리셋 이름을 입력해 주세요." };
    if (Array.from(normalized).length > 40) {
      return { ok: false, message: "프리셋 이름은 40자 이하여야 합니다." };
    }
    const duplicate = presets.some(
      (item) => item.id !== excludeId && item.name.toLocaleLowerCase() === normalized.toLocaleLowerCase()
    );
    if (duplicate) return { ok: false, message: "같은 이름의 프리셋이 이미 있습니다." };
    return { ok: true, name: normalized };
  }
  function createPresetId() {
    try {
      return `preset-${crypto.randomUUID()}`;
    } catch {
      return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  }
  function createPersistedState(userPresets, lastStyle) {
    return {
      version: 1,
      userPresets: userPresets.map((item) => ({
        id: item.id,
        name: item.name,
        style: cloneStyle(item.style)
      })),
      lastStyle: cloneStyle(lastStyle)
    };
  }
  function parsePersistedState(raw) {
    if (!raw) return createPersistedState([], DEFAULT_STYLE);
    try {
      const value = JSON.parse(raw);
      if (value.version !== 1 || !Array.isArray(value.userPresets)) {
        return createPersistedState([], DEFAULT_STYLE);
      }
      const usedNames = /* @__PURE__ */ new Set();
      const userPresets = [];
      for (const candidate of value.userPresets) {
        if (!candidate || typeof candidate !== "object") continue;
        const nameResult = validatePresetName(String(candidate.name ?? ""), userPresets);
        if (!nameResult.ok) continue;
        const key = nameResult.name.toLocaleLowerCase();
        if (usedNames.has(key)) continue;
        usedNames.add(key);
        userPresets.push({
          id: typeof candidate.id === "string" && candidate.id ? candidate.id : createPresetId(),
          name: nameResult.name,
          style: normalizeStyle(candidate.style)
        });
      }
      return createPersistedState(userPresets, normalizeStyle(value.lastStyle));
    } catch {
      return createPersistedState([], DEFAULT_STYLE);
    }
  }
  function stylesEqual(a, b) {
    return JSON.stringify(normalizeStyle(a)) === JSON.stringify(normalizeStyle(b));
  }
  function serializePresetExport(presets) {
    const bundle = {
      format: "risu-capture-style-presets",
      version: 1,
      presets: presets.map((item) => ({ name: item.name, style: cloneStyle(item.style) }))
    };
    return JSON.stringify(bundle, null, 2);
  }
  function importedName(name, usedNames) {
    const normalized = normalizePresetName(name);
    if (!usedNames.has(normalized.toLocaleLowerCase())) return normalized;
    for (let index = 1; index < 1e4; index += 1) {
      const suffix = index === 1 ? " (가져옴)" : ` (가져옴 ${index})`;
      const baseLength = Math.max(1, 40 - Array.from(suffix).length);
      const candidate = `${Array.from(normalized).slice(0, baseLength).join("")}${suffix}`;
      if (!usedNames.has(candidate.toLocaleLowerCase())) return candidate;
    }
    return `${Array.from(normalized).slice(0, 24).join("")} ${Date.now()}`.slice(0, 40);
  }
  function parsePresetExport(raw, existing) {
    const value = JSON.parse(raw);
    if (value.format !== "risu-capture-style-presets" || value.version !== 1 || !Array.isArray(value.presets)) {
      throw new Error("Log Capture 프리셋 파일 형식이 아닙니다.");
    }
    const presets = existing.map((item) => ({ ...item, style: cloneStyle(item.style) }));
    const usedNames = new Set(presets.map((item) => item.name.toLocaleLowerCase()));
    let imported = 0;
    let skipped = 0;
    for (const candidate of value.presets.slice(0, 100)) {
      if (!candidate || typeof candidate !== "object" || !candidate.style || typeof candidate.style !== "object") {
        skipped += 1;
        continue;
      }
      const validation = validatePresetName(String(candidate.name ?? ""), []);
      if (!validation.ok) {
        skipped += 1;
        continue;
      }
      const name = importedName(validation.name, usedNames);
      usedNames.add(name.toLocaleLowerCase());
      presets.push({ id: createPresetId(), name, style: normalizeStyle(candidate.style) });
      imported += 1;
    }
    skipped += Math.max(0, value.presets.length - 100);
    return { presets, imported, skipped };
  }
  const STORAGE_KEY = "risu_capture_store_v1";
  async function loadPersistedState$1() {
    try {
      return parsePersistedState(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return parsePersistedState(null);
    }
  }
  async function savePersistedState(userPresets, lastStyle) {
    const value = createPersistedState(userPresets, lastStyle);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
  const SERIF_DEFAULT_MIGRATION_KEY = "log_capture_webfont_serif_default_v1";
  async function loadPersistedState() {
    const persisted = await loadPersistedState$1();
    try {
      const migrated = window.localStorage.getItem(SERIF_DEFAULT_MIGRATION_KEY);
      if (migrated !== "1") {
        persisted.lastStyle = { ...persisted.lastStyle, font: "serif" };
        await savePersistedState(persisted.userPresets, persisted.lastStyle);
        window.localStorage.setItem(SERIF_DEFAULT_MIGRATION_KEY, "1");
      }
    } catch {
      persisted.lastStyle = { ...persisted.lastStyle, font: "serif" };
    }
    return persisted;
  }
  const WORKSPACE_DB_NAME = "log_capture_workspace_v1";
  const WORKSPACE_DB_VERSION = 1;
  const PROJECT_STORE = "projects";
  const DRAFT_STORE = "drafts";
  const CURRENT_DRAFT_ID = "current";
  const MAX_PROJECT_BACKUP_BYTES = 100 * 1024 * 1024;
  let workspaceDbPromise = null;
  function openWorkspaceDb() {
    if (workspaceDbPromise) return workspaceDbPromise;
    workspaceDbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("이 브라우저는 작업물 저장함을 지원하지 않습니다."));
        return;
      }
      const request = indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          const store = db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("작업물 저장소를 열지 못했습니다."));
      request.onblocked = () => reject(new Error("다른 탭에서 저장소 업데이트를 막고 있습니다."));
    });
    return workspaceDbPromise;
  }
  async function idbRequest(storeName, mode, operation) {
    const db = await openWorkspaceDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request;
      try {
        request = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("브라우저 저장소 작업에 실패했습니다."));
    });
  }
  const workspaceGet = (storeName, key) => idbRequest(storeName, "readonly", (store) => store.get(key));
  const workspaceGetAll = (storeName) => idbRequest(storeName, "readonly", (store) => store.getAll());
  const workspacePut = (storeName, value) => idbRequest(storeName, "readwrite", (store) => store.put(value));
  const workspaceDelete = (storeName, key) => idbRequest(storeName, "readwrite", (store) => store.delete(key));
  function createWorkspaceId() {
    try {
      return `work-${crypto.randomUUID()}`;
    } catch {
      return `work-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  function normalizeWorkspaceMetadata(value) {
    const fallback = cloneMetadata();
    if (!value || typeof value !== "object") return fallback;
    const result = {
      enabled: value.enabled !== false,
      divider: value.divider !== false,
      bot: { ...fallback.bot },
      model: { ...fallback.model },
      preset: { ...fallback.preset }
    };
    for (const key of ["bot", "model", "preset"]) {
      const candidate = value[key];
      if (!candidate || typeof candidate !== "object") continue;
      result[key] = {
        value: String(candidate.value ?? "").slice(0, key === "bot" ? 120 : 160),
        visible: candidate.visible !== false
      };
    }
    return result;
  }
  function normalizeWorkspaceRules(value) {
    if (!Array.isArray(value)) return [newRule()];
    const rules = value.slice(0, 100).map((candidate) => ({
      id: typeof candidate?.id === "string" && candidate.id ? candidate.id : newRule().id,
      find: String(candidate?.find ?? "").slice(0, 500),
      replace: String(candidate?.replace ?? "").slice(0, 500),
      caseSensitive: Boolean(candidate?.caseSensitive)
    }));
    return rules.length ? rules : [newRule()];
  }
  function plainWorkspaceSnapshot(snapshot) {
    return {
      version: 1,
      text: String(snapshot?.text ?? ""),
      metadata: normalizeWorkspaceMetadata(snapshot?.metadata),
      rules: normalizeWorkspaceRules(snapshot?.rules),
      style: normalizeStyle(snapshot?.style),
      previousText: typeof snapshot?.previousText === "string" ? snapshot.previousText : null,
      lastRuleCounts: Array.isArray(snapshot?.lastRuleCounts) ? snapshot.lastRuleCounts.slice(0, 100).map((value) => Math.max(0, Number(value) || 0)) : [],
      usePhoto: Boolean(snapshot?.usePhoto),
      photo: snapshot?.photo ?? null
    };
  }
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("사진 데이터를 읽지 못했습니다."));
      reader.readAsDataURL(blob);
    });
  }
  function dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl);
    if (!match) throw new Error("백업의 사진 데이터가 올바르지 않습니다.");
    const mime = match[1] || "application/octet-stream";
    const payload = match[2];
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }
  async function snapshotToPortable(snapshot) {
    const normalized = plainWorkspaceSnapshot(snapshot);
    let photo = null;
    if (normalized.photo?.blob instanceof Blob) {
      photo = {
        name: String(normalized.photo.name ?? "background-image"),
        type: normalized.photo.blob.type || "application/octet-stream",
        dataUrl: await blobToDataUrl(normalized.photo.blob)
      };
    }
    return { ...normalized, photo };
  }
  async function portableToSnapshot(value) {
    const normalized = plainWorkspaceSnapshot({ ...value, photo: null });
    let photo = null;
    if (value?.photo?.dataUrl && typeof value.photo.dataUrl === "string") {
      const blob = dataUrlToBlob(value.photo.dataUrl);
      if (!PHOTO_TYPES.has(blob.type)) throw new Error("백업에 지원하지 않는 배경 사진 형식이 있습니다.");
      if (blob.size > MAX_PHOTO_BYTES) throw new Error("백업의 배경 사진이 20MB를 초과합니다.");
      photo = { name: String(value.photo.name ?? "background-image"), blob };
    }
    return { ...normalized, photo, usePhoto: Boolean(normalized.usePhoto && photo) };
  }
  const CANVAS_WIDTH = 720;
  const MIN_CANVAS_HEIGHT = 240;
  const MAX_CANVAS_HEIGHT = 12e3;
  const BOTTOM_PADDING_RATIO = 0.85;
  const MIN_METADATA_FONT_SIZE = 12;
  const DIVIDER_LEAD = 31;
  const DIVIDER_TRAIL = 37;
  const BARE_METADATA_GAP = 20;
  class LayoutTooTallError extends Error {
    height;
    constructor(height) {
      super(`이미지 높이가 안전 제한(${MAX_CANVAS_HEIGHT.toLocaleString()}px)을 초과합니다.`);
      this.name = "LayoutTooTallError";
      this.height = height;
    }
  }
  function graphemes(value) {
    try {
      const Segmenter = Intl.Segmenter;
      if (Segmenter) {
        return Array.from(new Segmenter("ko", { granularity: "grapheme" }).segment(value), (part) => part.segment);
      }
    } catch {
    }
    return Array.from(value);
  }
  function appendRun(runs, text, bold = false, italic = false) {
    if (!text) return;
    const previous = runs.at(-1);
    if (previous && previous.bold === bold && previous.italic === italic) previous.text += text;
    else runs.push({ text, bold, italic });
  }
  function parseInlineMarkdown(value) {
    const runs = [];
    let plainStart = 0;
    let index = 0;
    while (index < value.length) {
      const marker = value.startsWith("***", index) ? "***" : value.startsWith("**", index) ? "**" : value[index] === "*" ? "*" : null;
      if (!marker) {
        index += 1;
        continue;
      }
      const closing = value.indexOf(marker, index + marker.length);
      if (closing <= index + marker.length) {
        index += marker.length;
        continue;
      }
      appendRun(runs, value.slice(plainStart, index));
      appendRun(
        runs,
        value.slice(index + marker.length, closing),
        marker.length >= 2,
        marker.length === 1 || marker.length === 3
      );
      index = closing + marker.length;
      plainStart = index;
    }
    appendRun(runs, value.slice(plainStart));
    return runs;
  }
  function parseMarkdownParagraph(paragraph) {
    const quote = paragraph.match(/^\s*>\s?(.*)$/u);
    if (!quote) return parseInlineMarkdown(paragraph.replace(/\t/g, "    "));
    const runs = [];
    appendRun(runs, "“");
    for (const run of parseInlineMarkdown(quote[1].replace(/\t/g, "    "))) appendRun(runs, run.text, run.bold, run.italic);
    appendRun(runs, "”");
    return runs;
  }
  function runsToUnits(runs) {
    return runs.flatMap((run) => graphemes(run.text).map((text) => ({ text, bold: run.bold, italic: run.italic })));
  }
  function unitsToRuns(units) {
    const runs = [];
    for (const unit of units) appendRun(runs, unit.text, unit.bold, unit.italic);
    return runs;
  }
  function measureRuns(runs, measure, fontSize) {
    return runs.reduce((sum, run) => sum + measure(run.text, run.bold, run.italic, fontSize), 0);
  }
  function trimLeadingWhitespace(units) {
    let start = 0;
    while (start < units.length && /^\s$/u.test(units[start].text)) start += 1;
    return units.slice(start);
  }
  function trimTrailingWhitespace(units) {
    let end = units.length;
    while (end > 0 && /^\s$/u.test(units[end - 1].text)) end -= 1;
    return units.slice(0, end);
  }
  function wrapRuns(runs, maxWidth, measure) {
    const units = runsToUnits(runs);
    if (!units.length) return [[]];
    const lines = [];
    let current = [];
    const commit = (unitsToCommit) => {
      lines.push(unitsToRuns(trimTrailingWhitespace(unitsToCommit)));
    };
    for (const unit of units) {
      current.push(unit);
      if (measureRuns(unitsToRuns(current), measure) <= maxWidth) continue;
      let breakAt = -1;
      for (let index = current.length - 2; index >= 0; index -= 1) {
        if (/^\s$/u.test(current[index].text)) {
          breakAt = index;
          break;
        }
      }
      if (breakAt >= 0) {
        commit(current.slice(0, breakAt));
        current = trimLeadingWhitespace(current.slice(breakAt + 1));
      } else if (current.length > 1) {
        const overflow = current.pop();
        commit(current);
        current = [overflow];
      } else {
        commit(current);
        current = [];
      }
    }
    if (current.length || !lines.length) commit(current);
    return lines;
  }
  function wrapMarkdownText(text, maxWidth, measure) {
    const normalized = text.replace(/\r\n?/g, "\n");
    return normalized.split("\n").flatMap((paragraph) => wrapRuns(parseMarkdownParagraph(paragraph), maxWidth, measure));
  }
  function visibleMetadataRuns(metadata) {
    if (!metadata.enabled) return [];
    const visible = [
      { field: metadata.bot, bold: false },
      { field: metadata.model, bold: false },
      { field: metadata.preset, bold: true }
    ].filter(({ field }) => field.visible && field.value.trim());
    const runs = [];
    visible.forEach(({ field, bold }, index) => {
      if (index) appendRun(runs, "  ·  ");
      appendRun(runs, field.value.trim(), bold);
    });
    return runs;
  }
  function fitRunsToWidth(runs, maxWidth, measure, fontSize) {
    if (measureRuns(runs, measure, fontSize) <= maxWidth) return runs;
    const units = runsToUnits(runs);
    const ellipsis = { text: "…", bold: false, italic: false };
    while (units.length && measureRuns(unitsToRuns([...trimTrailingWhitespace(units), ellipsis]), measure, fontSize) > maxWidth) {
      units.pop();
    }
    return unitsToRuns([...trimTrailingWhitespace(units), ellipsis]);
  }
  function buildQuoteLayout(text, metadata, style, measureBody, measureMetadata) {
    const contentLeft = style.padding;
    const contentWidth = CANVAS_WIDTH - style.padding * 2;
    const bodyFontSize = style.fontSize;
    const bodyLineHeight = Math.round(style.fontSize * style.lineHeight);
    const bodyRuns = wrapMarkdownText(text.trim(), contentWidth, measureBody);
    const rawMetadataRuns = visibleMetadataRuns(metadata);
    const baseMetadataFontSize = Math.max(16, Math.round(style.fontSize * 0.5));
    const naturalMetadataWidth = measureRuns(rawMetadataRuns, measureMetadata, baseMetadataFontSize);
    const metadataFontSize = rawMetadataRuns.length && naturalMetadataWidth > contentWidth ? Math.max(MIN_METADATA_FONT_SIZE, Math.floor(baseMetadataFontSize * contentWidth / naturalMetadataWidth)) : baseMetadataFontSize;
    const metadataRuns = rawMetadataRuns.length ? fitRunsToWidth(rawMetadataRuns, contentWidth, measureMetadata, metadataFontSize) : [];
    const metadataLineHeight = Math.round(metadataFontSize * 1.55);
    const bodyHeight = bodyRuns.length * bodyLineHeight;
    const showDivider = metadataRuns.length > 0 && metadata.divider;
    const metadataGap = metadataRuns.length ? showDivider ? DIVIDER_LEAD + DIVIDER_TRAIL : BARE_METADATA_GAP : 0;
    const metadataHeight = metadataRuns.length ? metadataLineHeight : 0;
    const blockHeight = bodyHeight + metadataGap + metadataHeight;
    const bottomPadding = Math.round(style.padding * BOTTOM_PADDING_RATIO);
    const bottomReduction = style.padding - bottomPadding;
    const balancedHeight = Math.max(MIN_CANVAS_HEIGHT, Math.ceil(style.padding * 2 + blockHeight));
    const height = balancedHeight - bottomReduction;
    if (height > MAX_CANVAS_HEIGHT) throw new LayoutTooTallError(height);
    const startY = balancedHeight === MIN_CANVAS_HEIGHT ? Math.max(style.padding, Math.round((balancedHeight - blockHeight) / 2)) : style.padding;
    const bodyLines = bodyRuns.map((runs, index) => ({
      text: runs.map((run) => run.text).join(""),
      runs,
      y: startY + bodyFontSize + index * bodyLineHeight
    }));
    const dividerY = showDivider ? startY + bodyHeight + DIVIDER_LEAD : null;
    const metadataStartY = startY + bodyHeight + metadataGap + metadataFontSize;
    const metadataLines = metadataRuns.length ? [{ text: metadataRuns.map((run) => run.text).join(""), runs: metadataRuns, y: metadataStartY }] : [];
    return {
      width: CANVAS_WIDTH,
      height,
      bodyLines,
      metadataLines,
      bodyFontSize,
      bodyLineHeight,
      metadataFontSize,
      metadataLineHeight,
      contentLeft,
      contentWidth,
      dividerY
    };
  }
  const alignCenter = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-align-center"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M4 6l16 0" />\n  <path d="M8 12l8 0" />\n  <path d="M6 18l12 0" />\n</svg>';
  const alignLeft = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-align-left"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M4 6l16 0" />\n  <path d="M4 12l10 0" />\n  <path d="M4 18l14 0" />\n</svg>';
  const arrowDown = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-down"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M12 5l0 14" />\n  <path d="M18 13l-6 6" />\n  <path d="M6 13l6 6" />\n</svg>';
  const arrowLeft = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-left"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M5 12l14 0" />\n  <path d="M5 12l6 6" />\n  <path d="M5 12l6 -6" />\n</svg>';
  const arrowUp = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-up"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M12 5l0 14" />\n  <path d="M18 11l-6 -6" />\n  <path d="M6 11l6 -6" />\n</svg>';
  const arrowsMaximize = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-arrows-maximize"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M16 4l4 0l0 4" />\n  <path d="M14 10l6 -6" />\n  <path d="M8 20l-4 0l0 -4" />\n  <path d="M4 20l6 -6" />\n  <path d="M16 20l4 0l0 -4" />\n  <path d="M14 14l6 6" />\n  <path d="M8 4l-4 0l0 4" />\n  <path d="M4 4l6 6" />\n</svg>';
  const chevronDown = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M6 9l6 6l6 -6" />\n</svg>';
  const chevronUp = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-up"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M6 15l6 -6l6 6" />\n</svg>';
  const settings = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-settings"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" />\n  <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />\n</svg>';
  const x = '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-x"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M18 6l-12 12" />\n  <path d="M6 6l12 12" />\n</svg>';
  function prepareIcon(svg) {
    return svg.replace('width="24"', 'width="20" aria-hidden="true" focusable="false"').replace('height="24"', 'height="20"').replace('stroke-width="2"', 'stroke-width="1.5"');
  }
  const ICONS = {
    alignCenter: prepareIcon(alignCenter),
    alignLeft: prepareIcon(alignLeft),
    arrowDown: prepareIcon(arrowDown),
    arrowLeft: prepareIcon(arrowLeft),
    arrowUp: prepareIcon(arrowUp),
    arrowsMaximize: prepareIcon(arrowsMaximize),
    chevronDown: prepareIcon(chevronDown),
    chevronUp: prepareIcon(chevronUp),
    settings: prepareIcon(settings),
    x: prepareIcon(x)
  };
  async function detectCurrentMetadata(api) {
    const result = {};
    try {
      const character = await api.getCharacter();
      if (character?.name?.trim()) result.bot = character.name.trim();
    } catch {
    }
    try {
      const [characterIndex, chatIndex] = await Promise.all([
        api.getCurrentCharacterIndex(),
        api.getCurrentChatIndex()
      ]);
      const chat = await api.getChatFromIndex(characterIndex, chatIndex);
      const messages = Array.isArray(chat?.message) ? chat.message : [];
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (!message || message.role !== "char" && message.role !== "assistant") continue;
        if (!result.preset && message.promptInfo?.promptName?.trim()) {
          result.preset = message.promptInfo.promptName.trim();
        }
        if (result.preset) break;
      }
    } catch {
    }
    return result;
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function applyReplacementRules(text, rules) {
    let next = text;
    let count = 0;
    const perRule = [];
    for (const rule of rules) {
      if (!rule.find) {
        perRule.push(0);
        continue;
      }
      const expression = new RegExp(escapeRegExp(rule.find), rule.caseSensitive ? "gu" : "giu");
      let ruleCount = 0;
      next = next.replace(expression, () => {
        ruleCount += 1;
        return rule.replace;
      });
      perRule.push(ruleCount);
      count += ruleCount;
    }
    return { text: next, count, perRule };
  }
  const BUNDLED_FONT_FAMILIES = {
    serif: "Log Capture Serif",
    ridi: "Log Capture RIDI Batang",
    sans: "Log Capture Sans",
    rounded: "Log Capture Rounded",
    mono: "Log Capture Mono"
  };
  const FONT_STACKS = {
    serif: `"${BUNDLED_FONT_FAMILIES.serif}", "Noto Serif KR", "AppleMyungjo", "Songti KR", serif`,
    ridi: `"${BUNDLED_FONT_FAMILIES.ridi}", "RIDIBatang", "Noto Serif KR", "AppleMyungjo", serif`,
    sans: `"${BUNDLED_FONT_FAMILIES.sans}", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`,
    rounded: `"${BUNDLED_FONT_FAMILIES.rounded}", ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", sans-serif`,
    mono: `"${BUNDLED_FONT_FAMILIES.mono}", ui-monospace, "SFMono-Regular", "SF Mono", Menlo, monospace`
  };
  const CDN_ROOT = "https://cdn.jsdelivr.net/fontsource/fonts";
  const FONT_DEFINITIONS = {
    serif: [
      {
        family: BUNDLED_FONT_FAMILIES.serif,
        weight: "400",
        url: `${CDN_ROOT}/noto-serif-kr@5.3.0/korean-400-normal.woff2`
      },
      {
        family: BUNDLED_FONT_FAMILIES.serif,
        weight: "700",
        url: `${CDN_ROOT}/noto-serif-kr@5.3.0/korean-700-normal.woff2`
      }
    ],
    ridi: [
      {
        family: BUNDLED_FONT_FAMILIES.ridi,
        weight: "400",
        sources: [
          { url: "https://cdn.jsdelivr.net/gh/TetraTheta/RIDIBatang-subset/dist/webfont/RIDIBatang-subset.woff2", format: "woff2" },
          { url: "https://ridicorp.com/wp-content/themes/ridicorp/css/font/RIDIBatang.otf", format: "opentype" }
        ]
      }
    ],
    sans: [
      {
        family: BUNDLED_FONT_FAMILIES.sans,
        weight: "400",
        url: `${CDN_ROOT}/noto-sans-kr@5.3.0/korean-400-normal.woff2`
      },
      {
        family: BUNDLED_FONT_FAMILIES.sans,
        weight: "500",
        url: `${CDN_ROOT}/noto-sans-kr@5.3.0/korean-500-normal.woff2`
      },
      {
        family: BUNDLED_FONT_FAMILIES.sans,
        weight: "700",
        url: `${CDN_ROOT}/noto-sans-kr@5.3.0/korean-700-normal.woff2`
      }
    ],
    rounded: [
      {
        family: BUNDLED_FONT_FAMILIES.rounded,
        weight: "400",
        url: `${CDN_ROOT}/jua@5.3.0/korean-400-normal.woff2`
      }
    ],
    mono: [
      {
        family: BUNDLED_FONT_FAMILIES.mono,
        weight: "400",
        url: `${CDN_ROOT}/nanum-gothic-coding@5.3.0/korean-400-normal.woff2`
      },
      {
        family: BUNDLED_FONT_FAMILIES.mono,
        weight: "700",
        url: `${CDN_ROOT}/nanum-gothic-coding@5.3.0/korean-700-normal.woff2`
      }
    ]
  };
  const METADATA_FONT = FONT_DEFINITIONS.sans.find((definition) => definition.weight === "500");
  const FONT_LOAD_TIMEOUT_MS = 1e4;
  const fontLoads = /* @__PURE__ */ new Map();
  function loadFont(definition) {
    const key = `${definition.family}:${definition.weight}`;
    const existing = fontLoads.get(key);
    if (existing) return existing;
    if (typeof FontFace === "undefined" || typeof document === "undefined" || !("fonts" in document)) {
      return Promise.resolve();
    }
    const source = Array.isArray(definition.sources)
      ? definition.sources.map((item) => `url(${item.url}) format("${item.format}")`).join(", ")
      : `url(${definition.url}) format("woff2")`;
    const pending = new FontFace(
      definition.family,
      source,
      { style: "normal", weight: definition.weight }
    ).load().then((face) => {
      document.fonts.add(face);
    });
    fontLoads.set(key, pending);
    void pending.catch(() => fontLoads.delete(key));
    return pending;
  }
  async function waitWithTimeout(pending) {
    let timer;
    const timeout = new Promise((_resolve, reject) => {
      timer = window.setTimeout(() => reject(new Error("웹폰트 로딩 시간이 초과되었습니다.")), FONT_LOAD_TIMEOUT_MS);
    });
    try {
      await Promise.race([pending, timeout]);
    } finally {
      if (timer !== void 0) window.clearTimeout(timer);
    }
  }
  async function ensureCanvasFonts(font) {
    try {
      await waitWithTimeout(Promise.all([
        ...FONT_DEFINITIONS[font].map(loadFont),
        loadFont(METADATA_FONT)
      ]).then(() => void 0));
    } catch {
    }
  }
  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = state * 1664525 + 1013904223 >>> 0;
      return state / 4294967296;
    };
  }
  function drawTexture(context, width, height, texture) {
    if (texture === "none") return;
    const random = seededRandom(width * 31 + height * 17);
    context.save();
    if (texture === "stars") {
      context.fillStyle = "rgba(255,255,255,0.48)";
      const count = Math.min(900, Math.max(100, Math.round(width * height / 6200)));
      for (let index = 0; index < count; index += 1) {
        const radius = random() < 0.92 ? 0.7 : 1.4;
        context.beginPath();
        context.arc(random() * width, random() * height, radius, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      const count = Math.min(5e3, Math.max(600, Math.round(width * height / 1500)));
      for (let index = 0; index < count; index += 1) {
        const alpha = 0.035 + random() * 0.055;
        context.fillStyle = random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        const size = 1.2 + random() * 0.7;
        context.fillRect(random() * width, random() * height, size, size);
      }
    }
    context.restore();
  }
  function clipRoundedCorners(context, width, height, radius) {
    const limit = Math.min(radius, width / 2, height / 2);
    if (limit <= 0) return;
    context.beginPath();
    context.moveTo(limit, 0);
    context.lineTo(width - limit, 0);
    context.arcTo(width, 0, width, limit, limit);
    context.lineTo(width, height - limit);
    context.arcTo(width, height, width - limit, height, limit);
    context.lineTo(limit, height);
    context.arcTo(0, height, 0, height - limit, limit);
    context.lineTo(0, limit);
    context.arcTo(0, 0, limit, 0, limit);
    context.closePath();
    context.clip();
  }
  function renderStyleThumbnail(canvas, style) {
    const width = 144;
    const height = 144;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    clipRoundedCorners(context, width, height, style.cornerRadius * width / CANVAS_WIDTH);
    drawStyleBackground(context, width, height, style);
    drawOverlay(context, width, height, style.overlay);
    const fontSize = Math.max(18, Math.min(30, Math.round(style.fontSize * 0.55)));
    const inset = Math.max(14, Math.min(30, Math.round(style.padding * 0.24)));
    context.fillStyle = style.textColor;
    context.textBaseline = "middle";
    context.textAlign = style.align;
    context.font = fontValue(fontSize, style.font, false, false);
    const x2 = style.align === "center" ? width / 2 : inset;
    context.fillText("가 Aa", x2, height * 0.43, width - inset * 2);
    context.globalAlpha = 0.62;
    context.font = fontValue(Math.max(12, Math.round(fontSize * 0.52)), "sans", true, false, 500);
    context.fillText("PRESET", x2, height * 0.7, width - inset * 2);
    context.globalAlpha = 1;
  }
  function drawStyleBackground(context, width, height, style) {
    if (style.background.kind === "gradient") {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, style.background.color1);
      gradient.addColorStop(1, style.background.color2);
      context.fillStyle = gradient;
    } else {
      context.fillStyle = style.background.color1;
    }
    context.fillRect(0, 0, width, height);
    drawTexture(context, width, height, style.background.texture);
  }
  function drawPhotoCover(context, image, width, height) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawnWidth = sourceWidth * scale;
    const drawnHeight = sourceHeight * scale;
    context.drawImage(image, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  }
  function drawOverlay(context, width, height, opacity) {
    if (opacity <= 0) return;
    context.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    context.fillRect(0, 0, width, height);
  }
  function fontValue(fontSize, font, bold, italic, baseWeight = 400) {
    const weight = bold ? 700 : baseWeight;
    return `${italic ? "italic " : ""}${weight} ${fontSize}px ${FONT_STACKS[font]}`;
  }
  function metadataBaseWeight(font) {
    return font === "sans" ? 500 : 400;
  }
  function drawRichLine(context, runs, y, contentLeft, contentWidth, align, font, fontSize, baseWeight = 400) {
    const widths = runs.map((run) => {
      context.font = fontValue(fontSize, font, run.bold, run.italic, baseWeight);
      return context.measureText(run.text).width;
    });
    const lineWidth = widths.reduce((sum, width) => sum + width, 0);
    let x2 = align === "center" ? contentLeft + (contentWidth - lineWidth) / 2 : contentLeft;
    for (let index = 0; index < runs.length; index += 1) {
      const run = runs[index];
      context.font = fontValue(fontSize, font, run.bold, run.italic, baseWeight);
      context.fillText(run.text, x2, y);
      x2 += widths[index];
    }
  }
  function drawText(context, layout, input) {
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = input.style.textColor;
    if (input.photo) {
      context.shadowColor = "rgba(0,0,0,0.42)";
      context.shadowBlur = 5;
      context.shadowOffsetY = 2;
    }
    for (const line of layout.bodyLines) {
      drawRichLine(
        context,
        line.runs,
        line.y,
        layout.contentLeft,
        layout.contentWidth,
        input.style.align,
        input.style.font,
        layout.bodyFontSize
      );
    }
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    if (layout.metadataLines.length) {
      context.fillStyle = input.style.textColor;
      if (layout.dividerY !== null) {
        context.globalAlpha = 0.48;
        const dividerWidth = input.style.align === "center" ? Math.min(180, layout.contentWidth * 0.36) : 80;
        const dividerX = input.style.align === "center" ? layout.contentLeft + (layout.contentWidth - dividerWidth) / 2 : layout.contentLeft;
        context.fillRect(dividerX, layout.dividerY, dividerWidth, 1.5);
      }
      context.globalAlpha = 0.82;
      for (const line of layout.metadataLines) {
        drawRichLine(
          context,
          line.runs,
          line.y,
          layout.contentLeft,
          layout.contentWidth,
          input.style.align,
          input.style.font,
          layout.metadataFontSize,
          metadataBaseWeight(input.style.font)
        );
      }
      context.globalAlpha = 1;
    }
  }
  async function renderQuoteToCanvas(canvas, input) {
    await ensureCanvasFonts(input.style.font);
    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        const sample = "가나다라마바사 ABC 123";
        await Promise.all([
          document.fonts.load(fontValue(input.style.fontSize, input.style.font, false, false), sample),
          document.fonts.load(fontValue(input.style.fontSize, input.style.font, true, false), sample),
          document.fonts.load(fontValue(input.style.fontSize, input.style.font, false, true), sample),
          document.fonts.load(fontValue(Math.max(16, Math.round(input.style.fontSize * 0.5)), input.style.font, false, false, metadataBaseWeight(input.style.font)), sample)
        ]);
        await document.fonts.ready;
      } catch {
      }
    }
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    if (!measureContext) throw new Error("Canvas 2D를 사용할 수 없습니다.");
    const metadataFontSize = Math.max(16, Math.round(input.style.fontSize * 0.5));
    const bodyMeasure = (text, bold = false, italic = false, fontSize = input.style.fontSize) => {
      measureContext.font = fontValue(fontSize, input.style.font, bold, italic);
      return measureContext.measureText(text).width;
    };
    const metadataMeasure = (text, bold = false, italic = false, fontSize = metadataFontSize) => {
      measureContext.font = fontValue(fontSize, input.style.font, bold, italic, metadataBaseWeight(input.style.font));
      const width = measureContext.measureText(text).width;
      return width;
    };
    const layout = buildQuoteLayout(input.text, input.metadata, input.style, bodyMeasure, metadataMeasure);
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D를 사용할 수 없습니다.");
    clipRoundedCorners(context, layout.width, layout.height, input.style.cornerRadius);
    drawStyleBackground(context, layout.width, layout.height, input.style);
    if (input.photo) drawPhotoCover(context, input.photo.image, layout.width, layout.height);
    drawOverlay(context, layout.width, layout.height, input.style.overlay);
    drawText(context, layout, input);
    return layout;
  }
  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG 파일을 만들지 못했습니다."));
      }, "image/png");
    });
  }
  function canvasToPngBlobSync(canvas) {
    const dataUrl = canvas.toDataURL("image/png");
    const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: "image/png" });
  }
  function createExportFilename(date = /* @__PURE__ */ new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `log-capture-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
  }
  const APP_STYLES = `
:root {
  color-scheme: light;
  --rc-paper: #fff;
  --rc-paper-sunk: oklch(96.2% 0.007 172);
  --rc-rule: oklch(86% 0.011 172);
  --rc-rule-soft: oklch(91% 0.008 172);
  /* Hierarchy is carried by lightness, not by shrinking type: headings and values at 22%, field
     labels at 38%, supporting copy at 50%. Nothing on the panel goes below 13px. */
  --rc-muted: oklch(50% 0.014 190);
  --rc-label: oklch(38% 0.016 192);
  --rc-ink: oklch(22% 0.018 195);
  --rc-hairline: oklch(22% 0.018 195 / .18);
  --rc-scrim: oklch(22% 0.018 195 / .68);
  --rc-accent: oklch(46% 0.075 175);
  --rc-accent-ink: oklch(38% 0.075 175);
  --rc-focus: oklch(56% 0.11 190);
  --rc-danger: oklch(52% 0.17 27);
  --rc-danger-deep: oklch(38% 0.13 27);

  --rc-sp-2xs: 4px;
  --rc-sp-xs: 8px;
  --rc-sp-sm: 12px;
  --rc-sp-md: 16px;
  --rc-sp-lg: 24px;
  --rc-sp-xl: 32px;
  --rc-sp-2xl: 48px;
  --rc-sp-3xl: 64px;
  --rc-r-xs: 4px;
  --rc-r-sm: 8px;
  --rc-r-md: 14px;
  --rc-r-pill: 999px;
  --rc-z-base: 1;
  --rc-z-raised: 10;
  --rc-z-sticky: 200;
  --rc-z-modal: 400;
  --rc-z-toast: 500;
  --rc-font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
  --rc-font-num: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
  /* Four steps with widening gaps, so no two levels can read as the same size. */
  --rc-text-sm: 13px;
  --rc-text-md: 15px;
  --rc-text-lg: 18px;
  --rc-text-xl: 22px;
  --rc-dur: 140ms;
  --rc-ease: cubic-bezier(.2, .8, .2, 1);
  --rc-topbar-h: 64px;
  --rc-pane-x: var(--rc-sp-lg);
  font-family: var(--rc-font-ui);
}

* { box-sizing: border-box; }
/* Reserved always, so collapsing an accordion or switching tabs cannot resize the layout by a
   scrollbar width when the content stops overflowing. */
html { scrollbar-gutter: stable; }
html, body { margin: 0; min-height: 100%; background: var(--rc-paper); color: var(--rc-ink); }
button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .45; }
button, summary, input, textarea, select { -webkit-tap-highlight-color: transparent; }
.icon-tabler { display: block; flex: 0 0 auto; }

#risu-capture-root {
  min-height: 100dvh;
  background: var(--rc-paper);
}
/* Standalone web build: Risu-only controls are hidden. Metadata remains manually editable. */
#rc-close, #rc-detect { display: none !important; }

.rc-topbar {
  height: var(--rc-topbar-h);
  padding: 0 var(--rc-sp-md);
  background: var(--rc-paper);
  border-bottom: 1px solid var(--rc-rule);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: var(--rc-z-sticky);
}
.rc-topbar h1 { margin: 0; overflow: hidden; font-size: var(--rc-text-lg); font-weight: 700; letter-spacing: -.02em; text-overflow: ellipsis; white-space: nowrap; }
.rc-topbar__left, .rc-topbar__right { display: flex; min-width: 0; align-items: center; gap: var(--rc-sp-xs); }
.rc-topbar__right { justify-content: flex-end; }

.rc-button {
  min-height: 38px;
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-sm);
  padding: var(--rc-sp-xs) var(--rc-sp-sm);
  background: var(--rc-paper);
  color: var(--rc-ink);
  font-size: var(--rc-text-md);
  font-weight: 600;
  transition: background var(--rc-dur) var(--rc-ease), color var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease);
}
.rc-button:hover:not(:disabled) { background: var(--rc-paper-sunk); }
.rc-button:active:not(:disabled) { transform: translateY(1px); }
.rc-button--primary { background: var(--rc-accent); border-color: var(--rc-accent); color: #fff; }
.rc-button--primary:hover:not(:disabled) { background: var(--rc-accent-ink); border-color: var(--rc-accent-ink); }
.rc-button--danger { color: var(--rc-danger); }
.rc-button--quiet { border-color: transparent; background: transparent; }
.rc-icon-button { display: inline-grid; width: 40px; padding: 0; place-items: center; }
.rc-button[data-saved="true"] { background: var(--rc-paper); color: var(--rc-accent-ink); box-shadow: inset 0 0 0 1.5px var(--rc-accent); }
.rc-editor-pane .rc-button { min-height: 34px; padding: var(--rc-sp-2xs) var(--rc-sp-sm); }
.rc-editor-pane .rc-icon-button { width: 34px; padding: 0; }

.rc-button:focus-visible,
.rc-tab:focus-visible,
.rc-preview-tool:focus-visible,
.rc-preset:focus-visible,
.rc-preset-menu__button:focus-visible,
.rc-checkbox:focus-visible,
.rc-range:focus-visible,
.rc-color-picker:focus-visible,
.rc-segment input:focus-visible + span,
.rc-section summary:focus-visible,
.rc-group__title:focus-visible {
  outline: 2px solid var(--rc-focus);
  outline-offset: 2px;
}

.rc-workspace {
  height: calc(100dvh - var(--rc-topbar-h));
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 520px);
}
.rc-preview-pane {
  position: relative;
  min-width: 0;
  overflow: auto;
  padding: var(--rc-sp-xl);
  background: var(--rc-paper);
}
.rc-preview-shell { width: min(100%, 560px); margin: 0 auto; }
.rc-preview-card {
  overflow: hidden;
  padding: 0;
  /* No radius of its own: the canvas already paints the corner radius the export will have, so a
     CSS radius on top shaves it again at 0 and exposes the checkerboard at 120. */
  border-radius: 0;
  background: var(--rc-paper);
  box-shadow: 0 0 0 1px var(--rc-hairline);
}
/* Checkerboard, not a solid fill, so corners rounded away read as transparent instead of dark. */
#rc-preview {
  display: block;
  width: 100%;
  height: auto;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e1e6e8 25%, transparent 25%, transparent 75%, #e1e6e8 75%),
    linear-gradient(45deg, #e1e6e8 25%, transparent 25%, transparent 75%, #e1e6e8 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}
/* The mono register tags machine values only. Korean has no glyphs in a mono face, so putting it
   on a whole line makes the message fall back mid-sentence and read as a second weight. */
.rc-preview-meta { display: flex; align-items: center; justify-content: space-between; gap: var(--rc-sp-xs); margin-top: var(--rc-sp-sm); color: var(--rc-muted); font-size: var(--rc-text-sm); }
#rc-size { font-family: var(--rc-font-num); font-variant-numeric: tabular-nums; }
.rc-preview-error { color: var(--rc-danger); font-weight: 600; }
.rc-preview-close { display: none; }
/* Only the stacked mobile layout scrolls the preview out of reach, so the tools live there. */
.rc-preview-tools { display: none; align-items: center; gap: var(--rc-sp-2xs); margin-left: auto; font-family: var(--rc-font-ui); }
.rc-preview-tool {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: var(--rc-sp-2xs);
  padding: 0 var(--rc-sp-xs);
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-sm);
  background: var(--rc-paper);
  color: var(--rc-ink);
  font-size: var(--rc-text-sm);
  font-weight: 600;
  white-space: nowrap;
}
.rc-preview-tool--icon { display: inline-grid; width: 32px; padding: 0; place-items: center; }
.rc-preview-collapsed .rc-preview-tool--icon > span { display: block; transform: rotate(180deg); }

.rc-editor-pane {
  min-width: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 0 var(--rc-pane-x) var(--rc-sp-lg);
  background: var(--rc-paper);
  border-left: 1px solid var(--rc-rule);
}
.rc-tabbar {
  position: sticky;
  top: 0;
  z-index: var(--rc-z-raised);
  margin-inline: calc(var(--rc-pane-x) * -1);
  padding: 0 var(--rc-pane-x);
  background: var(--rc-paper);
}
.rc-tabs { display: flex; align-items: end; gap: var(--rc-sp-lg); border-bottom: 1px solid var(--rc-rule); }
.rc-tab {
  min-height: 38px;
  min-width: 64px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding: var(--rc-sp-sm) var(--rc-sp-2xs) calc(var(--rc-sp-sm) - 2px);
  background: transparent;
  color: var(--rc-muted);
  font-size: var(--rc-text-md);
  font-weight: 600;
  transition: color var(--rc-dur) var(--rc-ease), border-color var(--rc-dur) var(--rc-ease);
}
.rc-tab[aria-selected="true"] { border-bottom-color: var(--rc-accent); color: var(--rc-accent-ink); }
.rc-tabpanel[hidden] { display: none; }

.rc-preset-bar { min-width: 0; margin-bottom: var(--rc-sp-md); }
.rc-group { margin: 0; border-bottom: 1px solid var(--rc-rule); background: transparent; }
/* A rule under the last section would close nothing - there is only pane padding beneath it. */
.rc-group:last-of-type, .rc-section:last-of-type { border-bottom: 0; }
.rc-group__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rc-sp-sm);
  margin: 0;
  padding: var(--rc-sp-md) 0;
  list-style: none;
  color: var(--rc-ink);
  font-size: var(--rc-text-lg);
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
  user-select: none;
}
.rc-group__title::-webkit-details-marker { display: none; }
.rc-group[open] .rc-summary-icon { transform: rotate(180deg); }
.rc-group__body { padding: 0 0 var(--rc-sp-lg); }
.rc-section { margin: 0; border: 0; border-bottom: 1px solid var(--rc-rule); background: transparent; }
.rc-section summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: var(--rc-sp-xs);
  justify-content: space-between;
  padding: var(--rc-sp-md) 0;
  font-size: var(--rc-text-lg);
  line-height: 1.35;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}
.rc-section summary::-webkit-details-marker { display: none; }
.rc-summary-icon { margin-left: auto; color: var(--rc-muted); transition: transform var(--rc-dur) var(--rc-ease); }
.rc-section[open] .rc-summary-icon { transform: rotate(180deg); }
.rc-section__body { padding: 0 0 var(--rc-sp-lg); }

.rc-label { display: block; margin: var(--rc-sp-md) 0 var(--rc-sp-xs); color: var(--rc-label); font-size: var(--rc-text-md); font-weight: 600; }
.rc-help { margin: var(--rc-sp-xs) 0 0; color: var(--rc-muted); font-size: var(--rc-text-sm); line-height: 1.55; }
.rc-field, .rc-textarea, .rc-select {
  width: 100%;
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-sm);
  padding: var(--rc-sp-sm);
  color: var(--rc-ink);
  background: var(--rc-paper-sunk);
  font-size: var(--rc-text-md);
  outline: none;
}
.rc-field:focus-visible, .rc-textarea:focus-visible, .rc-select:focus-visible { border-color: var(--rc-accent); outline: 2px solid var(--rc-focus); outline-offset: 2px; }
.rc-textarea { min-height: 210px; resize: vertical; line-height: 1.65; }
.rc-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: var(--rc-sp-sm); }
/* One slot hidden (solid background, or a photo covering the colours) would otherwise leave the
   remaining field at 55% width with dead space beside it. */
.rc-row:has(> [hidden]) { grid-template-columns: minmax(0, 1fr); }
.rc-row[hidden] { display: none; }
.rc-fieldline { display: flex; align-items: center; gap: var(--rc-sp-xs); }
.rc-fieldline .rc-field { flex: 1; }
.rc-checkbox { width: 18px; height: 18px; accent-color: var(--rc-accent); }
.rc-checkbox:disabled { cursor: not-allowed; }
.rc-switch-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rc-sp-xs) var(--rc-sp-md); margin-bottom: var(--rc-sp-2xs); }
.rc-switch { display: flex; align-items: center; gap: var(--rc-sp-xs); font-size: var(--rc-text-md); font-weight: 600; cursor: pointer; }
.rc-switch:has(.rc-checkbox:disabled) { color: var(--rc-muted); cursor: not-allowed; }
.rc-field:disabled, .rc-select:disabled { background: var(--rc-paper-sunk); color: var(--rc-muted); cursor: not-allowed; }
.rc-inline-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--rc-sp-xs); margin-top: var(--rc-sp-sm); }

.rc-replacement-list { display: grid; row-gap: var(--rc-sp-xs); margin-top: var(--rc-sp-sm); }
.rc-replacement {
  display: grid;
  grid-template-columns: 1fr 28px 1fr auto 36px;
  grid-template-areas:
    "find arrow replace case remove"
    "count count count count count";
  align-items: center;
  gap: var(--rc-sp-xs);
  padding: var(--rc-sp-xs) 0;
  border: 0;
  background: transparent;
}
.rc-replacement .rc-field { min-width: 0; padding: var(--rc-sp-xs); }
.rc-replacement__find { grid-area: find; }
.rc-replacement__arrow { grid-area: arrow; text-align: center; color: var(--rc-muted); }
.rc-replacement__replace { grid-area: replace; }
.rc-replacement__case { grid-area: case; display: flex; gap: var(--rc-sp-2xs); align-items: center; color: var(--rc-muted); font-size: var(--rc-text-sm); white-space: nowrap; }
.rc-replacement__remove { grid-area: remove; }
.rc-count { grid-area: count; min-width: 24px; justify-self: end; text-align: center; color: var(--rc-accent-ink); font-family: var(--rc-font-num); font-size: var(--rc-text-sm); font-weight: 600; }

.rc-preset-grid {
  display: flex;
  gap: var(--rc-sp-sm);
  margin: 0;
  padding: var(--rc-sp-2xs) 2px var(--rc-sp-sm);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  cursor: grab;
  user-select: none;
}
.rc-preset-grid::-webkit-scrollbar { display: none; }
.rc-preset-grid[data-dragging="true"] { cursor: grabbing; scroll-snap-type: none; }
.rc-preset {
  flex: 0 0 72px;
  min-width: 72px;
  padding: 0;
  border: 0;
  border-radius: var(--rc-r-md);
  background: transparent;
  color: var(--rc-ink);
  text-align: center;
  scroll-snap-align: start;
}
.rc-preset:hover .rc-preset__swatch,
.rc-preset:focus-visible .rc-preset__swatch,
.rc-preset:hover .rc-preset__settings-icon,
.rc-preset:focus-visible .rc-preset__settings-icon { box-shadow: 0 0 0 1.5px var(--rc-rule); }
.rc-preset[aria-pressed="true"] .rc-preset__swatch,
.rc-preset--just-created .rc-preset__swatch { box-shadow: 0 0 0 2px var(--rc-accent); }
.rc-preset--just-created .rc-preset__swatch { animation: rc-preset-flash 400ms var(--rc-ease); }
@keyframes rc-preset-flash { 50% { box-shadow: 0 0 0 4px var(--rc-accent); } }
.rc-preset__swatch,
.rc-preset__settings-icon {
  display: grid;
  width: 68px;
  height: 68px;
  margin: 2px auto var(--rc-sp-xs);
  border-radius: var(--rc-r-md);
  box-shadow: inset 0 0 0 1px var(--rc-hairline);
}
.rc-preset__swatch { object-fit: cover; }
.rc-preset__settings-icon {
  place-items: center;
  /* Dashed, so the only way into preset management does not sit in the row pretending to be one
     more preset the way a filled tile did. */
  border: 1px dashed var(--rc-rule);
  background: var(--rc-paper);
  color: var(--rc-label);
  box-shadow: none;
}
.rc-preset__name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--rc-text-sm); font-weight: 600; }

.rc-confirm-modal {
  position: fixed;
  inset: 0;
  z-index: calc(var(--rc-z-modal) + 1);
  display: grid;
  place-items: center;
  padding: var(--rc-sp-md);
  background: var(--rc-scrim);
}
.rc-confirm-modal[hidden] { display: none; }
.rc-confirm-dialog {
  width: min(100%, 440px);
  padding: var(--rc-sp-lg);
  border-radius: var(--rc-r-md);
  background: var(--rc-paper);
  box-shadow: 0 8px 28px oklch(20% .02 200 / .22);
}
.rc-confirm-dialog h2 { margin: 0 0 var(--rc-sp-xs); font-size: var(--rc-text-xl); font-weight: 700; }
.rc-confirm-dialog p { margin: 0; color: var(--rc-muted); font-size: var(--rc-text-md); line-height: 1.6; }
.rc-confirm-actions { justify-content: flex-end; margin-top: var(--rc-sp-md); }

.rc-preset-modal {
  position: fixed;
  inset: 0;
  z-index: var(--rc-z-modal);
  display: grid;
  place-items: center;
  padding: var(--rc-sp-md);
  background: var(--rc-scrim);
}
.rc-preset-modal[hidden] { display: none; }
.rc-preset-dialog {
  position: relative;
  width: min(100%, 560px);
  max-height: calc(100dvh - var(--rc-sp-2xl));
  overflow: auto;
  padding: var(--rc-sp-lg);
  border-radius: var(--rc-r-md);
  background: var(--rc-paper);
  box-shadow: 0 8px 28px oklch(20% .02 200 / .22);
}
.rc-preset-dialog h2 { margin: 0 var(--rc-sp-2xl) var(--rc-sp-2xs) 0; font-size: var(--rc-text-xl); font-weight: 700; }
.rc-preset-dialog__intro { margin: 0 0 var(--rc-sp-md); color: var(--rc-muted); font-size: var(--rc-text-md); }
.rc-preset-dialog__close { position: absolute; top: var(--rc-sp-sm); right: var(--rc-sp-sm); }
.rc-preset-menu { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--rc-sp-xs); }
.rc-preset-menu__button {
  min-height: 64px;
  padding: var(--rc-sp-sm);
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-sm);
  background: var(--rc-paper);
  color: var(--rc-ink);
  font-family: var(--rc-font-ui);
  font-size: var(--rc-text-md);
  font-weight: 600;
  line-height: 1.35;
}
.rc-preset-menu__button:hover { background: var(--rc-paper-sunk); }
.rc-preset-menu__button[aria-selected="true"] { border-color: transparent; color: var(--rc-accent-ink); background: var(--rc-paper); box-shadow: inset 0 0 0 1.5px var(--rc-accent); }
.rc-preset-panel { margin-top: var(--rc-sp-lg); padding: 0; border: 0; background: var(--rc-paper); }
.rc-preset-panel[hidden], #rc-manage-list[hidden], #rc-manage-help[hidden] { display: none; }
.rc-manage-list { margin: 0; padding: 0; list-style: none; display: grid; }
.rc-manage-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--rc-sp-xs);
  padding: var(--rc-sp-xs) 0;
  border: 0;
  border-bottom: 1px solid var(--rc-rule-soft);
  background: var(--rc-paper);
}
.rc-manage-item:last-child { border-bottom: 0; }
.rc-manage-item__swatch { width: 40px; height: 40px; border-radius: var(--rc-r-sm); border: 1px solid var(--rc-rule); }
.rc-manage-item__name { min-width: 0; min-height: 36px; }
.rc-manage-item__actions { display: flex; align-items: center; gap: var(--rc-sp-2xs); }
.rc-manage-item__action { min-height: 36px; }
.rc-manage-item__action.rc-icon-button { width: 34px; }
.rc-manage-item__action.rc-button--danger { padding: var(--rc-sp-xs) var(--rc-sp-sm); }
.rc-preset-panel .rc-label:first-child { margin-top: 0; }
.rc-preset-panel__primary { width: 100%; margin-top: var(--rc-sp-sm); }
.rc-preset-transfer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--rc-sp-xs); }
.rc-preset-empty { margin: 0; color: var(--rc-muted); text-align: center; font-size: var(--rc-text-md); }

.rc-control { margin-top: var(--rc-sp-md); }
.rc-control__head { display: flex; align-items: center; justify-content: space-between; gap: var(--rc-sp-xs); margin-bottom: var(--rc-sp-xs); color: var(--rc-label); font-size: var(--rc-text-md); font-weight: 600; }
.rc-number-control { display: grid; grid-template-columns: minmax(0, 1fr) 92px; align-items: center; gap: var(--rc-sp-sm); }
.rc-range {
  --rc-range-progress: 0%;
  width: 100%;
  min-width: 0;
  height: 4px;
  border-radius: var(--rc-r-pill);
  background: linear-gradient(
    to right,
    var(--rc-accent) 0%,
    var(--rc-accent) var(--rc-range-progress),
    var(--rc-rule) var(--rc-range-progress),
    var(--rc-rule) 100%
  );
  appearance: none;
  -webkit-appearance: none;
  outline: none;
}
.rc-range::-webkit-slider-runnable-track { height: 4px; border-radius: var(--rc-r-pill); background: transparent; }
.rc-range::-webkit-slider-thumb { width: 16px; height: 16px; margin-top: -6px; border: 0; border-radius: 50%; background: var(--rc-accent); appearance: none; -webkit-appearance: none; }
.rc-range::-moz-range-track { height: 4px; border: 0; border-radius: var(--rc-r-pill); background: transparent; }
.rc-range::-moz-range-progress { height: 4px; border-radius: var(--rc-r-pill); background: var(--rc-accent); }
.rc-range::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: var(--rc-accent); }
.rc-number-entry { height: 38px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--rc-sp-2xs); padding: 0 var(--rc-sp-xs); border: 1px solid var(--rc-rule); border-radius: var(--rc-r-sm); background: var(--rc-paper-sunk); color: var(--rc-muted); font-size: var(--rc-text-sm); }
.rc-number-entry:focus-within { border-color: var(--rc-accent); outline: 2px solid var(--rc-focus); outline-offset: 2px; }
.rc-number-entry input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--rc-ink); font-family: var(--rc-font-num); text-align: right; font-variant-numeric: tabular-nums; }
.rc-color-control { display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: var(--rc-sp-xs); }
.rc-color-code { min-width: 0; font-family: var(--rc-font-num); text-transform: uppercase; letter-spacing: .02em; }
.rc-color-picker { width: 42px; height: 42px; padding: 3px; border: 1px solid var(--rc-rule); border-radius: var(--rc-r-sm); background: var(--rc-paper); cursor: pointer; }
.rc-segment { display: grid; grid-template-columns: 1fr 1fr; gap: var(--rc-sp-xs); }
.rc-segment label { position: relative; }
.rc-segment input { position: absolute; opacity: 0; pointer-events: none; }
.rc-segment span {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: var(--rc-sp-xs);
  padding: var(--rc-sp-xs) var(--rc-sp-sm);
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-sm);
  background: var(--rc-paper);
  color: var(--rc-label);
  font-size: var(--rc-text-md);
  font-weight: 600;
  transition: color var(--rc-dur) var(--rc-ease), background var(--rc-dur) var(--rc-ease);
}
.rc-segment span .icon-tabler { width: 18px; height: 18px; }
.rc-segment label:hover span { background: var(--rc-paper-sunk); }
/* One selected language across the panel: accent ring + accent ink. A filled half also made the
   two options read as different widths even when the grid was even. */
.rc-segment input:checked + span { border-color: transparent; background: var(--rc-paper); color: var(--rc-accent-ink); box-shadow: inset 0 0 0 1.5px var(--rc-accent); }

.rc-photo-box { margin-top: var(--rc-sp-md); padding: 0; border: 0; background: transparent; }
.rc-photo-box .rc-inline-actions { margin-top: 0; }
.rc-photo-status { display: block; margin-top: var(--rc-sp-xs); color: var(--rc-muted); font-size: var(--rc-text-sm); overflow-wrap: anywhere; }

.rc-photo-save-modal {
  position: fixed;
  inset: 0;
  z-index: var(--rc-z-modal);
  display: grid;
  place-items: center;
  padding: var(--rc-sp-md);
  background: var(--rc-scrim);
}
.rc-photo-save-modal[hidden] { display: none; }
.rc-photo-save-dialog {
  position: relative;
  width: min(100%, 620px);
  max-height: calc(100dvh - var(--rc-sp-2xl));
  overflow: auto;
  padding: var(--rc-sp-lg);
  border-radius: var(--rc-r-md);
  background: var(--rc-paper);
  box-shadow: 0 8px 28px oklch(20% .02 200 / .22);
}
.rc-photo-save-dialog h2 { margin: 0 var(--rc-sp-2xl) var(--rc-sp-xs) 0; font-size: var(--rc-text-xl); font-weight: 700; }
.rc-photo-save-dialog p { margin: 0 0 var(--rc-sp-md); color: var(--rc-muted); font-size: var(--rc-text-md); line-height: 1.55; }
.rc-photo-save-close { position: absolute; top: var(--rc-sp-sm); right: var(--rc-sp-sm); }
.rc-photo-save-image-wrap { padding: var(--rc-sp-xs); border-radius: var(--rc-r-md); background: var(--rc-paper-sunk); }
.rc-photo-save-image-wrap img { display: block; width: 100%; height: auto; max-height: 62dvh; object-fit: contain; border-radius: var(--rc-r-sm); -webkit-touch-callout: default; user-select: auto; }
.rc-photo-save-actions { justify-content: flex-end; }

.rc-toast {
  position: fixed;
  left: 50%;
  bottom: var(--rc-sp-lg);
  /* Feedback can be emitted while a modal stays open (for example after deleting a preset), so it
     sits above every modal layer rather than behind the scrim. */
  z-index: var(--rc-z-toast);
  max-width: min(440px, calc(100vw - var(--rc-sp-xl)));
  transform: translate(-50%, 18px);
  opacity: 0;
  pointer-events: none;
  border-radius: var(--rc-r-sm);
  padding: var(--rc-sp-sm) var(--rc-sp-md);
  background: var(--rc-ink);
  color: #fff;
  font-size: var(--rc-text-md);
  box-shadow: 0 8px 28px oklch(20% .02 200 / .22);
  transition: opacity var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease);
}
.rc-toast[data-visible="true"] { opacity: 1; transform: translate(-50%, 0); }
.rc-toast[data-kind="error"] { background: var(--rc-danger-deep); }

@media (max-width: 920px) {
  body { overflow: auto; }
  #risu-capture-root {
    --rc-pane-x: var(--rc-sp-md);
    /* The sticky preview and the sticky tab bar both derive their offsets from this. svh, not
       dvh, so a phone's collapsing URL bar cannot resize the strip mid-scroll. */
    --rc-preview-h: clamp(150px, 32svh, 320px);
  }
  #risu-capture-root.rc-preview-collapsed { --rc-preview-h: 46px; }
  .rc-topbar { grid-template-columns: minmax(0, 1fr) auto; padding: 0 var(--rc-sp-xs); }
  .rc-workspace { height: auto; display: block; }

  /* Kept in view while the editor scrolls, so a style change is visible without scrolling back. */
  .rc-preview-pane {
    position: sticky;
    top: var(--rc-topbar-h);
    z-index: calc(var(--rc-z-sticky) + 1);
    min-height: var(--rc-preview-h);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--rc-sp-xs) var(--rc-sp-md);
    border-bottom: 1px solid var(--rc-rule);
    overflow: visible;
  }
  .rc-preview-shell { width: 100%; }
  /* Cropped, not scaled down: a long quote keeps its full width and is cut off at the strip's
     height, with a fade marking the cut. The full image stays one tap away under 크게. */
  .rc-preview-card {
    position: relative;
    display: block;
    padding: 0;
    max-height: calc(var(--rc-preview-h) - 54px);
    overflow: hidden;
    border-radius: 0;
    box-shadow: 0 0 0 1px var(--rc-hairline);
  }
  .rc-preview-card[data-clipped="true"]::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 40px;
    background: linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.94));
    pointer-events: none;
  }
  .rc-preview-meta { margin-top: var(--rc-sp-xs); }
  .rc-preview-tools { display: flex; }
  .rc-preview-collapsed .rc-preview-card { display: none; }
  .rc-preview-collapsed .rc-preview-meta { margin-top: 0; }

  .rc-editor-pane { overflow: visible; border-left: 0; }
  .rc-tabbar { top: calc(var(--rc-topbar-h) + var(--rc-preview-h)); }

  .rc-mobile-preview-open .rc-preview-pane {
    position: fixed;
    inset: var(--rc-topbar-h) 0 0;
    z-index: calc(var(--rc-z-sticky) + 2);
    display: block;
    min-height: 0;
    padding: 54px var(--rc-sp-md) var(--rc-sp-lg);
    overflow: auto;
  }
  .rc-mobile-preview-open .rc-preview-shell { width: min(100%, 560px); margin: 0 auto; }
  .rc-mobile-preview-open .rc-preview-card { padding: 0; max-height: none; overflow: visible; border-radius: 0; }
  .rc-mobile-preview-open .rc-preview-card::after { display: none; }
  .rc-mobile-preview-open .rc-preview-tools { display: none; }
  .rc-mobile-preview-open .rc-preview-close {
    position: fixed;
    top: calc(var(--rc-topbar-h) + var(--rc-sp-xs));
    right: var(--rc-sp-sm);
    z-index: calc(var(--rc-z-sticky) + 3);
    display: block;
    background: var(--rc-paper);
  }
}

@media (min-width: 1400px) {
  .rc-workspace { grid-template-columns: minmax(420px, 1fr) minmax(560px, 700px); }
  #rc-tab-style:not([hidden]) { display: grid; grid-template-columns: 1fr 1fr; align-items: start; column-gap: var(--rc-sp-md); }
  #rc-tab-style .rc-preset-bar { grid-column: 1 / -1; }
  #rc-tab-style .rc-row { grid-template-columns: 1fr; }
}


.rc-work-savebar {
  display: flex;
  align-items: center;
  gap: var(--rc-sp-xs);
  padding: var(--rc-sp-sm) var(--rc-sp-md);
  border-bottom: 1px solid var(--rc-rule);
  background: var(--rc-paper);
}
.rc-work-savebar .rc-button { flex: 0 0 auto; }
.rc-autosave-status {
  margin-left: auto;
  min-width: 0;
  color: var(--rc-muted);
  font-size: var(--rc-text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc-project-dialog { width: min(780px, 100%); }
.rc-project-save-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--rc-sp-xs);
  margin-top: var(--rc-sp-md);
}
.rc-project-transfer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rc-sp-xs);
  margin-top: var(--rc-sp-sm);
}
.rc-project-list {
  display: grid;
  gap: var(--rc-sp-sm);
  margin-top: var(--rc-sp-lg);
}
.rc-project-card {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: var(--rc-sp-md);
  padding: var(--rc-sp-sm);
  border: 1px solid var(--rc-rule);
  border-radius: var(--rc-r-md);
  background: var(--rc-paper);
}
.rc-project-thumb {
  width: 116px;
  height: 96px;
  border-radius: var(--rc-r-sm);
  background: var(--rc-paper-sunk);
  object-fit: cover;
}
.rc-project-thumb--empty {
  display: grid;
  place-items: center;
  color: var(--rc-muted);
  font-size: var(--rc-text-sm);
  text-align: center;
}
.rc-project-card__main { min-width: 0; }
.rc-project-card__title {
  margin: 0;
  font-size: var(--rc-text-md);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc-project-card__meta,
.rc-project-card__preview {
  margin: 4px 0 0;
  color: var(--rc-muted);
  font-size: var(--rc-text-sm);
}
.rc-project-card__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rc-project-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--rc-sp-sm);
}
.rc-project-empty {
  margin: var(--rc-sp-lg) 0 0;
  padding: var(--rc-sp-lg);
  border: 1px dashed var(--rc-rule);
  border-radius: var(--rc-r-md);
  color: var(--rc-muted);
  text-align: center;
}

@media (max-width: 520px) {
  .rc-topbar__right { gap: 4px; }
  .rc-topbar { grid-template-columns: minmax(0, 1fr) auto; }
  .rc-topbar h1 { font-size: var(--rc-text-md); }
  .rc-topbar__right { grid-column: 2; justify-self: end; }
  .rc-topbar .rc-button { min-height: 36px; padding: var(--rc-sp-2xs) var(--rc-sp-xs); font-size: var(--rc-text-sm); }
  .rc-topbar .rc-icon-button { width: 36px; }
  .rc-row { grid-template-columns: 1fr; }
  .rc-preset-grid { margin-inline: calc(var(--rc-sp-2xs) * -1); padding-inline: var(--rc-sp-2xs); }
  .rc-preset-dialog { padding: var(--rc-sp-md); border-radius: var(--rc-r-md); }
  .rc-preset-menu { grid-template-columns: 1fr; }
  .rc-preset-menu__button { min-height: 48px; text-align: left; }
  .rc-preset-transfer-actions { grid-template-columns: 1fr; }
  .rc-manage-item {
    grid-template-columns: 40px minmax(0, 1fr);
    grid-template-areas:
      "swatch name"
      "actions actions";
  }
  .rc-manage-item__swatch { grid-area: swatch; }
  .rc-manage-item__name { grid-area: name; }
  .rc-manage-item__actions { grid-area: actions; justify-content: flex-end; }
  .rc-replacement {
    grid-template-columns: minmax(0, 1fr) 22px minmax(0, 1fr) 36px;
    grid-template-areas:
      "find arrow replace remove"
      "case case count count";
  }
  .rc-replacement__case { margin-top: var(--rc-sp-2xs); }
  .rc-count { display: block; margin-top: var(--rc-sp-2xs); }
  .rc-work-savebar { flex-wrap: wrap; padding: var(--rc-sp-xs) var(--rc-sp-sm); }
  .rc-autosave-status { width: 100%; margin-left: 0; }
  .rc-project-save-row { grid-template-columns: 1fr; }
  .rc-project-card { grid-template-columns: 88px minmax(0, 1fr); gap: var(--rc-sp-sm); }
  .rc-project-thumb { width: 88px; height: 78px; }
  .rc-photo-save-modal { padding: var(--rc-sp-xs); }
  .rc-photo-save-dialog { padding: var(--rc-sp-md); border-radius: var(--rc-r-md); }
  .rc-confirm-modal { padding: var(--rc-sp-xs); }
  .rc-confirm-dialog { padding: var(--rc-sp-md); border-radius: var(--rc-r-md); }
}
`;
  const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
  const PHOTO_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp"]);
  const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
  const MAX_PRESET_FILE_BYTES = 1024 * 1024;
  const CONSENT_PROBE_MS = 400;
  const TAB_NAMES = ["content", "style"];
  const MOBILE_LAYOUT_QUERY = "(max-width: 920px)";
  const METADATA_BINDINGS = [
    ["bot", "rc-bot", "rc-bot-visible"],
    ["model", "rc-model", "rc-model-visible"],
    ["preset", "rc-prompt-preset", "rc-preset-visible"]
  ];
  function element(id) {
    const found = document.getElementById(id);
    if (!found) throw new Error(`필수 UI 요소를 찾을 수 없습니다: ${id}`);
    return found;
  }
  function updateRangeProgress(range) {
    const min = Number(range.min);
    const max = Number(range.max);
    const value = Number(range.value);
    const progress = max > min ? (value - min) / (max - min) * 100 : 0;
    range.style.setProperty("--rc-range-progress", `${Math.min(100, Math.max(0, progress))}%`);
  }
  function newRule() {
    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      find: "",
      replace: "",
      caseSensitive: false
    };
  }
  function normalizeHexInput(value) {
    const normalized = value.trim().toUpperCase();
    const withHash = /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : normalized;
    return HEX_COLOR_PATTERN.test(withHash) ? withHash : null;
  }
  function isIosDevice() {
    return /iPad|iPhone|iPod/u.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }
  function cloneMetadata() {
    return {
      enabled: true,
      divider: true,
      bot: { value: "", visible: true },
      model: { value: "", visible: true },
      preset: { value: "", visible: true }
    };
  }
  function createMarkup() {
    return `
    <div id="risu-capture-root" hidden>
      <header class="rc-topbar">
        <div class="rc-topbar__left">
          <button id="rc-close" class="rc-button rc-button--quiet rc-icon-button" type="button" aria-label="닫기">${ICONS.arrowLeft}</button>
          <h1>Log Capture</h1>
        </div>
        <div class="rc-topbar__right">
          <button id="rc-reset" class="rc-button" type="button">초기화</button>
          <button id="rc-detect" class="rc-button" type="button">정보 불러오기</button>
          <button id="rc-save" class="rc-button rc-button--primary" type="button">PNG 저장</button>
        </div>
      </header>

      <main class="rc-workspace">
        <section class="rc-preview-pane" aria-label="이미지 미리보기">
          <button id="rc-preview-close" class="rc-button rc-button--quiet rc-icon-button rc-preview-close" type="button" aria-label="미리보기 닫기">${ICONS.x}</button>
          <div class="rc-preview-shell">
            <div id="rc-preview-card" class="rc-preview-card"><canvas id="rc-preview" width="720" height="240"></canvas></div>
            <div class="rc-preview-meta">
              <span id="rc-size">720 × 240px</span>
              <span id="rc-preview-message">PNG 미리보기</span>
              <div class="rc-preview-tools">
                <button id="rc-preview-expand" class="rc-preview-tool" type="button">${ICONS.arrowsMaximize}<span>크게</span></button>
                <button id="rc-preview-collapse" class="rc-preview-tool rc-preview-tool--icon" type="button" aria-expanded="true" aria-label="미리보기 접기"><span aria-hidden="true">${ICONS.chevronUp}</span></button>
              </div>
            </div>
          </div>
        </section>

        <aside id="rc-editor-pane" class="rc-editor-pane">
          <div class="rc-tabbar">
            <div class="rc-tabs" role="tablist" aria-label="편집 영역">
              <button id="rc-tab-btn-content" class="rc-tab" type="button" role="tab" data-tab="content" aria-selected="true" aria-controls="rc-tab-content">내용</button>
              <button id="rc-tab-btn-style" class="rc-tab" type="button" role="tab" data-tab="style" aria-selected="false" aria-controls="rc-tab-style">디자인</button>
            </div>
          </div>

          <div class="rc-work-savebar" aria-label="작업물 저장">
            <button id="rc-work-save" class="rc-button rc-button--primary" type="button">작업 저장</button>
            <button id="rc-work-library" class="rc-button" type="button">저장함</button>
            <span id="rc-autosave-status" class="rc-autosave-status" aria-live="polite">자동저장 준비 중</span>
          </div>

          <div id="rc-tab-content" class="rc-tabpanel" role="tabpanel" aria-labelledby="rc-tab-btn-content">
          <details class="rc-section" open>
            <summary><span>본문</span><span class="rc-summary-icon">${ICONS.chevronDown}</span></summary>
            <div class="rc-section__body">
              <textarea id="rc-text" class="rc-textarea" aria-label="이미지로 만들 내용" placeholder="원하는 문장이나 문단을 복사해 붙여넣으세요."></textarea>
              <p class="rc-help">**굵게**, *기울임*, ***굵은 기울임***. &gt; 인용구는 큰따옴표로 표시됩니다.</p>
            </div>
          </details>

          <details class="rc-section">
            <summary><span>단어 치환</span><span class="rc-summary-icon">${ICONS.chevronDown}</span></summary>
            <div class="rc-section__body">
              <div id="rc-replacements" class="rc-replacement-list"></div>
              <div class="rc-inline-actions">
                <button id="rc-add-rule" class="rc-button" type="button">규칙 추가</button>
                <button id="rc-apply-rules" class="rc-button rc-button--primary" type="button">전체 치환</button>
                <button id="rc-undo-rules" class="rc-button" type="button" disabled>치환 취소</button>
                <span id="rc-replacement-result" class="rc-help" aria-live="polite"></span>
              </div>
            </div>
          </details>

          <details class="rc-section">
            <summary><span>하단 정보</span><span class="rc-summary-icon">${ICONS.chevronDown}</span></summary>
            <div class="rc-section__body">
              <div class="rc-switch-row">
                <label class="rc-switch"><input id="rc-metadata-visible" class="rc-checkbox" type="checkbox" checked><span>하단 정보 표시</span></label>
                <label class="rc-switch"><input id="rc-divider-visible" class="rc-checkbox" type="checkbox" checked><span>구분선 표시</span></label>
              </div>
              <label class="rc-label" for="rc-bot">봇 이름</label>
              <div class="rc-fieldline"><input id="rc-bot-visible" class="rc-checkbox" type="checkbox" checked aria-label="봇 이름 표시"><input id="rc-bot" class="rc-field" type="text" maxlength="120" placeholder="예: 리수"></div>
              <label class="rc-label" for="rc-model">모델명</label>
              <div class="rc-fieldline"><input id="rc-model-visible" class="rc-checkbox" type="checkbox" checked aria-label="모델명 표시"><input id="rc-model" class="rc-field" type="text" maxlength="160" placeholder="예: Claude Sonnet"></div>
              <label class="rc-label" for="rc-prompt-preset">프롬프트 프리셋</label>
              <div class="rc-fieldline"><input id="rc-preset-visible" class="rc-checkbox" type="checkbox" checked aria-label="프롬프트 프리셋 표시"><input id="rc-prompt-preset" class="rc-field" type="text" maxlength="160" placeholder="예: Roleplay v2"></div>
            </div>
          </details>
          </div>

          <div id="rc-tab-style" class="rc-tabpanel" role="tabpanel" aria-labelledby="rc-tab-btn-style" hidden>
          <section class="rc-preset-bar" aria-label="스타일 프리셋">
            <div id="rc-preset-grid" class="rc-preset-grid" role="group" tabindex="0" aria-label="스타일 프리셋 목록, 좌우로 스크롤할 수 있습니다"></div>
          </section>

          <details class="rc-group" open>
            <summary class="rc-group__title"><span>배경</span><span class="rc-summary-icon">${ICONS.chevronDown}</span></summary>
            <div class="rc-group__body">
              <div class="rc-photo-box">
                <input id="rc-photo-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>
                <div class="rc-inline-actions">
                  <button id="rc-photo-choose" class="rc-button" type="button">사진 가져오기</button>
                  <button id="rc-photo-clear" class="rc-button rc-button--danger" type="button" disabled>사진 제거</button>
                </div>
                <span id="rc-photo-status" class="rc-photo-status">선택한 사진이 없습니다. PNG·JPEG·WebP, 최대 20MB</span>
              </div>
              <div class="rc-row">
                <div><label class="rc-label" for="rc-background-kind">배경 유형</label><select id="rc-background-kind" class="rc-select"><option value="solid">단색</option><option value="gradient">그라데이션</option><option value="photo">사진</option></select></div>
                <div id="rc-texture-wrap"><label class="rc-label" for="rc-texture">질감</label><select id="rc-texture" class="rc-select"><option value="none">없음</option><option value="grain">그레인</option><option value="stars">별</option></select></div>
              </div>
              <div class="rc-row" id="rc-color-row">
                <div><label class="rc-label" for="rc-color1">기본 색상 (HEX)</label><div class="rc-color-control"><input id="rc-color1" class="rc-field rc-color-code" type="text" inputmode="text" maxlength="7" spellcheck="false" placeholder="#414B4B"><input id="rc-color1-picker" class="rc-color-picker" type="color" aria-label="기본 색상 선택"></div></div>
                <div id="rc-color2-wrap"><label class="rc-label" for="rc-color2">끝 색상 (HEX)</label><div class="rc-color-control"><input id="rc-color2" class="rc-field rc-color-code" type="text" inputmode="text" maxlength="7" spellcheck="false" placeholder="#263131"><input id="rc-color2-picker" class="rc-color-picker" type="color" aria-label="끝 색상 선택"></div></div>
              </div>
              <div class="rc-control"><div class="rc-control__head"><label for="rc-overlay">어두운 오버레이</label></div><div class="rc-number-control"><input id="rc-overlay" class="rc-range" type="range" min="0" max="85" step="1"><label class="rc-number-entry"><input id="rc-overlay-input" type="number" min="0" max="85" step="1" aria-label="어두운 오버레이 직접 입력"><span>%</span></label></div></div>
              <div class="rc-control"><div class="rc-control__head"><label for="rc-corner-radius">모서리 둥글기</label></div><div class="rc-number-control"><input id="rc-corner-radius" class="rc-range" type="range" min="0" max="${MAX_CORNER_RADIUS}" step="1"><label class="rc-number-entry"><input id="rc-corner-radius-input" type="number" min="0" max="${MAX_CORNER_RADIUS}" step="1" aria-label="모서리 둥글기 직접 입력"><span>px</span></label></div></div>
            </div>
          </details>

          <details class="rc-group" open>
            <summary class="rc-group__title"><span>글자</span><span class="rc-summary-icon">${ICONS.chevronDown}</span></summary>
            <div class="rc-group__body">
              <div class="rc-row">
                <div><label class="rc-label" for="rc-font">글꼴</label><select id="rc-font" class="rc-select"><option value="serif">명조/바탕</option><option value="ridi">리디바탕</option><option value="sans">고딕</option><option value="rounded">둥근 고딕</option><option value="mono">고정폭</option></select></div>
                <div><label class="rc-label" for="rc-text-color">글자 색 (HEX)</label><div class="rc-color-control"><input id="rc-text-color" class="rc-field rc-color-code" type="text" inputmode="text" maxlength="7" spellcheck="false" placeholder="#FFFFFF"><input id="rc-text-color-picker" class="rc-color-picker" type="color" aria-label="글자 색 선택"></div></div>
              </div>
              <div class="rc-control"><div class="rc-control__head"><label for="rc-font-size">글자 크기</label></div><div class="rc-number-control"><input id="rc-font-size" class="rc-range" type="range" min="14" max="72" step="1"><label class="rc-number-entry"><input id="rc-font-size-input" type="number" min="14" max="72" step="1" aria-label="글자 크기 직접 입력"><span>px</span></label></div></div>
              <div class="rc-control"><div class="rc-control__head"><label for="rc-line-height">행간</label></div><div class="rc-number-control"><input id="rc-line-height" class="rc-range" type="range" min="1.1" max="2.2" step="0.05"><label class="rc-number-entry"><input id="rc-line-height-input" type="number" min="1.1" max="2.2" step="0.05" aria-label="행간 직접 입력"><span>배</span></label></div></div>
              <div class="rc-control"><div class="rc-control__head"><span>정렬</span></div><div class="rc-segment"><label><input id="rc-align-left" type="radio" name="rc-align" value="left"><span>${ICONS.alignLeft}왼쪽</span></label><label><input id="rc-align-center" type="radio" name="rc-align" value="center"><span>${ICONS.alignCenter}가운데</span></label></div></div>
              <div class="rc-control"><div class="rc-control__head"><label for="rc-padding">안쪽 여백</label></div><div class="rc-number-control"><input id="rc-padding" class="rc-range" type="range" min="40" max="120" step="2"><label class="rc-number-entry"><input id="rc-padding-input" type="number" min="40" max="120" step="2" aria-label="안쪽 여백 직접 입력"><span>px</span></label></div></div>
            </div>
          </details>
          </div>
        </aside>
      </main>
      <div id="rc-confirm-modal" class="rc-confirm-modal" hidden>
        <section class="rc-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-confirm-title" aria-describedby="rc-confirm-description">
          <h2 id="rc-confirm-title"></h2>
          <p id="rc-confirm-description"></p>
          <div class="rc-inline-actions rc-confirm-actions">
            <button id="rc-confirm-cancel" class="rc-button" type="button">취소</button>
            <button id="rc-confirm-accept" class="rc-button rc-button--danger" type="button"></button>
          </div>
        </section>
      </div>
      <div id="rc-photo-save-modal" class="rc-photo-save-modal" hidden>
        <section class="rc-photo-save-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-photo-save-title">
          <button id="rc-photo-save-close" class="rc-button rc-button--quiet rc-icon-button rc-photo-save-close" type="button" aria-label="사진 저장 안내 닫기">${ICONS.x}</button>
          <h2 id="rc-photo-save-title">사진 앱에 저장</h2>
          <p>아래 이미지를 길게 누른 뒤 <strong>사진 앱에 저장</strong> 또는 <strong>이미지 저장</strong>을 선택하세요.</p>
          <div class="rc-photo-save-image-wrap"><img id="rc-photo-save-image" alt="저장할 Log Capture 이미지"></div>
          <div class="rc-inline-actions rc-photo-save-actions">
            <button id="rc-photo-save-file" class="rc-button" type="button">파일로 다운로드</button>
            <button id="rc-photo-save-done" class="rc-button rc-button--primary" type="button">닫기</button>
          </div>
        </section>
      </div>
      <div id="rc-preset-modal" class="rc-preset-modal" hidden>
        <section class="rc-preset-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-preset-modal-title">
          <button id="rc-preset-modal-close" class="rc-button rc-button--quiet rc-icon-button rc-preset-dialog__close" type="button" aria-label="프리셋 관리 닫기">${ICONS.x}</button>
          <h2 id="rc-preset-modal-title">프리셋 관리</h2>
          <p class="rc-preset-dialog__intro">원하는 작업을 선택해 주세요.</p>
          <div class="rc-preset-menu" role="tablist" aria-label="프리셋 관리 작업">
            <button class="rc-preset-menu__button" type="button" data-preset-panel="new" role="tab" aria-selected="false">새 프리셋 추가</button>
            <button class="rc-preset-menu__button" type="button" data-preset-panel="transfer" role="tab" aria-selected="false">가져오기·내보내기</button>
            <button class="rc-preset-menu__button" type="button" data-preset-panel="manage" role="tab" aria-selected="false">편집 및 삭제</button>
          </div>

          <div id="rc-preset-panel-new" class="rc-preset-panel" role="tabpanel" hidden>
            <label class="rc-label" for="rc-preset-name">새 프리셋 이름</label>
            <input id="rc-preset-name" class="rc-field" type="text" maxlength="40" placeholder="나만의 프리셋">
            <button id="rc-create-preset" class="rc-button rc-button--primary rc-preset-panel__primary" type="button">현재 설정으로 추가</button>
            <p class="rc-help">내장 프리셋을 선택한 뒤 추가하면 사용자 프리셋으로 복제됩니다. 배경 사진과 본문은 포함되지 않습니다.</p>
          </div>

          <div id="rc-preset-panel-transfer" class="rc-preset-panel" role="tabpanel" hidden>
            <input id="rc-preset-import-input" type="file" accept="application/json,.json" hidden>
            <div class="rc-preset-transfer-actions">
              <button id="rc-import-presets" class="rc-button rc-button--primary" type="button">프리셋 가져오기</button>
              <button id="rc-export-presets" class="rc-button" type="button">프리셋 내보내기</button>
            </div>
            <p class="rc-help">JSON 파일로 옮길 수 있습니다. 기존 프리셋과 이름이 겹치면 가져온 프리셋 이름을 자동으로 구분합니다.</p>
          </div>

          <div id="rc-preset-panel-manage" class="rc-preset-panel" role="tabpanel" hidden>
            <p id="rc-manage-empty" class="rc-preset-empty" hidden>편집할 사용자 프리셋이 없습니다.</p>
            <ul id="rc-manage-list" class="rc-manage-list"></ul>
            <p id="rc-manage-help" class="rc-help">이름 칸을 고친 뒤 Enter를 누르거나 다른 곳을 누르면 저장됩니다. 위·아래 이동 버튼으로 바꾼 순서는 프리셋 목록에 그대로 반영됩니다.</p>
          </div>
        </section>
      </div>
      <div id="rc-project-modal" class="rc-preset-modal" hidden>
        <section class="rc-preset-dialog rc-project-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-project-modal-title">
          <button id="rc-project-modal-close" class="rc-button rc-button--quiet rc-icon-button rc-preset-dialog__close" type="button" aria-label="작업물 저장함 닫기">${ICONS.x}</button>
          <h2 id="rc-project-modal-title">작업물 저장함</h2>
          <p class="rc-preset-dialog__intro">본문·하단정보·치환규칙·디자인·배경사진까지 저장하고 나중에 그대로 다시 편집할 수 있습니다.</p>
          <div class="rc-project-save-row">
            <input id="rc-project-name" class="rc-field" type="text" maxlength="60" placeholder="작업물 이름">
            <button id="rc-project-save-new" class="rc-button rc-button--primary" type="button">새 작업으로 저장</button>
            <button id="rc-project-overwrite" class="rc-button" type="button">현재 작업 덮어쓰기</button>
          </div>
          <div class="rc-project-transfer">
            <input id="rc-project-import-input" type="file" accept="application/json,.json" hidden>
            <button id="rc-project-import" class="rc-button" type="button">백업 가져오기</button>
            <button id="rc-project-export-all" class="rc-button" type="button">전체 백업 JSON</button>
          </div>
          <p class="rc-help">작업물은 이 브라우저의 IndexedDB에 저장됩니다. 다른 컴퓨터로 옮길 때는 전체 백업 JSON을 사용하세요.</p>
          <p id="rc-project-empty" class="rc-project-empty" hidden>아직 저장한 작업물이 없습니다.</p>
          <div id="rc-project-list" class="rc-project-list"></div>
        </section>
      </div>
      <div id="rc-toast" class="rc-toast" role="status" aria-live="polite"></div>
    </div>
  `;
  }
  class CaptureApp {
    root;
    canvas;
    style;
    userPresets;
    metadata = cloneMetadata();
    rules = [newRule()];
    previousText = null;
    photo = null;
    usePhoto = false;
    activePresetId = null;
    confirmResolve = null;
    renderFrame = null;
    renderRequest = 0;
    persistTimer = null;
    toastTimer = null;
    renderError = null;
    lastRuleCounts = [];
    photoSaveUrl = null;
    pendingPhotoSave = null;
    draftTimer = null;
    draftReady = false;
    suspendDraft = false;
    currentProjectId = null;
    currentProjectName = "";
    projectThumbUrls = [];
    constructor(persisted) {
      const styleElement = document.createElement("style");
      styleElement.textContent = APP_STYLES;
      document.head.appendChild(styleElement);
      document.body.insertAdjacentHTML("beforeend", createMarkup());
      this.root = element("risu-capture-root");
      this.canvas = element("rc-preview");
      this.style = normalizeStyle(persisted.lastStyle);
      this.userPresets = persisted.userPresets;
      this.bindEvents();
      this.syncAllControls();
      this.renderReplacementRules();
      this.renderPresetGrid();
      this.renderManageList();
      this.scheduleRender();
    }
    async open() {
      this.root.hidden = false;
      try {
        await this.restoreAutosaveDraft();
      } catch (error) {
        console.warn("[Log Capture] 자동저장 복원 실패", error);
      }
      this.draftReady = true;
      this.scheduleRender();
      this.scheduleDraftSave();
    }
    async close() {
      this.closeMobilePreview();
      this.settleConfirm(false, false);
      this.hidePhotoSaveModal();
      this.hidePresetModal();
      this.hideProjectModal();
      await this.persistNow();
      await this.saveDraftNow();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    bindEvents() {
      element("rc-close").addEventListener("click", () => void this.close());
      element("rc-reset").addEventListener("click", () => void this.confirmReset());
      element("rc-detect").addEventListener("click", () => void this.fillDetectedMetadata(true));
      element("rc-save").addEventListener("click", () => void this.exportImage());
      element("rc-work-save").addEventListener("click", () => void this.quickSaveProject());
      element("rc-work-library").addEventListener("click", () => void this.showProjectModal());
      element("rc-project-modal-close").addEventListener("click", () => this.hideProjectModal());
      element("rc-project-save-new").addEventListener("click", () => void this.saveProjectAsNewFromModal());
      element("rc-project-overwrite").addEventListener("click", () => void this.overwriteCurrentProjectFromModal());
      element("rc-project-name").addEventListener("keydown", (event) => {
        if (event.key === "Enter") void this.saveProjectAsNewFromModal();
      });
      const projectImportInput = element("rc-project-import-input");
      element("rc-project-import").addEventListener("click", () => projectImportInput.click());
      projectImportInput.addEventListener("change", () => void this.importWorkspaceBackup(projectImportInput.files?.[0]));
      element("rc-project-export-all").addEventListener("click", () => void this.exportWorkspaceBackup());
      const projectModal = element("rc-project-modal");
      projectModal.addEventListener("click", (event) => {
        if (event.target === projectModal) this.hideProjectModal();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.saveDraftNow();
      });
      element("rc-preview-expand").addEventListener("click", () => this.openMobilePreview());
      element("rc-preview-close").addEventListener("click", () => this.closeMobilePreview());
      element("rc-preview-collapse").addEventListener("click", () => this.togglePreviewCollapse());
      window.addEventListener("resize", () => this.updateClippedHint());
      TAB_NAMES.forEach((name, index) => {
        const button = element(`rc-tab-btn-${name}`);
        button.addEventListener("click", () => this.showTab(name));
        button.addEventListener("keydown", (event) => {
          const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          const next = TAB_NAMES[(index + step + TAB_NAMES.length) % TAB_NAMES.length];
          this.showTab(next);
          element(`rc-tab-btn-${next}`).focus();
          event.preventDefault();
        });
      });
      element("rc-photo-save-close").addEventListener("click", () => this.hidePhotoSaveModal());
      element("rc-photo-save-done").addEventListener("click", () => this.hidePhotoSaveModal());
      element("rc-photo-save-file").addEventListener("click", (event) => {
        if (!this.pendingPhotoSave) return;
        this.downloadBlob(this.pendingPhotoSave.blob, this.pendingPhotoSave.filename);
        const button = event.currentTarget;
        button.textContent = "다운로드됨";
        button.dataset.saved = "true";
        window.setTimeout(() => {
          button.textContent = "파일로 다운로드";
          delete button.dataset.saved;
        }, 1600);
      });
      element("rc-text").addEventListener("input", () => this.scheduleRender());
      const confirmModal = element("rc-confirm-modal");
      element("rc-confirm-cancel").addEventListener("click", () => this.settleConfirm(false));
      element("rc-confirm-accept").addEventListener("click", () => this.settleConfirm(true));
      confirmModal.addEventListener("click", (event) => {
        if (event.target === confirmModal) this.settleConfirm(false);
      });
      for (const [key, inputId, checkboxId] of METADATA_BINDINGS) {
        element(inputId).addEventListener("input", (event) => {
          this.metadata[key].value = event.currentTarget.value;
          this.scheduleRender();
        });
        element(checkboxId).addEventListener("change", (event) => {
          this.metadata[key].visible = event.currentTarget.checked;
          this.scheduleRender();
        });
      }
      element("rc-metadata-visible").addEventListener("change", (event) => {
        this.metadata.enabled = event.currentTarget.checked;
        this.updateMetadataControls();
        this.scheduleRender();
      });
      element("rc-divider-visible").addEventListener("change", (event) => {
        this.metadata.divider = event.currentTarget.checked;
        this.scheduleRender();
      });
      element("rc-add-rule").addEventListener("click", () => {
        this.captureRuleInputs();
        this.rules.push(newRule());
        this.renderReplacementRules();
        this.scheduleDraftSave();
      });
      element("rc-apply-rules").addEventListener("click", () => this.applyRules());
      element("rc-undo-rules").addEventListener("click", () => this.undoRules());
      const presetGrid = element("rc-preset-grid");
      let dragPointerId = null;
      let dragStartX = 0;
      let dragStartScrollLeft = 0;
      let dragMoved = false;
      presetGrid.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch" || event.pointerType === "mouse" && event.button !== 0) return;
        dragPointerId = event.pointerId;
        dragStartX = event.clientX;
        dragStartScrollLeft = presetGrid.scrollLeft;
        dragMoved = false;
      });
      presetGrid.addEventListener("pointermove", (event) => {
        if (dragPointerId !== event.pointerId) return;
        const delta = event.clientX - dragStartX;
        if (!dragMoved && Math.abs(delta) > 4) {
          dragMoved = true;
          presetGrid.setPointerCapture?.(event.pointerId);
          presetGrid.dataset.dragging = "true";
        }
        if (!dragMoved) return;
        presetGrid.scrollLeft = dragStartScrollLeft - delta;
        event.preventDefault();
      });
      const finishPresetDrag = (event, preserveMoved) => {
        if (dragPointerId !== event.pointerId) return;
        if (presetGrid.hasPointerCapture?.(event.pointerId)) presetGrid.releasePointerCapture?.(event.pointerId);
        dragPointerId = null;
        delete presetGrid.dataset.dragging;
        if (!preserveMoved) dragMoved = false;
        else window.setTimeout(() => {
          dragMoved = false;
        }, 0);
      };
      presetGrid.addEventListener("pointerup", (event) => finishPresetDrag(event, true));
      presetGrid.addEventListener("pointercancel", (event) => finishPresetDrag(event, false));
      presetGrid.addEventListener("click", (event) => {
        if (!dragMoved) return;
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
      }, true);
      presetGrid.addEventListener("wheel", (event) => {
        const maxScroll = presetGrid.scrollWidth - presetGrid.clientWidth;
        if (maxScroll <= 0) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        const nextScroll = Math.min(maxScroll, Math.max(0, presetGrid.scrollLeft + delta));
        if (nextScroll === presetGrid.scrollLeft) return;
        presetGrid.scrollLeft = nextScroll;
        event.preventDefault();
      }, { passive: false });
      presetGrid.addEventListener("keydown", (event) => {
        if (event.target !== presetGrid || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        presetGrid.scrollBy({ left: event.key === "ArrowRight" ? 164 : -164, behavior: "smooth" });
        event.preventDefault();
      });
      element("rc-create-preset").addEventListener("click", () => void this.createUserPreset());
      const presetImportInput = element("rc-preset-import-input");
      element("rc-import-presets").addEventListener("click", () => presetImportInput.click());
      element("rc-export-presets").addEventListener("click", () => this.exportPresets());
      presetImportInput.addEventListener("change", () => void this.importPresets(presetImportInput.files?.[0]));
      element("rc-preset-name").addEventListener("keydown", (event) => {
        if (event.key === "Enter") void this.createUserPreset();
      });
      const presetModal = element("rc-preset-modal");
      element("rc-preset-modal-close").addEventListener("click", () => this.hidePresetModal());
      presetModal.addEventListener("click", (event) => {
        if (event.target === presetModal) this.hidePresetModal();
      });
      document.querySelectorAll("[data-preset-panel]").forEach((button) => {
        button.addEventListener("click", () => this.showPresetPanel(button.dataset.presetPanel ?? "new"));
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!confirmModal.hidden) this.settleConfirm(false);
        else if (!element("rc-project-modal").hidden) this.hideProjectModal();
        else if (!presetModal.hidden) this.hidePresetModal();
      });
      element("rc-texture").addEventListener("input", () => {
        this.usePhoto = false;
        this.readStyleControls();
        this.updatePhotoStatus();
        this.styleChanged();
      });
      const backgroundKind = element("rc-background-kind");
      backgroundKind.addEventListener("input", () => {
        if (backgroundKind.value !== "photo") {
          this.usePhoto = false;
          this.readStyleControls();
          this.updatePhotoStatus();
          this.styleChanged();
          return;
        }
        if (!this.photo) {
          this.updatePhotoStatus();
          element("rc-photo-input").click();
          return;
        }
        this.usePhoto = true;
        this.updatePhotoStatus();
        this.scheduleRender();
      });
      const bindColorControl = (textId, pickerId, background) => {
        const textInput = element(textId);
        const picker = element(pickerId);
        const applyColor = (value, showError) => {
          const normalized = normalizeHexInput(value);
          if (!normalized) {
            if (showError) this.toast("색상은 #RRGGBB 형식의 HEX 코드로 입력해 주세요.", "error");
            this.syncAllControls();
            return;
          }
          textInput.value = normalized;
          picker.value = normalized;
          this.readStyleControls();
          if (background) {
            this.usePhoto = false;
            this.updatePhotoStatus();
          }
          this.styleChanged();
        };
        textInput.addEventListener("input", () => {
          if (normalizeHexInput(textInput.value)) applyColor(textInput.value, false);
        });
        textInput.addEventListener("blur", () => {
          if (!normalizeHexInput(textInput.value)) applyColor(textInput.value, true);
        });
        picker.addEventListener("input", () => applyColor(picker.value, false));
      };
      bindColorControl("rc-color1", "rc-color1-picker", true);
      bindColorControl("rc-color2", "rc-color2-picker", true);
      bindColorControl("rc-text-color", "rc-text-color-picker", false);
      element("rc-font").addEventListener("input", () => {
        this.readStyleControls();
        this.styleChanged();
      });
      const pairedNumbers = [
        ["rc-overlay", "rc-overlay-input"],
        ["rc-corner-radius", "rc-corner-radius-input"],
        ["rc-font-size", "rc-font-size-input"],
        ["rc-line-height", "rc-line-height-input"],
        ["rc-padding", "rc-padding-input"]
      ];
      for (const [rangeId, numberId] of pairedNumbers) {
        const range = element(rangeId);
        const number = element(numberId);
        range.addEventListener("input", () => {
          number.value = range.value;
          this.readStyleControls();
          this.styleChanged();
        });
        number.addEventListener("input", () => {
          if (!number.value || !number.checkValidity()) return;
          range.value = number.value;
          this.readStyleControls();
          this.styleChanged();
        });
        number.addEventListener("change", () => {
          if (!number.value || !number.checkValidity()) this.updateControlValues();
        });
      }
      for (const id of ["rc-align-left", "rc-align-center"]) {
        element(id).addEventListener("change", () => {
          this.readStyleControls();
          this.styleChanged();
        });
      }
      const photoInput = element("rc-photo-input");
      element("rc-photo-choose").addEventListener("click", () => photoInput.click());
      photoInput.addEventListener("change", () => void this.importPhoto(photoInput.files?.[0]));
      element("rc-photo-clear").addEventListener("click", () => {
        this.photo = null;
        this.usePhoto = false;
        photoInput.value = "";
        this.updatePhotoStatus();
        this.scheduleRender();
      });
    }
    syncAllControls() {
      for (const [key, inputId, checkboxId] of METADATA_BINDINGS) {
        element(inputId).value = this.metadata[key].value;
        element(checkboxId).checked = this.metadata[key].visible;
      }
      element("rc-texture").value = this.style.background.texture;
      element("rc-font").value = this.style.font;
      element(this.style.align === "center" ? "rc-align-center" : "rc-align-left").checked = true;
      this.updateControlValues();
      this.updatePhotoStatus();
      this.updateMetadataControls();
    }
    /**
     * `사진` is a UI-only third value for the background-kind select. A photo is never part of
     * StyleSettings - presets and pluginStorage must stay photo-free - so the style keeps its last
     * solid/gradient kind underneath while the photo is painting.
     */
    updateBackgroundControls() {
      const { kind } = this.style.background;
      element("rc-background-kind").value = this.usePhoto ? "photo" : kind;
      element("rc-texture-wrap").hidden = this.usePhoto;
      element("rc-color-row").hidden = this.usePhoto;
      element("rc-color2-wrap").hidden = kind !== "gradient";
    }
    updateMetadataControls() {
      const { enabled } = this.metadata;
      element("rc-metadata-visible").checked = enabled;
      const divider = element("rc-divider-visible");
      divider.checked = this.metadata.divider;
      divider.disabled = !enabled;
      for (const [, inputId, checkboxId] of METADATA_BINDINGS) {
        element(inputId).disabled = !enabled;
        element(checkboxId).disabled = !enabled;
      }
    }
    readStyleControls() {
      const kindValue = element("rc-background-kind").value;
      this.style = normalizeStyle({
        background: {
          // `사진` carries no style kind of its own; keep the one underneath it.
          kind: kindValue === "photo" ? this.style.background.kind : kindValue,
          texture: element("rc-texture").value,
          color1: element("rc-color1").value,
          color2: element("rc-color2").value
        },
        overlay: Number(element("rc-overlay").value) / 100,
        cornerRadius: Number(element("rc-corner-radius").value),
        font: element("rc-font").value,
        textColor: element("rc-text-color").value,
        fontSize: Number(element("rc-font-size").value),
        lineHeight: Number(element("rc-line-height").value),
        align: element("rc-align-center").checked ? "center" : "left",
        padding: Number(element("rc-padding").value)
      });
      this.updateBackgroundControls();
      this.updateControlValues();
    }
    updateControlValues() {
      const colors = [
        ["rc-color1", "rc-color1-picker", this.style.background.color1],
        ["rc-color2", "rc-color2-picker", this.style.background.color2],
        ["rc-text-color", "rc-text-color-picker", this.style.textColor]
      ];
      for (const [textId, pickerId, value] of colors) {
        const normalized = value.toUpperCase();
        element(textId).value = normalized;
        element(pickerId).value = normalized;
      }
      const values = [
        ["rc-overlay", "rc-overlay-input", String(Math.round(this.style.overlay * 100))],
        ["rc-corner-radius", "rc-corner-radius-input", String(this.style.cornerRadius)],
        ["rc-font-size", "rc-font-size-input", String(this.style.fontSize)],
        ["rc-line-height", "rc-line-height-input", this.style.lineHeight.toFixed(2)],
        ["rc-padding", "rc-padding-input", String(this.style.padding)]
      ];
      for (const [rangeId, numberId, value] of values) {
        const range = element(rangeId);
        range.value = value;
        updateRangeProgress(range);
        element(numberId).value = value;
      }
    }
    styleChanged() {
      this.updatePresetSelection();
      this.scheduleRender();
      this.schedulePersist();
    }
    getRenderInput(usePlaceholder = true) {
      const text = element("rc-text").value;
      return {
        text: text.trim() || (usePlaceholder ? "여기에 담고 싶은 문장을 입력해 주세요." : ""),
        metadata: this.metadata,
        style: this.style,
        photo: this.usePhoto ? this.photo : null
      };
    }
    scheduleRender() {
      element("rc-save").disabled = true;
      if (this.draftReady && !this.suspendDraft) this.scheduleDraftSave();
      if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
      const request = ++this.renderRequest;
      this.renderFrame = requestAnimationFrame(() => {
        this.renderFrame = null;
        void this.renderPreview(request);
      });
    }
    async renderPreview(request) {
      const message = element("rc-preview-message");
      try {
        const buffer = document.createElement("canvas");
        const layout = await renderQuoteToCanvas(buffer, this.getRenderInput());
        if (request !== this.renderRequest) return;
        this.canvas.width = buffer.width;
        this.canvas.height = buffer.height;
        const context = this.canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D를 사용할 수 없습니다.");
        context.drawImage(buffer, 0, 0);
        this.renderError = null;
        element("rc-size").textContent = `${layout.width.toLocaleString()} × ${layout.height.toLocaleString()}px`;
        message.textContent = "PNG 미리보기";
        message.classList.remove("rc-preview-error");
      } catch (error) {
        if (request !== this.renderRequest) return;
        this.renderError = error instanceof Error ? error.message : "미리보기를 만들 수 없습니다.";
        message.textContent = this.renderError;
        message.classList.add("rc-preview-error");
      }
      this.updateClippedHint();
      this.updateExportButtons();
    }
    /** Marks the fade that tells a reader the mobile strip is showing only the top of a tall image. */
    updateClippedHint() {
      const card = element("rc-preview-card");
      card.dataset.clipped = String(card.scrollHeight - card.clientHeight > 2);
    }
    updateExportButtons() {
      const disabled = !element("rc-text").value.trim() || Boolean(this.renderError);
      element("rc-save").disabled = disabled;
    }
    openMobilePreview() {
      this.root.classList.add("rc-mobile-preview-open");
      this.updateClippedHint();
      element("rc-preview-close").focus();
    }
    closeMobilePreview() {
      this.root.classList.remove("rc-mobile-preview-open");
      this.updateClippedHint();
    }
    /**
     * The mobile preview is sticky, so it costs screen height on every scroll. Collapsing it to its
     * caption row gives that height back while typing without losing the size readout.
     */
    togglePreviewCollapse() {
      const collapsed = this.root.classList.toggle("rc-preview-collapsed");
      const button = element("rc-preview-collapse");
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", collapsed ? "미리보기 펼치기" : "미리보기 접기");
      this.updateClippedHint();
    }
    showTab(tab) {
      for (const name of TAB_NAMES) {
        element(`rc-tab-btn-${name}`).setAttribute("aria-selected", String(name === tab));
        element(`rc-tab-${name}`).hidden = name !== tab;
      }
      if (window.matchMedia(MOBILE_LAYOUT_QUERY).matches) window.scrollTo({ top: 0 });
      else element("rc-editor-pane").scrollTop = 0;
    }
    /**
     * Asks inside the plugin instead of through Risuai.alertConfirm, whose dialog is painted by the
     * host app underneath the fullscreen plugin container and only becomes visible once it closes.
     */
    askConfirm(title, description, acceptLabel) {
      this.settleConfirm(false, false);
      element("rc-confirm-title").textContent = title;
      element("rc-confirm-description").textContent = description;
      element("rc-confirm-accept").textContent = acceptLabel;
      element("rc-confirm-modal").hidden = false;
      element("rc-confirm-cancel").focus();
      return new Promise((resolve) => {
        this.confirmResolve = resolve;
      });
    }
    settleConfirm(accepted, restoreFocus = true) {
      const modal = element("rc-confirm-modal");
      const resolve = this.confirmResolve;
      this.confirmResolve = null;
      if (!modal.hidden) {
        modal.hidden = true;
        const returnTarget = !element("rc-project-modal").hidden ? element("rc-project-modal-close") : element("rc-preset-modal").hidden ? element("rc-reset") : element("rc-preset-modal-close");
        if (restoreFocus && !this.root.hidden) returnTarget.focus();
      }
      resolve?.(accepted);
    }
    async confirmReset() {
      const accepted = await this.askConfirm(
        "편집 내용 초기화",
        "본문, 하단 정보, 치환 규칙, 배경 사진과 현재 스타일을 초기화할까요? 저장한 사용자 프리셋은 유지됩니다.",
        "초기화"
      );
      if (accepted) await this.resetEditor();
    }
    async resetEditor() {
      element("rc-text").value = "";
      this.metadata = cloneMetadata();
      for (const [, inputId, visibleId] of METADATA_BINDINGS) {
        element(inputId).value = "";
        element(visibleId).checked = true;
      }
      this.updateMetadataControls();
      this.rules = [newRule()];
      this.previousText = null;
      this.lastRuleCounts = [];
      element("rc-undo-rules").disabled = true;
      element("rc-replacement-result").textContent = "";
      this.photo = null;
      this.usePhoto = false;
      element("rc-photo-input").value = "";
      this.style = cloneStyle(DEFAULT_STYLE);
      this.activePresetId = null;
      this.currentProjectId = null;
      this.currentProjectName = "";
      element("rc-preset-name").value = "";
      this.renderError = null;
      this.closeMobilePreview();
      if (this.root.classList.contains("rc-preview-collapsed")) this.togglePreviewCollapse();
      this.showTab("content");
      this.hidePhotoSaveModal();
      this.syncAllControls();
      this.renderReplacementRules();
      this.renderPresetGrid();
      this.scheduleRender();
      await this.persistNow();
    }
    renderReplacementRules(counts = this.lastRuleCounts) {
      const container = element("rc-replacements");
      container.replaceChildren();
      this.rules.forEach((rule, index) => {
        const row = document.createElement("div");
        row.className = "rc-replacement";
        row.dataset.ruleId = rule.id;
        const find = document.createElement("input");
        find.className = "rc-field rc-replacement__find";
        find.placeholder = "찾을 말";
        find.value = rule.find;
        find.dataset.role = "find";
        find.setAttribute("aria-label", `${index + 1}번째 찾을 말`);
        const arrow = document.createElement("span");
        arrow.className = "rc-replacement__arrow";
        arrow.textContent = "→";
        const replace = document.createElement("input");
        replace.className = "rc-field rc-replacement__replace";
        replace.placeholder = "바꿀 말";
        replace.value = rule.replace;
        replace.dataset.role = "replace";
        replace.setAttribute("aria-label", `${index + 1}번째 바꿀 말`);
        const caseLabel = document.createElement("label");
        caseLabel.className = "rc-replacement__case";
        const caseInput = document.createElement("input");
        caseInput.type = "checkbox";
        caseInput.checked = rule.caseSensitive;
        caseInput.dataset.role = "case";
        caseLabel.append(caseInput, document.createTextNode("Aa 구분"));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "rc-button rc-button--quiet rc-icon-button rc-replacement__remove";
        remove.innerHTML = ICONS.x;
        remove.setAttribute("aria-label", `${index + 1}번째 치환 규칙 삭제`);
        remove.addEventListener("click", () => {
          this.captureRuleInputs();
          this.rules = this.rules.filter((item) => item.id !== rule.id);
          if (!this.rules.length) this.rules.push(newRule());
          this.lastRuleCounts = [];
          this.renderReplacementRules([]);
          this.scheduleRender();
        });
        const count = document.createElement("span");
        count.className = "rc-count";
        count.textContent = counts[index] ? `${counts[index]}회` : "";
        const changed = () => {
          this.captureRuleInputs();
          this.scheduleDraftSave();
        };
        find.addEventListener("input", changed);
        replace.addEventListener("input", changed);
        caseInput.addEventListener("change", changed);
        row.append(find, arrow, replace, caseLabel, remove, count);
        container.appendChild(row);
      });
    }
    captureRuleInputs() {
      const rows = Array.from(document.querySelectorAll(".rc-replacement"));
      this.rules = rows.map((row) => ({
        id: row.dataset.ruleId ?? newRule().id,
        find: row.querySelector('[data-role="find"]')?.value ?? "",
        replace: row.querySelector('[data-role="replace"]')?.value ?? "",
        caseSensitive: row.querySelector('[data-role="case"]')?.checked ?? false
      }));
    }
    applyRules() {
      this.captureRuleInputs();
      if (this.rules.some((rule) => !rule.find)) {
        this.toast("찾을 말이 비어 있는 규칙을 채우거나 삭제해 주세요.", "error");
        return;
      }
      const textArea = element("rc-text");
      const result = applyReplacementRules(textArea.value, this.rules);
      this.previousText = textArea.value;
      textArea.value = result.text;
      this.lastRuleCounts = result.perRule;
      this.renderReplacementRules(result.perRule);
      element("rc-undo-rules").disabled = false;
      element("rc-replacement-result").textContent = `총 ${result.count.toLocaleString()}회 치환했습니다.`;
      this.scheduleRender();
    }
    undoRules() {
      if (this.previousText === null) return;
      element("rc-text").value = this.previousText;
      this.previousText = null;
      this.lastRuleCounts = [];
      this.renderReplacementRules([]);
      element("rc-undo-rules").disabled = true;
      element("rc-replacement-result").textContent = "마지막 치환을 취소했습니다.";
      this.scheduleRender();
    }
    renderPresetGrid() {
      const grid = element("rc-preset-grid");
      grid.replaceChildren();
      const settings2 = document.createElement("button");
      settings2.type = "button";
      settings2.className = "rc-preset rc-preset--settings";
      settings2.setAttribute("aria-label", "프리셋 관리 열기");
      settings2.title = "프리셋 관리";
      const settingsIcon = document.createElement("span");
      settingsIcon.className = "rc-preset__settings-icon";
      settingsIcon.setAttribute("aria-hidden", "true");
      settingsIcon.innerHTML = ICONS.settings;
      const settingsName = document.createElement("span");
      settingsName.className = "rc-preset__name";
      settingsName.textContent = "관리";
      settings2.append(settingsIcon, settingsName);
      settings2.addEventListener("click", () => this.openPresetModal());
      grid.appendChild(settings2);
      const all = [
        ...this.userPresets.map((item) => ({ ...item, builtin: false })),
        ...BUILTIN_PRESETS
      ];
      for (const item of all) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "rc-preset";
        button.dataset.presetId = item.id;
        button.title = item.name;
        button.setAttribute("aria-label", `${item.name} 프리셋 적용`);
        button.setAttribute("aria-pressed", String(this.activePresetId === item.id && stylesEqual(this.style, item.style)));
        const swatch = document.createElement("canvas");
        swatch.className = "rc-preset__swatch";
        swatch.setAttribute("aria-hidden", "true");
        renderStyleThumbnail(swatch, item.style);
        const name = document.createElement("span");
        name.className = "rc-preset__name";
        name.textContent = item.name;
        button.append(swatch, name);
        button.addEventListener("click", () => this.applyPreset(item.id, Boolean(item.builtin)));
        grid.appendChild(button);
      }
      this.updateManageState();
    }
    applyPreset(id, builtin) {
      const item = builtin ? BUILTIN_PRESETS.find((candidate) => candidate.id === id) : this.userPresets.find((candidate) => candidate.id === id);
      if (!item) return;
      this.style = cloneStyle(item.style);
      this.activePresetId = item.id;
      this.usePhoto = false;
      this.syncAllControls();
      this.renderPresetGrid();
      this.scheduleRender();
      this.schedulePersist();
    }
    updatePresetSelection() {
      document.querySelectorAll(".rc-preset[data-preset-id]").forEach((button) => {
        const id = button.dataset.presetId;
        const item = BUILTIN_PRESETS.find((candidate) => candidate.id === id) ?? this.userPresets.find((candidate) => candidate.id === id);
        button.setAttribute("aria-pressed", String(Boolean(item && item.id === this.activePresetId && stylesEqual(this.style, item.style))));
      });
      this.updateManageState();
    }
    updateManageState() {
      const empty = this.userPresets.length === 0;
      element("rc-export-presets").disabled = empty;
      element("rc-manage-empty").hidden = !empty;
      element("rc-manage-list").toggleAttribute("hidden", empty);
      element("rc-manage-help").toggleAttribute("hidden", empty);
    }
    openPresetModal() {
      this.renderManageList();
      this.showPresetPanel("");
      element("rc-preset-modal").hidden = false;
      element("rc-preset-modal-close").focus();
    }
    hidePresetModal() {
      element("rc-preset-modal").hidden = true;
    }
    showPresetPanel(panel) {
      const validPanel = ["new", "transfer", "manage"].includes(panel) ? panel : "";
      document.querySelectorAll("[data-preset-panel]").forEach((button) => {
        button.setAttribute("aria-selected", String(button.dataset.presetPanel === validPanel));
      });
      for (const name of ["new", "transfer", "manage"]) {
        element(`rc-preset-panel-${name}`).hidden = name !== validPanel;
      }
      if (validPanel === "manage") this.renderManageList();
      if (validPanel === "new") element("rc-preset-name").focus();
    }
    renderManageList(focusPresetId, focusAction) {
      const list = element("rc-manage-list");
      list.replaceChildren();
      this.userPresets.forEach((item, index) => {
        const row = document.createElement("li");
        row.className = "rc-manage-item";
        row.dataset.presetId = item.id;
        const swatch = document.createElement("canvas");
        swatch.className = "rc-manage-item__swatch";
        swatch.setAttribute("aria-hidden", "true");
        renderStyleThumbnail(swatch, item.style);
        const name = document.createElement("input");
        name.type = "text";
        name.className = "rc-field rc-manage-item__name";
        name.maxLength = 40;
        name.value = item.name;
        name.setAttribute("aria-label", `${item.name} 프리셋 이름`);
        name.addEventListener("blur", () => this.commitPresetName(item.id, name));
        name.addEventListener("keydown", (event) => {
          if (event.key === "Enter") name.blur();
          else if (event.key === "Escape") {
            name.value = item.name;
            name.blur();
            event.stopPropagation();
          }
        });
        const actions = document.createElement("div");
        actions.className = "rc-manage-item__actions";
        const action = (role, label, content, disabled, onClick) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = role === "delete" ? "rc-button rc-button--danger rc-manage-item__action" : "rc-button rc-button--quiet rc-icon-button rc-manage-item__action";
          button.dataset.action = role;
          button.innerHTML = content;
          button.setAttribute("aria-label", label);
          button.title = label;
          button.disabled = disabled;
          button.addEventListener("click", onClick);
          actions.appendChild(button);
          return button;
        };
        action("up", `${item.name} 위로 이동`, ICONS.arrowUp, index === 0, () => this.movePreset(item.id, -1));
        action("down", `${item.name} 아래로 이동`, ICONS.arrowDown, index === this.userPresets.length - 1, () => this.movePreset(item.id, 1));
        action("delete", `${item.name} 삭제`, "삭제", false, () => void this.deleteUserPreset(item.id));
        row.append(swatch, name, actions);
        list.appendChild(row);
      });
      this.updateManageState();
      if (!focusPresetId) return;
      const target = list.querySelector(
        `[data-preset-id="${CSS.escape(focusPresetId)}"] [data-action="${focusAction}"]`
      );
      if (target && !target.disabled) target.focus();
      else list.querySelector(`[data-preset-id="${CSS.escape(focusPresetId)}"] .rc-manage-item__name`)?.focus();
    }
    commitPresetName(id, input) {
      const target = this.userPresets.find((item) => item.id === id);
      if (!target || input.value === target.name) return;
      const validation = validatePresetName(input.value, this.userPresets, id);
      if (!validation.ok) {
        input.value = target.name;
        return this.toast(validation.message, "error");
      }
      if (validation.name === target.name) {
        input.value = target.name;
        return;
      }
      target.name = validation.name;
      input.value = validation.name;
      input.setAttribute("aria-label", `${validation.name} 프리셋 이름`);
      this.renderPresetGrid();
      void this.persistNow();
    }
    movePreset(id, offset) {
      const index = this.userPresets.findIndex((item) => item.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= this.userPresets.length) return;
      const [moved] = this.userPresets.splice(index, 1);
      this.userPresets.splice(target, 0, moved);
      this.renderPresetGrid();
      this.renderManageList(id, offset < 0 ? "up" : "down");
      void this.persistNow();
    }
    async createUserPreset() {
      const input = element("rc-preset-name");
      const validation = validatePresetName(input.value, this.userPresets);
      if (!validation.ok) return this.toast(validation.message, "error");
      const created = { id: createPresetId(), name: validation.name, style: cloneStyle(this.style) };
      this.userPresets.push(created);
      this.activePresetId = created.id;
      input.value = "";
      this.renderPresetGrid();
      this.renderManageList();
      await this.persistNow();
      this.hidePresetModal();
      const createdButton = document.querySelector(`.rc-preset[data-preset-id="${created.id}"]`);
      createdButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      createdButton?.classList.add("rc-preset--just-created");
      window.setTimeout(() => createdButton?.classList.remove("rc-preset--just-created"), 400);
    }
    async deleteUserPreset(id) {
      const selected = this.userPresets.find((item) => item.id === id);
      if (!selected) return;
      const accepted = await this.askConfirm(
        "프리셋 삭제",
        `“${selected.name}” 프리셋을 삭제할까요? 되돌릴 수 없습니다.`,
        "삭제"
      );
      if (!accepted) return;
      this.userPresets = this.userPresets.filter((item) => item.id !== selected.id);
      if (this.activePresetId === selected.id) this.activePresetId = null;
      this.renderPresetGrid();
      this.renderManageList();
      await this.persistNow();
    }
    exportPresets() {
      if (!this.userPresets.length) return this.toast("내보낼 사용자 프리셋이 없습니다.", "error");
      const blob = new Blob([serializePresetExport(this.userPresets)], { type: "application/json;charset=utf-8" });
      const date = /* @__PURE__ */ new Date();
      const filename = `log-capture-presets-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}.json`;
      this.downloadBlob(blob, filename);
      this.toast(`${this.userPresets.length}개 프리셋을 내보냈습니다.`);
    }
    async importPresets(file) {
      const input = element("rc-preset-import-input");
      if (!file) return;
      try {
        if (file.size > MAX_PRESET_FILE_BYTES) throw new Error("프리셋 파일은 1MB 이하여야 합니다.");
        const result = parsePresetExport(await file.text(), this.userPresets);
        if (!result.imported) throw new Error("가져올 수 있는 프리셋이 없습니다.");
        this.userPresets = result.presets;
        this.activePresetId = null;
        this.renderPresetGrid();
        this.renderManageList();
        await this.persistNow();
        this.toast(`${result.imported}개 프리셋을 가져왔습니다.${result.skipped ? ` (${result.skipped}개 건너뜀)` : ""}`);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "프리셋 파일을 읽지 못했습니다.", "error");
      } finally {
        input.value = "";
      }
    }
    schedulePersist() {
      if (this.persistTimer !== null) clearTimeout(this.persistTimer);
      this.persistTimer = window.setTimeout(() => {
        this.persistTimer = null;
        void this.persistNow();
      }, 350);
    }
    async persistNow() {
      if (this.persistTimer !== null) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      try {
        await savePersistedState(this.userPresets, this.style);
      } catch {
        this.toast("스타일 설정을 저장하지 못했습니다.", "error");
      }
    }
    /**
     * Auto-runs on open, where it only fills blanks and never touches the database. A manual press
     * overwrites what is already typed — that is what the button is for — and may fall back to the
     * preset's module-integration text.
     */
    async fillDetectedMetadata(manual = false) {
      if (manual) this.toast("웹 버전에서는 하단 정보를 직접 입력해 주세요.");
    }
    async readModuleIntegration() {
      return "";
    }
    async importPhoto(file) {
      if (!file) return;
      if (!PHOTO_TYPES.has(file.type)) return this.toast("PNG, JPEG 또는 WebP 사진만 사용할 수 있습니다.", "error");
      if (file.size > MAX_PHOTO_BYTES) return this.toast("배경 사진은 20MB 이하여야 합니다.", "error");
      try {
        const image = await this.loadImage(file);
        this.photo = { image, name: file.name, blob: file };
        this.usePhoto = true;
        this.updatePhotoStatus();
        this.scheduleRender();
      } catch {
        this.toast("사진 파일을 읽지 못했습니다.", "error");
      }
    }
    loadImage(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Image decode failed"));
        };
        image.src = url;
      });
    }
    updatePhotoStatus() {
      element("rc-photo-clear").disabled = !this.photo;
      element("rc-photo-status").textContent = this.photo ? `${this.photo.name} · ${this.usePhoto ? "배경으로 사용 중" : "보관됨, 배경 유형에서 사진을 고르면 적용됩니다"}` : "선택한 사진이 없습니다. PNG·JPEG·WebP, 최대 20MB";
      this.updateBackgroundControls();
    }
    deriveProjectName() {
      const text = element("rc-text").value.trim();
      const firstLine = text.split(/\r?\n/u).find((line) => line.trim())?.trim().replace(/^>\s*/u, "").replace(/[*_`]/gu, "") ?? "";
      if (firstLine) return Array.from(firstLine).slice(0, 36).join("");
      const date = new Date();
      return `작업 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    normalizeProjectName(value) {
      const name = String(value ?? "").trim().replace(/\s+/gu, " ");
      if (!name) throw new Error("작업물 이름을 입력해 주세요.");
      if (Array.from(name).length > 60) throw new Error("작업물 이름은 60자 이하여야 합니다.");
      return name;
    }
    captureWorkspaceSnapshot() {
      this.captureRuleInputs();
      return {
        version: 1,
        text: element("rc-text").value,
        metadata: normalizeWorkspaceMetadata(this.metadata),
        rules: normalizeWorkspaceRules(this.rules),
        style: cloneStyle(this.style),
        previousText: this.previousText,
        lastRuleCounts: this.lastRuleCounts.slice(),
        usePhoto: Boolean(this.usePhoto && this.photo),
        photo: this.photo?.blob instanceof Blob ? { name: this.photo.name, blob: this.photo.blob } : null
      };
    }
    async applyWorkspaceSnapshot(snapshot, options = {}) {
      const normalized = plainWorkspaceSnapshot(snapshot);
      this.suspendDraft = true;
      try {
        element("rc-text").value = normalized.text;
        this.metadata = normalizeWorkspaceMetadata(normalized.metadata);
        this.rules = normalizeWorkspaceRules(normalized.rules);
        this.previousText = normalized.previousText;
        this.lastRuleCounts = normalized.lastRuleCounts;
        element("rc-undo-rules").disabled = typeof this.previousText !== "string";
        element("rc-replacement-result").textContent = "";
        this.style = normalizeStyle(normalized.style);
        this.activePresetId = null;
        this.photo = null;
        this.usePhoto = false;
        element("rc-photo-input").value = "";
        if (normalized.photo?.blob instanceof Blob) {
          const image = await this.loadImage(normalized.photo.blob);
          this.photo = { image, name: String(normalized.photo.name ?? "background-image"), blob: normalized.photo.blob };
          this.usePhoto = Boolean(normalized.usePhoto);
        }
        this.syncAllControls();
        this.renderReplacementRules();
        this.updatePresetSelection();
        this.scheduleRender();
        if (options.tab) this.showTab(options.tab);
      } finally {
        this.suspendDraft = false;
      }
    }
    updateAutosaveStatus(message) {
      const status = element("rc-autosave-status");
      if (message) {
        status.textContent = message;
        return;
      }
      const suffix = this.currentProjectName ? ` · ${this.currentProjectName}` : "";
      status.textContent = `자동저장됨${suffix}`;
    }
    scheduleDraftSave() {
      if (!this.draftReady || this.suspendDraft) return;
      if (this.draftTimer !== null) clearTimeout(this.draftTimer);
      this.updateAutosaveStatus("자동저장 중…");
      this.draftTimer = window.setTimeout(() => {
        this.draftTimer = null;
        void this.saveDraftNow();
      }, 650);
    }
    async saveDraftNow() {
      if (!this.draftReady || this.suspendDraft) return;
      if (this.draftTimer !== null) {
        clearTimeout(this.draftTimer);
        this.draftTimer = null;
      }
      try {
        await workspacePut(DRAFT_STORE, {
          id: CURRENT_DRAFT_ID,
          updatedAt: Date.now(),
          projectId: this.currentProjectId,
          projectName: this.currentProjectName,
          snapshot: this.captureWorkspaceSnapshot()
        });
        this.updateAutosaveStatus();
      } catch (error) {
        console.warn("[Log Capture] 자동저장 실패", error);
        this.updateAutosaveStatus("자동저장 실패");
      }
    }
    async restoreAutosaveDraft() {
      const draft = await workspaceGet(DRAFT_STORE, CURRENT_DRAFT_ID);
      if (!draft?.snapshot) return;
      await this.applyWorkspaceSnapshot(draft.snapshot);
      this.currentProjectId = typeof draft.projectId === "string" ? draft.projectId : null;
      this.currentProjectName = typeof draft.projectName === "string" ? draft.projectName : "";
      this.updateAutosaveStatus("마지막 작업 복원됨");
      window.setTimeout(() => this.updateAutosaveStatus(), 1800);
    }
    async createThumbnailBlob() {
      try {
        const source = document.createElement("canvas");
        await renderQuoteToCanvas(source, this.getRenderInput());
        const width = 240;
        const height = Math.max(80, Math.min(320, Math.round(source.height * width / source.width)));
        const thumbnail = document.createElement("canvas");
        thumbnail.width = width;
        thumbnail.height = height;
        const context = thumbnail.getContext("2d");
        if (!context) return null;
        context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height);
        return await new Promise((resolve) => thumbnail.toBlob(resolve, "image/jpeg", 0.78));
      } catch {
        return null;
      }
    }
    async quickSaveProject() {
      try {
        const suggested = this.deriveProjectName();
        const entered = window.prompt("새 작업물 이름을 입력해 주세요.", suggested);
        if (entered === null) return;
        const name = this.normalizeProjectName(entered);
        await this.saveCurrentProject(name, null);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "작업물을 저장하지 못했습니다.", "error");
      }
    }
    async saveCurrentProject(name, existingId = null) {
      const normalizedName = this.normalizeProjectName(name);
      const now = Date.now();
      let previous = null;
      if (existingId) previous = await workspaceGet(PROJECT_STORE, existingId);
      const id = previous?.id ?? existingId ?? createWorkspaceId();
      const record = {
        id,
        name: normalizedName,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        snapshot: this.captureWorkspaceSnapshot(),
        thumbnail: await this.createThumbnailBlob()
      };
      await workspacePut(PROJECT_STORE, record);
      this.currentProjectId = id;
      this.currentProjectName = normalizedName;
      element("rc-project-name").value = normalizedName;
      await this.saveDraftNow();
      this.updateAutosaveStatus();
      this.toast(`“${normalizedName}” 작업물을 저장했습니다.`);
      if (!element("rc-project-modal").hidden) await this.renderProjectList();
    }
    async showProjectModal() {
      try {
        element("rc-project-modal").hidden = false;
        element("rc-project-name").value = this.deriveProjectName();
        element("rc-project-overwrite").disabled = !this.currentProjectId;
        await this.renderProjectList();
        element("rc-project-name").focus();
        element("rc-project-name").select();
      } catch (error) {
        element("rc-project-modal").hidden = true;
        this.toast(error instanceof Error ? error.message : "작업물 저장함을 열지 못했습니다.", "error");
      }
    }
    hideProjectModal() {
      element("rc-project-modal").hidden = true;
      for (const url of this.projectThumbUrls) URL.revokeObjectURL(url);
      this.projectThumbUrls = [];
    }
    async saveProjectAsNewFromModal() {
      try {
        const name = this.normalizeProjectName(element("rc-project-name").value);
        await this.saveCurrentProject(name, null);
        element("rc-project-overwrite").disabled = false;
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "새 작업물을 저장하지 못했습니다.", "error");
      }
    }
    async overwriteCurrentProjectFromModal() {
      try {
        if (!this.currentProjectId) {
          this.toast("먼저 저장함에서 작업물을 불러오거나 새 작업으로 저장해 주세요.", "error");
          return;
        }
        const name = this.normalizeProjectName(element("rc-project-name").value || this.currentProjectName);
        await this.saveCurrentProject(name, this.currentProjectId);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "현재 작업물을 덮어쓰지 못했습니다.", "error");
      }
    }
    formatProjectDate(timestamp) {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
    async renderProjectList() {
      const list = element("rc-project-list");
      const empty = element("rc-project-empty");
      for (const url of this.projectThumbUrls) URL.revokeObjectURL(url);
      this.projectThumbUrls = [];
      list.replaceChildren();
      let projects = await workspaceGetAll(PROJECT_STORE);
      projects = projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      empty.hidden = projects.length > 0;
      for (const project of projects) {
        const card = document.createElement("article");
        card.className = "rc-project-card";
        let thumb;
        if (project.thumbnail instanceof Blob) {
          thumb = document.createElement("img");
          thumb.className = "rc-project-thumb";
          thumb.alt = "";
          const url = URL.createObjectURL(project.thumbnail);
          this.projectThumbUrls.push(url);
          thumb.src = url;
        } else {
          thumb = document.createElement("div");
          thumb.className = "rc-project-thumb rc-project-thumb--empty";
          thumb.textContent = "미리보기 없음";
        }
        const main = document.createElement("div");
        main.className = "rc-project-card__main";
        const title = document.createElement("h3");
        title.className = "rc-project-card__title";
        title.textContent = project.name;
        const meta = document.createElement("p");
        meta.className = "rc-project-card__meta";
        const hasPhoto = project.snapshot?.photo?.blob instanceof Blob;
        meta.textContent = `${this.formatProjectDate(project.updatedAt)}${hasPhoto ? " · 배경사진 포함" : ""}${project.id === this.currentProjectId ? " · 현재 작업" : ""}`;
        const preview = document.createElement("p");
        preview.className = "rc-project-card__preview";
        preview.textContent = String(project.snapshot?.text ?? "").trim().replace(/\s+/gu, " ") || "본문 없음";
        const actions = document.createElement("div");
        actions.className = "rc-project-card__actions";
        const load = document.createElement("button");
        load.className = "rc-button rc-button--primary";
        load.type = "button";
        load.textContent = "불러오기";
        load.addEventListener("click", () => void this.loadProject(project.id));
        const rename = document.createElement("button");
        rename.className = "rc-button";
        rename.type = "button";
        rename.textContent = "이름 변경";
        rename.addEventListener("click", () => void this.renameProject(project.id));
        const remove = document.createElement("button");
        remove.className = "rc-button rc-button--danger";
        remove.type = "button";
        remove.textContent = "삭제";
        remove.addEventListener("click", () => void this.deleteProject(project.id));
        actions.append(load, rename, remove);
        main.append(title, meta, preview, actions);
        card.append(thumb, main);
        list.append(card);
      }
    }
    async loadProject(id) {
      try {
        const project = await workspaceGet(PROJECT_STORE, id);
        if (!project) throw new Error("작업물을 찾지 못했습니다.");
        await this.applyWorkspaceSnapshot(project.snapshot, { tab: "content" });
        this.currentProjectId = project.id;
        this.currentProjectName = project.name;
        element("rc-project-overwrite").disabled = false;
        await this.saveDraftNow();
        this.hideProjectModal();
        this.updateAutosaveStatus();
        this.toast(`“${project.name}” 작업물을 불러왔습니다.`);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "작업물을 불러오지 못했습니다.", "error");
      }
    }
    async renameProject(id) {
      const project = await workspaceGet(PROJECT_STORE, id);
      if (!project) return;
      const entered = window.prompt("새 작업물 이름", project.name);
      if (entered === null) return;
      try {
        project.name = this.normalizeProjectName(entered);
        project.updatedAt = Date.now();
        await workspacePut(PROJECT_STORE, project);
        if (this.currentProjectId === id) {
          this.currentProjectName = project.name;
          await this.saveDraftNow();
        }
        await this.renderProjectList();
        this.updateAutosaveStatus();
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "이름을 바꾸지 못했습니다.", "error");
      }
    }
    async deleteProject(id) {
      const project = await workspaceGet(PROJECT_STORE, id);
      if (!project) return;
      const accepted = await this.askConfirm("작업물 삭제", `“${project.name}” 작업물을 삭제할까요?`, "삭제");
      if (!accepted) return;
      await workspaceDelete(PROJECT_STORE, id);
      if (this.currentProjectId === id) {
        this.currentProjectId = null;
        this.currentProjectName = "";
        element("rc-project-overwrite").disabled = true;
        await this.saveDraftNow();
      }
      await this.renderProjectList();
      this.updateAutosaveStatus();
    }
    async exportWorkspaceBackup() {
      try {
        const projects = await workspaceGetAll(PROJECT_STORE);
        const draft = await workspaceGet(DRAFT_STORE, CURRENT_DRAFT_ID);
        if (!projects.length && !draft?.snapshot) throw new Error("백업할 작업물이 없습니다.");
        const portableProjects = [];
        for (const project of projects) {
          portableProjects.push({
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            snapshot: await snapshotToPortable(project.snapshot)
          });
        }
        const portableDraft = draft?.snapshot ? {
          projectName: draft.projectName || "",
          updatedAt: draft.updatedAt,
          snapshot: await snapshotToPortable(draft.snapshot)
        } : null;
        const bundle = {
          format: "log-capture-workspace-backup",
          version: 1,
          exportedAt: new Date().toISOString(),
          projects: portableProjects,
          draft: portableDraft
        };
        const blob = new Blob([JSON.stringify(bundle)], { type: "application/json;charset=utf-8" });
        const date = new Date();
        const filename = `log-capture-workspace-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}.json`;
        this.downloadBlob(blob, filename);
        this.toast(`${portableProjects.length}개 작업물을 백업했습니다.`);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "작업물 백업에 실패했습니다.", "error");
      }
    }
    async uniqueImportedProjectName(name, usedNames) {
      const base = this.normalizeProjectName(name || "가져온 작업");
      if (!usedNames.has(base.toLocaleLowerCase())) return base;
      for (let index = 1; index < 10000; index += 1) {
        const suffix = index === 1 ? " (가져옴)" : ` (가져옴 ${index})`;
        const candidate = `${Array.from(base).slice(0, Math.max(1, 60 - Array.from(suffix).length)).join("")}${suffix}`;
        if (!usedNames.has(candidate.toLocaleLowerCase())) return candidate;
      }
      return `가져온 작업 ${Date.now()}`;
    }
    async importWorkspaceBackup(file) {
      const input = element("rc-project-import-input");
      if (!file) return;
      try {
        if (file.size > MAX_PROJECT_BACKUP_BYTES) throw new Error("작업물 백업 파일은 100MB 이하여야 합니다.");
        const value = JSON.parse(await file.text());
        if (value?.format !== "log-capture-workspace-backup" || value.version !== 1 || !Array.isArray(value.projects)) {
          throw new Error("Log Capture 작업물 백업 파일 형식이 아닙니다.");
        }
        const existing = await workspaceGetAll(PROJECT_STORE);
        const usedNames = new Set(existing.map((item) => String(item.name ?? "").toLocaleLowerCase()));
        let imported = 0;
        for (const candidate of value.projects.slice(0, 200)) {
          if (!candidate?.snapshot) continue;
          const snapshot = await portableToSnapshot(candidate.snapshot);
          const name = await this.uniqueImportedProjectName(candidate.name || "가져온 작업", usedNames);
          usedNames.add(name.toLocaleLowerCase());
          const now = Date.now();
          await workspacePut(PROJECT_STORE, {
            id: createWorkspaceId(),
            name,
            createdAt: Number(candidate.createdAt) || now,
            updatedAt: Number(candidate.updatedAt) || now,
            snapshot,
            thumbnail: null
          });
          imported += 1;
        }
        if (value.draft?.snapshot) {
          const snapshot = await portableToSnapshot(value.draft.snapshot);
          const draftName = await this.uniqueImportedProjectName(value.draft.projectName || "가져온 자동저장", usedNames);
          await workspacePut(PROJECT_STORE, {
            id: createWorkspaceId(),
            name: draftName,
            createdAt: Date.now(),
            updatedAt: Number(value.draft.updatedAt) || Date.now(),
            snapshot,
            thumbnail: null
          });
          imported += 1;
        }
        if (!imported) throw new Error("가져올 수 있는 작업물이 없습니다.");
        await this.renderProjectList();
        this.toast(`${imported}개 작업물을 가져왔습니다.`);
      } catch (error) {
        this.toast(error instanceof Error ? error.message : "작업물 백업을 읽지 못했습니다.", "error");
      } finally {
        input.value = "";
      }
    }
    async exportImage() {
      const text = element("rc-text").value;
      if (!text.trim()) return this.toast("이미지로 만들 본문을 입력해 주세요.", "error");
      if (this.renderError) return this.toast(this.renderError, "error");
      const saveButton = element("rc-save");
      saveButton.disabled = true;
      try {
        const filename = createExportFilename();
        if (isIosDevice()) {
          const blob2 = canvasToPngBlobSync(this.canvas);
          const result = await this.tryIosPhotoShare(blob2, filename);
          if (result === "shared") this.toast("공유 시트에서 이미지 저장을 선택할 수 있습니다.");
          else if (result === "unsupported") this.showPhotoSaveModal(blob2, filename);
          return;
        }
        await renderQuoteToCanvas(this.canvas, this.getRenderInput(false));
        const blob = await canvasToPngBlob(this.canvas);
        this.downloadBlob(blob, filename);
        saveButton.textContent = "저장됨";
        saveButton.dataset.saved = "true";
        window.setTimeout(() => {
          saveButton.textContent = "저장";
          delete saveButton.dataset.saved;
        }, 1600);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message = error instanceof LayoutTooTallError || error instanceof Error ? error.message : "이미지를 저장하지 못했습니다.";
        this.toast(message, "error");
      } finally {
        this.updateExportButtons();
      }
    }
    tryIosPhotoShare(blob, filename) {
      if (typeof navigator.share !== "function" || typeof File === "undefined") return Promise.resolve("unsupported");
      const file = new File([blob], filename, { type: "image/png" });
      const data = { files: [file], title: "Log Capture 이미지" };
      if (typeof navigator.canShare === "function" && !navigator.canShare(data)) return Promise.resolve("unsupported");
      try {
        return navigator.share(data).then(() => "shared").catch((error) => error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "unsupported");
      } catch {
        return Promise.resolve("unsupported");
      }
    }
    showPhotoSaveModal(blob, filename) {
      this.hidePhotoSaveModal();
      this.pendingPhotoSave = { blob, filename };
      this.photoSaveUrl = URL.createObjectURL(blob);
      element("rc-photo-save-image").src = this.photoSaveUrl;
      element("rc-photo-save-modal").hidden = false;
      element("rc-photo-save-close").focus();
    }
    hidePhotoSaveModal() {
      element("rc-photo-save-modal").hidden = true;
      element("rc-photo-save-image").removeAttribute("src");
      if (this.photoSaveUrl) URL.revokeObjectURL(this.photoSaveUrl);
      this.photoSaveUrl = null;
      this.pendingPhotoSave = null;
    }
    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
    }
    toast(message, kind = "normal") {
      const toast = element("rc-toast");
      toast.textContent = message;
      toast.dataset.kind = kind;
      toast.dataset.visible = "true";
      if (this.toastTimer !== null) clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        toast.dataset.visible = "false";
        this.toastTimer = null;
      }, 2800);
    }
  }
  (async () => {
    try {
      const persisted = await loadPersistedState();
      const app = new CaptureApp(persisted);
      window.LogCaptureApp = app;
      await app.open();
    } catch (error) {
      console.error(`[Log Capture] 초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
      const message = document.createElement("p");
      message.style.cssText = "padding:24px;font-family:system-ui,sans-serif;color:#991b1b";
      message.textContent = "Log Capture를 시작하지 못했습니다. 브라우저 콘솔을 확인해 주세요.";
      document.body.appendChild(message);
    }
  })();
})();
