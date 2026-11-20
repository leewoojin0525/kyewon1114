(() => {
  "use strict";
  const data = JSON.parse(document.querySelector("#review-data").textContent);
  const records = data.records;
  const byId = new Map(records.map((r) => [r.id, r]));
  const storageKey = "wovn-copy-review-v1";
  const cards = new Map();
  const undo = new Map();
  let edits = {};
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const defaultEdit = (r) => ({
    baseHash: r.sourceHash,
    baseFields: clone(r.original),
    fields: clone(r.original),
    note: "",
    hide: false,
    translate: true,
  });
  const getEdit = (r) => edits[r.id] || defaultEdit(r);
  const stale = (r, e) => e.baseHash !== r.sourceHash;
  const changedFields = (r, e) =>
    r.fields.filter((f) => e.fields[f.key] !== r.original[f.key]);
  const dirty = (r, e = getEdit(r)) =>
    changedFields(r, e).length > 0 || !!e.note.trim() || e.hide || stale(r, e);
  const notify = (text) =>
    (document.querySelector("#status").textContent = text);
  function validEdit(r, value) {
    if (
      !value ||
      typeof value !== "object" ||
      typeof value.baseHash !== "string" ||
      typeof value.note !== "string" ||
      value.note.length > 12000 ||
      typeof value.hide !== "boolean" ||
      typeof value.translate !== "boolean"
    )
      return false;
    return ["fields", "baseFields"].every(
      (name) =>
        value[name] &&
        typeof value[name] === "object" &&
        r.fields.every(
          (f) =>
            typeof value[name][f.key] === "string" &&
            value[name][f.key].length <= 30000,
        ),
    );
  }
  let loadWarning = "";
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      saved?.schemaVersion === 1 &&
      saved.items &&
      typeof saved.items === "object" &&
      !Array.isArray(saved.items)
    ) {
      for (const [id, value] of Object.entries(saved.items)) {
        const record = byId.get(id);
        if (record && validEdit(record, value)) edits[id] = value;
        else
          loadWarning =
            "일부 이전 편집 항목을 불러오지 못했습니다. 저장해 둔 백업 파일을 확인해주세요.";
      }
    }
  } catch {
    loadWarning =
      "브라우저의 이전 저장 내용을 읽지 못했습니다. 편집 후 작업 백업을 저장해주세요.";
  }
  function save() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ schemaVersion: 1, items: edits }),
      );
      return true;
    } catch {
      notify(
        "브라우저 자동 저장이 되지 않습니다. 창을 닫기 전에 요청서 또는 작업 백업을 다운로드해주세요.",
      );
      return false;
    }
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function control(text, action) {
    const b = element("button", "", text);
    b.type = "button";
    b.dataset.action = action;
    return b;
  }
  function sizeTextareas(card) {
    if (card.hidden) return;
    for (const area of card.querySelectorAll(".field textarea")) {
      area.style.height = "auto";
      area.style.height = Math.max(130, area.scrollHeight + 3) + "px";
    }
  }
  function renderCardState(r, fill = false) {
    const card = cards.get(r.id),
      e = getEdit(r);
    card.classList.toggle("is-changed", dirty(r, e));
    card.querySelector(".badge").textContent = e.hide
      ? "글 숨김 요청"
      : dirty(r, e)
        ? "수정·메모 있음"
        : "현재 원고";
    card.querySelector(".stale").hidden = !stale(r, e);
    for (const f of r.fields) {
      const wrap = card.querySelector(`[data-field="${f.key}"]`);
      wrap.classList.toggle("is-edited", e.fields[f.key] !== r.original[f.key]);
      if (fill) wrap.querySelector("input,textarea").value = e.fields[f.key];
    }
    if (fill) {
      card.querySelector(".request-note").value = e.note;
      card.querySelector("[data-option=hide]").checked = e.hide;
      card.querySelector("[data-option=translate]").checked = e.translate;
    }
    card.querySelector("[data-action=reset]").disabled = !dirty(r, e);
    card.querySelector("[data-action=undo]").hidden = !undo.has(r.id);
  }
  function updateCounts() {
    const n = records.filter((r) => dirty(r)).length;
    document.querySelector("#pending-count").textContent = `변경 ${n}건`;
  }
  function filter() {
    const scope = document.querySelector("#scope").value,
      id = document.querySelector("#entry").value;
    const q = document.querySelector("#search").value.trim().toLowerCase(),
      only = document.querySelector("#changes-only").checked;
    let count = 0;
    for (const r of records) {
      const e = getEdit(r),
        card = cards.get(r.id);
      const text = [
        r.code,
        r.title,
        ...Object.values(r.original),
        ...Object.values(e.fields),
        e.note,
      ]
        .join(" ")
        .toLowerCase();
      card.hidden = !(
        (scope === "all" || r.kind === scope) &&
        (!id || r.id === id) &&
        (!q || text.includes(q)) &&
        (!only || dirty(r, e))
      );
      if (!card.hidden) {
        count++;
        sizeTextareas(card);
      }
    }
    document.querySelector("#visible-count").textContent =
      `${count} / ${records.length}개 항목`;
    document.querySelector("#empty").hidden = count !== 0;
  }
  function editRecord(r, card) {
    const e = clone(getEdit(r));
    for (const f of r.fields)
      e.fields[f.key] = card.querySelector(
        `[data-field="${f.key}"] input,[data-field="${f.key}"] textarea`,
      ).value;
    e.note = card.querySelector(".request-note").value;
    e.hide = card.querySelector("[data-option=hide]").checked;
    e.translate = card.querySelector("[data-option=translate]").checked;
    edits[r.id] = e;
    if (!dirty(r, e) && e.translate) delete edits[r.id];
    undo.delete(r.id);
    renderCardState(r);
    updateCounts();
    sizeTextareas(card);
    if (save())
      notify(
        `${r.code} 편집 내용을 이 브라우저에 저장했습니다. 완료 후 변경 요청서를 다운로드해주세요.`,
      );
  }
  const selector = document.querySelector("#entry");
  for (const [kind, label] of [
    ["project", "프로젝트"],
    ["studio", "Studio"],
  ]) {
    const group = element("optgroup");
    group.label = label;
    for (const r of records.filter((r) => r.kind === kind)) {
      const option = element("option", "", `${r.code} ${r.title}`);
      option.value = r.id;
      group.append(option);
    }
    selector.append(group);
  }
  for (const r of records) {
    const card = element("article", "copy-card");
    card.dataset.id = r.id;
    card.id = r.code;
    const header = element("div", "card-header");
    if (r.cover) {
      const img = element("img", "cover");
      img.src = r.cover;
      img.alt = r.coverReference;
      img.loading = "lazy";
      header.append(img);
    }
    const heading = element("div", "card-heading");
    heading.append(
      element("span", "code", r.code),
      element("span", "badge", "현재 원고"),
      element("h2", "", r.title),
      element("p", "", r.basis),
    );
    const link = element(
      "a",
      "",
      r.kind === "project"
        ? "홈페이지에서 이 작품 보기"
        : "홈페이지 Studio 보기",
    );
    link.href = r.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    heading.append(link);
    header.append(heading);
    const warning = element(
      "p",
      "stale",
      "기준 원고가 바뀐 이전 수정안입니다. 현재 원문과 비교해주세요. 요청서에는 두 기준을 함께 보존합니다.",
    );
    warning.hidden = true;
    const fields = element("div", "fields");
    for (const f of r.fields) {
      const wrap = element("div", "field");
      wrap.dataset.field = f.key;
      wrap.dataset.language = f.language;
      const label = element("label", "", f.label);
      const input = element(f.multiline ? "textarea" : "input");
      input.id = `${r.code}-${f.key}`;
      label.htmlFor = input.id;
      input.value = r.original[f.key];
      input.maxLength = 30000;
      if (f.multiline) input.rows = 4;
      else input.type = "text";
      input.setAttribute("aria-label", `${r.code} ${f.label}`);
      wrap.append(
        label,
        input,
        element(
          "p",
          "field-hint",
          "문장을 그대로 읽거나, 이 칸에서 바로 수정하세요.",
        ),
      );
      fields.append(wrap);
    }
    const options = element("div", "card-options");
    for (const [key, labelText] of [
      ["translate", "한글을 바꾸면 영문도 함께 다듬기"],
      ["hide", "홈페이지에서 이 글 숨기기 요청"],
    ]) {
      const label = element("label", "check");
      const input = element("input");
      input.type = "checkbox";
      input.dataset.option = key;
      input.checked = key === "translate";
      input.setAttribute("aria-label", `${r.code} ${labelText}`);
      label.append(input, document.createTextNode(labelText));
      options.append(label);
    }
    const noteLabel = element(
      "label",
      "note-label",
      "수정 방향·추가 요청 메모",
    );
    noteLabel.htmlFor = r.code + "-note";
    const note = element("textarea", "request-note");
    note.id = r.code + "-note";
    note.rows = 2;
    note.maxLength = 12000;
    note.placeholder =
      "예: 두 번째 문단은 짧게 / 재료에 대한 설명 추가 / 표현을 더 담백하게";
    note.setAttribute("aria-label", `${r.code} 수정 요청 메모`);
    const actions = element("div", "card-actions");
    actions.append(
      control("원문으로 되돌리기", "reset"),
      control("되돌리기 취소", "undo"),
    );
    const reference = element("details", "reference");
    reference.append(element("summary", "", "현재 원문과 비교하기"));
    for (const f of r.fields)
      reference.append(
        element("h3", "", f.label),
        element("pre", "", r.original[f.key]),
      );
    const sources = element("details", "sources");
    sources.append(element("summary", "", "원고 근거·출처 보기"));
    const sourceList = element("ul");
    for (const s of r.sources) {
      const item = element("li");
      if (/^https?:\/\//.test(s.url)) {
        const a = element("a", "", s.label);
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        item.append(a);
      } else item.textContent = s.label;
      sourceList.append(item);
    }
    sources.append(sourceList);
    card.append(
      header,
      warning,
      fields,
      options,
      noteLabel,
      note,
      actions,
      reference,
      sources,
    );
    document.querySelector("#cards").append(card);
    cards.set(r.id, card);
    card.addEventListener("input", (event) => {
      if (event.target.matches("input,textarea")) editRecord(r, card);
    });
    card.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.dataset.action === "reset") {
        undo.set(r.id, clone(getEdit(r)));
        delete edits[r.id];
      }
      if (button.dataset.action === "undo") {
        edits[r.id] = undo.get(r.id);
        undo.delete(r.id);
      }
      renderCardState(r, true);
      updateCounts();
      sizeTextareas(card);
      save();
      notify(
        `${r.code} ${button.dataset.action === "reset" ? "원문으로 되돌렸습니다. ‘되돌리기 취소’로 수정안을 다시 가져올 수 있습니다." : "수정안을 다시 불러왔습니다."}`,
      );
    });
    renderCardState(r, true);
  }
  document.querySelector("#scope").addEventListener("change", () => {
    selector.value = "";
    filter();
  });
  selector.addEventListener("change", () => {
    const r = byId.get(selector.value);
    if (r) document.querySelector("#scope").value = r.kind;
    document.querySelector("#search").value = "";
    filter();
  });
  document.querySelector("#search").addEventListener("input", filter);
  document.querySelector("#changes-only").addEventListener("change", filter);
  for (const button of document.querySelectorAll("[data-view]"))
    button.addEventListener("click", () => {
      document.body.dataset.language = button.dataset.view;
      document
        .querySelectorAll("[data-view]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      filter();
    });
  function download(name, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.querySelector("#download").addEventListener("click", () => {
    const pending = records.filter((r) => dirty(r));
    if (!pending.length) {
      notify(
        "아직 수정하거나 메모를 남긴 항목이 없습니다. 문장을 바꾸거나 요청 메모를 적어주세요.",
      );
      return;
    }
    const lines = [
      "WOVN · 프로젝트·Studio 글 변경 요청",
      `작성 시각: ${new Date().toLocaleString("ko-KR")}`,
      `검토 원고 기준: ${data.edition}`,
      `요청 항목: ${pending.length}건`,
      "홈페이지 자동 반영 아님 — 원문·공개 버전을 대조한 뒤 반영",
      "",
    ];
    for (const r of pending) {
      const e = getEdit(r);
      lines.push(
        `[${r.code}] ${r.title}`,
        `항목 ID: ${r.id}`,
        `기준 공개 버전: ${r.expectedVersion}`,
        `기준 원고: ${r.sourceHash}`,
        `홈페이지: ${r.url}`,
      );
      if (stale(r, e))
        lines.push(
          "주의: 이전 원고를 기준으로 작성한 수정안입니다. 현재 원문과 비교 필요.",
          `이전 기준 원고: ${e.baseHash}`,
          "이전 원문:",
          JSON.stringify(e.baseFields, null, 2),
        );
      if (e.hide)
        lines.push(
          "글 숨기기 요청: 이 글만 홈페이지에서 숨김. 프로젝트·사진은 유지.",
        );
      const changed = changedFields(r, e);
      if (e.translate && changed.some((f) => f.language === "ko"))
        lines.push(
          "영문 요청: 수정한 한글 뜻에 맞춰 영문도 검토·다듬기. 직접 수정한 영문이 있으면 그 내용을 존중해주세요.",
          "현재 영문 참고:",
          r.fields
            .filter((f) => f.language === "en")
            .map((f) => `${f.label}\n${r.original[f.key]}`)
            .join("\n\n"),
        );
      for (const f of changed)
        lines.push(
          `【${f.label} · 현재 원문】`,
          r.original[f.key],
          `【${f.label} · 수정 요청】`,
          e.fields[f.key] || "(빈 문장으로 변경 요청)",
        );
      if (e.note.trim()) lines.push("【추가 요청 메모】", e.note);
      lines.push("", "────────────────────", "");
    }
    download(
      "WOVN-글변경요청.txt",
      "\uFEFF" + lines.join("\n"),
      "text/plain;charset=utf-8",
    );
    notify(
      `${pending.length}개 항목의 변경 요청서를 다운로드했습니다. 이 대화에 파일을 보내주세요.`,
    );
  });
  document.querySelector("#backup-save").addEventListener("click", () => {
    download(
      "WOVN-글편집-작업백업.json",
      JSON.stringify(
        {
          format: "wovn-copy-review-backup",
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          items: edits,
        },
        null,
        2,
      ),
      "application/json",
    );
    notify(
      "편집 백업을 저장했습니다. 다른 브라우저에서는 ‘백업 불러오기’로 이어갈 수 있습니다.",
    );
  });
  document
    .querySelector("#backup-open")
    .addEventListener("click", () =>
      document.querySelector("#backup-file").click(),
    );
  document
    .querySelector("#backup-file")
    .addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 3000000) throw new Error("백업 파일이 너무 큽니다.");
        const incoming = JSON.parse(await file.text());
        if (
          incoming.format !== "wovn-copy-review-backup" ||
          incoming.schemaVersion !== 1 ||
          !incoming.items ||
          typeof incoming.items !== "object" ||
          Array.isArray(incoming.items)
        )
          throw new Error("WOVN 글 편집 백업 파일이 아닙니다.");
        for (const [id, value] of Object.entries(incoming.items)) {
          if (!byId.has(id) || !validEdit(byId.get(id), value))
            throw new Error(
              "현재 목록과 맞지 않는 항목이 있습니다. 원본 백업을 이 대화에 보내주세요.",
            );
        }
        // Do not silently replace a newer edit with a different imported edit.
        const conflicts = Object.keys(incoming.items).filter(
          (id) =>
            edits[id] &&
            JSON.stringify(edits[id]) !== JSON.stringify(incoming.items[id]),
        );
        if (conflicts.length)
          throw new Error(
            "이 브라우저의 편집과 다른 내용이 겹칩니다. 현재 작업을 백업한 뒤 새 브라우저에서 불러오거나, 두 백업을 이 대화에 보내주세요.",
          );
        edits = { ...edits, ...incoming.items };
        for (const r of records) renderCardState(r, true);
        updateCounts();
        filter();
        save();
        notify("백업을 불러왔습니다. 수정 내용과 메모를 확인해주세요.");
      } catch (error) {
        notify(
          error.message ||
            "백업을 읽지 못했습니다. 현재 편집 내용은 유지됩니다.",
        );
      }
      event.target.value = "";
    });
  window.addEventListener("resize", () => {
    for (const card of cards.values()) sizeTextareas(card);
  });
  updateCounts();
  filter();
  notify(
    loadWarning ||
      (Object.keys(edits).length
        ? "이 브라우저에 저장한 편집 내용을 불러왔습니다."
        : "현재 원고를 불러왔습니다. 입력칸에서 문장을 바로 수정하거나 요청 메모를 남겨주세요."),
  );
})();
