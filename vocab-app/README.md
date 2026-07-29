# 魔法词本 V0.5（试验版）

把你在哈利波特英文版里积累的词汇，做成手机上能随时翻看的小词本。

> 本版本先不做艾宾浩斯复习，只做：**词表查看 → 搜索 / 筛选 / 排序 → HTML 导入**。

## 默认词表

已内置《阿兹卡班的囚徒》前 5 章生词（约 583 条）：

- `public/azkaban-vocabulary.html`：原始 HTML
- `src/data/azkabanWords.ts`：录入后的 App 数据

## 你怎么在 iPhone 上用

1. 用 Safari 打开上线后的网页（合并 PR 并开启 GitHub Pages 后可用）
2. 点底部分享按钮 → **添加到主屏幕**
3. 主屏幕会出现「魔法词本」，通勤时像 App 一样打开

## 本地运行

```bash
cd vocab-app
npm install
npm run dev
```

浏览器打开终端提示的地址即可。

## 导入格式

优先支持阿兹卡班词表表格：

| ID | 英文 | 音标 | 变形 | 出现 | 词库 | 中文 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | torch | /tɔːtʃ/ | / | / | 四级 雅思 | 火把；火炬 |

也兼容通用表格：单词 / 音标 / 释义 / 频次 / 标签，以及一行一个：`word — 释义`。

词库里的「四级 / 六级 / 专四 / 专八 / 雅思 / 高考」会映射到筛选标签。

## V0.5 已有功能

- 阿兹卡班默认词表（可再导入 HTML 覆盖）
- 搜索（单词 / 释义 / 备注）
- 筛选：全部、高频、四级、六级、专四、专八、雅思、高考、其他
- 排序：频次高低、A-Z
- 词条详情（音标、释义、标签、章节备注）
- 导入后保存在本机浏览器（localStorage）
- 可选 Supabase 云同步（本地优先 + 静默备份 + 恢复凭证）

## 云同步（Supabase）

1. 复制 `.env.example` 为 `.env.local`，填入 Project URL 和 `anon` public key  
2. 本地：`npm run dev`  
3. 上线 GitHub Pages：在仓库 **Settings → Secrets and variables → Actions** 添加  
   - `VITE_SUPABASE_URL`  
   - `VITE_SUPABASE_ANON_KEY`  
4. App 内点「云同步」→ **复制恢复凭证**，存到备忘录（清网站数据后用来找回）

云端表：`user_progress`（`user_id` / `payload` / `updated_at`），需开启 Anonymous Sign-In 与 RLS 策略。

## 下一步（V1）

- 继续录入后续章节
- 修正源表里明显错位的词条（如个别 word/音标/释义不一致）
- 艾宾浩斯每日新学 / 复习
