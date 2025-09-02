# Dialog 彈窗定位問題除錯記錄

**日期**: 2025-09-02  
**問題**: CreateProjectDialog 彈窗開啟時會從螢幕中央滑動到左上角

## 問題描述

在專案列表頁面點擊「新增專案」按鈕後，彈窗會短暫出現在螢幕中央，然後快速滑動到左上角的錯誤位置。這個問題已經嘗試修復六次都失敗。

## 除錯過程

### 第一階段：基本定位調整
1. **嘗試修改 Dialog 組件的 CSS 類別**
   - 移除 `max-h-[calc(100vh-2rem)] overflow-y-auto`
   - 結果：問題依然存在

2. **檢查 Select 組件影響**
   - 修改 Select 的 position 屬性為 "item-aligned"
   - 調整 Select 的 z-index 和 overflow 設定
   - 結果：問題未解決

### 第二階段：深入分析
3. **加入 Debug Log**
   ```javascript
   // 檢查 Dialog 位置
   console.log('Dialog position:', {
     top: rect.top,
     left: rect.left,
     transform: styles.transform,
     position: styles.position
   });
   ```
   發現：
   - `Body overflow: hidden` - Radix UI 會自動設定
   - `Active portals: 0` - Portal 沒有正確渲染
   - Dialog 元素找不到

4. **創建新的穩定版 Dialog 組件**
   - 使用內聯樣式強制定位
   - 結果：問題依然存在

### 第三階段：系統性測試
5. **創建專門的 CSS 修復文件 `dialog-fix.css`**
   - 使用 `!important` 強制覆蓋所有可能的定位屬性
   - 測試多個選擇器組合：
     - `[role="dialog"]`
     - `[data-radix-portal]`
     - `[data-slot="dialog-content"]`
     - `[data-radix-popper-content-wrapper]`

6. **逐步測試找出關鍵屬性**
   - 測試 `inset: auto !important` - 造成元素消失
   - 測試 `position: fixed` + 基本定位 - 出現在錯誤位置
   - 測試 `right: auto` + `bottom: auto` - 部分有效

### 第四階段：極端方法
7. **使用 MutationObserver 監聽樣式變化**
   ```javascript
   observer = new MutationObserver(() => {
     forcePosition(dialog);
   });
   ```
   結果：造成無限循環，網頁卡死

## 問題根源發現

透過系統性測試發現：

**Radix UI Dialog 會動態設定 `inset` 屬性**
- `inset` 是 `top`, `right`, `bottom`, `left` 的簡寫
- Radix 設定 `inset` 會覆蓋我們的 `left: 50%` 和 `top: 50%`
- CSS 類別的優先級不夠高，無法覆蓋動態內聯樣式

## 最終解決方案

在 `dialog.tsx` 的 DialogContent 組件中加入內聯樣式：

```jsx
<DialogPrimitive.Content
  ref={ref}
  className={cn(
    "fixed z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto",
    className,
  )}
  style={{
    position: 'fixed',
    left: '50%',
    top: '50%',
    right: 'auto',    // 關鍵：防止 inset 覆蓋
    bottom: 'auto',   // 關鍵：防止 inset 覆蓋
    transform: 'translate(-50%, -50%)',
    margin: 0
  }}
  {...props}
>
```

### 為什麼這個方案有效

1. **內聯樣式優先級最高** - 直接覆蓋 Radix 的動態樣式
2. **`right: 'auto'` 和 `bottom: 'auto'`** - 明確設定這兩個值，防止 `inset` 簡寫屬性影響 `left` 和 `top`
3. **簡單直接** - 不需要額外的 CSS 文件、不需要 JavaScript 監聽、不需要複雜的選擇器

## 經驗教訓

1. **第三方 UI 庫的內部實現可能很複雜**
   - Radix UI 使用了 Popper.js 進行定位
   - 會動態計算並設定內聯樣式
   - 簡單的 CSS 覆蓋可能無效

2. **系統性除錯的重要性**
   - 逐步移除/添加屬性找出關鍵因素
   - 使用 console.log 追蹤實際的 DOM 狀態
   - 測試時要有耐心，逐一驗證假設

3. **內聯樣式 vs CSS 類別**
   - 當需要覆蓋動態生成的樣式時，內聯樣式更可靠
   - CSS `!important` 有時也無法覆蓋內聯樣式

4. **了解 CSS 簡寫屬性**
   - `inset` 會同時設定四個方向的定位
   - 需要明確設定各個屬性來防止被簡寫覆蓋

## 總結

這個問題花了很長時間解決，嘗試了超過七種不同的方法。最終發現問題的關鍵是 Radix UI 使用 `inset` 簡寫屬性覆蓋了我們的定位。解決方案很簡單：在內聯樣式中明確設定 `right: 'auto'` 和 `bottom: 'auto'`，但找到這個解決方案的過程很曲折。這次經驗提醒我們在使用第三方 UI 庫時，需要深入了解其內部實現機制。