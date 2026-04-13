import { state } from './state.js';
import { apiRequest } from './api.js';
import { 
  createSpinnerNode, createStatusBadge, buildTicketUrl, getNextStatus, 
  showToast, getVisibleDates, normalizeTicket, normalizeStatus,
  openModal, closeModal, populateStatusSelect, populateAssigneeSelect,
  populatePrioritySelect, normalizePriority
} from './utils.js';
import { renderCellsForDate } from './board.js';

export function rebuildTicketMap() {
  const map = {};
  state.tickets.forEach((ticket) => {
    map[ticket.id] = ticket;
  });
  state.ticketMap = map;
}

export function renderTaskTicketOptions() {
  const select = document.getElementById('taskTicketSelect');
  select.innerHTML = '';

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- none --';
  select.appendChild(empty);

  state.tickets.forEach((ticket) => {
    const option = document.createElement('option');
    option.value = ticket.id;
    option.textContent = `${ticket.id} - ${ticket.title}`;
    select.appendChild(option);
  });
}

export function initTicketFilters() {
  const statusSelect = document.getElementById('filterStatusSelect');
  const assigneeSelect = document.getElementById('filterAssigneeSelect');
  const prioritySelect = document.getElementById('filterPrioritySelect');
  const clearBtn = document.getElementById('clearFiltersBtn');

  populateStatusSelect(statusSelect, '');
  const allStatusOption = document.createElement('option');
  allStatusOption.value = 'all';
  allStatusOption.textContent = 'All';
  statusSelect.insertBefore(allStatusOption, statusSelect.firstChild);
  statusSelect.value = 'all';

  populateAssigneeSelect(assigneeSelect, '');
  const allAssigneeOption = document.createElement('option');
  allAssigneeOption.value = 'all';
  allAssigneeOption.textContent = 'All';
  assigneeSelect.insertBefore(allAssigneeOption, assigneeSelect.firstChild);
  assigneeSelect.value = 'all';

  populatePrioritySelect(prioritySelect, '');
  const allPriorityOption = document.createElement('option');
  allPriorityOption.value = 'all';
  allPriorityOption.textContent = 'All';
  prioritySelect.insertBefore(allPriorityOption, prioritySelect.firstChild);
  prioritySelect.value = 'all';

  const handleFilterChange = () => {
    renderTicketsTab();
  };

  statusSelect.addEventListener('change', handleFilterChange);
  assigneeSelect.addEventListener('change', handleFilterChange);
  prioritySelect.addEventListener('change', handleFilterChange);

  clearBtn.addEventListener('click', () => {
    statusSelect.value = 'all';
    assigneeSelect.value = 'all';
    prioritySelect.value = 'all';
    renderTicketsTab();
  });
}

export async function loadTickets(forceReload) {
  if (state.loadingTickets) {
    return;
  }

  if (state.ticketsLoaded && !forceReload) {
    return;
  }

  state.loadingTickets = true;
  try {
    const list = await apiRequest('/api/tickets');
    state.tickets = Array.isArray(list) ? list.map(normalizeTicket) : [];
    state.ticketsLoaded = true;
    rebuildTicketMap();
    renderTaskTicketOptions();
    
    // Initialize filters if not already done
    if (!state.filtersInitialized) {
      initTicketFilters();
      state.filtersInitialized = true;
    }
    
    renderTicketsTab();

    getVisibleDates().forEach((date) => {
      renderCellsForDate(date);
    });
  } catch (error) {
    showToast(`Failed to load tickets: ${error.message}`, 'error');
  } finally {
    state.loadingTickets = false;
  }
}

export function openEditTicketModal(ticketId) {
  const ticket = state.ticketMap[ticketId];
  if (!ticket) return;

  document.getElementById('editTicketIdInput').value = ticket.id;
  document.getElementById('editTicketTitleInput').value = ticket.title;
  document.getElementById('editTicketDescInput').value = ticket.description;
  
  populateStatusSelect(document.getElementById('editTicketStatusSelect'), ticket.status);
  populateAssigneeSelect(document.getElementById('editTicketAssigneeSelect'), ticket.assignee);
  populatePrioritySelect(document.getElementById('editTicketPrioritySelect'), ticket.priority);
  
  openModal('editTicketModal');
}

