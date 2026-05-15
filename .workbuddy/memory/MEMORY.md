# 長期記憶

## 工作背景
用戶是一名具有 Android Java 開發背景的開發者，使用 React Native + Expo 開發名為 Countdowns 的倒計時追蹤應用。

## 技術棧
- Expo SDK 54 + React Native 0.81.5 + TypeScript
- @expo-google-fonts/inter 字體
- Expo Router 檔案式路由
- AsyncStorage 本地持久化
- react-native-reanimated 動畫
- Android Widget (AppWidgetProvider + NativeModules 橋接)

## 已知已修復問題
- 佈局貼合 fitsSystemWindows
- Today 標籤天數動態顯示
- 小工具尺寸 3x3 改 2x2
- 深色主題配色優化
- 日曆數字顯示亂碼（移除 Inter 字體）
- 卡片右上角灰色直角瑕疵（加 backgroundColor）
- DAYS 文字字母間距過大（letterSpacing 1.2→0.5）
- 新增/編輯按鈕閃退（日曆字體渲染崩潰根源）

## APK 建置記錄
- EAS 雲端 Release APK 已成功：app-release.apk（82MB，@ichanliu/countdowns）
- 本地環境僅 4GB RAM，Android 原生構建 (C++/worklets/reanimated) 會 OOM
- 需用戶本地手動執行 npx eas build --platform android --profile preview

## 使用者偏好
- 使用繁體中文溝通
- 偏好直接、簡潔的回覆
- 提供詳細結構化的技術規格
- 偏好一次性解決方案而非增量調試
- 當程式碼過於混亂時，偏好重新開始
