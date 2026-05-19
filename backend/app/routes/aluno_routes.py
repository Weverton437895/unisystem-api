from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional

from app.schemas.aluno_schema import (
    AlunoCreate,
    AlunoUpdate,
    AlunoResponse,
    AlunoListResponse,
    MessageResponse,
)
from app.services.aluno_service import aluno_service

router = APIRouter(prefix="/alunos", tags=["Alunos"])


@router.post(
    "/",
    response_model=AlunoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo aluno",
)
async def criar_aluno(aluno: AlunoCreate):
    try:
        novo_aluno = await aluno_service.criar_aluno(aluno)
        return AlunoResponse(**novo_aluno.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/",
    response_model=AlunoListResponse,
    summary="Listar todos os alunos",
)
async def listar_alunos(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    curso: Optional[str] = Query(None, description="Filtrar por curso"),
    busca: Optional[str] = Query(None, description="Buscar por nome, matrícula ou e-mail"),
):
    alunos = await aluno_service.listar_alunos(status=status, curso=curso, busca=busca)
    return AlunoListResponse(
        total=len(alunos),
        alunos=[AlunoResponse(**a.to_dict()) for a in alunos],
    )


@router.get(
    "/estatisticas",
    summary="Obter estatísticas dos alunos",
)
async def estatisticas():
    return await aluno_service.estatisticas()


@router.get(
    "/matricula/{matricula}",
    response_model=AlunoResponse,
    summary="Buscar aluno por matrícula",
)
async def buscar_por_matricula(matricula: str):
    aluno = await aluno_service.buscar_por_matricula(matricula)
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aluno com matrícula '{matricula}' não encontrado",
        )
    return AlunoResponse(**aluno.to_dict())


@router.get(
    "/{aluno_id}",
    response_model=AlunoResponse,
    summary="Buscar aluno por ID",
)
async def buscar_aluno(aluno_id: str):
    aluno = await aluno_service.buscar_por_id(aluno_id)
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aluno com ID '{aluno_id}' não encontrado",
        )
    return AlunoResponse(**aluno.to_dict())


@router.put(
    "/{aluno_id}",
    response_model=AlunoResponse,
    summary="Atualizar aluno",
)
async def atualizar_aluno(aluno_id: str, dados: AlunoUpdate):
    try:
        aluno = await aluno_service.atualizar_aluno(aluno_id, dados)
        if not aluno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aluno com ID '{aluno_id}' não encontrado",
            )
        return AlunoResponse(**aluno.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{aluno_id}",
    response_model=MessageResponse,
    summary="Deletar aluno",
)
async def deletar_aluno(aluno_id: str):
    deletado = await aluno_service.deletar_aluno(aluno_id)
    if not deletado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aluno com ID '{aluno_id}' não encontrado",
        )
    return MessageResponse(message="Aluno removido com sucesso", id=aluno_id)
