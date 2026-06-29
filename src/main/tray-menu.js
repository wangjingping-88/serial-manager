function createTrayMenuTemplate({ showWindow, refresh, quit }) {
  return [
    { label: '显示窗口', click: showWindow },
    { label: '立即刷新', click: refresh },
    { type: 'separator' },
    { label: '退出', click: quit }
  ];
}

module.exports = {
  createTrayMenuTemplate
};
