export const MEMBERS = ['Devansh', 'Devasy', 'Niel'];

export const STORAGE_KEYS = {
  siteUrl: 'litmus_netlify_site_url',
};

export const STATUS_FLOW = ['to do', 'in progress', 'in review', 'done', 'on hold'];
export const STATUS_ALIASES = {
  todo: 'to do',
  'to do': 'to do',
  'in prog': 'in progress',
  'in progress': 'in progress',
  review: 'in review',
  'in review': 'in review',
  done: 'done',
  'on hold': 'on hold',
  'on-hold': 'on hold',
};
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
  toastTimer: null,
};
