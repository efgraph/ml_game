import json, re, time
from typing import List, Tuple
from openai import OpenAI, RateLimitError, APIError
from omegaconf import DictConfig


def _first_list(obj):
    for v in obj.values():
        if isinstance(v, list):
            return v
    return []


def generate_qa_pairs_for_topic(topic: str, client: OpenAI, cfg: DictConfig, log_prompts: bool = False,) -> List[dict]:
    sys_msg = "You are a data API. Return valid JSON only."
    usr_msg = (
        f'Generate short and interesting {cfg.pairs_per_topic} question–answer sets about "{topic}".\n'
        f'No numeric calculations, no formulas, no symbols like +, −, ×, ÷, =.\n'
        f'Return a JSON array; each item must be\n'
        f'Generate the type of a question, e.g. definition, general, application, importance, comparison, explanation etc.\n'
        f'Each generated question must have a unique type. Must be no duplicated types. \n'
        f'{{"question": "...", "answers": ["answer1", "answer2"], "type": "..."}}.'
    )
    for attempt in range(cfg.max_retries):
        try:
            rsp = client.chat.completions.create(
                model=cfg.model_name,
                temperature=cfg.temperature,
                messages=[{"role": "system", "content": sys_msg},
                          {"role": "user",   "content": usr_msg}],
                response_format={"type": "json_object"},
            )
            content = rsp.choices[0].message.content

            if log_prompts:
                print("----- request -----")
                print(usr_msg)
                print("----- response ----")
                print(content)
                print("-------------------")

            obj = json.loads(content)
            if isinstance(obj, list):
                return obj
            if isinstance(obj, dict):
                if isinstance(obj.get("data"), list):
                    return obj["data"]
                return _first_list(obj)
        except (RateLimitError, APIError):
            time.sleep((2 ** attempt) * cfg.rate_delay_seconds)
        time.sleep(2 ** attempt)
    return []


_SYSTEM_PROMPT_GRADING = """You are an expert statistics instructor.
Produce short student answers at 4 rubric levels:

Score 3 – fully correct, ≤15 words
Score 2 – partly correct
Score 1 – vague/off-topic
Score 0 – wrong

Return exactly 2 answers for each score:

3) ...
3) ...
2) ...
2) ...
1) ...
1) ...
0) ...
0) ...
"""


def generate_graded_answers(
    question: str,
    gold_answers: List[str],
    client: OpenAI,
    cfg: DictConfig,
    log_prompts: bool = False,
) -> List[Tuple[str, int]]:
    gold = gold_answers[0]
    prompt = f"Question: {question}\nCorrect answer: {gold}"

    for attempt in range(cfg.max_retries):
        try:
            rsp = client.chat.completions.create(
                model=cfg.model_name,
                temperature=cfg.temperature,
                messages=[{"role": "system", "content": _SYSTEM_PROMPT_GRADING},
                          {"role": "user",   "content": prompt}],
            )
            raw = rsp.choices[0].message.content.strip()
            out = []
            if log_prompts:
                print("╭─PROMPT────────────────────────")
                print(prompt)
                print("╭─RESPONSE──────────────────────")
                print(raw)
                print("╰───────────────────────────────")
            for ln in raw.splitlines():
                m = re.match(r"^([0-3])\)\s*(.+)$", ln.strip())
                if m:
                    out.append((m.group(2).strip(), int(m.group(1))))
            return out[:12]
        except (RateLimitError, APIError):
            time.sleep((2 ** attempt) * cfg.rate_delay_seconds)
    return []


def generate_context_for_topic(topic: str, client: OpenAI, cfg: DictConfig, log_prompts: bool = False) -> str:
    system_prompt = "You are a helpful educational assistant. Return valid JSON only."

    user_prompt = (
        f"Write a clear and informative paragraph explaining the concept of \"{topic}\" in statistics.\n"
        f"Include its definition, how it is calculated, when it is used, and its limitations.\n"
        f"Do not use any mathematical symbols, formulas, or equations. Use simple language.\n"
        f"Do not use word statistics in the answer.\n"
        f"Return your answer as a JSON object in the format:\n"
        f'{{"topic": "{topic}", "context": "your explanation here"}}'
    )

    for attempt in range(cfg.max_retries):
        try:
            rsp = client.chat.completions.create(
                model=cfg.model_name,
                temperature=cfg.temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
            )
            content = rsp.choices[0].message.content.strip()

            if log_prompts:
                print("----- context prompt -----")
                print(user_prompt)
                print("----- response -----")
                print(content)
                print("--------------------------")

            obj = json.loads(content)
            return obj.get("context", "")
        except (RateLimitError, APIError, json.JSONDecodeError):
            time.sleep((2 ** attempt) * cfg.rate_delay_seconds)

    return ""
