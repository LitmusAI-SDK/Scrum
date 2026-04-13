import { STATUS_ALIASES, STATUS_LABELS, STATUS_FLOW, STATUS_CLASS, state, STORAGE_KEYS, MEMBERS } from './state.js';

export function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[value] || 'to do';
}

export function getStatusLabel(status) {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || STATUS_LABELS['to do'];
}

export function getNextStatus(status) {
  const current = normalizeStatus(status);
  const currentIndex = STATUS_FLOW.indexOf(current);
  return STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length];
}

export function getStoredSiteUrl() {
  const stored = (localStorage.getItem(STORAGE_KEYS.siteUrl) || '').trim();
  return stored || window.location.origin;
}

export function buildTicketUrl(ticketId) {
  return `${getStoredSiteUrl().replace(/\/$/, '')}/${encodeURIComponent(ticketId)}`;
}

export function extractTicketId(input) {
  const source = String(input || '');
  const match = source.match(/LITMUS-\d+/i);
  return match ? match[0].toUpperCase() : '';
}

export function serializeTasksForEditor(tasks) {
  return tasks
    .map((task) => {
      const ticketId = String(task.ticket_id || '').trim();
      const text = String(task.free_text || '').replace(/\r\n/g, '\n');
      if (!text && ticketId) {
        return ticketId;
      }

      if (!ticketId || new RegExp(`\\b${ticketId}\\b`, 'i').test(text)) {
        return text;
      }

      return `${text} ${ticketId}`;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getTicketTagHtml(ticketId, asLink) {
  const safeId = escapeHtml(ticketId);
  const ticket = state.ticketMap[ticketId];
  const ticketTitle = ticket && ticket.title ? ` title="${escapeHtml(ticket.title)}"` : '';

  if (asLink) {
    return `<a class="ticket-tag" href="${escapeHtml(buildTicketUrl(ticketId))}" data-ticket-id="${safeId}" target="_blank" rel="noopener noreferrer" contenteditable="false"${ticketTitle}>${safeId}</a>`;
  }

  return `<span class="ticket-tag" data-ticket-id="${safeId}" contenteditable="false"${ticketTitle}>${safeId}</span>`;
}

export function replaceTicketTokensWithTags(text, asLink) {
  const tokens = [];
  const withPlaceholders = String(text || '').replace(
    /https?:\/\/[^\s<]*LITMUS-\d+\b|\bLITMUS-\d+\b/gi,
    (match) => {
      const ticketId = extractTicketId(match);
      if (!ticketId) {
        return match;
      }

      const token = `@@TICKET_${tokens.length}@@`;
      tokens.push({ token, ticketId });
      return token;
    },
  );

  let html = escapeHtml(withPlaceholders);
  tokens.forEach((entry) => {
    html = html.replace(new RegExp(escapeRegex(entry.token), 'g'), getTicketTagHtml(entry.ticketId, asLink));
  });

  return html;
}

export function getTicketTokenSignature(text) {
  const source = String(text || '');
  const tokens = [];
  const regex = /https?:\/\/[^\s<]*LITMUS-\d+\b|\bLITMUS-\d+\b/gi;

  let match = regex.exec(source);
  while (match) {
    const ticketId = extractTicketId(match[0]);
    if (ticketId) {
      tokens.push(`${ticketId}@${match.index}`);
    }
    match = regex.exec(source);
  }

  return tokens.join('|');
}

export function renderEditableSourceHtml(sourceText) {
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n');
  if (!normalized) {
    return '';
  }

  return normalized
    .split('\n')
    .map((line) => replaceTicketTokensWithTags(line, false))
    .join('<br>');
}

export function renderInlineMarkdown(line) {
  return replaceTicketTokensWithTags(line, true)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

export function renderMarkdownToHtml(sourceText) {
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return '';
  }

  const lines = normalized.split('\n');
  const parts = [];
  let listType = '';

  const closeList = () => {
    if (listType) {
      parts.push(`</${listType}>`);
      listType = '';
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);

    if (bulletMatch) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        parts.push('<ul>');
      }
      parts.push(`<li>${renderInlineMarkdown(bulletMatch[1])}</li>`);
      return;
    }

    if (orderedMatch) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        parts.push('<ol>');
      }
      parts.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    closeList();

    if (!trimmed) {
      parts.push('<p><br></p>');
      return;
    }

    if (/^---+$/.test(trimmed)) {
      parts.push('<hr />');
      return;
    }

    parts.push(`<p>${renderInlineMarkdown(line)}</p>`);
  });

  closeList();
  return parts.join('');
}

