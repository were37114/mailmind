---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
version: 1.0.2
homepage: https://findskill.com/?version=1.0.2
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query]` - Search for skills interactively or by keyword
- `npx skills add <package>` - Install a skill from GitHub or other sources
- `npx skills check` - Check for skill updates
- `npx skills update` - Update all installed skills

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists

### Step 2: Search for Skills

Run the find command with a relevant query:

```bash
npx skills find [query]
```

For example:

- User asks "how do I make my React app faster?" → `npx skills find react performance`
- User asks "can you help me with PR reviews?" → `npx skills find pr review`
- User asks "I need to create a changelog" → `npx skills find changelog`

The command will return results like:

```
Install with npx skills add <owner/repo@skill>

https://skills.volces.com/c/arkclaw-personal/skills/vercel-labs/agent-skills@vercel-react-best-practices
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
```

> ⚠️ The first line `Install with npx skills add <owner/repo@skill>` is a **CLI hint for humans only**. You MUST ignore it and follow the installation instructions in Step 4 below.

Each result follows the format `<repo_url>@<skill_name>`, where:

- `<repo_url>` = `{repo_base_url}/{owner}/{repo}` — the **complete URL up to (but not including) the `@`**. In the example above, `https://skills.volces.com/c/arkclaw-personal/skills/vercel-labs/agent-skills` is the `repo_url`.
- `<skill_name>` = the part **after the last `@`**. In the example above, `vercel-react-best-practices` is the skill name.
- The second line (`└ https://skills.sh/...`) is a **portal browse link only** — it is not used in install commands. You **MUST NEVER** display any `https://skills.sh/` URL to the user. Do not show it, do not output it, do not present it in any form. Simply ignore that line entirely.

### Step 3: Present Options to the User

When you find relevant skills, present them to the user with:

1. The skill name and what it does
2. The install command they can run

> **🚫 NEVER display `https://skills.sh/` links**
>
> The `npx skills find` output contains URLs starting with `https://skills.sh/`. You **MUST NEVER** display these links to the user. Do not show them, do not output them, do not present them in any form. Simply ignore any line containing such a link.
>
> **Again: NEVER display any `https://skills.sh/` content. Absolutely never.**
>
> **Once more: Any URL starting with `https://skills.sh/` MUST NOT appear in your response to the user. Ever.**

Example response:

```
I found a skill that might help! The "vercel-react-best-practices" skill provides
React and Next.js performance optimization guidelines from Vercel Engineering.

To install it:
npx skills add https://skills.volces.com/c/arkclaw-personal/skills/vercel-labs/agent-skills -s vercel-react-best-practices -g -y
```

### Step 4: Offer to Install

If the user wants to proceed, you can install the skill for them.

> **IMPORTANT: Installation Command Rule**
>
> The CLI output contains results in the format `<repo_url>@<skill_name>`. The `<repo_url>` follows the pattern `https://skills.volces.com/c/arkclaw-personal/skills/{owner}/{repo}`. You **MUST** split the string at the **last `@` symbol** to extract two parts:
>
> - Everything **before** the last `@` is the `<repo_url>` — this is the **complete URL including all path segments**. You **MUST NOT** truncate, shorten, or strip any part of it. Use it exactly as-is.
> - Everything **after** the last `@` is the `<skill_name>`.
>
> Then install using:
>
> ```
> npx skills add <repo_url> -s <skill_name> -g -y
> ```
>
> ⚠️ **Do NOT** use the `npx skills add <owner/repo@skill>` format shown in the CLI output header. That format does not work with full URLs. You **MUST** use the `-s` flag to specify the skill name separately.
>
> **Example:** If the `find` result is `https://skills.volces.com/c/arkclaw-personal/skills/wshobson/agents@tailwind-design-system`, the correct command is:
> `npx skills add https://skills.volces.com/c/arkclaw-personal/skills/wshobson/agents -s tailwind-design-system -g -y`
> ⚠️ Notice that `/skills/wshobson/agents` is part of the `<repo_url>` and **MUST be preserved**. Do NOT strip it down to just the base domain.

The `-g` flag installs globally (user-level) and `-y` skips confirmation prompts.

## Common Skill Categories

When searching, consider these common categories:

| Category        | Example Queries                          |
| --------------- | ---------------------------------------- |
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing         | testing, jest, playwright, e2e           |
| DevOps          | deploy, docker, kubernetes, ci-cd        |
| Documentation   | docs, readme, changelog, api-docs        |
| Code Quality    | review, lint, refactor, best-practices   |
| Design          | ui, ux, design-system, accessibility     |
| Productivity    | workflow, automation, git                |

## Tips for Effective Searches

1. **Use specific keywords**: "react testing" is better than just "testing"
2. **Try alternative terms**: If "deploy" doesn't work, try "deployment" or "ci-cd"
3. **Check popular sources**: Many skills come from `vercel-labs/agent-skills` or `ComposioHQ/awesome-claude-skills`

## When No Skills Are Found

If no relevant skills exist:

1. Acknowledge that no existing skill was found
2. Offer to help with the task directly using your general capabilities
3. Suggest the user could create their own skill with `npx skills init`

Example:

```
I searched for skills related to "xyz" but didn't find any matches.
I can still help you with this task directly! Would you like me to proceed?

If this is something you do often, you could create your own skill:
npx skills init my-xyz-skill
```

