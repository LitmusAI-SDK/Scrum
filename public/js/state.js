export const MEMBERS = ['Devansh', 'Devasy', 'Niel'];

const workflowConstants = globalThis.LITMUS_WORKFLOW_CONSTANTS;
if (!workflowConstants || !workflowConstants.STATUS_ALIASES || !workflowConstants.ALLOWED_PRIORITIES) {
  throw new Error('Missing workflow constants. Ensure /shared/workflow-constants.js is loaded before app modules.');
}

export const STORAGE_KEYS = {
  siteUrl: 'litmus_netlify_site_url',
  members: 'litmus_members',
};

export const STATUS_FLOW = ['to do', 'in progress', 'in review', 'done', 'on hold'];
export const STATUS_ALIASES = Object.freeze({ ...workflowConstants.STATUS_ALIASES });
export const ALLOWED_PRIORITIES = Object.freeze([...workflowConstants.ALLOWED_PRIORITIES]);
export const STATUS_LABELS = {
  'to do': 'To Do',
  'in progress': 'In Progress',
  'in review': 'In Review',
  done: 'Done',
  'on hold': 'On Hold',
};
export const STATUS_CLASS = {
  'to do': 'status-todo',
  'in progress': 'status-in-prog',
  'in review': 'status-review',
  done: 'status-done',
  'on hold': 'status-on-hold',
};

export const state = {
  activeTab: 'board',
  visibleDates: [],
  boardByDate: {},
  boardDraft: {},
  cellRefs: new Map(),
  tickets: [],
  ticketMap: {},
  loadingTickets: false,
  ticketsLoaded: false,
  filtersInitialized: false,
  toastTimer: null,
};
