# Configuração do Apache Superset para o stack do Grupo Franciosi.
#
# Este arquivo é montado em /app/pythonpath/superset_config.py (lido
# automaticamente pela imagem oficial `apache/superset`).
#
# Objetivo principal: habilitar o EMBEDDING de dashboards via guest token,
# para que o painel web-admin embuta os dashboards num iframe sem login.
import os


def _split(value: str) -> list[str]:
    return [item.strip() for item in (value or "").split(",") if item.strip()]


def _bool(value: str, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


# ---------- Segurança ----------
SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]

# Atrás do Traefik (TLS terminado no proxy) — confia nos headers X-Forwarded-*.
ENABLE_PROXY_FIX = True

# ---------- Banco de metadados ----------
DATABASE_USER = os.environ.get("DATABASE_USER", "superset")
DATABASE_PASSWORD = os.environ.get("DATABASE_PASSWORD", "superset")
DATABASE_HOST = os.environ.get("DATABASE_HOST", "superset-db")
DATABASE_PORT = os.environ.get("DATABASE_PORT", "5432")
DATABASE_DB = os.environ.get("DATABASE_DB", "superset")
SQLALCHEMY_DATABASE_URI = (
    f"postgresql+psycopg2://{DATABASE_USER}:{DATABASE_PASSWORD}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

# ---------- Cache / Celery (Redis) ----------
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": REDIS_PORT,
    "CACHE_REDIS_DB": 1,
}
DATA_CACHE_CONFIG = CACHE_CONFIG
FILTER_STATE_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_REDIS_DB": 2}
EXPLORE_FORM_DATA_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_REDIS_DB": 3}


class CeleryConfig:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    result_backend = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    imports = ("superset.sql_lab",)
    worker_prefetch_multiplier = 1
    task_acks_late = False


CELERY_CONFIG = CeleryConfig

# ---------- Feature flags ----------
FEATURE_FLAGS = {
    # Permite gerar guest tokens e embutir dashboards via SDK/iframe.
    "EMBEDDED_SUPERSET": True,
    # Controle de acesso por dashboard (roles), opcional.
    "DASHBOARD_RBAC": True,
}

# ---------- Embedding / Guest token ----------
GUEST_TOKEN_JWT_SECRET = os.environ.get("SUPERSET_GUEST_TOKEN_SECRET", SECRET_KEY)
# Role aplicada ao visitante do dashboard embutido (somente leitura).
GUEST_ROLE_NAME = os.environ.get("SUPERSET_GUEST_ROLE_NAME", "Gamma")
# Tempo de vida do guest token (segundos). O painel renova sob demanda.
GUEST_TOKEN_JWT_EXP_SECONDS = int(
    os.environ.get("SUPERSET_GUEST_TOKEN_EXP_SECONDS", "300")
)

# ---------- CORS ----------
# Origens (domínios) do painel autorizadas a chamar a API e embutir dashboards.
PANEL_ORIGINS = _split(os.environ.get("PANEL_ORIGIN", "*")) or ["*"]

ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": PANEL_ORIGINS,
}

# ---------- Embedding via iframe (CSP / Talisman) ----------
# Por padrão o Superset envia X-Frame-Options: SAMEORIGIN, o que bloquearia o
# iframe. Removemos esse header e liberamos `frame-ancestors` via CSP.
# Em produção (https) os cookies do iframe cross-site exigem SameSite=None +
# Secure. Em dev local (http) defina SUPERSET_COOKIE_SECURE=false.
COOKIE_SECURE = _bool(os.environ.get("SUPERSET_COOKIE_SECURE"), True)
COOKIE_SAMESITE = os.environ.get("SUPERSET_COOKIE_SAMESITE", "None")

TALISMAN_ENABLED = True
_frame_ancestors = ["'self'", *PANEL_ORIGINS]
_connect_src = ["'self'", *PANEL_ORIGINS]
TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "worker-src": ["'self'", "blob:"],
        "connect-src": _connect_src,
        "frame-ancestors": _frame_ancestors,
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
    "content_security_policy_nonce_in": [],
    "force_https": False,
    "frame_options": None,
    "session_cookie_secure": COOKIE_SECURE,
}

# Cookies de sessão precisam funcionar dentro do iframe cross-site.
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE
SESSION_COOKIE_SECURE = COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = True

# Tempo limite das queries do webserver (segundos).
SUPERSET_WEBSERVER_TIMEOUT = int(
    os.environ.get("SUPERSET_WEBSERVER_TIMEOUT", "120")
)
