# Keeper — judge demo and sponsor evidence
Author: Alex Picon <alexnpc@me.com>

Open [the main judge walkthrough](http://localhost:8888/keeper/?demo=1). The homepage, primary button, deck and recorded pitch all feature **El pan que pudo traer**, in Grandma’s first-person perspective.

The source is written family recollection, reconstructed as a literary telling. Prepared narration uses ElevenLabs stock voices. **Do not claim it is an original recording of Grandma.** Her grandchild’s different perspective stays in a separately attributed family note.

The [narrated screen recording](keeper-demo.mp4) shows this running main story. The [deck](http://localhost:8889/keeper/) uses current app screenshots.

## 90-second presentation

| Time | Action | Say |
|---|---|---|
| 0–20 s | Open demo; Listen to her telling | “Keeper gives the original storyteller the narrative voice. This is Grandma: her husband worked at the docks, and he brought home the bread he could afford.” |
| 20–35 s | Next; Read the butter chapter | “Their four-year-old thanked him, then asked for butter. Eight short chapters and eight illustrations keep the telling readable.” |
| 35–55 s | Next; Read her faith story | “She prayed to la Virgen del Carmen de la Legua in Callao. Her conviction stays in her narration; the grandchild’s separate interpretation does not replace it. Source and adaptation notes remain available.” |
| 55–70 s | Next; Listen in Spanish | “The narrator remains Grandma in both editions. All eight chapters are prepared with ElevenLabs in both languages. Use the story URL to share it directly.” |
| 70–90 s | Next; review and download | “One HTML file carries all eight illustrations, chapters, source recollections, the separate family note, and any available narration. It opens offline.” |

For a live technical extension, create a story, upload permitted audio, transcribe with ElevenLabs, and ask an optional source-grounded follow-up. The old fictional audio fixture is available only via `?demo=adventure`; it is not the main story. Use it if testing Scribe needs a nonpersonal audio sample. Provider failures preserve the family’s text/audio; prepared readings are never mislabeled as live generation.

## Sponsor fit, with actual evidence

The [official HackGT 13 prize page](https://hackgt13.devpost.com/) lists ElevenLabs, SpaceXAI, Meta's AI social challenge, Oracle, and overall prizes. Checked September 26, 2026. Listing a prize does not confirm our eligibility; detailed judging criteria are on the authenticated event portal.

| Target | What Keeper can demonstrate | Remaining submission evidence |
|---|---|---|
| MLH Best Use of ElevenLabs | Scribe STT; timestamped source navigation; spoken interview prompts; three stock reading voices; timed multilingual narration; embedded audio exports. API calls and artifacts are real. | Live walkthrough and service explanation. No claim of ElevenLabs Agents, cloning, or dubbing APIs. |
| SpaceXAI: Make it Legendary | Grok story drafting, source-anchored follow-ups, five-language editions, and watercolor generation. | The local sponsor packet also requires building in Cursor. Confirm the team has genuine Cursor usage evidence before claiming eligibility. |
| Meta: Bringing People Closer Together with AI | Family memories become shareable artifacts across generations and languages. Remembered-person attribution supports families after a loss. | Local packet calls for a 2–3 minute video, public repo, working prototype and explanation of the social/AI value. The included two-minute video helps; human submission and eligibility checks remain. |
| Oracle / Best Overall | Complete input-to-keepsake flow, source provenance, review, accessible reading/listening options, and a coherent user need. | Select the appropriate track and submit the real project. No measured user-outcome or accuracy claims. |

Do not claim MongoDB Atlas, Backboard, Tiger Data, Vultr, or .tech use for Keeper without actually implementing/deploying them. Create-X is described in the local packet as an interest checkbox, not an extra hackathon prize. The product is stronger when every sponsor claim points to something judges can use.

## Technical answers

- **Is this live?** The walkthrough uses clearly labeled, previously generated outputs for immediate playback. Regenerate narration, transcribe, follow-up, translation, story drafting, and illustration are real live API paths. The demo never silently falls back to a fake provider result.
- **Whose voice is it?** Stock ElevenLabs narration is separate from the original audio. The fictional sample source is also synthetic, explicitly labeled. User recordings preserve the original voice.
- **Can AI invent details?** It can. Prompts discourage it; exact quote checks reject unsupported source excerpts; the family reviews prose and translations. These checks do not prove historical truth.
- **Where does it live?** Drafts and books are in browser IndexedDB. Audio/text goes to the named providers when requested. The new personal voice endpoints do not use a server disk cache. Downloaded HTML embeds the selected narration and original audio. There is no cloud backup or shared online family account yet.
- **What was verified?** Twenty-three API regression tests, real live STT/TTS/interview/translation calls, read-along, source seeking, source-edit invalidation, persistence, mobile layout, and self-contained offline exports. Hardware, all languages, and real-family outcomes are not independently validated.

## Asset credits

Alex Picon · alexnpc@me.com. OpenAI imagegen: fictional kitchen illustration. ElevenLabs: prepared source and stock-voice readings, Scribe transcript, and product-video narration. Grok: prepared Spanish translation and runtime text/image features. Fonts: DM Sans and Libre Caslon Display, SIL Open Font License via Google Fonts. All screenshots/video footage come from the actual running Keeper app.

## Storytelling revision

The optional adventure fixture is **Grandpa telling a complete first-person story**, not Elena describing an orange-peeling habit: 538 source words, 8 chapters, 1,463 storybook words, 8 different illustrations, and 16 prepared chapter readings (English/Spanish). Let judges hear the beginning, then jump to a source word if time is short. Use the chapter menu to jump from launch to storm to homecoming.

The input is open storytelling, with up to 30 minutes recording and 60,000 characters of text. Optional questions live in a collapsed help panel. The default book is an imaginative 8-chapter retelling; 12 chapters and faithful mode are available. Each chapter explains its added scenes/dialogue. Source quotes are anchors, not proof that imaginative details really happened.

## Adult family stories: Lima

Open [El pan que pudo traer](http://localhost:8888/keeper/?story=bread) for the family-requested weave of work at the docks, a bag of bread, a four-year-old's thanks and request for **butter**, her father's tears, and the grandmother praying to la Virgen del Carmen de la Legua in Callao and finding a large bill. Grandma narrates all eight chapters in first person. Her grandchild’s coincidence interpretation appears in a separate family note and is never put in her mouth. Do not claim the events are verified as the same day, invent a denomination, or claim the bill cured the sick child.

The homepage also offers two explicitly fictional companion books inspired by work, friendship, accidents, hunger, illness and mutual care. These do not identify a real relative as the patient or assert that a fictional accident happened to the grandfather. The original storyteller is distinct from the person preserving the telling. The supplied family details are preserved as written recollections; there is no manufactured “original family recording.” Every book has a Spanish edition and eight distinct chapter illustrations. Grandma has all sixteen chapter readings prebuilt; both companions also have all sixteen chapter readings prebuilt.

Grandma’s current edition has eight short chapters (93–102 words each), each with its own illustration. The devotional image is la Virgen del Carmen de la Legua with the Niño Jesús, checked against the Diócesis del Callao reference; do not substitute Guadalupe or generic Marian imagery. The optional Full length remains available for new books.

Share Grandma’s story directly: [English](https://keeper-ai.tech/keeper/?story=bread) · [Spanish](https://keeper-ai.tech/keeper/?story=bread&lang=Spanish). The address bar updates on opening a story; Copy story link works on the public HTTP host. All sixteen Grandma tracks were played in browser tests without generation requests. Both companions now use roughly 100 words per chapter and eight unique illustrations each.


English reading defaults to **Grandma Rachel** (`0rEo3eAjssGDUCXHYENf`); Spanish defaults to **Abuela Tina** (`lZmnvfWF4ko4J7F7QDtX`). Switching editions selects the corresponding default. All eight chapters of each bundled book are prebuilt in both languages, with word timing. These are generated reading voices, not original family recordings. The demo video uses Grandma Rachel.
