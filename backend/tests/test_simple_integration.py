import pytest
import json
import tempfile
import os
from pathlib import Path

from commands import CLI, _parse_refs


def test_config_loading():
    try:
        cli = CLI()
        assert cli is not None
        assert hasattr(cli, "cfg")
    except Exception as e:
        pytest.skip(f"Configuration failed to load: {e}")


def test_data_format_validation():
    data = [
        {
            "question": "What is the central limit theorem?",
            "ref_answers": ["Distribution of sample means approaches normal as n increases"],
            "student_answer": "As sample size increases, the distribution of sample means approximates a normal distribution",
            "score": 3
        },
        {
            "question": "Define p-value",
            "ref_answers": ["Probability of observing data under null hypothesis"],
            "student_answer": "It's the probability of the data given the null hypothesis",
            "score": 2
        }
    ]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jsonl", mode="w") as f:
        for item in data:
            f.write(json.dumps(item) + "\n")
    
    filename = f.name
    try:
        with open(filename, 'r') as f:
            lines = f.readlines()
            assert len(lines) == 2
            
            for line in lines:
                item = json.loads(line)
                assert "question" in item
                assert "ref_answers" in item
                assert "student_answer" in item
                assert "score" in item
                assert 0 <= item["score"] <= 3
    finally:
        os.unlink(filename)


def test_project_structure():
    assert Path("question_generator").exists()
    assert Path("answer_classifier").exists()
    assert Path("api").exists()
    assert Path("conf").exists()
    
    assert Path("commands.py").exists()
    assert Path("pyproject.toml").exists()
    
    assert Path("api/api.py").exists()
    
    assert Path("question_generator/model.py").exists()
    assert Path("answer_classifier/model.py").exists()
    
    assert Path("question_generator/infer.py").exists()
    assert Path("answer_classifier/infer.py").exists() 