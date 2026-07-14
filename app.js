const STORAGE_KEY = "personal-workout-pwa-v1";
const DRAFT_KEY = "personal-workout-pwa-drafts-v1";
const CATEGORIES = ["胸", "肩", "背", "腿", "手臂", "其他"];
const NOTE_SUFFIXES = ["中間那台", "窄三角 中間", "總重量", "右二", "左二", "最右", "窄 中", "左", "中", "右", "高"];

const starterExercises = [
  { name: "機械上斜臥推", category: "胸" },
  { name: "機械水平臥推", category: "胸" },
  { name: "槓鈴上斜臥推", category: "胸" },
  { name: "槓鈴臥推", category: "胸" },
  { name: "啞鈴臥推", category: "胸" },
  { name: "史密斯臥推", category: "胸" },
  { name: "機械夾胸", category: "胸" },
  { name: "Cable夾胸", category: "胸" },
  { name: "機械肩推", category: "肩" },
  { name: "啞鈴肩推", category: "肩" },
  { name: "Cable啞鈴側平舉", category: "肩" },
  { name: "Cable臉拉", category: "肩" },
  { name: "啞鈴二頭", category: "手臂" },
  { name: "啞鈴錘式", category: "手臂" },
  { name: "啞鈴錘式彎舉", category: "手臂" },
  { name: "Cable三頭", category: "手臂" },
];

const state = loadState();

const elements = {
  saveToday: document.querySelector("#save-today-button"),
  date: document.querySelector("#workout-date"),
  bodyWeight: document.querySelector("#body-weight"),
  categoryTabs: document.querySelector("#category-tabs"),
  exerciseChips: document.querySelector("#exercise-chips"),
  todayExercises: document.querySelector("#today-exercises"),
  todayEmpty: document.querySelector("#today-empty"),
  historyList: document.querySelector("#history-list"),
  historyEmpty: document.querySelector("#history-empty"),
  historyEdit: document.querySelector("#history-edit-button"),
  libraryList: document.querySelector("#library-list"),
  libraryTabs: document.querySelector("#library-tabs"),
  libraryForm: document.querySelector("#library-form"),
  libraryName: document.querySelector("#library-name"),
  exportOutput: document.querySelector("#export-output"),
  importFile: document.querySelector("#import-file"),
  importStatus: document.querySelector("#import-status"),
  exerciseTemplate: document.querySelector("#exercise-template"),
  confirmBackdrop: document.querySelector("#confirm-backdrop"),
  confirmMessage: document.querySelector("#confirm-message"),
  confirmCancel: document.querySelector("#confirm-cancel"),
  confirmAccept: document.querySelector("#confirm-accept"),
  toastBackdrop: document.querySelector("#toast-backdrop"),
  toast: document.querySelector("#toast"),
};

let draft = createEmptyWorkout(todayISO());
let activeCategory = CATEGORIES[0];
let activeLibraryCategory = CATEGORIES[0];
let activeExerciseId = null;
let isHistoryEditing = false;
let editingLibraryName = "";
let toastTimer = 0;
let confirmResolver = null;
let confirmHideTimer = 0;
let confirmRestoreFocus = null;
let libraryDrag = null;

init();

function init() {
  const bufferedToday = loadDraftBuffer(todayISO());
  const existingToday = state.workouts.find((workout) => workout.date === todayISO());
  draft = bufferedToday || (existingToday ? cloneWorkout(existingToday) : createEmptyWorkout(todayISO()));

  elements.date.value = draft.date;
  elements.bodyWeight.value = draft.bodyWeight || "";

  document.addEventListener("click", handleClick);
  elements.date.addEventListener("change", handleDateChange);
  elements.bodyWeight.addEventListener("input", () => {
    draft.bodyWeight = elements.bodyWeight.value.trim();
    persistDraftBuffer();
  });
  elements.libraryForm.addEventListener("submit", handleAddLibraryExercise);
  elements.importFile.addEventListener("change", handleImportJson);
  elements.confirmCancel.addEventListener("click", () => finishDeleteConfirmation(false));
  elements.confirmAccept.addEventListener("click", () => finishDeleteConfirmation(true));
  elements.confirmBackdrop.addEventListener("click", (event) => {
    if (event.target === elements.confirmBackdrop) finishDeleteConfirmation(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && confirmResolver) finishDeleteConfirmation(false);
  });
  elements.libraryList.addEventListener("pointerdown", handleLibraryDragStart);
  document.addEventListener("pointermove", handleLibraryDragMove);
  document.addEventListener("pointerup", handleLibraryDragEnd);
  document.addEventListener("pointercancel", handleLibraryDragEnd);

  renderAll();
}