export async function submitEditTicket() {
  const id = document.getElementById('editTicketIdInput').value;
  const title = document.getElementById('editTicketTitleInput').value.trim();
  const description = document.getElementById('editTicketDescInput').value.trim();
  const status = normalizeStatus(document.getElementById('editTicketStatusSelect').value);
  const assignee = document.getElementById('editTicketAssigneeSelect').value;
  const priority = normalizePriority(document.getElementById('editTicketPrioritySelect').value);

  if (!title) {
    showToast('Ticket title is required.', 'error');
    return;
  }

  const submitBtn = document.getElementById('editTicketSubmitBtn');
  submitBtn.disabled = true;
  try {
    const updated = await apiRequest('/api/tickets', {
      method: 'PATCH',
      body: {
        id,
        title,
        description,
        status,
        assignee,
        priority,
      },
    });

    const normalized = normalizeTicket(updated || {});
    const index = state.tickets.findIndex((item) => item.id === id);
    if (index >= 0) {
      state.tickets[index] = normalized;
    }
    rebuildTicketMap();
    renderTicketsTab();
    getVisibleDates().forEach((date) => renderCellsForDate(date));
    
    closeModal('editTicketModal');
    showToast(`Ticket ${id} updated.`, 'success');
  } catch (error) {
    showToast(`Ticket update failed: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

export function renderTicketsTab() {
  const host = document.getElementById('ticketsContainer');
  host.innerHTML = '';

  if (state.loadingTickets && !state.tickets.length) {
    host.appendChild(createSpinnerNode());
    return;
  }

  const statusFilter = document.getElementById('filterStatusSelect').value;
  const assigneeFilter = document.getElementById('filterAssigneeSelect').value;
  const priorityFilter = document.getElementById('filterPrioritySelect').value;

  const filteredTickets = state.tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (assigneeFilter !== 'all' && ticket.assignee !== assigneeFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    return true;
  });

  if (!filteredTickets.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tickets found matching filters.';
    host.appendChild(empty);
    return;
  }

  filteredTickets.forEach((ticket) => {
    const card = document.createElement('article');
    card.className = 'ticket-card';

    const title = document.createElement('h3');
    title.className = 'ticket-title';
    title.textContent = `${ticket.id} - ${ticket.title || '(No title)'}`;

    const desc = document.createElement('p');
    desc.className = 'ticket-description';
    desc.textContent = ticket.description || '(No description)';

    const meta = document.createElement('div');
    meta.className = 'ticket-meta';
    meta.append(createStatusBadge(ticket.status));

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

    const urlLink = document.createElement('a');
    urlLink.className = 'ticket-url';
    urlLink.href = buildTicketUrl(ticket.id);
    urlLink.target = '_blank';
    urlLink.rel = 'noopener noreferrer';
    urlLink.textContent = buildTicketUrl(ticket.id);
    meta.appendChild(urlLink);

    const datesMeta = document.createElement('div');
    datesMeta.className = 'ticket-meta';
    datesMeta.style.marginTop = '4px';
    datesMeta.style.fontSize = '0.8em';
    datesMeta.style.color = 'var(--text-muted)';
    
    if (ticket.created_at) {
      const createdSpan = document.createElement('span');
      createdSpan.textContent = `Created: ${new Date(ticket.created_at).toLocaleDateString()}`;
      datesMeta.appendChild(createdSpan);
    }
    if (ticket.updated_at) {
      const updatedSpan = document.createElement('span');
      updatedSpan.textContent = `Updated: ${new Date(ticket.updated_at).toLocaleDateString()}`;
      datesMeta.appendChild(updatedSpan);
    }
    if (ticket.closed_at) {
      const closedSpan = document.createElement('span');
      closedSpan.textContent = `Closed: ${new Date(ticket.closed_at).toLocaleDateString()}`;
      datesMeta.appendChild(closedSpan);
    }

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '8px';

    const cycleBtn = document.createElement('button');
    cycleBtn.type = 'button';
    cycleBtn.className = 'btn small';
    cycleBtn.textContent = `Cycle Status -> ${getNextStatus(ticket.status)}`;
    cycleBtn.addEventListener('click', () => {
      cycleTicketStatus(ticket.id);
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn small';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      openEditTicketModal(ticket.id);
    });

    actions.append(cycleBtn, editBtn);
    card.append(title, desc, meta, datesMeta, actions);
    host.appendChild(card);
  });
}

export async function cycleTicketStatus(ticketId) {
  const ticket = state.ticketMap[ticketId];
  if (!ticket) {
    showToast(`Ticket ${ticketId} not found in cache.`, 'error');
    return;
  }

  const nextStatus = getNextStatus(ticket.status);
  try {
    const updated = await apiRequest('/api/tickets', {
      method: 'PATCH',
      body: {
        id: ticketId,
        status: nextStatus,
      },
    });

    const normalized = normalizeTicket(updated || {});
    const index = state.tickets.findIndex((item) => item.id === ticketId);
    if (index >= 0) {
      state.tickets[index] = normalized;
    }
    rebuildTicketMap();
    renderTicketsTab();
    getVisibleDates().forEach((date) => renderCellsForDate(date));
    showToast(`Ticket ${ticketId} updated to ${normalized.status}.`, 'success');
  } catch (error) {
    showToast(`Status update failed: ${error.message}`, 'error');
  }
}

export async function submitCreateTicket() {
  const title = document.getElementById('ticketTitleInput').value.trim();
  const description = document.getElementById('ticketDescInput').value.trim();
  const status = normalizeStatus(document.getElementById('ticketStatusSelect').value);
  const assignee = document.getElementById('ticketAssigneeSelect').value;
  const priority = normalizePriority(document.getElementById('ticketPrioritySelect').value);

  if (!title) {
    showToast('Ticket title is required.', 'error');
    return;
  }

  const submitBtn = document.getElementById('createTicketSubmitBtn');
  submitBtn.disabled = true;
  try {
    const created = await apiRequest('/api/tickets', {
      method: 'POST',
      body: {
        title,
        description,
        status,
        assignee,
        priority,
      },
    });

    document.getElementById('createTicketModal').classList.add('hidden');
    document.getElementById('createTicketModal').setAttribute('aria-hidden', 'true');
    showToast(`Created ${created.id}.`, 'success');
    await loadTickets(true);
    renderTicketsTab();
  } catch (error) {
    showToast(`Ticket creation failed: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}
