from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Aluno:
    id: str
    nome: str
    email: str
    matricula: str
    curso: str
    periodo: int
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    status: str = "ativo"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "matricula": self.matricula,
            "curso": self.curso,
            "periodo": self.periodo,
            "cpf": self.cpf,
            "telefone": self.telefone or "",
            "data_nascimento": self.data_nascimento or "",
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Aluno":
        return cls(
            id=data["id"],
            nome=data["nome"],
            email=data["email"],
            matricula=data["matricula"],
            curso=data["curso"],
            periodo=int(data["periodo"]),
            cpf=data["cpf"],
            telefone=data.get("telefone"),
            data_nascimento=data.get("data_nascimento"),
            status=data.get("status", "ativo"),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
        )