function loadState() {
  const fallback = {
    workouts: [],
    exerciseLibrary: normalizeLibrary(starterExercises),
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return fallback;

    const workouts = normalizeWorkouts(stored.workouts);
    const exerciseLibrary = normalizeLibrary(stored.exerciseLibrary);
    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exerciseLibrary.some((item) => item.name === exercise.name)) {
          const category = guessCategory(exercise.name);
          exerciseLibrary.push({ name: exercise.name, category, order: getNextOrder(category, exerciseLibrary) });
        }
      });
    });

    return {
      workouts,
      exerciseLibrary: normalizeLibraryOrders(exerciseLibrary),
    };
  } catch {
    return fallback;
  }
}

function normalizeWorkouts(workouts) {
  if (!Array.isArray(workouts)) return [];

  return workouts
    .filter((workout) => workout?.date)
    .map((workout) => ({
      id: workout.id || newId(),
      date: workout.date,
      bodyWeight: workout.bodyWeight?.toString() || "",
      exercises: Array.isArray(workout.exercises)
        ? mergeExercises(workout.exercises
            .filter((exercise) => exercise?.name)
            .map((exercise) => {
              const normalizedExercise = normalizeExerciseIdentity(exercise.name, exercise.note);
              return {
                id: exercise.id || newId(),
                name: normalizedExercise.name,
                note: normalizedExercise.note,
                sets: Array.isArray(exercise.sets) ? exercise.sets : [],
              };
            }))
        : [],
    }));
}

