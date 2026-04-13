import { state, MEMBERS } from './state.js';
import { apiRequest } from './api.js';
import { 
  getVisibleDates, formatDateLabel, cellKey, renderCellInDisplayMode,
  getTasksForMember, serializeTasksForEditor, showToast 
} from './utils.js';
import { createMarkdownEditor } from './components/MarkdownEditor.js';

export function updateWeekSummary() {
  const target = document.getElementById('weekSummary');
  const dates = getVisibleDates();
  if (!dates.length) {
    target.textContent = 'No dates found. Add dates in the board sheet.';
    return;
  }

  const newest = dates[0];
  const oldest = dates[dates.length - 1];
  target.textContent = `Dates (newest first): ${newest} to ${oldest}`;
}

export function addNewDateToBoard(dateString) {
  if (state.visibleDates.includes(dateString)) {
    showToast(`Date ${dateString} is already on the board.`, 'error');
    return false;
  }

  state.visibleDates.push(dateString);
  state.visibleDates.sort((left, right) => right.localeCompare(left));

  state.boardByDate[dateString] = {
    date: dateString,
    members: {},
  };

  MEMBERS.forEach((member) => {
    const key = cellKey(dateString, member);
    state.boardDraft[key] = '';
  });

  updateWeekSummary();
  renderBoardTable();
  return true;
}

export function renderBoardCell(date, member) {
  const key = cellKey(date, member);
  const refs = state.cellRefs.get(key);
  if (!refs) {
    return;
  }

  const editor = refs.editor;

  if (!Object.prototype.hasOwnProperty.call(state.boardDraft, key)) {
    const tasks = getTasksForMember(date, member);
    state.boardDraft[key] = serializeTasksForEditor(tasks);
  }

  if (editor.dataset.mode === 'editing' && document.activeElement === editor) {
    return;
  }

  if (editor.setValue) {
    editor.setValue(state.boardDraft[key]);
  } else {
    renderCellInDisplayMode(editor, state.boardDraft[key]);
  }
}

export function renderCellsForDate(date) {
  MEMBERS.forEach((member) => renderBoardCell(date, member));
}

export function renderBoardTable() {
  const head = document.getElementById('boardHead');
  const body = document.getElementById('boardBody');

  head.innerHTML = '';
  body.innerHTML = '';
  state.cellRefs.clear();

  const headRow = document.createElement('tr');
  const dateHead = document.createElement('th');
  dateHead.textContent = 'Date';
  headRow.appendChild(dateHead);

  MEMBERS.forEach((member) => {
    const memberHead = document.createElement('th');
    memberHead.textContent = member;
    headRow.appendChild(memberHead);
  });

  head.appendChild(headRow);

  const visibleDates = getVisibleDates();
  visibleDates.forEach((date) => {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.className = 'date-col';
    dateCell.textContent = `${formatDateLabel(date)} (${date})`;
    row.appendChild(dateCell);

    MEMBERS.forEach((member) => {
      const cell = document.createElement('td');
      cell.className = 'board-cell';

      const key = cellKey(date, member);

      const editor = createMarkdownEditor(state.boardDraft[key] || '', (newValue) => {
        state.boardDraft[key] = newValue;
      });

      cell.append(editor);
      state.cellRefs.set(key, { editor });
      row.appendChild(cell);
    });

    body.appendChild(row);
  });

  visibleDates.forEach((date) => renderCellsForDate(date));
}

export async function loadVisibleBoardDates(forceReload) {
  if (!forceReload && state.visibleDates.length) {
    updateWeekSummary();
    renderBoardTable();
    return;
  }

  try {
    const data = await apiRequest('/api/board');
    const byDate = data && data.by_date && typeof data.by_date === 'object' ? data.by_date : {};
    const dates = Object.keys(byDate)
      .filter((date) => String(date).trim().length > 0)
      .sort((left, right) => right.localeCompare(left));

    const nextBoardByDate = {};
    dates.forEach((date) => {
      const bucket = byDate[date];
      const members = bucket && bucket.members && typeof bucket.members === 'object' ? bucket.members : {};
      nextBoardByDate[date] = {
        date,
        members,
      };
    });

    state.visibleDates = dates;
    state.boardByDate = nextBoardByDate;

    const nextDraft = {};
    dates.forEach((date) => {
      MEMBERS.forEach((member) => {
        const key = cellKey(date, member);
        if (Object.prototype.hasOwnProperty.call(state.boardDraft, key)) {
          nextDraft[key] = state.boardDraft[key];
          return;
        }

        const tasks = getTasksForMember(date, member);
        nextDraft[key] = serializeTasksForEditor(tasks);
      });
    });
    state.boardDraft = nextDraft;

    updateWeekSummary();
    renderBoardTable();
  } catch (error) {
    showToast(`Failed to load board: ${error.message}`, 'error');
  }
}

export function syncVisibleEditorsToDraft() {
  state.cellRefs.forEach((refs, key) => {
    const editor = refs && refs.editor;
    if (!editor) {
      return;
    }

    if (editor.dataset.mode === 'editing') {
      const sourceText = getEditorPlainText(editor);
      state.boardDraft[key] = sourceText;
      renderCellInDisplayMode(editor, sourceText);
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(state.boardDraft, key)) {
      state.boardDraft[key] = '';
    }
  });
}

export async function saveBoardChanges() {
  const button = document.getElementById('saveBoardBtn');
  button.disabled = true;

  try {
    if (!getVisibleDates().length) {
      showToast('No dates available to save.', 'error');
      return;
    }

    syncVisibleEditorsToDraft();

    const cells = [];
    getVisibleDates().forEach((date) => {
      MEMBERS.forEach((member) => {
        const key = cellKey(date, member);
        cells.push({
          date,
          member,
          text: state.boardDraft[key] || '',
        });
      });
    });

    await apiRequest('/api/board', {
      method: 'PUT',
      body: {
        cells,
      },
    });

    state.boardByDate = {};
    state.boardDraft = {};
    await loadVisibleBoardDates(true);
    showToast('Board saved successfully.', 'success');
  } catch (error) {
    showToast(`Save failed: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}