export function getEditorPlainText(editor) {
  return String(editor && editor.innerText ? editor.innerText : '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n$/, '');
}

export function getCaretOffset(editor) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.endContainer)) {
    return null;
  }

  const preCaret = range.cloneRange();
  preCaret.selectNodeContents(editor);
  preCaret.setEnd(range.endContainer, range.endOffset);
  return preCaret.toString().length;
}

export function setCaretOffset(editor, targetOffset) {
  if (typeof targetOffset !== 'number' || targetOffset < 0) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  let remaining = targetOffset;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent ? node.textContent.length : 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        return true;
      }
      remaining -= length;
      return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
      const isAtomic =
        element.classList.contains('ticket-tag') ||
        element.getAttribute('contenteditable') === 'false';

      if (isAtomic) {
        const length = element.textContent ? element.textContent.length : 0;
        if (remaining <= length) {
          range.setStartAfter(element);
          range.collapse(true);
          return true;
        }

        remaining -= length;
        return false;
      }
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
      if (remaining === 0) {
        range.setStartAfter(node);
        range.collapse(true);
        return true;
      }
      remaining -= 1;
      return false;
    }

    const children = node.childNodes || [];
    for (let i = 0; i < children.length; i += 1) {
      if (walk(children[i])) {
        return true;
      }
    }

    return false;
  }

  if (!walk(editor)) {
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

export function renderCellInEditMode(editor, sourceText) {
  editor.dataset.mode = 'editing';
  editor.dataset.ticketSig = getTicketTokenSignature(sourceText);
  editor.innerHTML = renderEditableSourceHtml(sourceText);
}

export function renderCellInDisplayMode(editor, sourceText) {
  editor.dataset.mode = 'display';
  editor.dataset.ticketSig = '';
  editor.innerHTML = renderMarkdownToHtml(sourceText);
}

export function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.classList.remove('hidden', 'error', 'success');
  if (type === 'error') {
    toast.classList.add('error');
  }
  if (type === 'success') {
    toast.classList.add('success');
  }
  toast.textContent = message;

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }

  state.toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3600);
}

export function fromIsoDate(dateString) {
  const parts = String(dateString).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

export function getVisibleDates() {
  return state.visibleDates.slice();
}

export function formatDateLabel(isoDate) {
  const date = fromIsoDate(isoDate);
  if (!date) {
    return isoDate;
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function cellKey(date, member) {
  return `${date}:::${member}`;
}

export function createSpinnerNode() {
  const wrap = document.createElement('div');
  wrap.className = 'spinner-wrap';
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  const label = document.createElement('span');
  label.textContent = 'Loading';
  wrap.append(spinner, label);
  return wrap;
}

export function createStatusBadge(status) {
  const normalized = normalizeStatus(status);
  const badge = document.createElement('span');
  badge.className = `status-badge ${STATUS_CLASS[normalized]}`;
  badge.textContent = getStatusLabel(normalized);
  return badge;
}

export function getTasksForMember(date, member) {
  const dateBucket = state.boardByDate[date];
  if (!dateBucket || !dateBucket.members) {
    return [];
  }

  const tasks = dateBucket.members[member];
  return Array.isArray(tasks) ? tasks : [];
}

export function populateStatusSelect(selectElement, fallbackStatus) {
  selectElement.innerHTML = '';
  STATUS_FLOW.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = getStatusLabel(status);
    if (status === fallbackStatus) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

export function populateAssigneeSelect(selectElement, fallbackAssignee) {
  selectElement.innerHTML = '';
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Unassigned';
  selectElement.appendChild(emptyOption);

  MEMBERS.forEach((member) => {
    const option = document.createElement('option');
    option.value = member;
    option.textContent = member;
    if (member === fallbackAssignee) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

export function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export function normalizePriority(priority) {
  const normalized = String(priority || '').trim().toLowerCase();
  return ALLOWED_PRIORITIES.includes(normalized) ? normalized : 'medium';
}

export function normalizeTicket(ticket) {
  return {
    id: String(ticket.id || '').trim(),
    title: String(ticket.title || '').trim(),
    description: String(ticket.description || '').trim(),
    status: normalizeStatus(ticket.status),
    created_at: String(ticket.created_at || '').trim(),
    assignee: String(ticket.assignee || '').trim(),
    priority: normalizePriority(ticket.priority),
    updated_at: String(ticket.updated_at || '').trim(),
    closed_at: String(ticket.closed_at || '').trim(),
  };
}

export function populatePrioritySelect(selectElement, fallbackPriority) {
  selectElement.innerHTML = '';
  ALLOWED_PRIORITIES.forEach((priority) => {
    const option = document.createElement('option');
    option.value = priority;
    option.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    if (priority === fallbackPriority) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
}

export function parseRouteTicketId() {
  const trimmed = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return null;
  }

  if (!/^LITMUS-\d+$/i.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase();
}