function mergeExercises(exercises) {
  const byKey = new Map();
  exercises.forEach((exercise) => {
    const key = `${exercise.name}::${exercise.note || ""}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.sets.push(...exercise.sets);
    } else {
      byKey.set(key, { ...exercise, sets: [...exercise.sets] });
    }
  });
  return [...byKey.values()];
}

function normalizeLibrary(library) {
  const source = Array.isArray(library) ? library : starterExercises;

  const byName = new Map();
  source.forEach((item, sourceIndex) => {
    const rawExercise = typeof item === "string" ? { name: item, category: guessCategory(item) } : item;
    if (!rawExercise?.name) return;
    const exercise = normalizeExerciseIdentity(rawExercise.name);
    const category = CATEGORIES.includes(rawExercise.category) ? rawExercise.category : guessCategory(exercise.name);
    const order = Number(rawExercise.order);
    byName.set(exercise.name, {
      name: exercise.name,
      category,
      order: Number.isFinite(order) ? order : (byName.get(exercise.name)?.order ?? sourceIndex),
    });
  });

  return normalizeLibraryOrders([...byName.values()]);
}

function normalizeExerciseIdentity(rawName, rawNote = "") {
  const normalizedName = rawName?.toString().trim().replaceAll("（", "(").replaceAll("）", ")") || "";
  const normalizedNote = rawNote?.toString().trim() || "";
  const match = normalizedName.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!match) {
    const suffix = NOTE_SUFFIXES.find((item) => normalizedName.endsWith(` ${item}`));
    if (!suffix) return { name: canonicalizeExerciseName(normalizedName), note: normalizedNote };

    const note = [normalizedNote, suffix].filter(Boolean).join(" / ");
    return {
      name: canonicalizeExerciseName(normalizedName.slice(0, -suffix.length).trim()),
      note,
    };
  }

  const note = [normalizedNote, match[2].trim()].filter(Boolean).join(" / ");
  return {
    name: canonicalizeExerciseName(match[1].trim()),
    note,
  };
}

function canonicalizeExerciseName(name) {
  return name.trim();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadDraftBuffer(date) {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    const buffered = stored?.[date];
    if (!buffered?.date) return null;
    return cloneWorkout(buffered);
  } catch {
    return null;
  }
}

function persistDraftBuffer() {
  if (!draft?.date) return;

  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
    stored[draft.date] = {
      ...cloneWorkout(draft),
      date: draft.date,
      bodyWeight: elements.bodyWeight.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // localStorage can fail in private browsing or when storage is full.
  }
}

function clearDraftBuffer(date) {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
    delete stored[date];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function createEmptyWorkout(date) {
  return {
    id: newId(),
    date,
    bodyWeight: "",
    exercises: [],
  };
}

function cloneWorkout(workout) {
  return JSON.parse(JSON.stringify(workout));
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWeekday(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return weekdays[date.getDay()];
}

function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const view = button.dataset.view;

  if (view) {
    switchView(view);
    return;
  }

  if (!action) return;

  const exerciseId = button.closest("[data-exercise-id]")?.dataset.exerciseId;
  const setId = button.closest("[data-set-id]")?.dataset.setId;

  const actions = {
    "save-today": saveToday,
    "toggle-history-edit": () => {
      isHistoryEditing = !isHistoryEditing;
      renderHistory();
    },
    "copy-text": copyTextExport,
    "download-json": downloadJson,
    "import-json": () => elements.importFile.click(),
    "fill-last-set": () => fillLastSet(exerciseId, Number(button.dataset.index || 0)),
    "repeat-last-set": () => repeatLastSet(exerciseId),
    "toggle-exercise": () => toggleExerciseWorkspace(exerciseId),
    "select-category": () => {
      activeCategory = button.dataset.category;
      renderToday();
    },
    "select-library-category": () => {
      activeLibraryCategory = button.dataset.category;
      editingLibraryName = "";
      renderLibrary();
    },
    "remove-exercise": () => removeExercise(exerciseId),
    "remove-set": () => removeSet(exerciseId, setId),
    "add-from-library": () => addExercise(button.dataset.name),
    "library-edit": () => {
      editingLibraryName = button.dataset.name;
      renderLibrary();
    },
    "library-save": () => saveLibraryEdit(button),
    "library-cancel": () => {
      editingLibraryName = "";
      renderLibrary();
    },
    "library-delete": () => deleteLibraryExercise(button.dataset.name),
    "delete-workout": () => deleteWorkout(button.dataset.date),
  };

  actions[action]?.();
}

function handleDateChange() {
  persistDraftBuffer();
  const date = elements.date.value || todayISO();
  const buffered = loadDraftBuffer(date);
  const existing = state.workouts.find((workout) => workout.date === date);
  draft = buffered || (existing ? cloneWorkout(existing) : createEmptyWorkout(date));
  activeExerciseId = null;
  elements.bodyWeight.value = draft.bodyWeight || "";
  renderToday();
}

function handleAddLibraryExercise(event) {
  event.preventDefault();
  const name = elements.libraryName.value.trim();
  if (!name) return;
  addToLibrary(name, activeLibraryCategory);
  elements.libraryName.value = "";
  renderAll();
  showToast("新增成功", "success");
}

function addToLibrary(name, category = activeCategory) {
  const normalized = normalizeExerciseIdentity(name);
  if (!normalized.name) return;
  const nextCategory = category || guessCategory(normalized.name);
  const existing = state.exerciseLibrary.find((exercise) => exercise.name === normalized.name);
  if (existing) {
    if (existing.category !== nextCategory) {
      existing.category = nextCategory;
      existing.order = getNextOrder(nextCategory);
    }
  } else {
    state.exerciseLibrary.push({ name: normalized.name, category: nextCategory, order: getNextOrder(nextCategory) });
  }
  state.exerciseLibrary = normalizeLibraryOrders(state.exerciseLibrary);
  persist();
}

async function deleteLibraryExercise(name) {
  if (!(await confirmDeletion(`確定要刪除動作「${name}」嗎？`))) return;
  state.exerciseLibrary = state.exerciseLibrary.filter((exercise) => exercise.name !== name);
  persist();
  renderAll();
  showToast("刪除成功", "danger");
}

function saveLibraryEdit(button) {
  const item = button.closest(".library-item");
  const oldName = button.dataset.name;
  const nextName = item?.querySelector("[data-field='library-edit-name']")?.value.trim();
  const nextCategory = item?.querySelector("[data-field='library-edit-category']")?.value;
  if (!oldName || !nextName || !nextCategory) return;

  updateLibraryExercise(oldName, nextName, nextCategory);
  editingLibraryName = "";
  renderAll();
}

function updateLibraryExercise(oldName, nextName, nextCategory) {
  const oldCanonical = normalizeExerciseIdentity(oldName).name;
  const nextCanonical = normalizeExerciseIdentity(nextName).name;
  if (!oldCanonical || !nextCanonical) return;

  state.exerciseLibrary = state.exerciseLibrary
    .map((exercise) => ({
      ...exercise,
      name: normalizeExerciseIdentity(exercise.name).name,
    }))
    .filter((exercise) => exercise.name && exercise.name !== oldCanonical && exercise.name !== nextCanonical);
  state.exerciseLibrary.push({ name: nextCanonical, category: nextCategory, order: getNextOrder(nextCategory) });
  state.exerciseLibrary = normalizeLibraryOrders(state.exerciseLibrary);

  draft.exercises.forEach((exercise) => {
    if (normalizeExerciseIdentity(exercise.name).name === oldCanonical) exercise.name = nextCanonical;
  });

  state.workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (normalizeExerciseIdentity(exercise.name).name === oldCanonical) exercise.name = nextCanonical;
    });
  });

  rebuildLibraryFromWorkouts();
  persist();
}

function rebuildLibraryFromWorkouts() {
  const byName = new Map();
  state.exerciseLibrary.forEach((exercise) => {
    const normalized = normalizeExerciseIdentity(exercise.name);
    if (!normalized.name) return;
    byName.set(normalized.name, {
      name: normalized.name,
      category: CATEGORIES.includes(exercise.category) ? exercise.category : guessCategory(normalized.name),
      order: Number.isFinite(Number(exercise.order)) ? Number(exercise.order) : getNextOrder(exercise.category, [...byName.values()]),
    });
  });

  draft.exercises.forEach((exercise) => {
    const normalized = normalizeExerciseIdentity(exercise.name);
    if (!normalized.name || byName.has(normalized.name)) return;
    const category = guessCategory(normalized.name);
    byName.set(normalized.name, { name: normalized.name, category, order: getNextOrder(category, [...byName.values()]) });
  });

  state.workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const normalized = normalizeExerciseIdentity(exercise.name);
      if (!normalized.name || byName.has(normalized.name)) return;
      const category = guessCategory(normalized.name);
      byName.set(normalized.name, { name: normalized.name, category, order: getNextOrder(category, [...byName.values()]) });
    });
  });

  state.exerciseLibrary = normalizeLibraryOrders([...byName.values()]);
}

async function deleteWorkout(date) {
  if (!(await confirmDeletion(`確定要刪除 ${formatDate(date)} 的訓練紀錄嗎？`))) return;
  state.workouts = state.workouts.filter((workout) => workout.date !== date);
  if (draft.date === date) {
    draft = createEmptyWorkout(date);
    elements.bodyWeight.value = "";
  }
  persist();
  renderAll();
  showToast("刪除成功", "danger");
}

function addExercise(name) {
  if (!name) return;

  const existing = draft.exercises.find((exercise) => exercise.name === name);
  if (existing) {
    draft.exercises = [existing, ...draft.exercises.filter((exercise) => exercise.id !== existing.id)];
    activeExerciseId = existing.id;
    persistDraftBuffer();
    renderToday();
    return;
  }

  const exercise = {
    id: newId(),
    name,
    note: "",
    sets: [],
  };
  draft.exercises.unshift(exercise);
  activeExerciseId = exercise.id;

  addToLibrary(name, getExerciseCategory(name));
  persistDraftBuffer();
  renderToday();
  showToast("新增成功", "success");
}

async function removeExercise(exerciseId) {
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  if (!exercise || !(await confirmDeletion(`確定要刪除本次的「${exercise.name}」嗎？`))) return;
  draft.exercises = draft.exercises.filter((exercise) => exercise.id !== exerciseId);
  if (activeExerciseId === exerciseId) activeExerciseId = null;
  persistDraftBuffer();
  renderToday();
  showToast("刪除成功", "danger");
}

function toggleExerciseWorkspace(exerciseId) {
  activeExerciseId = activeExerciseId === exerciseId ? null : exerciseId;
  renderToday();
}

function fillLastSet(exerciseId, index) {
  const card = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  if (!card || !exercise) return;

  const last = findLastExercise(exercise.name);
  const set = last?.sets[index];
  if (!set) return;

  const parsed = normalizeSet(set);
  card.querySelector("[name='weight']").value = parsed.weight;
  card.querySelector("[name='unit']").value = parsed.unit;
  card.querySelector("[name='reps']").value = parsed.reps;
  card.querySelector("[name='repeat']").value = parsed.repeat || "1";
  card.querySelector("[name='weight']").focus();
}

function repeatLastSet(exerciseId) {
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  const previousSet = exercise?.sets[exercise.sets.length - 1];
  if (!exercise || !previousSet) return;

  const parsed = normalizeSet(previousSet);
  addSetToExercise(exercise, {
    id: newId(),
    weight: parsed.weight,
    unit: parsed.unit,
    reps: parsed.reps,
    repeat: "1",
  });
  persistDraftBuffer();
  renderToday();
  showToast("新增成功", "success");
}

async function removeSet(exerciseId, setId) {
  const exercise = draft.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  const set = exercise.sets.find((item) => item.id === setId);
  if (!set || !(await confirmDeletion(`確定要刪除 ${formatSet(set)} 嗎？`))) return;
  exercise.sets = exercise.sets.filter((set) => set.id !== setId);
  persistDraftBuffer();
  renderToday();
  showToast("刪除成功", "danger");
}

function saveToday() {
  draft.date = elements.date.value || todayISO();
  draft.bodyWeight = elements.bodyWeight.value.trim();

  const cleanWorkout = {
    ...cloneWorkout(draft),
    exercises: draft.exercises
      .map((exercise) => ({
        ...exercise,
        note: exercise.note?.trim() || "",
        sets: exercise.sets.filter((set) => set.reps),
      }))
      .filter((exercise) => exercise.sets.length),
  };

  state.workouts = state.workouts.filter((workout) => workout.date !== cleanWorkout.date);
  if (cleanWorkout.exercises.length || cleanWorkout.bodyWeight) {
    state.workouts.push(cleanWorkout);
  }
  sortWorkouts();
  persist();
  clearDraftBuffer(cleanWorkout.date);
  renderAll();
  switchView("history");
}

function sortWorkouts() {
  state.workouts.sort((a, b) => b.date.localeCompare(a.date));
}

function findLastExercise(name) {
  return state.workouts
    .filter((workout) => workout.date !== draft.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((workout) => workout.exercises)
    .find((exercise) => exercise.name === name);
}

function switchView(view) {
  if (view !== "history" && isHistoryEditing) {
    isHistoryEditing = false;
    renderHistory();
  }
  elements.saveToday.hidden = view !== "today";

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  });

  if (view === "export") renderExport();
}

function renderAll() {
  renderToday();
  renderHistory();
  renderLibrary();
  renderExport();
}

function renderToday() {
  if (!draft.exercises.some((exercise) => exercise.id === activeExerciseId)) activeExerciseId = null;
  elements.categoryTabs.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const tab = document.createElement("button");
    tab.className = `category-tab${category === activeCategory ? " is-active" : ""}`;
    tab.type = "button";
    tab.dataset.action = "select-category";
    tab.dataset.category = category;
    tab.textContent = category;
    elements.categoryTabs.append(tab);
  });

  elements.exerciseChips.innerHTML = "";
  state.exerciseLibrary
    .filter((exercise) => exercise.category === activeCategory)
    .forEach((exercise) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.dataset.action = "add-from-library";
    chip.dataset.name = exercise.name;
    chip.textContent = exercise.name;
    elements.exerciseChips.append(chip);
  });

  elements.todayExercises.innerHTML = "";
  draft.exercises.forEach((exercise) => {
    elements.todayExercises.append(renderExerciseCard(exercise));
  });
  elements.todayEmpty.hidden = draft.exercises.length > 0;
}

function renderExerciseCard(exercise) {
  const node = elements.exerciseTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.exerciseId = exercise.id;
  const isActive = exercise.id === activeExerciseId;
  node.classList.toggle("is-active", isActive);
  node.querySelector(".exercise-title").textContent = exercise.name;
  const toggle = node.querySelector(".exercise-toggle");
  toggle.setAttribute("aria-expanded", String(isActive));
  node.querySelector(".exercise-workspace").hidden = !isActive;
  node.querySelector("[name='unit']").value = findPreferredUnit(exercise);
  const noteInput = node.querySelector("[name='note']");
  noteInput.value = exercise.note || "";
  noteInput.addEventListener("input", (event) => {
    exercise.note = event.currentTarget.value.trim();
    persistDraftBuffer();
  });

  const last = findLastExercise(exercise.name);
  node.querySelector(".last-note").textContent = last ? `最近一次：${formatSetsInline(last.sets)}` : "尚無上次紀錄";

  const lastSetButtons = node.querySelector(".last-set-buttons");
  lastSetButtons.hidden = !last?.sets?.length;
  if (last?.sets?.length) {
    last.sets.forEach((set, index) => {
      const button = document.createElement("button");
      button.className = "ghost-button";
      button.type = "button";
      button.dataset.action = "fill-last-set";
      button.dataset.index = String(index);
      button.textContent = `填入 ${formatSet(set)}`;
      lastSetButtons.append(button);
    });
  }

  const sets = node.querySelector(".sets");
  exercise.sets.forEach((set) => {
    const row = document.createElement("div");
    row.className = "set-row";
    row.dataset.setId = set.id;
    row.innerHTML = `
      <span class="set-row-value">${formatSet(set)}</span>
      <button class="mini-button danger" type="button" data-action="remove-set">刪除</button>
    `;
    sets.append(row);
  });
  node.querySelector(".repeat-set-button").disabled = exercise.sets.length === 0;

  node.querySelector(".set-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const reps = data.get("reps")?.toString().trim();
    if (!reps) return;

    const nextSet = {
      id: newId(),
      weight: data.get("weight")?.toString().trim() || "",
      unit: data.get("unit")?.toString() || "",
      reps,
      repeat: data.get("repeat")?.toString().trim() || "1",
    };

    addSetToExercise(exercise, nextSet);

    form.reset();
    persistDraftBuffer();
    renderToday();
    showToast("新增成功", "success");
  });

  return node;
}

function addSetToExercise(exercise, nextSet) {
  const previousSet = exercise.sets[exercise.sets.length - 1];
  if (!previousSet || !isSameSet(previousSet, nextSet)) {
    exercise.sets.push(nextSet);
    return;
  }

  const currentRepeat = Number(previousSet.repeat || 1) || 1;
  const addedRepeat = Number(nextSet.repeat || 1) || 1;
  previousSet.repeat = String(currentRepeat + addedRepeat);
}

function renderHistory() {
  if (!state.workouts.length) isHistoryEditing = false;
  elements.historyEdit.textContent = isHistoryEditing ? "完成" : "編輯";
  elements.historyEdit.disabled = state.workouts.length === 0;
  elements.historyEdit.setAttribute("aria-pressed", String(isHistoryEditing));
  elements.historyList.innerHTML = "";
  state.workouts.forEach((workout) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const head = document.createElement("div");
    head.className = "history-head";

    const summary = document.createElement("div");
    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = formatDate(workout.date);
    const weekday = document.createElement("span");
    weekday.className = "history-weekday";
    weekday.textContent = formatWeekday(workout.date);
    date.append(weekday);
    const weight = document.createElement("span");
    weight.className = "history-weight";
    weight.textContent = workout.bodyWeight ? `${workout.bodyWeight} kg` : "未記錄體重";
    summary.append(date, weight);

    head.append(summary);
    if (isHistoryEditing) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "mini-button danger";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete-workout";
      deleteButton.dataset.date = workout.date;
      deleteButton.textContent = "刪除";
      head.append(deleteButton);
    }

    const exercises = document.createElement("div");
    exercises.className = "history-exercises";
    workout.exercises.forEach((exercise) => {
      const block = document.createElement("div");
      block.className = "history-exercise";

      const name = document.createElement("div");
      name.className = "history-exercise-name";
      name.textContent = exercise.name;
      if (exercise.note) {
        const note = document.createElement("span");
        note.className = "history-exercise-note";
        note.textContent = exercise.note;
        name.append(note);
      }

      const sets = document.createElement("div");
      sets.className = "history-sets";
      exercise.sets.forEach((set) => {
        const tag = document.createElement("span");
        tag.className = "history-set";
        tag.textContent = formatSet(set);
        sets.append(tag);
      });

      block.append(name, sets);
      exercises.append(block);
    });

    item.append(head, exercises);
    elements.historyList.append(item);
  });
  elements.historyEmpty.hidden = state.workouts.length > 0;
}

function renderLibrary() {
  elements.libraryName.placeholder = `新增「${activeLibraryCategory}」動作`;
  elements.libraryName.setAttribute("aria-label", `新增${activeLibraryCategory}類動作`);
  elements.libraryTabs.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const tab = document.createElement("button");
    tab.className = `category-tab${category === activeLibraryCategory ? " is-active" : ""}`;
    tab.type = "button";
    tab.dataset.action = "select-library-category";
    tab.dataset.category = category;
    tab.textContent = category;
    elements.libraryTabs.append(tab);
  });

  elements.libraryList.innerHTML = "";
  const visibleExercises = state.exerciseLibrary.filter((exercise) => exercise.category === activeLibraryCategory);
  if (!visibleExercises.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty";
    empty.textContent = "這個分類還沒有動作。";
    elements.libraryList.append(empty);
    return;
  }

  visibleExercises.forEach((exercise) => {
    const item = document.createElement("div");
    item.className = "library-item";
    item.dataset.libraryName = exercise.name;

    if (editingLibraryName === exercise.name) {
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = exercise.name;
      nameInput.dataset.field = "library-edit-name";
      nameInput.ariaLabel = "動作名稱";

      const categorySelect = document.createElement("select");
      categorySelect.dataset.field = "library-edit-category";
      categorySelect.ariaLabel = "動作分類";
      CATEGORIES.forEach((categoryName) => {
        const option = document.createElement("option");
        option.value = categoryName;
        option.textContent = categoryName;
        option.selected = categoryName === exercise.category;
        categorySelect.append(option);
      });

      const saveButton = document.createElement("button");
      saveButton.className = "mini-button";
      saveButton.type = "button";
      saveButton.dataset.action = "library-save";
      saveButton.dataset.name = exercise.name;
      saveButton.textContent = "儲存";

      const cancelButton = document.createElement("button");
      cancelButton.className = "mini-button";
      cancelButton.type = "button";
      cancelButton.dataset.action = "library-cancel";
      cancelButton.textContent = "取消";

      item.classList.add("is-editing");
      item.append(nameInput, categorySelect, saveButton, cancelButton);
      elements.libraryList.append(item);
      return;
    }

    const dragHandle = document.createElement("button");
    dragHandle.className = "library-drag-handle";
    dragHandle.type = "button";
    dragHandle.ariaLabel = "拖曳排序";
    dragHandle.textContent = "≡";

    const label = document.createElement("span");
    label.className = "library-name";
    label.textContent = exercise.name;

    const editButton = document.createElement("button");
    editButton.className = "mini-button";
    editButton.type = "button";
    editButton.dataset.action = "library-edit";
    editButton.dataset.name = exercise.name;
    editButton.textContent = "編輯";

    const deleteButton = document.createElement("button");
    deleteButton.className = "mini-button danger";
    deleteButton.type = "button";
    deleteButton.dataset.action = "library-delete";
    deleteButton.dataset.name = exercise.name;
    deleteButton.textContent = "刪除";

    item.append(dragHandle, label, editButton, deleteButton);
    elements.libraryList.append(item);
  });
}

function handleLibraryDragStart(event) {
  const handle = event.target.closest(".library-drag-handle");
  if (!handle) return;

  const item = handle.closest(".library-item");
  if (!item || item.classList.contains("is-editing")) return;

  event.preventDefault();
  libraryDrag = {
    item,
    pointerId: event.pointerId,
  };
  item.classList.add("is-dragging");
  handle.setPointerCapture?.(event.pointerId);
}

function handleLibraryDragMove(event) {
  if (!libraryDrag || event.pointerId !== libraryDrag.pointerId) return;

  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".library-item:not(.is-editing)");
  if (!target || target === libraryDrag.item || target.parentElement !== elements.libraryList) return;

  const targetRect = target.getBoundingClientRect();
  const shouldPlaceBefore = event.clientY < targetRect.top + targetRect.height / 2;
  elements.libraryList.insertBefore(libraryDrag.item, shouldPlaceBefore ? target : target.nextElementSibling);
}

function handleLibraryDragEnd(event) {
  if (!libraryDrag || event.pointerId !== libraryDrag.pointerId) return;

  const item = libraryDrag.item;
  item.classList.remove("is-dragging");
  libraryDrag = null;

  const orderedNames = [...elements.libraryList.querySelectorAll(".library-item")]
    .map((element) => element.dataset.libraryName)
    .filter(Boolean);
  applyLibraryOrder(orderedNames);
  persist();
  renderAll();
}

function applyLibraryOrder(orderedNames) {
  orderedNames.forEach((name, index) => {
    const exercise = state.exerciseLibrary.find((item) => item.name === name && item.category === activeLibraryCategory);
    if (exercise) exercise.order = index;
  });
  state.exerciseLibrary = normalizeLibraryOrders(state.exerciseLibrary);
}

function renderExport() {
  elements.exportOutput.value = state.workouts.map(formatWorkout).join("\n\n");
}

async function handleImportJson(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const imported = normalizeImportedState(JSON.parse(await file.text()));
    const workoutCount = imported.workouts.length;
    const shouldImport = window.confirm(`讀取後會覆蓋目前這台裝置的資料。\n\n備份內有 ${workoutCount} 筆訓練紀錄。確定要讀取嗎？`);
    if (!shouldImport) {
      setImportStatus("已取消讀取。");
      return;
    }

    state.workouts = imported.workouts;
    state.exerciseLibrary = imported.exerciseLibrary;
    sortWorkouts();
    persist();

    const existingToday = state.workouts.find((workout) => workout.date === elements.date.value);
    draft = existingToday ? cloneWorkout(existingToday) : createEmptyWorkout(elements.date.value || todayISO());
    activeExerciseId = null;
    elements.bodyWeight.value = draft.bodyWeight || "";

    renderAll();
    setImportStatus(`讀取完成：${workoutCount} 筆訓練紀錄。`);
    switchView("history");
  } catch {
    setImportStatus("讀取失敗：請選擇由這個 App 下載的 JSON 備份。", true);
  }
}

function normalizeImportedState(imported) {
  if (!imported || !Array.isArray(imported.workouts)) {
    throw new Error("Invalid backup");
  }

  const workouts = imported.workouts
    .filter((workout) => workout?.date)
    .map((workout) => ({
      id: workout.id || newId(),
      date: workout.date,
      bodyWeight: workout.bodyWeight?.toString() || "",
      exercises: Array.isArray(workout.exercises)
        ? mergeExercises(workout.exercises
            .filter((exercise) => exercise?.name)
            .map((exercise) => {
              const normalizedExercise = normalizeExerciseIdentity(exercise.name, exercise.note);
              return {
                id: exercise.id || newId(),
                name: normalizedExercise.name,
                note: normalizedExercise.note,
                sets: Array.isArray(exercise.sets)
                  ? exercise.sets
                      .filter((set) => set?.reps)
                      .map((set) => ({
                        id: set.id || newId(),
                        weight: set.weight?.toString() || "",
                        unit: set.unit?.toString() || "",
                        reps: set.reps?.toString() || "",
                        repeat: set.repeat?.toString() || "1",
                      }))
                  : [],
              };
            }))
        : [],
    }));

  const importedLibrary = normalizeLibrary(imported.exerciseLibrary);
  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (!importedLibrary.some((item) => item.name === exercise.name)) {
        const category = guessCategory(exercise.name);
        importedLibrary.push({ name: exercise.name, category, order: getNextOrder(category, importedLibrary) });
      }
    });
  });

  return {
    workouts,
    exerciseLibrary: normalizeLibraryOrders(importedLibrary),
  };
}

function setImportStatus(message, isError = false) {
  elements.importStatus.textContent = message;
  elements.importStatus.classList.toggle("is-error", isError);
}

function showToast(message, type = "success") {
  if (!elements.toast) return;

  elements.toast.textContent = message;
  elements.toast.classList.remove("is-success", "is-danger");
  elements.toast.classList.add(type === "danger" ? "is-danger" : "is-success");
  elements.toast.classList.add("is-visible");
  elements.toastBackdrop?.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    elements.toastBackdrop?.classList.remove("is-visible");
  }, 600);
}

function confirmDeletion(message) {
  if (confirmResolver) finishDeleteConfirmation(false);

  clearTimeout(confirmHideTimer);
  confirmRestoreFocus = document.activeElement;
  elements.confirmMessage.textContent = message;
  elements.confirmBackdrop.hidden = false;

  return new Promise((resolve) => {
    confirmResolver = resolve;
    requestAnimationFrame(() => {
      elements.confirmBackdrop.classList.add("is-visible");
      elements.confirmCancel.focus();
    });
  });
}

function finishDeleteConfirmation(confirmed) {
  if (!confirmResolver) return;

  const resolve = confirmResolver;
  confirmResolver = null;
  elements.confirmBackdrop.classList.remove("is-visible");
  confirmRestoreFocus?.focus();
  confirmRestoreFocus = null;
  confirmHideTimer = window.setTimeout(() => {
    elements.confirmBackdrop.hidden = true;
  }, 160);
  resolve(confirmed);
}

function formatWorkout(workout) {
  const heading = `${formatDate(workout.date)}${workout.bodyWeight ? ` ${workout.bodyWeight}kg` : ""}`;
  const exercises = workout.exercises.map((exercise) => {
    const sets = exercise.sets.map(formatSet).join("\n");
    const note = exercise.note ? ` (${exercise.note})` : "";
    return `${exercise.name}${note}\n${sets}`;
  });

  return [heading, ...exercises].join("\n");
}

function formatSet(set) {
  const parsed = normalizeSet(set);
  const repeat = set.repeat && set.repeat !== "1" ? ` x${set.repeat}` : "";
  const weight = parsed.weight ? `${parsed.weight}${parsed.unit} ` : "";
  return `${weight}x${parsed.reps}${repeat}`;
}

function isSameSet(a, b) {
  const left = normalizeSet(a);
  const right = normalizeSet(b);
  return left.weight === right.weight && left.unit === right.unit && left.reps === right.reps;
}

function findPreferredUnit(exercise) {
  const currentSet = [...exercise.sets].reverse().find((set) => "unit" in set || set.weight);
  if (currentSet) return normalizeSet(currentSet).unit;

  const lastExercise = findLastExercise(exercise.name);
  const lastSet = [...(lastExercise?.sets || [])].reverse().find((set) => "unit" in set || set.weight);
  if (lastSet) return normalizeSet(lastSet).unit;

  return "lbs";
}

function formatSetsInline(sets) {
  if (!sets.length) return "無組數";
  return sets.map(formatSet).slice(0, 2).join(" / ") + (sets.length > 2 ? " ..." : "");
}

async function copyTextExport() {
  renderExport();
  elements.exportOutput.select();

  try {
    await navigator.clipboard.writeText(elements.exportOutput.value);
  } catch {
    document.execCommand("copy");
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(createBackupPayload(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workout-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function createBackupPayload() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    workouts: cloneWorkout(state.workouts),
    exerciseLibrary: state.exerciseLibrary.map((exercise) => ({
      name: exercise.name,
      category: exercise.category,
      order: exercise.order,
    })),
  };
}

function normalizeSet(set) {
  const rawWeight = set.weight?.toString().trim() || "";
  const explicitUnit = set.unit?.toString() || "";
  const match = rawWeight.match(/^(.+?)(kg|lbs)$/i);

  if (explicitUnit) {
    return { ...set, weight: rawWeight, unit: explicitUnit };
  }

  if (match) {
    return {
      ...set,
      weight: match[1].trim(),
      unit: match[2].toLowerCase(),
    };
  }

  return { ...set, weight: rawWeight, unit: "" };
}

function guessCategory(name) {
  if (name.includes("腹") || name.includes("卷腹")) return "其他";
  if (name.includes("肩") || name.includes("側平舉") || name.includes("臉拉")) return "肩";
  if (name.includes("二頭") || name.includes("三頭") || name.includes("錘式") || name.includes("手腕")) return "手臂";
  if (name.includes("背") || name.includes("划船") || name.includes("下拉") || name.includes("後拉") || name.toLowerCase().includes("row") || name.toLowerCase().includes("lat")) return "背";
  if (name.includes("腿") || name.includes("蹲") || name.includes("硬舉") || name.includes("腳踏車")) return "腿";
  if (name.includes("胸") || name.includes("臥推") || name.includes("上斜") || name.includes("飛鳥") || name.includes("夾胸")) return "胸";
  return "其他";
}

function getExerciseCategory(name) {
  return state.exerciseLibrary.find((exercise) => exercise.name === name)?.category || guessCategory(name);
}

function sortExercises(a, b) {
  const categoryDiff = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
  return categoryDiff || getExerciseOrder(a) - getExerciseOrder(b) || a.name.localeCompare(b.name, "zh-Hant");
}

function normalizeLibraryOrders(library) {
  const counts = new Map();
  return [...library].sort(sortExercises).map((exercise) => {
    const category = CATEGORIES.includes(exercise.category) ? exercise.category : guessCategory(exercise.name);
    const order = counts.get(category) || 0;
    counts.set(category, order + 1);
    return { ...exercise, category, order };
  });
}

function getExerciseOrder(exercise) {
  const order = Number(exercise?.order);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function getNextOrder(category, library = state.exerciseLibrary) {
  const currentCategory = CATEGORIES.includes(category) ? category : "其他";
  return library
    .filter((exercise) => exercise.category === currentCategory)
    .reduce((maxOrder, exercise) => Math.max(maxOrder, getExerciseOrder(exercise)), -1) + 1;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
