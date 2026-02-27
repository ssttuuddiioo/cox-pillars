/* ── form.js ── Pledge form modal: name + email, pledges to all 4 pillars ── */

var PledgeForm = (function() {

  var modal, nameInput, emailInput, emailSuffixes, nameDisplay, submitBtn;
  var canSubmit = false;
  var onSubmit = null; // callback({ name, email })
  var onCancel = null; // callback when modal closed without submit
  var activeField = 'name'; // 'name' or 'email'

  function init(submitCallback, cancelCallback) {
    onSubmit = submitCallback;
    onCancel = cancelCallback;
    modal = document.getElementById('pledge-modal');
    nameInput = document.getElementById('pledge-name');
    emailInput = document.getElementById('pledge-email');
    emailSuffixes = document.getElementById('email-suffixes');
    nameDisplay = document.getElementById('pledge-name-display');
    submitBtn = document.getElementById('pledge-submit-btn');

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

    // Close button
    var closeBtn = document.getElementById('pledge-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() { close(); });
    }

    // Submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        if (canSubmit) handleSubmit();
      });
      submitBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (canSubmit) handleSubmit();
      }, { passive: false });
    }
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
      Keyboard.setReturnLabel('Done');
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
        updateNameDisplay();
      }
    });
  }

  function validate() {
    canSubmit = nameInput.value.trim().length > 0;
    if (submitBtn) submitBtn.disabled = !canSubmit;
  }

  function updateNameDisplay() {
    if (!nameDisplay) return;
    var name = nameInput.value.trim();
    nameDisplay.textContent = name.length > 0 ? name : '_____';
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
    if (nameDisplay) nameDisplay.textContent = '_____';
    if (submitBtn) submitBtn.disabled = true;

    modal.classList.remove('hidden');
    document.body.classList.add('form-open');

    // Auto-focus name input with keyboard open
    focusField('name');
  }

  function close(wasSubmit) {
    Keyboard.hide();
    emailSuffixes.classList.add('hidden');
    modal.classList.add('hidden');
    document.body.classList.remove('form-open');
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
