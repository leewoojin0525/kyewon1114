// Homepage choices are private review requests, independent of project ordering.
const homeReview = (() => {
  const MAX = 8;
  const homeKey = key + "-home-selection";
  const byRef = new Map(cards.map((card) => [card.dataset.ref, card]));
  const baseline = homeReviewBaseline.references;
  const signature = JSON.stringify([
    homeReviewBaseline.settingsVersion,
    baseline,
  ]);
  const list = document.querySelector("#home-list");
  const message = document.querySelector("#home-message");
  const buttons = new Map();
  function eligible(ref) {
    const card = byRef.get(ref);
    if (!card) return false;
    const checked = card.querySelector("input[type=checkbox]").checked;
    return card.dataset.deleted === "true" ? checked : !checked;
  }
  let selected = baseline.filter(eligible);
  try {
    const saved = JSON.parse(localStorage.getItem(homeKey) || "null");
    if (saved?.signature === signature && Array.isArray(saved.references)) {
      selected = [...new Set(saved.references)].filter(eligible).slice(0, MAX);
    }
  } catch {}
  function persist() {
    try {
      localStorage.setItem(
        homeKey,
        JSON.stringify({ signature, references: selected }),
      );
      return true;
    } catch {
      return false;
    }
  }
  function announce(text) {
    message.textContent = text;
  }
  function locate(ref) {
    document.querySelector("#project").value = byRef.get(ref).dataset.project;
    document.querySelector("#resolution").value = "";
    document.querySelector("#search").value = ref;
    document.querySelector("#usage").value = "";
    filter();
    byRef.get(ref).scrollIntoView({ block: "center" });
    buttons.get(ref).focus({ preventScroll: true });
  }
  function control(text, action, ref, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.dataset.homeAction = action;
    button.dataset.ref = ref;
    button.setAttribute("aria-label", label);
    return button;
  }
  function render() {
    document.querySelector("#home-count").textContent =
      `${selected.length} / ${MAX}장 선택`;
    document.querySelector("#home-empty").hidden = selected.length !== 0;
    list.replaceChildren();
    selected.forEach((ref, index) => {
      const card = byRef.get(ref);
      const item = document.createElement("li");
      item.className = "home-item";
      item.dataset.ref = ref;
      const rank = document.createElement("strong");
      rank.textContent = `메인 ${String(index + 1).padStart(2, "0")}`;
      const picture = control("", "locate", ref, `${ref} 사진 목록에서 보기`);
      picture.className = "home-picture";
      const img = card.querySelector("img").cloneNode();
      img.draggable = false;
      img.alt = ref;
      picture.append(img);
      const name = document.createElement("span");
      name.className = "home-ref";
      name.textContent = ref;
      const title = document.createElement("span");
      title.className = "home-title";
      title.textContent = card.dataset.title;
      const actions = document.createElement("div");
      actions.className = "home-item-controls";
      const first = control("맨 앞으로", "first", ref, `${ref} 메인 맨 앞으로`);
      const previous = control("← 앞으로", "prev", ref, `${ref} 메인 앞으로`);
      const next = control("뒤로 →", "next", ref, `${ref} 메인 뒤로`);
      first.disabled = previous.disabled = index === 0;
      next.disabled = index === selected.length - 1;
      actions.append(
        first,
        previous,
        next,
        control("선택 해제", "remove", ref, `${ref} 메인 선택 해제`),
      );
      item.append(rank, picture, name, title, actions);
      list.append(item);
    });
    for (const card of cards) {
      const ref = card.dataset.ref;
      const index = selected.indexOf(ref);
      const button = buttons.get(ref);
      card.dataset.homeSelected = String(index >= 0);
      button.setAttribute("aria-pressed", String(index >= 0));
      button.textContent =
        index >= 0 ? `메인 ${index + 1}번 선택됨 · 해제` : "메인 선택";
      button.disabled = !eligible(ref);
    }
    filter();
  }
  function changed(text) {
    const stored = persist();
    render();
    announce(
      text +
        (stored
          ? " 요청서 다운로드를 눌러 보내주세요."
          : " 브라우저 저장을 사용할 수 없으니 창을 닫기 전에 요청서를 다운로드해주세요."),
    );
  }
  for (const card of cards) {
    const ref = card.dataset.ref;
    const wrap = document.createElement("div");
    wrap.className = "home-choice";
    const button = control(
      "메인 선택",
      "toggle",
      ref,
      `${ref} 메인 선택 또는 해제`,
    );
    button.className = "home-toggle";
    button.addEventListener("click", () => {
      if (!eligible(ref)) return;
      const index = selected.indexOf(ref);
      if (index >= 0) selected.splice(index, 1);
      else if (selected.length < MAX) selected.push(ref);
      else {
        announce(
          "메인 사진은 최대 8장입니다. 위 선택 목록에서 한 장을 해제한 뒤 추가해주세요.",
        );
        document
          .querySelector("#home-selection")
          .scrollIntoView({ block: "start" });
        return;
      }
      changed(
        `${ref} ${index >= 0 ? "선택을 해제했습니다." : "사진을 메인에 선택했습니다."}`,
      );
    });
    buttons.set(ref, button);
    wrap.append(button);
    const current = baseline.indexOf(ref);
    if (current >= 0 || card.dataset.deleted === "true") {
      const note = document.createElement("small");
      note.textContent =
        current >= 0
          ? `현재 홈페이지 메인 ${current + 1}번`
          : "복원 요청을 체크하면 메인에도 선택할 수 있습니다.";
      wrap.append(note);
    }
    card.querySelector(".meta").prepend(wrap);
  }
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-action]");
    if (!button) return;
    const { ref, homeAction: action } = button.dataset;
    const index = selected.indexOf(ref);
    if (action === "locate") {
      locate(ref);
      return;
    }
    if (index < 0) return;
    if (action === "remove") selected.splice(index, 1);
    if (action === "first") selected.unshift(...selected.splice(index, 1));
    if (action === "prev" && index > 0)
      [selected[index - 1], selected[index]] = [
        selected[index],
        selected[index - 1],
      ];
    if (action === "next" && index < selected.length - 1)
      [selected[index], selected[index + 1]] = [
        selected[index + 1],
        selected[index],
      ];
    changed(
      action === "remove"
        ? `${ref} 선택을 해제했습니다.`
        : "메인 사진 순서를 변경했습니다.",
    );
    const item = [...list.children].find((li) => li.dataset.ref === ref);
    if (item) {
      const focus =
        [...item.querySelectorAll("button")].find(
          (b) => b.dataset.homeAction === action && !b.disabled,
        ) || item.querySelector("button");
      focus.focus({ preventScroll: true });
    } else
      document
        .querySelector("#home-count")
        .scrollIntoView({ block: "nearest" });
  });
  function syncAvailability() {
    const before = selected.length;
    selected = selected.filter(eligible);
    if (before !== selected.length)
      changed(
        "삭제 요청 또는 복원 취소한 사진을 메인 선택에서도 제외했습니다.",
      );
    else render();
  }
  document.querySelector("#grid").addEventListener("change", (event) => {
    if (event.target.matches("input[type=checkbox]")) syncAvailability();
  });
  document.querySelector("#home-clear").addEventListener("click", () => {
    selected = [];
    changed("선택을 비웠습니다. 아래 사진 목록에서 새로 골라주세요.");
  });
  document.querySelector("#home-reset").addEventListener("click", () => {
    selected = baseline.filter(eligible);
    changed(
      selected.length === baseline.length
        ? "현재 홈페이지 사진과 순서로 되돌렸습니다."
        : "현재 홈페이지 사진을 불러왔습니다. 삭제 요청한 사진은 제외했습니다.",
    );
  });
  document.querySelector("#show-home-only").addEventListener("click", () => {
    document.querySelector("#project").value = "";
    document.querySelector("#resolution").value = "";
    document.querySelector("#search").value = "";
    document.querySelector("#usage").value = "home";
    filter();
    document.querySelector("#grid").scrollIntoView({ block: "start" });
  });
  document
    .querySelector("#home-download")
    .addEventListener("click", () =>
      document.querySelector("#download").click(),
    );
  render();
  announce(
    "현재 메인 사진을 기본 선택으로 불러왔습니다. 변경한 선택은 이 브라우저에 저장됩니다.",
  );
  return {
    appendRequest(lines) {
      syncAvailability();
      if (!selected.length) {
        announce(
          "메인 사진을 1장 이상 선택한 뒤 요청서를 다운로드해주세요. 현재 메인으로 되돌리기를 눌러도 됩니다.",
        );
        document
          .querySelector("#home-selection")
          .scrollIntoView({ block: "start" });
        return false;
      }
      const same = JSON.stringify(selected) === JSON.stringify(baseline);
      lines.push(
        "메인페이지 사진 선택 — " + (same ? "현재 선택 유지" : "변경 요청"),
      );
      lines.push("메인 사진 수: " + selected.length + "장 / 최대 8장");
      if (homeReviewBaseline.settingsVersion != null)
        lines.push(
          "기준 홈페이지 설정 버전: " + homeReviewBaseline.settingsVersion,
        );
      selected.forEach((ref, index) => {
        const card = byRef.get(ref);
        lines.push(
          `메인 ${String(index + 1).padStart(2, "0")}: ${card.dataset.title} / ${ref}${card.dataset.deleted === "true" ? " (복원 요청 포함)" : ""}`,
        );
      });
      lines.push(
        "메인 사진 순서는 프로젝트 내부 사진 순서와 별도입니다.",
        "",
        "프로젝트별 사진 변경 요청",
        "",
      );
      return true;
    },
  };
})();
