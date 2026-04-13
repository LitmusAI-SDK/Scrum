import { MEMBERS, STORAGE_KEYS } from './state.js';
import { getStoredSiteUrl, showToast } from './utils.js';
import { apiRequest } from './api.js';

export function persistMembers() {
  localStorage.setItem('LITMUS_MEMBERS', JSON.stringify(MEMBERS));
}

export function loadPersistedMembers() {
  const stored = localStorage.getItem('LITMUS_MEMBERS');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        MEMBERS.splice(0, MEMBERS.length, ...parsed);
      }
    } catch (e) {
      console.error('Failed to parse stored members:', e);
    }
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

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn danger small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      MEMBERS.splice(index, 1);
      persistMembers();
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
  renderMembersEditor();

  document.getElementById('addMemberBtn').addEventListener('click', () => {
    MEMBERS.push(`Member ${MEMBERS.length + 1}`);
    persistMembers();
    renderMembersEditor();
  });

  document.getElementById('saveSetupBtn').addEventListener('click', () => {
    const siteUrl = siteUrlInput.value.trim();
    if (siteUrl) {
      localStorage.setItem(STORAGE_KEYS.siteUrl, siteUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.siteUrl);
    }
    persistMembers();
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