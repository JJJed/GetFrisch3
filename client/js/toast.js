/**
 * Toast Notification System for GetFrisch
 * Lightweight toast component: Toast.show(message, type, duration)
 */

var Toast = (function () {
  var container = null;
  var MAX_VISIBLE = 3;

  function getContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;

    var c = getContainer();

    // Enforce max visible
    while (c.children.length >= MAX_VISIBLE) {
      c.removeChild(c.firstChild);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.textContent = message;

    // Close on click
    toast.addEventListener('click', function () {
      dismiss(toast);
    });

    c.appendChild(toast);

    // Trigger reflow for animation
    toast.offsetHeight;
    toast.classList.add('toast-visible');

    // Auto-dismiss
    var timer = setTimeout(function () {
      dismiss(toast);
    }, duration);

    toast._timer = timer;
  }

  function dismiss(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  return { show: show };
})();
