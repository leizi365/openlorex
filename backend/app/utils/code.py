from nanoid import generate as nanoid_generate


def new_public_code(prefix: str = "") -> str:
    """对外暴露的业务 code，不暴露自增 id。"""
    token = nanoid_generate(size=16)
    return f"{prefix}{token}" if prefix else token
