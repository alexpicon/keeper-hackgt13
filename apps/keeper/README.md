# Keeper — family stories worth passing down
Author: Alex Picon <alexnpc@me.com>

Keeper preserves family memories as illustrated, narrated storybooks. Open [the app](http://localhost:8888/keeper/), [the judge walkthrough](http://localhost:8888/keeper/?demo=1), or [the deck](http://localhost:8889/keeper/). The former lighthouse/VR modules remain unused for compatibility. The main capture flow is storytelling, not a questionnaire; prompts are optional and collapsed. It does not presume childhood, fantasy, or a happy ending.

## The family workflow

1. Identify the original storyteller separately from the person preserving the story. By default, the original storyteller narrates in first person; the collector’s perspective is an explicit alternative.
2. Record up to thirty minutes, upload up to 20 MB of audio, or write. Recording needs HTTPS or localhost. Optional browser dictation uses the browser's speech service. Uploaded files and recordings stay local until **Transcribe with ElevenLabs** is selected.
3. ElevenLabs Scribe v2 proposes a transcript with word timestamps and automatic speaker labels. Review and accept it explicitly; the original recording is preserved. Timestamp buttons refer to the machine transcript, even if the family corrects the draft wording.
4. The optional, collapsed storytelling-help panel offers **Ask about my memory** for a Grok follow-up anchored to an exact source excerpt. **Listen to the question** speaks it with ElevenLabs. This is a turn-based guide, not an ElevenLabs conversational-agent session.
5. Tell the whole story uninterrupted, then choose an **8- or 12-chapter book**. **Vivid literary retelling** is the default: developed scenes and dialogue with a tone that matches the telling. Work, friendship, accidents, hunger, illness, faith, and unfinished endings belong here as much as childhood. A separate optional wonder setting allows playful treatment when it fits. **Close to the telling** stays faithful to the supplied events. Each chapter retains an exact source anchor and a disclosure of its imaginative additions. Anchors are not evidence for invented scenes. The complete original telling stays untouched.

   The generator validates chapter count, source anchors, substantial text length, and imaginative-addition disclosures. Short chapters are now the default: a target of 80–110 words, validated at 60–125 words per chapter for Latin-language sources. The optional Full setting retains a 175-word average minimum. Chapters outside the selected bounds are fitted to the requested length in up to three concurrent calls, preserving the storyteller and full plot context. Incomplete generation returns the original telling explicitly, not a completed short “book.” Other writing systems use character-length validation rather than an inappropriate space-delimited word floor. Generation may take up to three minutes.
6. In the listening room, use Grandma Rachel for English and Abuela Tina for Spanish (Sarah, George, and Lily remain alternatives). ElevenLabs Multilingual v2 returns an MP3 and character timings. Word highlighting follows audio when the provider's aligned text matches the page (ignoring outside whitespace). If normalization changes the words, the audio still plays without misleading highlights. Continuous reading advances chapters, generating narration if needed.
7. Create English, Spanish, French, Portuguese, or Hindi editions with Grok. The original stays separate. Each edition needs its own review. Editing a source page clears translations and generated narration so stale material cannot be exported as current.
8. Download the selected edition as a self-contained HTML book, embedding artwork, original audio, and any generated narration for the selected voice/language. MP3s can also be downloaded individually. Printing/PDF keeps words and images; HTML keeps audio.

IndexedDB holds drafts and books on this browser. Clearing browser data removes local copies: download keepsakes for durable storage. Collection stories have public, host-correct share links. Personal books and private edits stay browser-local and are shared by downloading the book. No family accounts, online collaborative library, cloud backup, or voice cloning are implemented.

## The main story and judge experience

**El pan que pudo traer** is the homepage feature, primary story button, and default `?demo=1` walkthrough. Grandma narrates eight short chapters (93–102 words), each with its own illustration: work at the docks, bread and butter, her husband's tears, prayer to la Virgen del Carmen de la Legua in Callao, the found bill, her faith, and the family she addresses.

The five judge steps cover Grandma’s telling, the butter chapter, her faith and its source, Spanish narration, and the offline keepsake. The source is written family recollection. All eight English and eight Spanish chapter readings are prebuilt with ElevenLabs and labeled; no original family recording is fabricated. Her grandchild’s separate opinion remains outside the narration. Main-story assets live in `stories/lima/bread/`; the full Lima collection remains available from the homepage.

The older fictional Captain Button story remains an explicit secondary fixture at `?demo=adventure`, useful for testing original-audio transcription and the Full chapter-length mode. `tools/prepare_keeper_demo.py` rebuilds that fixture, not the featured family story. The default route never selects it.

`tools/record_keeper_pitch.py` records the running main story and adds ElevenLabs product narration to `slides/keeper/keeper-demo.mp4`. See [the presenter script](../../slides/keeper/DEMO.md). The video is a product walkthrough, not a recording of a real family session.

## Service boundaries

- `server/routers/keeper_story.py`: story drafts, status, and watercolor generation. Existing `XAI_API_KEY`; optional `KEEPER_TEXT_MODEL` (default `grok-3-mini`) and `KEEPER_IMAGE_MODEL` (default `grok-imagine-image`). Provider failure preserves the original text with an explicit notice.
- `server/routers/keeper_voice.py`: POST `/api/keeper/voice/narrate`, `/transcribe`, `/interview`, `/translate`, and GET `/status`. Uses existing `ELEVENLABS_API_KEY` and `XAI_API_KEY`. No personal disk cache; private results have `Cache-Control: no-store`. Audio upload is bounded at 20 MB. Provider errors return recoverable messages without exposing provider bodies or credentials.
- Keys stay server-side. Personal payloads are not deliberately logged or stored by these routers. Requests go to the named provider when the family asks; provider processing/retention is separate from local application storage. The pre-existing shared `/api/tts` disk cache is not used by Keeper's new studio.
- API references: [ElevenLabs timed speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps), [ElevenLabs transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [xAI image generation](https://docs.x.ai/developers/model-capabilities/images/generation).

## Verification

- `uv run python -m tools.check_keeper_main`: featured cover, primary CTA, default judge route, all five main-story steps, correct Carmen image/name, Spanish playback, eight-image export, and mobile. No new provider calls; uses prepared opening narration.

- `uv run python -m unittest discover -s tests -p 'test_keeper*.py'`: 23 tests cover source fidelity, fabricated quotes, fallback behavior, file/voice limits, no-store responses, transcript timing, exact interview anchors, translation page counts, unchanged-body translation failures, and sanitized provider errors.
- `uv run python -m tools.check_keeper`: original flow against port 8888, including synthetic microphone-device recording, real story/image generation, recovery, persistence, edits, and export.
- `uv run python -m tools.check_keeper_long`: the explicit secondary `?demo=adventure` fixture; complete first-person source, 8 chapters / 1,400+ words, 8 illustrations, optional prompts, length/style controls, chapter navigation, adaptation disclosures, translated chapters, 9 embedded audio clips, and mobile layout. Uses the already-generated demo rather than issuing new provider calls.
- `uv run python -m tools.check_keeper_voice`: the secondary fictional fixture for real Scribe transcription of the fictional sample; live Lily narration; live source-grounded interview and spoken question; judge steps, prepared read-along, source seeking, Spanish review/export, edit invalidation, mobile overflow and offline book loading. Saves actual app screenshots for the deck. Calls live APIs and consumes credits.
- These checks validate implementation, not real microphone hardware, historical accuracy, translation quality across every supported language, accessibility certification, or user outcomes.

## Credits

Alex Picon, alexnpc@me.com, for implementation and demo. Kitchen watercolor: OpenAI imagegen, September 26, 2026, fictional example. Runtime art: xAI image generation. Demo source, reading voices, and product narration: ElevenLabs reading voices (Grandma Rachel/Abuela Tina defaults; Sarah/George/Lily legacy alternatives), with no voice cloning. Fonts: DM Sans and Libre Caslon Display, Google Fonts, SIL Open Font License. Exports use system fonts and have no external font dependency.

## Review rounds

The original boat game was replaced with an artifact families can keep. The first pass added source evidence, export, and draft recovery. The voice expansion was reviewed against the repository competitor-analysis standard: show live implementation and honest limits rather than unsupported claims. Browser review caught padded alignment text and a partially translated edition; both were corrected, with a backend regression against translated headings/unchanged bodies. The judge walkthrough now has direct playback actions, prepared-provider labels, and a matching screen-recorded pitch. Sponsor arguments are documented separately from eligibility in the presenter script.

The later storytelling review replaced the tiny recollection sample with a complete first-person adventure. The server now develops undersized chapters before validation, and the UI starts with uninterrupted storytelling rather than a prompt. Twelve-chapter generation and translation are covered by API tests; the eight-chapter sample is a real generated output.

## Lima collection: supplied memory versus inspired fiction

The homepage now includes three eight-chapter books (2,338 words total), with eight distinct illustrations in every book, complete Spanish text editions, and prepared opening narration in both languages. **Grandma’s book additionally has all eight chapters prebuilt in both English and Spanish: sixteen ElevenLabs tracks.** The two companions have prepared openings and on-demand narration for their remaining chapters.

- **El pan que pudo traer** (775 words): [open the book](http://localhost:8888/keeper/?story=bread). Retells the bread and found-banknote memories in **Grandma’s first-person voice** at the family’s request. Her husband, their daughter, her prayer, and her faith stay in her narration. The grandchild’s different interpretation is preserved in a separately attributed family note, not put in her mouth. The four-year-old thanks her father for the bread and asks for **butter**, as explicitly clarified. Grandma’s prayer to the Virgin Mary remains in her telling; the grandchild’s coincidence interpretation remains in the separate note. The weave is not presented as verified single-day chronology. No denomination, donor, diagnosis, or cure is invented.
- **Las manos que se cuidaban** (774 words): [open](http://localhost:8888/keeper/?story=port). Clearly labeled fiction about an unnamed Latin American port crew, inspired by the grandfather's occupation and themes of friends, accidents, and mutual protection. The workers and incident are invented, not claims about the grandfather. No particular port or era is asserted.
- **La familia que seguía volviendo** (789 words): [open](http://localhost:8888/keeper/?story=care). Clearly labeled fiction about sharing care through illness, hunger, and setbacks in Lima. Characters are invented; no diagnosis is assigned to an identifiable relative, and no medical outcome is invented.

Sources are **written recollections**, not invented original recordings. Prepared readings are labeled stock-voice narration. Source anchors, provenance labels, adaptation notes, and export labels remain visible. Save a personal copy to the bookshelf; edits, reviews, and live generation also create a personal copy rather than overwriting the collection.

`tools/build_keeper_lima.py` authors the text/source manifest. It rebuilds base books and clears prepared assets from their metadata; run `tools/prepare_keeper_lima.py` afterward to attach translations, illustrations and opening narration. The latter uses existing provider keys and a temporary content-addressed cache. All depicted people and settings are illustrative, not portraits or historical photographs.

`uv run python -m tools.check_keeper_lima` checks all 24 chapters, exact anchors, the butter clarification, age and faith perspectives, fiction labels, absence of fabricated source audio, personal-copy persistence, Spanish export, direct links, and mobile layout. Its screenshots refresh the deck. Read-along tolerates paragraph and punctuation normalization while checking that the spoken words still match, without changing visible wording.

## Original storyteller versus person preserving the story

The capture form now identifies **who originally told the story** separately from **who is preserving it**. The default narrative voice is the original storyteller's first-person “I,” including when someone else supplies recollections. A separate option deliberately selects the collector's retrospective perspective. Legacy books without this setting keep their prior attribution.

`Memory.narrator` identifies the original storyteller; `source_provider` identifies the contributor; `narrative_voice` chooses `storyteller` (default) or `collector`. The chapter-development pass receives all three fields too. Additional contributor opinions belong in optional `family_note`, which must contain an exact source excerpt, attributed to the supplied contributor. The UI and HTML export keep the note outside the chapter narration. A reconstructed telling is labeled as such; generated reading voices are not presented as an original family recording.

For **El pan que pudo traer**, all eight chapters now speak as Grandma: “my husband,” “our little girl,” and “I was praying.” English and Spanish were regenerated, including opening audio. Her grandchild's coincidence interpretation survives only in the separate family note and original source material.

## Short chapters and locally accurate illustrations

Grandma's book now has **eight chapters of 93–102 words** and eight distinct watercolor scenes. The chapter illustration manifest is `stories/lima/bread/chapter-art.json`; these chapter assets use OpenAI imagegen, with a consistent reference style. The older shared illustrations remain for historical URLs but are no longer repeated across this book's pages. The English and Spanish text and all sixteen chapter readings match the shortened edition. `chapter_length` is persisted in drafts and books; new stories default to `concise`, while `full` remains available.

The family explicitly identified **la Virgen del Carmen de la Legua, Callao, Perú**. Her name is preserved in both language editions. The framed devotional image was corrected against the [Diócesis del Callao reference](https://www.diocesisdelcallao.org/advocaciones/virgen-del-carmen-de-la-legua) and the [Carmen de la Legua devotional site](https://www.virgencarmendelalegua.com.pe/): the crowned Virgin with the crowned Niño Jesús and Carmelite vestments. Reference photographs were consulted, not bundled or claimed as our assets. Incorrect generic devotional wall pictures were removed. The source recollections retain their original wording with the family's specific clarification appended.

## Public links and complete narration

Opening a collection book updates the address bar to `?story=bread`, `?story=port`, or `?story=care`. Spanish editions use `&lang=Spanish`. The Copy story link button uses the current host; it works on the public HTTP address with a select-and-copy fallback when the secure Clipboard API is unavailable. Browser Back/Forward and reload restore the book. UUID creation also supports HTTP via `crypto.getRandomValues`.

Grandma's public links: [English](http://34.223.255.241:8888/keeper/?story=bread), [Spanish](http://34.223.255.241:8888/keeper/?story=bread&lang=Spanish). Private edits use browser-local routes and never masquerade as published collection editions; download their HTML file to share the actual edited content.

`tools/prepare_keeper_narration.py` prebuilds and validates all 64 English/Spanish readings across the four bundled books, preserving text/timing correspondence. It reuses valid prepared files, otherwise calls ElevenLabs and saves the MP3 plus alignment. `tools/prepare_keeper_lima.py` invokes it after preparing the collection, so rebuilding cannot silently leave only the opening narrated.

Both companion books now use eight short chapters, with **93–101 words per chapter**, and separate chapter-art manifests. Original image assets are reused only once within each book; newly generated scenes complete the set. The builder requires eight art entries per book, and browser checks enforce unique URLs and distinct image hashes, so the old three-image repetition cannot silently return.

Verification additions: `uv run python -m tools.check_keeper_links` checks the actual public HTTP origin, copy fallback, a fresh recipient browser, Spanish sharing, Back/Forward, local saves and private-edit isolation. `uv run python -m tools.check_keeper_audio` plays all 64 tracks and verifies English/Spanish automatic advancement with **zero narration API calls**. Collection checks now inspect all 24 short chapters and all 24 distinct chapter illustrations.


English reading defaults to **Grandma Rachel** (`0rEo3eAjssGDUCXHYENf`); Spanish defaults to **Abuela Tina** (`lZmnvfWF4ko4J7F7QDtX`). Switching editions selects the corresponding default. All eight chapters of each bundled book are prebuilt in both languages, with word timing. These are generated reading voices, not original family recordings. The demo video uses Grandma Rachel.
