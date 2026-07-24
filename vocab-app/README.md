# 魔法词本 V0.5（试验版）

把你在哈利波特英文版里积累的词汇，做成手机上能随时翻看的小词本。

> 本版本先不做艾宾浩斯复习，只做：**词表查看 → 搜索 / 筛选 / 排序 → HTML 导入**。

## 默认词表

已内置《阿兹卡班的囚徒》前 6 章生词（约 777 条）：

- `public/azkaban-vocabulary.html`：原始 HTML（一章一页翻阅；词性写在中文前（多词性分行）；完整原句例句；若文中义很特殊，释义下加一行 `文中特指：…`）
- `src/data/azkabanWords.ts`：录入后的 App 数据

释义校准：本地可把开源词典 ECDICT 的 `ecdict.csv` 放到 `vocab-app/.dict/`（已 gitignore），再运行 `python3 scripts/enrich_meanings_ecdict.py` 批量用词典义覆盖上下文义；单次查词用 `python3 scripts/dict_lookup.py <word>`。

### 预览词表 HTML（本地）

直接用浏览器打开：

`vocab-app/public/azkaban-vocabulary.html`

打开后可用「上一章 / 下一章」或顶部章节圆点翻页，也可用键盘 ← →。

不需要 `npm run dev`。本地开发时若已启动 Vite，也可访问：

`http://localhost:5173/azkaban-vocabulary.html`

线上（合并并部署后）：https://urrrerin.github.io/Urrrerin/azkaban-vocabulary.html

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

| ID | 英文 | 音标 | 变形 | 出现 | 词库 | 中文 | 例句 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | flashlight | /ˈflæʃlaɪt/ | / | / | 四级 雅思 | n. 手电筒；火把（英式亦作 torch） | It was nearly midnight... |

也兼容通用表格：单词 / 音标 / 释义 / 频次 / 标签，以及一行一个：`word — 释义`。

词库里的「四级 / 六级 / 专四 / 专八 / 雅思 / 高考」会映射到筛选标签。

## V0.5 已有功能

- 阿兹卡班默认词表（可再导入 HTML 覆盖）
- 搜索（单词 / 释义 / 备注）
- 筛选：全部、高频、四级、六级、专四、专八、雅思、高考、其他
- 排序：频次高低、A-Z
- 词条详情（音标、释义、标签、章节备注）
- 导入后保存在本机浏览器（localStorage）

## 下一步（V1）

- 继续录入后续章节
- 修正源表里明显错位的词条（如个别 word/音标/释义不一致）
- 艾宾浩斯每日新学 / 复习
