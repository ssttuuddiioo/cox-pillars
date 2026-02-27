/* ── keyboard.js ── Custom on-screen QWERTY keyboard ── */

var Keyboard = (function() {

  var container;
  var activeInput = null;
  var isShifted = false;
  var onInputChange = null; // callback
  var returnLabel = 'Submit';

  var ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
    ['123', 'space', 'return']
  ];

  var NUM_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', "'", 'backspace'],
    ['ABC', 'space', 'return']
  ];

  var isNumMode = false;

  function init(containerEl, changeCallback) {
    container = containerEl;
    onInputChange = changeCallback;
    render();
  }

  function render() {
    container.innerHTML = '';
    var rows = isNumMode ? NUM_ROWS : ROWS;

    for (var r = 0; r < rows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      for (var k = 0; k < rows[r].length; k++) {
        var key = rows[r][k];
        var btn = document.createElement('button');
        btn.className = 'kb-key';
        btn.setAttribute('type', 'button');

        if (key === 'space') {
          btn.className += ' space';
          btn.textContent = '';
          btn.setAttribute('data-key', 'space');
        } else if (key === 'backspace') {
          btn.className += ' wide';
          btn.innerHTML = '&#9003;';
          btn.setAttribute('data-key', 'backspace');
        } else if (key === 'return') {
          btn.className += ' return-key';
          btn.textContent = returnLabel;
          btn.setAttribute('data-key', 'return');
        } else if (key === 'shift') {
          btn.className += ' wide';
          btn.innerHTML = '&#8679;';
          btn.setAttribute('data-key', 'shift');
          if (isShifted) btn.classList.add('active');
        } else if (key === '123') {
          btn.className += ' wide';
          btn.textContent = '123';
          btn.setAttribute('data-key', '123');
        } else if (key === 'ABC') {
          btn.className += ' wide';
          btn.textContent = 'ABC';
          btn.setAttribute('data-key', 'ABC');
        } else if (key === '#+=') {
          btn.className += ' wide';
          btn.textContent = '#+=';
          btn.setAttribute('data-key', '#+=');
        } else {
          var display = isShifted ? key.toUpperCase() : key.toLowerCase();
          btn.textContent = display;
          btn.setAttribute('data-key', key);
        }

        btn.addEventListener('click', handleKeyPress);
        rowEl.appendChild(btn);
      }

      container.appendChild(rowEl);
    }
  }

  function handleKeyPress(e) {
    e.preventDefault();
    var target = e.currentTarget;
    var key = target.getAttribute('data-key');

    if (!activeInput) return;

    if (key === 'space') {
      insertChar(' ');
    } else if (key === 'backspace') {
      deleteChar();
    } else if (key === 'return') {
      // Move to next input or close
      if (onInputChange) onInputChange('return');
    } else if (key === 'shift') {
      isShifted = !isShifted;
      render();
    } else if (key === '123') {
      isNumMode = true;
      render();
    } else if (key === 'ABC') {
      isNumMode = false;
      render();
    } else if (key === '#+=') {
      // Could add more symbols, for now just toggle back
      isNumMode = false;
      render();
    } else {
      var ch = isShifted ? key.toUpperCase() : key.toLowerCase();
      insertChar(ch);
      if (isShifted) {
        isShifted = false;
        render();
      }
    }
  }

  function insertChar(ch) {
    if (!activeInput) return;
    var maxLen = parseInt(activeInput.getAttribute('maxlength')) || 100;
    if (activeInput.value.length >= maxLen) return;
    activeInput.value += ch;
    triggerChange();
  }

  function deleteChar() {
    if (!activeInput) return;
    activeInput.value = activeInput.value.slice(0, -1);
    triggerChange();
  }

  function triggerChange() {
    if (onInputChange) onInputChange('input');
    autoShiftIfEmpty();
  }

  function autoShiftIfEmpty() {
    if (!activeInput) return;
    var val = activeInput.value;
    var shouldShift = val.length === 0;
    if (shouldShift !== isShifted) {
      isShifted = shouldShift;
      render();
    }
  }

  function setActiveInput(inputEl) {
    // Remove active class from previous
    if (activeInput) activeInput.classList.remove('active');
    activeInput = inputEl;
    if (activeInput) activeInput.classList.add('active');
    // Auto-shift for first letter of a name
    autoShiftIfEmpty();
  }

  function show() {
    container.classList.add('open');
  }

  function hide() {
    container.classList.remove('open');
    if (activeInput) activeInput.classList.remove('active');
    activeInput = null;
  }

  function isOpen() {
    return container.classList.contains('open');
  }

  function setReturnLabel(label) {
    returnLabel = label || 'Submit';
    render();
  }

  return {
    init: init,
    show: show,
    hide: hide,
    isOpen: isOpen,
    setActiveInput: setActiveInput,
    setReturnLabel: setReturnLabel,
    render: render
  };
})();
