from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.redis_db import init_redis, close_redis
from app.routes.aluno_routes import router as aluno_router
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    await close_redis()


app = FastAPI(
    title="Sistema Universidade API",
    description="API de gerenciamento de alunos universitários",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aluno_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {"status": "online", "message": "Sistema Universidade API está rodando"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
