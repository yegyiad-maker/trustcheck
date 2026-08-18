# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *


class TrustCheck(gl.Contract):
    url: str
    claim: str
    result: str

    def __init__(self):
        self.url = ""
        self.claim = ""
        self.result = ""

    def _check(self, url: str, claim: str) -> dict:

        def evaluate():
            response = gl.nondet.web.get(url)
            content = response.body.decode("utf-8")

            prompt = f"""
You are a careful fact-checking assistant.

SOURCE:
{url}

CLAIM:
{claim}

WEBPAGE CONTENT:
{content}

Determine whether the webpage provides evidence for the claim.

Return ONLY JSON in exactly this format:

{{
  "verdict": "TRUE",
  "reason": "short explanation"
}}

The verdict MUST be exactly one of:
TRUE
FALSE
UNCERTAIN

Rules:

TRUE:
The webpage clearly supports the claim.

FALSE:
The webpage clearly contradicts the claim.

UNCERTAIN:
The webpage does not contain enough reliable evidence.

Do not use outside knowledge.
Do not invent facts.
Do not add additional JSON fields.
Keep the reason short and factual.
"""

            return gl.nondet.exec_prompt(
                prompt,
                response_format="json"
            )

        return gl.eq_principle.prompt_comparative(
            evaluate,
            principle="""
All validators must agree on the verdict.

The verdict must be exactly one of:
TRUE, FALSE, UNCERTAIN.

The reason may use different wording, but it must be
consistent with the evidence found in the webpage.

If there is insufficient evidence, prefer UNCERTAIN.
"""
        )

    @gl.public.write
    def verify(self, url: str, claim: str) -> str:
        self.url = url
        self.claim = claim
        self.result = ""

        result = self._check(url, claim)

        verdict = str(result.get("verdict", "UNCERTAIN")).upper()
        reason = str(result.get("reason", "No explanation available."))

        if verdict not in ["TRUE", "FALSE", "UNCERTAIN"]:
            verdict = "UNCERTAIN"

        self.result = json.dumps(
            {
                "verdict": verdict,
                "reason": reason
            },
            sort_keys=True
        )

        return self.result

    @gl.public.view
    def get_result(self) -> str:
        return self.result
