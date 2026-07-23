# （Harry Potter 词汇）

这是一个给「哈利波特阅读背单词」用的小项目。

- App 代码在 [`vocab-app/`](./vocab-app/)
- 当前版本：**V0.5 试验版**（手机词表查看 + 筛选排序 + HTML 导入）
- 详细说明见 [`vocab-app/README.md`](./vocab-app/README.md)

## 已录入词表

已把《哈利·波特与阿兹卡班的囚徒》前 6 章生词 HTML 录入为默认词表：

- 源文件：[`vocab-app/public/azkaban-vocabulary.html`](./vocab-app/public/azkaban-vocabulary.html)
- 数据：[`vocab-app/src/data/azkabanWords.ts`](./vocab-app/src/data/azkabanWords.ts)
- 规模：约 **694** 条（含章节内复现条目）

## 小白怎么理解

| 概念 | 对应这里 |
| --- | --- |
| 产品 | 魔法词本 |
| 仓库 | 就是这个 GitHub 仓库 |
| V0.5 | 先能在手机上看词，不做复杂复习算法 |

## 手机打开（iPhone）

正式地址（需先开启 GitHub Pages，只需一次）：

1. 电脑打开：https://github.com/Urrrerin/Urrrerin/settings/pages
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. Branch 选 **gh-pages** / **/(root)** → Save
4. 一两分钟后用 Safari 打开：

**https://urrrerin.github.io/Urrrerin/**

然后点分享 →「添加到主屏幕」，就能像 App 一样用。

词表源文件也在同一站点：https://urrrerin.github.io/Urrrerin/azkaban-vocabulary.html

## 怎么预览词表 HTML

词表就是一个普通网页文件，**不需要跑 App**，本地直接打开即可：

1. 在仓库里找到：`vocab-app/public/azkaban-vocabulary.html`
2. 用浏览器打开（双击，或拖进 Chrome / Edge / Safari）
3. 也能在资源管理器地址栏输入该文件的完整路径回车

如果你在用 Cursor / VS Code：在文件树上右键这个 HTML → **Reveal in Finder / Open in Browser**（有对应扩展时）。

说明：
- **本地打开**看到的是你电脑上这一份（含未合并的修改，只要文件已同步到本地）
- **网站预览** https://urrrerin.github.io/Urrrerin/azkaban-vocabulary.html 要等 PR 合并并部署到 `gh-pages` 后才会更新第六章

