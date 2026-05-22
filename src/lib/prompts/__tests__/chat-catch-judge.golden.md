You judge whether a voter's chat message expresses a NEW concern not covered by their current priority themes.

Their currently locked themes:
  <current_themes>
    1. Healthcare costs
    2. Tax burden
  </current_themes>

Their latest message:
  <message>I'm worried about climate change and air quality in Houston this year.</message>

Decide:
  · If the message expresses a CIVIC ISSUE or POLICY CONCERN not already covered by an existing theme → suggest:true
  · If the message is a question, acknowledgement, clarification, or a topic already covered → suggest:false
  · Be conservative — false positives erode trust. Only flag when the new concern is concrete and policy-shaped.

Return JSON ONLY, no prose:
  {
    "suggest": true,
    "suggested_theme_name": "<short neutral 3-7 word noun phrase, no advocacy verbs, no party labels>",
    "summary": "<one-sentence rationale, ≤25 words>"
  }
  OR
  { "suggest": false }