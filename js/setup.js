import { MEMBERS, STORAGE_KEYS } from './state.js';
import { getStoredSiteUrl, showToast } from './utils.js';
import { apiRequest } from './api.js';

function sanitizeMembers() {
  const cleaned = MEMBERS
    .map((member) => String(member || '').trim())
    .filter((member) => member.length > 0);

  MEMBERS.splice(0, MEMBERS.length, ...cleaned);
  return cleaned;
}

function persistMembers() {
  localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(MEMBERS));
}

function loadPersistedMembers() {
  const raw = localStorage.getItem(STORAGE_KEYS.members);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    const cleaned = parsed
      .map((member) => String(member || '').trim())
      .filter((member) => member.length > 0);

    if (cleaned.length) {
      MEMBERS.splice(0, MEMBERS.length, ...cleaned);
    }
  } catch (_error) {
    // Ignore malformed local storage and keep default members.
  }
}

export function renderMembersEditor() {
  const host = document.getElementById('membersEditor');
  host.innerHTML = '';

  MEMBERS.forEach((member, index) => {
    const row = document.createElement('div');
    row.className = 'member-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.value = member;
    input.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value) {
        MEMBERS[index] = value;
      }
    });
    input.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (!value) {
        MEMBERS.splice(index, 1);
        renderMembersEditor();
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn danger small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      MEMBERS.splice(index, 1);
      renderMembersEditor();
    });

    row.append(input, removeBtn);
    host.appendChild(row);
  });
}

export function initSetupTab() {
  const siteUrlInput = document.getElementById('siteUrlInput');
  siteUrlInput.value = getStoredSiteUrl();

  loadPersistedMembers();
  sanitizeMembers();
  renderMembersEditor();

  document.getElementById('addMemberBtn').addEventListener('click', () => {
    MEMBERS.push(`Member ${MEMBERS.length + 1}`);
    renderMembersEditor();
  });

  document.getElementById('saveSetupBtn').addEventListener('click', () => {
    const siteUrl = siteUrlInput.value.trim();
    if (siteUrl) {
      localStorage.setItem(STORAGE_KEYS.siteUrl, siteUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.siteUrl);
    }

    sanitizeMembers();
    persistMembers();
    renderMembersEditor();

    showToast('Setup saved locally.', 'success');
  });

  document.getElementById('testConnectionBtn').addEventListener('click', async () => {
    const btn = document.getElementById('testConnectionBtn');
    btn.disabled = true;
    try {
      await apiRequest('/api/tickets');
      showToast('Connection successful!', 'success');
    } catch (error) {
      showToast(`Connection failed: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
