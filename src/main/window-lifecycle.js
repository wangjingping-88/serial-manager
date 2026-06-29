const CLOSE_RESPONSE = {
  MINIMIZE_TO_TRAY: 0,
  QUIT: 1,
  CANCEL: 2
};

function getCloseResponseAction(response) {
  if (response === CLOSE_RESPONSE.MINIMIZE_TO_TRAY) {
    return 'hide';
  }

  if (response === CLOSE_RESPONSE.QUIT) {
    return 'quit';
  }

  return 'cancel';
}

function showWindowIfAvailable(win) {
  if (!win) {
    return false;
  }

  win.show();
  if (win.isMinimized()) {
    win.restore();
  }
  win.focus();
  return true;
}

module.exports = {
  CLOSE_RESPONSE,
  getCloseResponseAction,
  showWindowIfAvailable
};
