# 🔧 插件弹窗尺寸问题故障排除

## ❗ 问题描述

插件弹窗显示过小，界面被压缩。

## 🎯 解决方案

### 方案一：强制重新加载插件

1. 打开 `chrome://extensions/`
2. 找到"清理缓存助手"插件
3. 点击 **"重新加载"** 按钮（🔄 图标）
4. 重新点击插件图标测试

### 方案二：清除插件缓存

1. 使用插件本身清理浏览器缓存
2. 重新加载插件
3. 重启 Chrome 浏览器

### 方案三：重新安装插件

1. 在扩展管理页面删除插件
2. 重新加载插件文件夹
3. 确保所有文件都是最新版本

### 方案四：检查 Chrome 版本

- 确保使用 Chrome 88+ 版本
- 更新到最新版本的 Chrome

## 📏 预期尺寸

- **宽度**: 520px
- **最小宽度**: 520px
- **高度**: 自动调整（最小 720px）

## 🛠️ 技术修复

如果以上方案都无效，请检查以下技术细节：

### CSS 强制尺寸规则

```css
/* Chrome 插件弹窗固定尺寸 */
html {
  width: 520px !important;
  min-width: 520px !important;
  height: auto !important;
  min-height: 720px !important;
}

body {
  min-width: 520px;
  min-height: 720px;
  width: 520px;
  height: auto;
}
```

### HTML 内联样式备用

```html
<body
  style="width: 520px; min-width: 520px; height: auto; min-height: 720px;"
></body>
```

## 🧪 测试方法

1. 打开 `test.html` 文件测试插件功能
2. 对比插件实际弹窗大小
3. 使用浏览器开发者工具检查 CSS 应用情况

## 📞 获取帮助

如果问题仍然存在：

1. 检查浏览器控制台是否有错误信息
2. 确认没有其他插件冲突
3. 尝试在隐身模式下测试插件

## ⚡ 紧急备用方案

如果需要临时使用更小的尺寸，可以将 CSS 中的 520px 改为较小值：

```css
html {
  width: 400px !important;
  min-width: 400px !important;
}

body {
  width: 400px;
  min-width: 400px;
}
```

但这会影响界面布局，建议尽快恢复到 520px。
