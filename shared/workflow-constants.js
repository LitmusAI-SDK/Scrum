(function initWorkflowConstants(factory) {
  const constants = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.LITMUS_WORKFLOW_CONSTANTS = constants;
  }
})(function createWorkflowConstants() {
  const STATUS_ALIASES = {
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

  const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'critical'];

  return {
    STATUS_ALIASES,
    ALLOWED_PRIORITIES,
  };
});
