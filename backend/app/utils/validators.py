import re


def validar_cpf(cpf: str) -> bool:
    """Valida CPF brasileiro (apenas dígitos, 11 caracteres)."""
    cpf = "".join(filter(str.isdigit, cpf))

    if len(cpf) != 11:
        return False

    if cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    if resto != int(cpf[9]):
        return False

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    if resto != int(cpf[10]):
        return False

    return True


def formatar_cpf(cpf: str) -> str:
    """Formata CPF para XXX.XXX.XXX-XX."""
    cpf = "".join(filter(str.isdigit, cpf))
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf


def formatar_telefone(telefone: str) -> str:
    """Formata telefone brasileiro."""
    tel = "".join(filter(str.isdigit, telefone))
    if len(tel) == 11:
        return f"({tel[:2]}) {tel[2:7]}-{tel[7:]}"
    elif len(tel) == 10:
        return f"({tel[:2]}) {tel[2:6]}-{tel[6:]}"
    return telefone


def validar_email(email: str) -> bool:
    """Valida formato básico de e-mail."""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validar_matricula(matricula: str) -> bool:
    """Valida que matrícula não está vazia."""
    return bool(matricula and matricula.strip())
