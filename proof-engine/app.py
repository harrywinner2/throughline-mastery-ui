"""Independent Python verifier service for the Throughline geometry engine.

This optional FastAPI service exposes the Python re-implementation as an HTTP
endpoint so an external caller can verify a learner's answer against an engine
that shares no code with the TypeScript product. Correctness lives outside the
LLM, and here it lives outside the product's language entirely.
"""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from geometry import TOL, solve

app = FastAPI(title="python-proof", description="Independent geometry verifier")


class VerifyRequest(BaseModel):
    inclination: float
    parallel: bool
    relationship: str
    givenAngle: int
    askAngle: int
    answerDeg: Optional[float] = None
    givenValue: Optional[float] = None


class VerifyResponse(BaseModel):
    groundTruth: Optional[float]
    correct: bool


@app.get("/health")
def health() -> dict:
    return {"engine": "python-proof", "ok": True}


@app.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest) -> VerifyResponse:
    ground_truth = solve(
        inclination=req.inclination,
        parallel=req.parallel,
        relationship=req.relationship,
        given_angle=req.givenAngle,
        ask_angle=req.askAngle,
        given_value=req.givenValue,
    )

    if ground_truth is None:
        correct = req.answerDeg is None
    elif req.answerDeg is None:
        correct = False
    else:
        correct = abs(req.answerDeg - ground_truth) <= TOL

    return VerifyResponse(groundTruth=ground_truth, correct=correct)
