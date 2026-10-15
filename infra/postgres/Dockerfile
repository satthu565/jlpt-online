FROM postgres:17-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-server-dev-17 \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Build pg_bigm extension from official release
RUN curl -L -o pg_bigm.tar.gz https://github.com/pgbigm/pg_bigm/archive/refs/tags/v1.2-20240606.tar.gz \
  && mkdir pg_bigm \
  && tar -xzf pg_bigm.tar.gz -C pg_bigm --strip-components=1 \
  && cd pg_bigm \
  && make USE_PGXS=1 \
  && make USE_PGXS=1 install \
  && cd .. \
  && rm -rf pg_bigm pg_bigm.tar.gz

COPY postgresql.small.conf /etc/postgresql/postgresql.conf
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
