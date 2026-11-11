WHAT TO UPLOAD
  1) notes.js            -> replace the old one on your website
  2) Code-folders.gs     -> only needed for "Import Drive folder" (steps are written at the top of that file)
  Nothing else changes. Topics / table / subject look / order / link buttons work WITHOUT touching Apps Script.

HOW TO USE (type the admin PIN first, then open Notes > a subject)
  📝 Edit topics & table : the real topics view becomes editable. Tap a line = type. Buttons under the line: ↑ ↓ (move), ← → (out / in), ＋ Below, ＋ Inside, 🗑.
                           Enter = new line, Tab / Shift+Tab = in / out, paste a list = one line each. Tab "⏱️ Table" edits the table (rows, heading rows, columns).
                           💾 Save to keep. "Text mode" = the old text box. "Back to original" = the topics from notes-info.js again.
  ✏️ Edit subject        : name, icon, colour (and file-name words for subjects you added).
  ↕ Reorder subjects     : arrows.
  🔗 Add link / Drive folder : button that opens any link, OR import a public Drive folder (all sub-folders) as normal notes in that subject.
  ➕ Add subject         : same form, with an optional link/folder.

IF THE FOLDER IMPORT SAYS "⚠️"
  - "not shared as anyone with the link": share the folder that way in Drive.
  - "Apps Script has no folder part": do the 3 steps in Code-folders.gs and deploy a NEW version.
  - Still failing? Give this to any AI:
    "Google Apps Script web app. Add doGet handlers: ?folder=ID returns JSON {ok:true,name,files:[{p:'Root/Sub/file.pdf',id,t:lastUpdatedMs,s:size,m:mime}]}
     listing a public (anyone-with-link) Drive folder recursively using DriveApp; ?dfile=ID returns that file as base64 text, or 'denied' if not public.
     Google Docs/Slides are exported as PDF. Refuse private files. Cache results 10 min."
