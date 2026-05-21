export interface ThemeExtractionInput {
  userInput: string;
}

export function buildThemeExtractionPrompt(
  input: ThemeExtractionInput,
): string {
  return `You extract civic themes from a voter's own words.

The user just wrote a free-form message about what they care about
politically. Return a JSON array of 1–5 themes. Each theme:

  "name":   a short neutral noun phrase (3–7 words).
            No advocacy verbs ("fight against", "stand up for").
            No party labels.
  "quotes": 1–2 short verbatim phrases from the user's message
            that grounded this theme. Use their EXACT words.

Rules:
  · Don't pad to a fixed count. One thing, one theme.
  · Don't generalize. "ICE detention near my kid's school" stays
    specific. Don't collapse it to "Immigration."
  · Order doesn't matter — the user will rerank in the UI.
  · No prose. Return JSON only.

<user_message>
${input.userInput}
</user_message>`;
}
