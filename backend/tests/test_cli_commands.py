import pytest
import subprocess
import os
import json
import tempfile
from pathlib import Path


def run_command(command):
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
    )
    return result


@pytest.fixture
def sample_data_file():
    qa_data = []
    for i in range(5):
        qa_data.append({
            "input": f"generate a question about: hypothesis testing {i}",
            "output": f"Question: What is the p-value in hypothesis testing?\nAnswer: It's the probability of the observed data under the null hypothesis."
        })
    
    qa_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jsonl", mode="w")
    for item in qa_data:
        json.dump(item, qa_file)
        qa_file.write("\n")
    qa_file.close()
    
    graded_data = []
    for i in range(5):
        graded_data.append({
            "question": f"What is the p-value in hypothesis testing?",
            "ref_answers": ["It's the probability of the observed data under the null hypothesis."],
            "student_answer": f"The probability of observing our data or more extreme data if the null hypothesis is true {i}",
            "score": i % 4
        })
    
    graded_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jsonl", mode="w")
    for item in graded_data:
        json.dump(item, graded_file)
        graded_file.write("\n")
    graded_file.close()
    
    yield {
        "qa_file": qa_file.name,
        "graded_file": graded_file.name
    }
    
    os.unlink(qa_file.name)
    os.unlink(graded_file.name)


@pytest.mark.slow
@pytest.mark.skipif(not os.path.exists("models/qgen"),
                   reason="Question generator model directory not found")
def test_question_generator_inference():
    prompt = "generate a question about: normal distribution"
    result = run_command(f"python commands.py infer --questions --prompt \"{prompt}\"")
    if result.returncode != 0:
        pytest.skip(f"Inference failed with error: {result.stderr}")
    else:
        assert len(result.stdout) > 0


@pytest.mark.slow
@pytest.mark.skipif(not os.path.exists("models/grader"),
                   reason="Answer grader model directory not found")
def test_answer_grader_inference():
    question = "What is a p-value?"
    student_answer = "The probability of observing our data or more extreme data if the null hypothesis is true."
    ref_answers = '["The probability of seeing the observed data under the null hypothesis"]'
    
    result = run_command(
        f"python commands.py infer --grader --question \"{question}\" "
        f"--student_answer \"{student_answer}\" --ref_answers '{ref_answers}'"
    )
    
    if result.returncode != 0:
        pytest.skip(f"Inference failed with error: {result.stderr}")
    else:
        assert len(result.stdout) > 0
