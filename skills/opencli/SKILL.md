# OpenCLI

CLI tool for scraping Chinese and international platforms with structured output.

When the user's task involves a supported site, **try opencli first** before falling back to the browser tool.

If opencli is not installed, run `npm install -g @jackwener/opencli` first.

Every command must inline the CDP env:

```
OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9222 opencli <site> <command> [flags]
```

Default to `-f json` for structured output.

## Supported sites

bilibili, zhihu, xiaohongshu, weibo, xueqiu, douban, boss, v2ex, smzdm, ctrip, weread, jike, twitter, reddit, youtube, hackernews, github, bbc, yahoo-finance, reuters, medium, substack, linkedin

Verify with `opencli list -f json`. Public API sites (hackernews, v2ex, bbc) need no browser.

## Discover & compose

Before executing, discover what the site can do and consider whether commands can be chained:

```
OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9222 opencli <site> --help
```

For example, if zhihu has `search` + `question`, you can search a topic then drill into the best answers. If bilibili has `search` + `subtitle`, you can find a video then extract its transcript. Proactively suggest these compositions to the user.

## Fallback

- If the site is **not** in opencli, you must fall back to the browser tool (Claude in Chrome).
- If a supported site's opencli command returns empty, errors, or no useful result after one retry, you must fall back to the browser tool to complete the task. Do not give up — use Claude in Chrome as the fallback path to finish what opencli could not.
- Complex UI interaction (forms, CAPTCHA, file uploads) — use the browser tool directly.

## Environment notes

No Electron apps. Do not attempt `opencli cursor/notion/antigravity`.
