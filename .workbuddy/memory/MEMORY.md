# 長期記憶

## 工作背景
用戶是一名具有 Android Java 開發背景的開發者，使用 React Native + Expo 開發名為 Countable 的倒計時追蹤應用。

## 技術棧
- Expo SDK 54 + React Native 0.81.5 + TypeScript
- @expo-google-fonts/inter 字體
- Expo Router 檔案式路由
- AsyncStorage 本地持久化
- react-native-reanimated 動畫
- Android Widget (AppWidgetProvider + NativeModules 橋接，Expo local module)

## 已修復問題
- 佈局貼合 fitsSystemWindows
- Today 標籤天數動態顯示
- 小工具尺寸 3x3 改 2x2
- 深色主題配色優化
- 日曆數字顯示亂碼（移除 Inter 字體）
- 卡片右上角灰色直角瑕疵
- DAYS 文字字母間距過大
- 新增/編輯按鈕閃退
- 日曆 flexWrap 改逐週渲染（7 欄網格）

## 建置方式
- EAS 雲端 Release APK（已多次成功）
- 本地 4GB RAM 無法編譯 C++（reanimated/worklets OOM）
- `npx eas build --platform android --profile preview`

## 使用者偏好
- 使用繁體中文溝通
- 偏好直接、簡潔的回覆
- 提供詳細結構化的技術規格
- 偏好一次性解決方案而非增量調試
- 當程式碼過於混亂時，偏好重新開始

---

# 開發路線圖

## Phase 1 — Widget 優化（多 Widget + 背景圖 + 點擊跳轉）

### 1A. Pin 改為「置頂」
- `isPinned` 欄位意義改為置頂（排序優先）
- 圖示可從 bookmark 改為 star（⭐）
- `EventsContext.togglePin` 邏輯調整

### 1B. 多 Widget 支援
- SharedPreferences 改為依 widgetId 儲存（每個 Widget 獨立資料）
- 新增 Widget 時觸發 `configure` 活動選取事件
- JS 端 `syncWidget(event, widgetId?)` 支援指定 Widget
- Widget 清單頁面顯示已綁定的事件

### 1C. Widget 背景圖片
- `RemoteViews.setImageViewBitmap()` 顯示事件圖片
- 圖片 URI 存入 SharedPreferences
- 同步 app 內事件圖片，或 Widget 單獨指定

### 1D. 點按 Widget 跳轉
- `PendingIntent` 帶 eventId extra
- App 接收 intent 後跳轉到事件編輯/詳情頁

---

## Phase 2 — 事件詳情頁

- 主頁點擊卡片 → 全屏詳情頁
- 大字倒數數字置中 + 自訂背景圖片
- 下滑顯示：
  - **倒數事件（future/today）**：進度環（已過天數百分比）
  - **計時事件（past）**：無進度環
  - Created 日期（可修改）
- 返回按鈕回到主頁

---

## Phase 3 — 設定頁面（取代 Widget 指南）

- 右上角按鈕改為設定齒輪 ⚙
- 自訂主題配色
- 上載圖片
- 事件提醒（每天 00:00 推送，可自訂提示詞）
- 日曆年份快速選擇器

---

## UI 小優化
- 日曆 header 點擊年份可快速跳選年份
- 移除 EventCard 中 iOS/Android 重複分支（簡化程式碼）
- 清理 plugins/ 目錄（已廢棄的 config plugin 嘗試）
