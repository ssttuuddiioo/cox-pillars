/* ── form.js ── Pledge form modal: show/hide, pillar selection, validation ── */

var PledgeForm = (function() {

  var modal, card, pillarContainer, nameInput, messageInput, submitBtn;
  var selectedPillar = null;
  var onSubmit = null; // callback(pledge)

  function init(submitCallback) {
    onSubmit = submitCallback;
    modal = document.getElementById('pledge-modal');
    card = modal.querySelector('.modal-card');
    pillarContainer = document.getElementById('pillar-options');
    nameInput = document.getElementById('pledge-name');
    messageInput = document.getElementById('pledge-message');
    submitBtn = document.getElementById('pledge-submit');

    renderPillars();
    wireEvents();
    initKeyboard();
  }

  function renderPillars() {
    pillarContainer.innerHTML = '';
    for (var i = 0; i < PILLARS.length; i++) {
      var p = PILLARS[i];
      var btn = document.createElement('button');
      btn.className = 'pillar-btn';
      btn.setAttribute('data-pillar', p.id);
      btn.setAttribute('type', 'button');
      btn.style.color = p.color;

      var icon = document.createElement('span');
      icon.className = 'pillar-icon';
      icon.style.backgroundColor = p.color;
      icon.textContent = p.icon;

      var name = document.createElement('span');
      name.textContent = p.name;

      btn.appendChild(icon);
      btn.appendChild(name);
      pillarContainer.appendChild(btn);
    }
  }

  function wireEvents() {
    // Pillar selection
    pillarContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('.pillar-btn');
      if (!btn) return;

      // Deselect all
      var btns = pillarContainer.querySelectorAll('.pillar-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('selected');
      }

      btn.classList.add('selected');
      var pillarId = btn.getAttribute('data-pillar');
      selectedPillar = null;
      for (var j = 0; j < PILLARS.length; j++) {
        if (PILLARS[j].id === pillarId) {
          selectedPillar = PILLARS[j];
          break;
        }
      }
      validate();
    });

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

    messageInput.addEventListener('click', function() {
      Keyboard.setActiveInput(messageInput);
      Keyboard.show();
    });
    messageInput.addEventListener('touchstart', function(e) {
      e.preventDefault();
      Keyboard.setActiveInput(messageInput);
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
        // If on name input, move to message
        if (nameInput.classList.contains('active')) {
          Keyboard.setActiveInput(messageInput);
        } else {
          // On message input, try submit
          if (!submitBtn.disabled) {
            handleSubmit();
          }
        }
      } else if (action === 'input') {
        validate();
      }
    });
  }

  function validate() {
    var valid = selectedPillar && nameInput.value.trim().length > 0;
    submitBtn.disabled = !valid;
  }

  function handleSubmit() {
    if (submitBtn.disabled) return;
    var pledge = createPledge(
      nameInput.value.trim(),
      selectedPillar,
      messageInput.value.trim()
    );
    PledgeStore.add(pledge);

    if (onSubmit) onSubmit(pledge);
    close();
  }

  function open() {
    // Reset form
    selectedPillar = null;
    nameInput.value = '';
    messageInput.value = '';
    submitBtn.disabled = true;
    var btns = pillarContainer.querySelectorAll('.pillar-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('selected');
    }
    Keyboard.hide();

    modal.classList.remove('hidden');
  }

  function close() {
    Keyboard.hide();
    modal.classList.add('hidden');
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
