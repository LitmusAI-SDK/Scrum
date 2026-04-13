import { MEMBERS, STORAGE_KEYS } from './state.js';
import { getStoredSiteUrl, showToast } from './utils.js';
import { apiRequest } from './api.js';

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
      MEMBERS[index] = e.target.value.trim();
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
