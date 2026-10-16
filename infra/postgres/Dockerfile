FROM postgres:17-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-server-dev-17 \
    curl \
    ca-certificates \
    lz4 \
    daemontools \
  && rm -rf /var/lib/apt/lists/*

# Build pg_bigm extension from official release (ghim phiên bản)
RUN curl -L -o pg_bigm.tar.gz https://github.com/pgbigm/pg_bigm/archive/refs/tags/v1.2-20240606.tar.gz \
  && mkdir pg_bigm \
  && tar -xzf pg_bigm.tar.gz -C pg_bigm --strip-components=1 \
  && cd pg_bigm \
  && make USE_PGXS=1 \
  && make USE_PGXS=1 install \
  && cd .. \
  && rm -rf pg_bigm pg_bigm.tar.gz

# Install WAL-G for PostgreSQL PITR backup per T1.8.6 & B3 (pinned version)
ARG WALG_VERSION=v3.0.3
ARG WALG_ARCH=ubuntu-20.04-amd64
RUN curl -L -o wal-g.tar.gz "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-${WALG_ARCH}.tar.gz" \
  && tar -xzf wal-g.tar.gz \
  && mv wal-g-pg-* /usr/local/bin/wal-g \
  && chmod +x /usr/local/bin/wal-g \
  && /usr/local/bin/wal-g --version \
  && rm -f wal-g.tar.gz

# Profile configuration files (A12)
COPY postgresql.small.conf /etc/postgresql/postgresql.small.conf
COPY postgresql.large.conf /etc/postgresql/postgresql.large.conf
COPY postgresql.small.conf /etc/postgresql/postgresql.conf

# Healthcheck
HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
