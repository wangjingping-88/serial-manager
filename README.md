# 串口通知工具

一个面向 Windows 的串口插拔通知工具。打开后可以查看当前所有串口信息，最小化或关闭窗口后保留在系统托盘；检测到串口插入或拔出时，会通过系统通知提示具体串口。每个设备支持自定义名称，适合一个 USB Hub 上挂载多个串口设备时快速区分。

## 功能

- 查看当前串口号、设备名称、厂商、服务和占用状态。
- 串口插入和拔出实时检测。
- 系统通知提示插入或拔出的串口。
- 支持按设备保存自定义名称，重新插拔后仍可识别。
- 最小化和关闭窗口时隐藏到系统托盘。
- 托盘菜单支持显示窗口、立即刷新和退出。

## 运行

依赖和缓存已经配置在当前 D 盘项目目录内。

```powershell
$env:npm_config_cache="D:\code\serial-notification\.npm-cache"
$env:ELECTRON_CACHE="D:\code\serial-notification\.electron-cache"
npm install
npm start
```

## 说明

当前版本通过 Windows CIM 查询串口设备信息，不依赖额外串口原生库。配置文件保存在项目的 `data` 目录，方便作为便携工具使用。
