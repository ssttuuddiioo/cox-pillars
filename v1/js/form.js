/* ── form.js ── Pledge form modal: name + email, pledges to all 4 pillars ── */

var PledgeForm = (function() {

  var modal, card, nameInput, emailInput, emailSuffixes;
  var canSubmit = false;
  var onSubmit = null; // callback({ name, email })
  var onCancel = null; // callback when modal closed without submit
  var activeField = 'name'; // 'name' or 'email'

  function init(submitCallback, cancelCallback) {
    onSubmit = submitCallback;
    onCancel = cancelCallback;
    modal = document.getElementById('pledge-modal');
    card = modal.querySelector('.modal-card');
    nameInput = document.getElementById('pledge-name');
    emailInput = document.getElementById('pledge-email');
    emailSuffixes = document.getElementById('email-suffixes');

    wireEvents();
    initKeyboard();
  }

  function wireEvents() {
    // Name input focus -> open keyboard on name
    nameInput.addEventListener('click', function() {
      focusField('name');
    });
    nameInput.addEventListener('touchstart', function(e) {
      e.preventDefault();
      focusField('name');
    }, { passive: false });

    // Email input focus -> open keyboard on email
    emailInput.addEventListener('click', function() {
      focusField('email');
    });
    emailInput.addEventListener('touchstart', function(e) {
      e.preventDefault();
      focusField('email');
    }, { passive: false });

    // Email suffix buttons
    var suffixBtns = emailSuffixes.querySelectorAll('.email-suffix-btn');
    for (var i = 0; i < suffixBtns.length; i++) {
      suffixBtns[i].addEventListener('click', handleSuffix);
    }

    // Backdrop click closes modal
    modal.querySelector('.modal-backdrop').addEventListener('click', close);
  }

  function focusField(field) {
    activeField = field;
    if (field === 'name') {
      Keyboard.setActiveInput(nameInput);
      emailSuffixes.classList.add('hidden');
      Keyboard.setReturnLabel('Next');
    } else {
      Keyboard.setActiveInput(emailInput);
      emailSuffixes.classList.remove('hidden');
      Keyboard.setReturnLabel('Submit');
    }
    Keyboard.show();
  }

  function handleSuffix(e) {
    var suffix = e.currentTarget.getAttribute('data-suffix');
    if (!emailInput) return;
    var maxLen = parseInt(emailInput.getAttribute('maxlength')) || 80;
    var newVal = emailInput.value + suffix;
    if (newVal.length <= maxLen) {
      emailInput.value = newVal;
    }
    validate();
  }

  function initKeyboard() {
    var kbContainer = document.getElementById('keyboard-container');
    Keyboard.init(kbContainer, function(action) {
      if (action === 'return') {
        if (activeField === 'name') {
          // Move to email field
          focusField('email');
        } else {
          if (canSubmit) {
            handleSubmit();
          }
        }
      } else if (action === 'input') {
        validate();
      }
    });
  }

  function validate() {
    canSubmit = nameInput.value.trim().length > 0;
  }

  function handleSubmit() {
    if (!canSubmit) return;
    var data = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim()
    };

    if (onSubmit) onSubmit(data);
    close(true);
  }

  function open() {
    // Reset form
    nameInput.value = '';
    emailInput.value = '';
    canSubmit = false;
    activeField = 'name';

    modal.classList.remove('hidden');

    // Auto-focus name input with keyboard open
    focusField('name');
  }

  function close(wasSubmit) {
    Keyboard.hide();
    emailSuffixes.classList.add('hidden');
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
