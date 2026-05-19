from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from enum import Enum


class StatusAluno(str, Enum):
    ativo = "ativo"
    inativo = "inativo"
    trancado = "trancado"
    formado = "formado"


class CursoEnum(str, Enum):
    ciencia_computacao = "Ciência da Computação"
    engenharia_software = "Engenharia de Software"
    sistemas_informacao = "Sistemas de Informação"
    engenharia_civil = "Engenharia Civil"
    administracao = "Administração"
    direito = "Direito"
    medicina = "Medicina"
    pedagogia = "Pedagogia"
    matematica = "Matemática"
    fisica = "Física"


class AlunoCreate(BaseModel):
    nome: str
    email: EmailStr
    matricula: str
    curso: str
    periodo: int
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    status: StatusAluno = StatusAluno.ativo

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v):
        if not v or not v.strip():
            raise ValueError("Nome não pode ser vazio")
        return v.strip()

    @field_validator("periodo")
    @classmethod
    def periodo_valido(cls, v):
        if v < 1 or v > 12:
            raise ValueError("Período deve estar entre 1 e 12")
        return v

    @field_validator("matricula")
    @classmethod
    def matricula_valida(cls, v):
        if not v or not v.strip():
            raise ValueError("Matrícula não pode ser vazia")
        return v.strip().upper()


class AlunoUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    curso: Optional[str] = None
    periodo: Optional[int] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    status: Optional[StatusAluno] = None

    @field_validator("periodo")
    @classmethod
    def periodo_valido(cls, v):
        if v is not None and (v < 1 or v > 12):
            raise ValueError("Período deve estar entre 1 e 12")
        return v


class AlunoResponse(BaseModel):
    id: str
    nome: str
    email: str
    matricula: str
    curso: str
    periodo: int
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AlunoListResponse(BaseModel):
    total: int
    alunos: list[AlunoResponse]


class MessageResponse(BaseModel):
    message: str
    id: Optional[str] = None
