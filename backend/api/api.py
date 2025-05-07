from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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