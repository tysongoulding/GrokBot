---
name: Check Google Chat Net-Eng Alerts
description: >-
  Use when checking unread Google Chat, especially the Net-Eng - Alerts space,
  via signed-in Chat in the browser.
---
# Check Google Chat Net-Eng Alerts

Assumes Chrome is signed in to Tyson’s Google account (tyson.goulding@optconnect.com). Do not send or reply in Chat unless the user asked.

Prefer a working Google Chat connector for reads. If Chat MCP is unauthenticated or broken, use signed-in Chrome. Never scrape cookies or attach to DevTools to run this skill.

## Inputs
- `{space}`: Chat space to open. Default: `Net-Eng - Alerts`.

## Steps
1. Open https://chat.google.com/app/home
2. If a login wall appears, stop and ask the user to sign in. Do not type credentials.
3. Confirm **Home** is selected in the left sidebar.
4. Turn on the **Unread** filter in the Home list if it is off.
5. Scan the unread Home list. Note Flows, Icinga, and other items, but do not treat them as the goal unless `{space}` is Home.
6. Open `{space}` (default **Net-Eng - Alerts**, pinned under the Net-Eng section). It may load in the split pane.
7. Read the latest messages in that space: sender, time, and what they said. Do not transcribe secrets, tokens, or passwords.
8. Report a short digest of new unread items. Stay quiet on “nothing new” only if this was a scheduled watch that says to.

## Do not
- Send, react, or @-mention anyone unless the user asked.
- Mark things read unless asked.
- Use this for Slack or Gmail.
