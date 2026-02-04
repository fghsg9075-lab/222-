# Leon karo Project
Leon karo is an educational platform for smart learning, formerly known as Ideal Inspiration Classes (IIC).

## Recent Changes
### January 21, 2026
- **Ultra Discount Timer**: Enabled Years to Seconds precision for discount events and cooldowns. Added auto-start logic when cooldown reaches zero.
- **School Mode Notes Fix**: Standardized `schoolFreeNotesHtml` and `competitionFreeNotesHtml` usage across `PdfView` and `StudentDashboard`.
- **Discount Synchronization**: Unified general discount settings and event-specific discount logic in the `Store` component.

## System Architecture
### Discount Event Logic
- Admins set duration and cooldown units.
- `calculateStartTime` and `calculateEndTimeFromStart` generate ISO timestamps.
- `StudentDashboard` monitors these timestamps to toggle between 'WAITING', 'ACTIVE', and 'NONE' states.
- Discount banner UI adapts based on the state (Amber for waiting, Red for active).

### Content Visibility
- `ChapterSelection` now checks for `schoolVideoPlaylist`, `competitionVideoPlaylist`, `schoolPdfLink`, and `competitionPdfLink` to determine if a chapter is "Available".
- `LessonView` identifies free content by checking specific types (`PDF_FREE`, `NOTES_HTML_FREE`) and free entries within playlists.
