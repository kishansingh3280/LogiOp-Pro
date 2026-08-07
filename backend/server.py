from fastapi import FastAPI, APIRouter, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Remote backend the Expo mobile app actually talks to. The FastAPI service
# here is only a light-weight proxy so the deployment context matches the
# `/api/*` contract expected by the mobile client. All business logic lives
# on the remote host. The URL MUST come from environment configuration.
REMOTE_BACKEND_URL = os.environ.get("REMOTE_BACKEND_URL", "").rstrip("/")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Shared async client for proxy calls (reused for connection pooling)
_HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
    "host",
}
_proxy_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup_proxy_client():
    global _proxy_client
    _proxy_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    global _proxy_client
    if _proxy_client is not None:
        await _proxy_client.aclose()


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
async def proxy_to_remote_backend(path: str, request: Request):
    """Catch-all proxy that forwards any unhandled `/api/*` request to the
    remote backend the Expo app is actually configured to hit. This keeps the
    deployment container's `/api/*` contract in sync with the mobile client
    without duplicating business logic locally.
    """
    if not REMOTE_BACKEND_URL:
        logger.error("REMOTE_BACKEND_URL is not configured; cannot proxy %s", path)
        return Response(
            content=b'{"detail":"Backend not configured"}',
            status_code=503,
            media_type="application/json",
        )
    target_url = f"{REMOTE_BACKEND_URL}/api/{path}"
    fwd_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    body = await request.body()

    try:
        resp = await _proxy_client.request(
            request.method,
            target_url,
            params=request.query_params,
            headers=fwd_headers,
            content=body,
        )
    except httpx.RequestError as exc:
        logger.warning("Upstream proxy failure for %s: %s", target_url, exc)
        return Response(
            content=b'{"detail":"Upstream backend unreachable"}',
            status_code=502,
            media_type="application/json",
        )

    resp_headers = {
        k: v for k, v in resp.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp_headers,
        media_type=resp.headers.get("content-type"),
    )
