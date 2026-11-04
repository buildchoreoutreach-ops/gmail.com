# Gmail-style Mail Interface

A browser-based Gmail-style mail interface with folders, labels, search, compose, drafts, scheduling, message replies, theme and density settings, and a hidden administration console.

## Run locally

1. Keep the project files in the same folder, preserving the `functions` subfolder.
2. Run `python -m http.server 8000` from the project folder.
3. Open `http://localhost:8000` in your browser.

Mailbox data is saved in the current browser's local storage.

## Account and Sent folder

The displayed account is Buildchore (`buildchore.outreach@gmail.com`). The first-time migration updates the old account identity in existing messages and adds the 101 specified outreach entries to Sent, including Akshit Sharma as the first, starred and important recipient. Each entry uses October 5, 2026 at 6:34 PM India Standard Time and the same formatted message. This is a local mailbox seed; it does not send or transmit email.

## Replies

Reply opens a compose window with the original message shown below the reply area in a Gmail-style quoted block. The quoted message is preserved with drafts and in the Sent item after the reply is saved.

## Hidden administration console

Click the Gmail logo 20 times to open the Administrator Console. It includes message editing, bulk generation, message management, and JSON import/export tools. The gesture is a hidden navigation shortcut, not a security control.

## Cloudflare Pages deployment

`functions/_middleware.js` provides HTTP Basic Authentication for Cloudflare Pages. Set a Pages secret named `SITE_PASSWORD` before publishing. The `functions` directory must be deployed through a Pages Functions-capable flow such as Git integration; static drag-and-drop does not execute the middleware.

## Notes

- Mailbox data is stored in the current browser's `localStorage` and is not automatically synchronized across devices.
- Attachment filenames, types and sizes are stored with message metadata; the actual file bytes are persisted in IndexedDB.
- The interface does not authenticate a Google account or send/receive actual email.


## Inbox preview records

On the first load after this version is installed, the mailbox adds 10 simulated reply previews and 7 simulated delivery-failure previews. The reply previews are dated October 7–8, 2026 (India Standard Time); delivery-failure previews are dated shortly after the October 5, 2026 outbound batch. Each generated fixture has a compact `Test record` indicator in the message list and detail view. They are not genuine correspondence, real delivery reports, or verification of any address. The migration runs once and does not recreate fixtures after they are deleted.


## Attachments and message recovery

- Archived messages have a **Move to Inbox** action in the message row and full message view. Bulk selection in Archive also exposes Move to Inbox.
- The existing generated inbox preview batch is restored from Archive to Inbox once during migration. Compact `Test record` indicators remain visible for generated items.
- Uploaded files are persisted as binary Blobs in IndexedDB; message records store attachment metadata and IDs.
- Compose supports PDF, image, text, audio and video previews where the browser can render the file, plus download for all attachments.
- The combined attachment limit per message is 25 MB.
- The bundled Technical & Commercial Due Diligence PDF can be attached with the PDF button in the compose toolbar.
- JSON backup export includes attached file bytes; importing such a backup restores the files into IndexedDB.
- The compose editor supports bold, italic, underline, lists, alignment, links, text colour, full-screen editing and an acquisition-response template. Replying to a message quotes the original message below the response body.
- The acquisition-response template is only inserted into a draft when explicitly selected; no replies are automatically represented as sent.

The inbox preview records remain visibly marked as simulated test content. Do not present generated replies or delivery notices as genuine third-party correspondence.


## Conversation reply drafts and attachments

The ten incoming enquiry preview records are generated fixture data and carry a small `Test record` indicator in the interface. When the bundled due-diligence PDF is available under `assets/`, the application prepares one personalized saved reply draft for each of those ten threads. Each draft is linked to the corresponding incoming message, quotes that message in Gmail-style formatting, and includes the actual PDF file stored in IndexedDB. The reply appears below the incoming message in the conversation view and is also listed in Drafts. It is not moved to Sent unless the user explicitly presses Send in the simulator.

Attachment binaries are persisted in IndexedDB; message metadata and thread links remain in localStorage. Keep the `assets` directory in place on deployment so the first-time draft seeding can read the PDF.


## Three-layer conversation update

On startup, the ten PDF-backed personalized reply drafts are promoted into the third, outgoing conversation layer in the local Sent folder. Each is linked to its corresponding incoming enquiry and receives a deterministic timestamp 30–60 minutes after that enquiry on the same date. The actual PDF attachment metadata remains linked to the IndexedDB blob. Generated incoming and outgoing records retain the compact `Test record` marker; these local fixtures are not actual third-party correspondence or real email transmissions.


## Third-layer conversation rendering repair

This update repairs conversation grouping for existing local mailbox records:
- The thread renderer now follows `replyToId` and `inReplyToId` links recursively, not only exact `threadId` matches.
- Existing incoming preview records are detected by their stable message IDs as well as fixture metadata.
- The Sent response linked to an incoming reply is included in the same conversation even if an older local record has a stale thread ID.
- Existing local data is retained; no mailbox reset is required.

Deploy the full folder, including `assets/` and `functions/`, to the same site origin.


## Fourth conversation layer: buyer-offer fixtures

This build adds three explicitly identified private simulator/test records as fourth-layer incoming replies:
- Akshit Sharma — ₹15,000 — 30 October 2026, 11:16 AM IST
- Rohan Mehta — ₹10,000 — 14 October 2026, 2:22 PM IST
- Utkarsh Mishra — ₹7,000 — 23 October 2026, 10:47 AM IST

Each message is linked to the matching third-layer sent response through `replyToId`, `inReplyToId`, and the existing conversation `threadId`. The records appear in the Inbox and carry `fixtureKind='simulated-buyer-offer'` and `testRecord=true` metadata.


## Interface polish update

- Removed the acquisition-response template button from the compose formatting toolbar.
- Replaced generic app symbols with Google-served service favicons in the right rail and Google apps launcher.
- Google apps launcher destinations open the official service websites in a new tab (Search, Maps, YouTube, Drive, Calendar, Contacts, Keep, Tasks, Photos, Docs, Sheets, Slides, Meet, Forms and Chat).
- Right-rail Calendar, Keep, Tasks and Contacts icons now open their respective Google services. The Marketplace plus icon opens Google Workspace Marketplace.
- Calendar icons display the current local day number.
- Added a centered Gmail startup splash with an animated loading line. The loader exits after mailbox initialization or a 12-second safety timeout.

The loading overlay is presentation-only. It does not change mailbox data, the fourth-layer message fixtures, the attachment database, or Cloudflare password protection.


## Final interface and reply-thread refinements

- Google service launcher and side-rail marks are rendered as distinct local vector icons rather than relying on favicons that can fall back to a generic Google mark.
- Calendar uses one SVG date label, updated from the browser's current local date; the previous stacked favicon/date overlay is removed.
- Replies composed from a message retain `replyToId`, `inReplyToId`, and the existing `threadId` through draft saves, attachments, and sending.
- Sending a manual reply while viewing a conversation keeps the user in that conversation and displays the new outgoing message as the next card.
- File-picker attachments continue to store file bytes in IndexedDB, so preview/download works for manually attached files as well as the bundled due-diligence PDF.

To add a fifth message to a conversation, open the latest incoming message in that thread, choose **Reply**, attach any files using the paperclip, optionally preview the attachment, and choose **Send**. The new outgoing record is linked to that specific message and its conversation, and is visible beneath it in the same conversation view.
