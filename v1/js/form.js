/* ── form.js ── Pledge form modal: name-only, pledges to all 4 pillars ── */

var PledgeForm = (function() {

  var modal, card, nameInput, submitBtn;
  var onSubmit = null; // callback({ name })
  var onCancel = null; // callback when modal closed without submit

  function init(submitCallback, cancelCallback) {
    onSubmit = submitCallback;
    onCancel = cancelCallback;
    modal = document.getElementById('pledge-modal');
    card = modal.querySelector('.modal-card');
    nameInput = document.getElementById('pledge-name');
    submitBtn = document.getElementById('pledge-submit');

    wireEvents();
    initKeyboard();
  }

  function wireEvents() {
    // Input focus -> open keyboard
    nameInput.addEventListener('click', function() {
      Keyboard.setActiveInput(nameInput);
      Keyboard.show();
    });
    nameInput.addEventListener('touchstart', function(e) {
      e.preventDefault();
      Keyboard.setActiveInput(nameInput);
      Keyboard.show();
    }, { passive: false });

    // Submit
    submitBtn.addEventListener('click', handleSubmit);

    // Backdrop click closes modal
    modal.querySelector('.modal-backdrop').addEventListener('click', close);
  }

  function initKeyboard() {
    var kbContainer = document.getElementById('keyboard-container');
    Keyboard.init(kbContainer, function(action) {
      if (action === 'return') {
        if (!submitBtn.disabled) {
          handleSubmit();
        }
      } else if (action === 'input') {
        validate();
      }
    });
  }

  function validate() {
    var valid = nameInput.value.trim().length > 0;
    submitBtn.disabled = !valid;
  }

  function handleSubmit() {
    if (submitBtn.disabled) return;
    var data = {
      name: nameInput.value.trim()
    };

    if (onSubmit) onSubmit(data);
    close(true);
  }

  function open() {
    // Reset form
    nameInput.value = '';
    submitBtn.disabled = true;

    modal.classList.remove('hidden');

    // Auto-focus name input with keyboard open
    Keyboard.setActiveInput(nameInput);
    Keyboard.show();
  }

  function close(wasSubmit) {
    Keyboard.hide();
    modal.classList.add('hidden');
    if (!wasSubmit && onCancel) onCancel();
  }

  function isOpen() {
    return !modal.classList.contains('hidden');
  }

  return {
    init: init,
    open: open,
    close: close,
    isOpen: isOpen
  };
})();
