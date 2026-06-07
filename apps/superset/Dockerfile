# Imagem do Superset com o driver de Postgres (psycopg2), ausente na imagem
# oficial. Necessário porque o banco de metadados do Superset é Postgres.
ARG SUPERSET_VERSION=4.1.1
FROM apache/superset:${SUPERSET_VERSION}

USER root
# psycopg2-binary: driver Postgres (metadado). flask-cors: exigido por
# ENABLE_CORS no superset_config.py (embedding).
RUN pip install --no-cache-dir psycopg2-binary flask-cors
USER superset
