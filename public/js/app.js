import { state, MEMBERS } from './state.js';
import { 
  parseRouteTicketId, buildTicketUrl, createStatusBadge, 
  renderMarkdownToHtml, showToast, populateStatusSelect, populateAssigneeSelect,
  populatePrioritySelect, openModal, closeModal, getVisibleDates
} from './utils.js';
import { apiRequest } from './api.js';
import { loadVisibleBoardDates, saveBoardChanges, addNewDateToBoard } from './board.js';
import { loadTickets, submitCreateTicket, submitEditTicket } from './tickets.js';
import { initSetupTab } from './setup.js';

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  if (tabId === 'board') {
    loadVisibleBoardDates();
  } else if (tabId === 'tickets') {
    loadTickets();
  }
}

async function renderDirectTicketView(ticketId) {
  const shell = document.getElementById('appShell');
  shell.innerHTML = '';

  const detail = document.createElement('div');
  detail.className = 'ticket-detail';
  detail.innerHTML = `<h2>Loading ${ticketId}...</h2>`;
  shell.appendChild(detail);

  try {
    const list = await apiRequest('/api/tickets');
    const ticket = list.find((t) => String(t.id).toUpperCase() === ticketId);

    if (!ticket) {
      detail.innerHTML = `<h2>Ticket Not Found</h2><p>Could not locate ${ticketId}.</p>`;
      return;
    }

    detail.innerHTML = `
      <h2>${ticket.id} - ${ticket.title || '(No title)'}</h2>
      <div class="detail-meta" id="directTicketMeta"></div>
      <hr style="border:0; border-top:1px dashed var(--border); margin:16px 0;" />
      <div class="cell-editor" data-mode="display" style="border:none; padding:0; background:transparent;">
        ${renderMarkdownToHtml(ticket.description || '(No description)')}
      </div>
    `;

    const meta = detail.querySelector('#directTicketMeta');
    meta.appendChild(createStatusBadge(ticket.status));
    const dateSpan = document.createElement('span');
    dateSpan.textContent = `Created: ${ticket.created_at || 'Unknown'}`;
    meta.appendChild(dateSpan);
    if (ticket.assignee) {
      const assigneeSpan = document.createElement('span');
      assigneeSpan.textContent = `👤 ${ticket.assignee}`;
      meta.appendChild(assigneeSpan);
    }
    if (ticket.priority) {
      const prioritySpan = document.createElement('span');
      prioritySpan.textContent = `⚡ ${ticket.priority}`;
      meta.appendChild(prioritySpan);
    }
  } catch (error) {
    detail.innerHTML = `<h2>Error</h2><p>${error.message}</p>`;
  }
}

async function submitAddTask() {
  const date = document.getElementById('taskDateSelect').value;
  const member = document.getElementById('taskMemberSelect').value;
  const ticketId = document.getElementById('taskTicketSelect').value;
  const freeText = document.getElementById('taskTextInput').value.trim();

  if (!date || !member) {
    showToast('Date and Member are required.', 'error');
    return;
  }

  const submitBtn = document.getElementById('addTaskSubmitBtn');
  submitBtn.disabled = true;

  try {
    await apiRequest('/api/board', {
      method: 'POST',
      body: {
        date,
        member,
        ticket_id: ticketId,
        free_text: freeText,
      },
    });

    closeModal('addTaskModal');
    showToast('Task added successfully.', 'success');
    await loadVisibleBoardDates(true);
  } catch (error) {
    showToast(`Failed to add task: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function initEventHandlers() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.target);
    });
  });

  document.getElementById('refreshBoardBtn').addEventListener('click', () => {
    loadVisibleBoardDates(true);
  });

  document.getElementById('saveBoardBtn').addEventListener('click', () => {
    saveBoardChanges();
  });

  document.getElementById('openAddDateBtn').addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newDateInput').value = today;
    openModal('addDateModal');
  });

  document.getElementById('cancelAddDateBtn').addEventListener('click', () => {
    closeModal('addDateModal');
  });

  document.getElementById('addDateSubmitBtn').addEventListener('click', () => {
    const dateStr = document.getElementById('newDateInput').value.trim();
    if (!dateStr) {
      showToast('Please select a valid date.', 'error');
      return;
    }
    if (addNewDateToBoard(dateStr)) {
      closeModal('addDateModal');
      showToast('Date added. Remember to save changes.', 'success');
    }
  });

  document.getElementById('openCreateTicketBtn').addEventListener('click', () => {
    document.getElementById('ticketTitleInput').value = '';
    document.getElementById('ticketDescInput').value = '';
    populateStatusSelect(document.getElementById('ticketStatusSelect'), 'to do');
    populateAssigneeSelect(document.getElementById('ticketAssigneeSelect'), '');
    populatePrioritySelect(document.getElementById('ticketPrioritySelect'), 'medium');
    openModal('createTicketModal');
  });

  document.getElementById('cancelCreateTicketBtn').addEventListener('click', () => {
    closeModal('createTicketModal');
  });

  document.getElementById('createTicketSubmitBtn').addEventListener('click', () => {
    submitCreateTicket();
  });

  document.getElementById('cancelEditTicketBtn').addEventListener('click', () => {
    closeModal('editTicketModal');
  });

  document.getElementById('editTicketSubmitBtn').addEventListener('click', () => {
    submitEditTicket();
  });

  document.getElementById('openAddTaskBtn').addEventListener('click', () => {
    const dateSelect = document.getElementById('taskDateSelect');
    dateSelect.innerHTML = '';
    getVisibleDates().forEach((date) => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = date;
      dateSelect.appendChild(option);
    });

    const memberSelect = document.getElementById('taskMemberSelect');
    memberSelect.innerHTML = '';
    MEMBERS.forEach((member) => {
      const option = document.createElement('option');
      option.value = member;
      option.textContent = member;
      memberSelect.appendChild(option);
    });

    const ticketSelect = document.getElementById('taskTicketSelect');
    ticketSelect.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- none --';
    ticketSelect.appendChild(emptyOption);

    state.tickets.forEach((ticket) => {
      const option = document.createElement('option');
      option.value = ticket.id;
      option.textContent = `${ticket.id} - ${ticket.title || '(No title)'}`;
      ticketSelect.appendChild(option);
    });

    document.getElementById('taskTextInput').value = '';
    openModal('addTaskModal');
  });

  document.getElementById('cancelAddTaskBtn').addEventListener('click', () => {
    closeModal('addTaskModal');
  });

  document.getElementById('addTaskSubmitBtn').addEventListener('click', () => {
    submitAddTask();
  });
}

function init() {
  const directTicketId = parseRouteTicketId();
  if (directTicketId) {
    renderDirectTicketView(directTicketId);
    return;
  }

  initSetupTab();
  initEventHandlers();
  
  // Load tickets in background to populate task dropdown
  loadTickets().then(() => {
    switchTab('board');
  });
}

document.addEventListener('DOMContentLoaded', init);
