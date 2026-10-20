# NPO 任務管理健檢框架

模組一：角色、權責與協作。把 RACI 和 Management 3.0 的七級授權融合成「權責地圖」，搭配角色卡與八個健檢面向，給專職少、志工多的台灣 NPO 使用。

網站：<https://leadfortaiwan26.github.io/task-management/>（GitHub Pages，`main` 分支 `/docs`）
上位框架：[營運健檢框架](https://github.com/leadfortaiwan26/operational-framework)

> v0.1 草稿。法規摘要是閱讀條文的整理，不是法律意見。Management 3.0 的 Delegation Poker 卡片不是開放授權，本文只引用等級名稱；角色卡模板改寫自 Sociocracy 3.0（CC BY-SA 4.0）。

## 更新方式

```bash
npm install
npm run build   # src/framework.md → docs/index.html
```

- 內容：`src/framework.md`。改完跑 `npm run build`，把 `src/` 與 `docs/` 一起 commit。
- 頁首文字與連結：`site.json`；樣式：`style.css`（build 時複製到 `docs/assets/`）。
- 證據標記 `[F]` 事實、`[E]` 專家或機構主張、`[I]` 推論、`[H]` 未查證，build 時會轉成小標籤。
