FROM python:3.14-alpine
WORKDIR /opt/ptds
COPY web ./web
COPY gateway ./gateway
COPY deploy/TRIAL_POLICY.json ./deploy/TRIAL_POLICY.json
RUN adduser -D -u 10001 ptds && mkdir /runtime && chown ptds /runtime
USER ptds
EXPOSE 8080
CMD ["python3","-u","-m","gateway.server","--host","0.0.0.0","--port","8080","--runtime","/runtime"]
