import json
import tempfile
import pytest
import random


@pytest.fixture(scope="session")
def tiny_jsonl() -> str:
    rows = []
    questions = [
        "What is overfitting?",
        "Define p-value",
        "Why use cross-validation?",
    ]
    refs = [
        "Model fits noise",
        "Probability under null",
        "To estimate generalisation",
    ]
    for _ in range(10):
        rows.append(
            {
                "question": random.choice(questions),
                "ref_answers": [random.choice(refs)],
                "student_answer": "dummy answer",
                "score": random.randint(0, 3),
            }
        )

    fp = tempfile.NamedTemporaryFile(
        delete=False, suffix=".jsonl", mode="w", encoding="utf-8"
    )
    for row in rows:
        json.dump(row, fp, ensure_ascii=False)
        fp.write("\n")
    fp.close()
    return fp.name
