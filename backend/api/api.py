from __future__ import annotations

import json
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from question_generator.infer import infer_qgen
from answer_classifier.infer import infer_classifier

from hydra import compose, initialize
from omegaconf import DictConfig

def load_config() -> DictConfig:
    with initialize(version_base=None, config_path="../conf"):
        cfg = compose(config_name="config")
    return cfg

cfg = load_config()

app = FastAPI(title="QA-Grader API", version="1.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionResponse(BaseModel):
    prompt: str
    topic: str
    context: str
    generated_question: str

class ClassifyRequest(BaseModel):
    question: str
    student_answer: str

class ClassifyResponse(BaseModel):
    question: str
    predicted_score: int

class ReviewedQuestionItem(BaseModel):
    question: Dict[str, Any]
    userAnswer: str
    evaluation: Dict[str, Any]

class ReviewSubmissionRequest(BaseModel):
    reviewed_items: List[ReviewedQuestionItem]

USER_REVIEWS_FILE = "./user_reviews.jsonl"

@app.get("/v1/generate_question", response_model=QuestionResponse)
async def generate_question(topic: str = Query(..., min_length=1)):
    prompt = f"Generate a question about: {topic}"
    result = infer_qgen(prompt, cfg=cfg)
    try:
        return QuestionResponse.model_validate(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid response: {e}")


@app.post("/v1/classify_answer", response_model=ClassifyResponse)
async def classify_answer(req: ClassifyRequest):
    result = infer_classifier(req.question, req.student_answer)
    try:
        return ClassifyResponse.model_validate(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid response: {e}")

@app.post("/v1/review_questions", status_code=201)
async def submit_review_questions(submission: ReviewSubmissionRequest = Body(...)):
    if not submission.reviewed_items:
        raise HTTPException(status_code=400, detail="No items submitted")

    try:
        with open(USER_REVIEWS_FILE, "a", encoding="utf-8") as f:
            for item in submission.reviewed_items:
                f.write(json.dumps(item.dict()) + "\n")
        return {"message": f"{len(submission.reviewed_items)} items submitted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving review: {e}")