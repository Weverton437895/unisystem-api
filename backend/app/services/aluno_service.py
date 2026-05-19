import uuid
from datetime import datetime
from typing import Optional

from app.database.redis_db import get_redis
from app.models.aluno_model import Aluno
from app.schemas.aluno_schema import AlunoCreate, AlunoUpdate
from app.utils.validators import validar_cpf, formatar_cpf, formatar_telefone

ALUNO_KEY_PREFIX = "aluno:"
ALUNO_SET_KEY = "alunos:todos"
MATRICULA_INDEX = "index:matricula:"
EMAIL_INDEX = "index:email:"
CPF_INDEX = "index:cpf:"


class AlunoService:

    async def criar_aluno(self, data: AlunoCreate) -> Aluno:
        r = get_redis()

        cpf_limpo = "".join(filter(str.isdigit, data.cpf))
        if not validar_cpf(cpf_limpo):
            raise ValueError("CPF inválido")

        if await r.exists(MATRICULA_INDEX + data.matricula):
            raise ValueError(f"Matrícula '{data.matricula}' já cadastrada")

        if await r.exists(EMAIL_INDEX + data.email.lower()):
            raise ValueError(f"E-mail '{data.email}' já cadastrado")

        if await r.exists(CPF_INDEX + cpf_limpo):
            raise ValueError(f"CPF já cadastrado")

        aluno_id = str(uuid.uuid4())
        agora = datetime.now().isoformat()

        aluno = Aluno(
            id=aluno_id,
            nome=data.nome,
            email=data.email.lower(),
            matricula=data.matricula,
            curso=data.curso,
            periodo=data.periodo,
            cpf=formatar_cpf(cpf_limpo),
            telefone=formatar_telefone(data.telefone) if data.telefone else None,
            data_nascimento=data.data_nascimento,
            status=data.status.value,
            created_at=agora,
            updated_at=agora,
        )

        pipe = r.pipeline()
        aluno_dict = aluno.to_dict()
        for k, v in aluno_dict.items():
            pipe.hset(ALUNO_KEY_PREFIX + aluno_id, k, v)
        pipe.sadd(ALUNO_SET_KEY, aluno_id)
        pipe.set(MATRICULA_INDEX + data.matricula, aluno_id)
        pipe.set(EMAIL_INDEX + data.email.lower(), aluno_id)
        pipe.set(CPF_INDEX + cpf_limpo, aluno_id)
        await pipe.execute()

        return aluno

    async def listar_alunos(
        self,
        status: Optional[str] = None,
        curso: Optional[str] = None,
        busca: Optional[str] = None,
    ) -> list[Aluno]:
        r = get_redis()

        aluno_ids = await r.smembers(ALUNO_SET_KEY)
        if not aluno_ids:
            return []

        alunos = []
        for aluno_id in aluno_ids:
            data = await r.hgetall(ALUNO_KEY_PREFIX + aluno_id)
            if data:
                aluno = Aluno.from_dict(data)

                if status and aluno.status != status:
                    continue
                if curso and aluno.curso != curso:
                    continue
                if busca:
                    busca_lower = busca.lower()
                    if not (
                        busca_lower in aluno.nome.lower()
                        or busca_lower in aluno.matricula.lower()
                        or busca_lower in aluno.email.lower()
                    ):
                        continue

                alunos.append(aluno)

        alunos.sort(key=lambda a: a.nome)
        return alunos

    async def buscar_por_id(self, aluno_id: str) -> Optional[Aluno]:
        r = get_redis()
        data = await r.hgetall(ALUNO_KEY_PREFIX + aluno_id)
        if not data:
            return None
        return Aluno.from_dict(data)

    async def buscar_por_matricula(self, matricula: str) -> Optional[Aluno]:
        r = get_redis()
        aluno_id = await r.get(MATRICULA_INDEX + matricula.upper())
        if not aluno_id:
            return None
        return await self.buscar_por_id(aluno_id)

    async def atualizar_aluno(self, aluno_id: str, data: AlunoUpdate) -> Optional[Aluno]:
        r = get_redis()

        aluno = await self.buscar_por_id(aluno_id)
        if not aluno:
            return None

        updates = data.model_dump(exclude_none=True)
        if not updates:
            return aluno

        if "email" in updates:
            email_novo = updates["email"].lower()
            email_existente_id = await r.get(EMAIL_INDEX + email_novo)
            if email_existente_id and email_existente_id != aluno_id:
                raise ValueError(f"E-mail '{email_novo}' já está em uso")
            await r.delete(EMAIL_INDEX + aluno.email)
            await r.set(EMAIL_INDEX + email_novo, aluno_id)
            updates["email"] = email_novo

        if "telefone" in updates and updates["telefone"]:
            updates["telefone"] = formatar_telefone(updates["telefone"])

        if "status" in updates and hasattr(updates["status"], "value"):
            updates["status"] = updates["status"].value

        updates["updated_at"] = datetime.now().isoformat()

        for k, v in updates.items():
            await r.hset(ALUNO_KEY_PREFIX + aluno_id, k, v)
        return await self.buscar_por_id(aluno_id)

    async def deletar_aluno(self, aluno_id: str) -> bool:
        r = get_redis()

        aluno = await self.buscar_por_id(aluno_id)
        if not aluno:
            return False

        cpf_limpo = "".join(filter(str.isdigit, aluno.cpf))

        pipe = r.pipeline()
        pipe.delete(ALUNO_KEY_PREFIX + aluno_id)
        pipe.srem(ALUNO_SET_KEY, aluno_id)
        pipe.delete(MATRICULA_INDEX + aluno.matricula)
        pipe.delete(EMAIL_INDEX + aluno.email)
        pipe.delete(CPF_INDEX + cpf_limpo)
        await pipe.execute()

        return True

    async def estatisticas(self) -> dict:
        r = get_redis()
        alunos = await self.listar_alunos()

        total = len(alunos)
        por_status = {}
        por_curso = {}

        for aluno in alunos:
            por_status[aluno.status] = por_status.get(aluno.status, 0) + 1
            por_curso[aluno.curso] = por_curso.get(aluno.curso, 0) + 1

        return {
            "total_alunos": total,
            "por_status": por_status,
            "por_curso": por_curso,
        }


aluno_service = AlunoService()