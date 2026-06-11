FROM openbao/openbao:latest

# jq for JSON parsing in the entrypoint, curl for health checks
USER root
RUN apk add --no-cache jq curl

COPY config.hcl /openbao/config/config.hcl
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
