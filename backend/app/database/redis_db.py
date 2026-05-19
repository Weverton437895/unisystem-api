import redis.asyncio as redis
import os
from dotenv import load_dotenv

load_dotenv()

redis_client: redis.Redis = None


async def init_redis():
    global redis_client
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD", None),
        db=int(os.getenv("REDIS_DB", 0)),
        decode_responses=True,
    )
    await redis_client.ping()
    print("✅ Conectado ao Redis com sucesso!")


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        print("🔌 Conexão Redis encerrada.")


def get_redis() -> redis.Redis:
    return redis_client
