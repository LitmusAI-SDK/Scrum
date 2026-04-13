import { 
  renderCellInEditMode, 
  renderCellInDisplayMode, 
  getEditorPlainText, 
  getTicketTokenSignature, 
  getCaretOffset, 
  setCaretOffset 
} from '../utils.js';

export function createMarkdownEditor(initialValue, onChange) {
  const editor = document.createElement('div');
  editor.className = 'cell-editor';
  editor.setAttribute('data-placeholder', 'Write markdown here. Paste ticket URL/ID to render a tag.');
  editor.setAttribute('contenteditable', 'true');
  editor.setAttribute('spellcheck', 'false');
  editor.dataset.mode = 'display';

  let currentValue = initialValue || '';

  editor.addEventListener('focus', () => {
    if (editor.dataset.mode === 'editing') {
      return;
    }

    renderCellInEditMode(editor, currentValue);
    setCaretOffset(editor, getEditorPlainText(editor).length);
  });

  editor.addEventListener('input', () => {
    if (editor.dataset.mode !== 'editing') {
      return;
    }

    const sourceText = getEditorPlainText(editor);
    currentValue = sourceText;

    if (onChange) {
      onChange(currentValue);
    }

    const nextSig = getTicketTokenSignature(sourceText);
    if (nextSig === (editor.dataset.ticketSig || '')) {
      return;
    }

    const caretOffset = getCaretOffset(editor);
    renderCellInEditMode(editor, sourceText);
    if (caretOffset !== null) {
      setCaretOffset(editor, caretOffset);
    }
  });

  editor.addEventListener('blur', () => {
    const sourceText = getEditorPlainText(editor);
    currentValue = sourceText;
    renderCellInDisplayMode(editor, sourceText);
  });

  editor.addEventListener('click', (event) => {
    if (editor.dataset.mode !== 'display') {
      return;
    }

    const link = event.target.closest('a.ticket-tag');
    if (!link) {
      return;
    }

    event.preventDefault();
    window.open(link.href, '_blank', 'noopener,noreferrer');
  });

  editor.setValue = (newValue) => {
    currentValue = newValue || '';
    if (editor.dataset.mode === 'display') {
      renderCellInDisplayMode(editor, currentValue);
    } else {
      renderCellInEditMode(editor, currentValue);
    }
  };

  renderCellInDisplayMode(editor, currentValue);

  return editor;
}
