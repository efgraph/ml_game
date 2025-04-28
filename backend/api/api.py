from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from question_generator.infer import infer_qgen
from answer_classifier.infer import infer_classifier

app = FastAPI(title="QA-Grader API", version="1.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionResponse(BaseModel):
    question: str


class ClassifyRequest(BaseModel):
    question: str
    student_answer: str
    ref_answers: List[str]
    checkpoint: Optional[str] = None


class ClassifyResponse(BaseModel):
    predicted_score: int
    probabilities: List[float]
    checkpoint_used: str


@app.get("/v1/generate_question", response_model=QuestionResponse)
async def generate_question(topic: str = Query(..., min_length=1)):
    prompt = f"Generate a question about: {topic}"
    result = infer_qgen(prompt)
    if isinstance(result, str):
        return {"question": result}
    if isinstance(result, dict) and "question" in result:
        return {"question": result["question"]}
    return {"question": str(result)}


@app.post("/v1/classify_answer", response_model=ClassifyResponse)
async def classify_answer(req: ClassifyRequest):
    result = infer_classifier(req.question, req.student_answer, req.ref_answers, req.checkpoint)
    return ClassifyResponse(**result)
