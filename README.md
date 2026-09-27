# keeper-hackgt13

Author: Alex Picon <alexnpc@me.com>

Keeper turns spoken or written family memories into illustrated storybooks while preserving the original storyteller’s voice, source text, and family review. Includes English and Spanish editions of Grandma’s Lima and Callao story, eight distinct illustrations, and sixteen prepared ElevenLabs chapter readings.

## Run

Install [uv](https://docs.astral.sh/uv/), copy `.env.example` to `.env`, add your xAI and ElevenLabs keys, then run `./run.sh`.
Open http://localhost:8888/keeper/ or the deck at http://localhost:8888/slides/keeper/.
The prepared collection works without API keys. New story generation and translation use Grok; transcription and generated reading voices use ElevenLabs. Gemini is not currently integrated.

## Verify

`uv run python -m unittest discover -s tests -p 'test_keeper*.py'`

## Story links

`/keeper/?story=bread` opens Grandma’s story; add `&lang=Spanish` for Spanish, or use `/keeper/?demo=1` for the judge tour. Private books remain in the browser and can be exported as self-contained HTML. Narration uses clearly labeled stock AI voices, not recordings or clones of relatives.

See [app documentation](apps/keeper/README.md) and [demo script](slides/keeper/DEMO.md).

Extracted from the collaborative HackGT 13 repository. No other application or repository is required to run Keeper. Environment files and credentials are excluded from Git.
