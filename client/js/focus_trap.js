/**
 * Focus Trap Utility for GetFrisch
 * Traps keyboard focus within a modal element
 */

var FocusTrap = (function () {
  var activeModal = null;
  var previousFocus = null;
  var boundHandler = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function handleKeydown(e) {
    if (!activeModal) return;

    if (e.key === 'Escape') {
      deactivate();
      // Close the modal — find the close button or invoke known close functions
      var modalId = activeModal ? activeModal.id : '';
      if (modalId === 'authModal' && typeof apiClient !== 'undefined' && apiClient.isAuthenticated()) {
        closeAuthModal();
      } else if (modalId === 'schoolModal') {
        closeSchoolModal();
      } else if (modalId === 'replayModal' && typeof closeReplay === 'function') {
        closeReplay();
      }
      // usernameModal intentionally cannot be escaped
      return;
    }

    if (e.key !== 'Tab') return;

    var focusable = activeModal.querySelectorAll(FOCUSABLE);
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !activeModal.contains(document.activeElement)) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last || !activeModal.contains(document.activeElement)) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function activate(modalElement) {
    if (!modalElement) return;

    // Deactivate any existing trap first
    if (activeModal) deactivate();

    previousFocus = document.activeElement;
    activeModal = modalElement;

    // Focus the first focusable element inside the modal
    var focusable = modalElement.querySelectorAll(FOCUSABLE);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      modalElement.setAttribute('tabindex', '-1');
      modalElement.focus();
    }

    boundHandler = handleKeydown;
    document.addEventListener('keydown', boundHandler);
  }

  function deactivate() {
    if (boundHandler) {
      document.removeEventListener('keydown', boundHandler);
      boundHandler = null;
    }

    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }

    activeModal = null;
    previousFocus = null;
  }

  return { activate: activate, deactivate: deactivate };
})();
