#!/bin/sh
# Auto-initialises and auto-unseals OpenBao on every container start.
# On first run it prints the root token — copy it into your .env file.
# On subsequent runs it reads the saved unseal key and unseals automatically.
set -e

VAULT_ADDR="http://127.0.0.1:8200"
INIT_FILE="/openbao/data/.vault-init"
APP_TOKEN="${OPENBAO_TOKEN:-evidence-service-token}"

# ── Start OpenBao in the background ─────────────────────────────────────────
bao server -config=/openbao/config/config.hcl &
BAO_PID=$!

echo "[openbao-init] Waiting for OpenBao to start..."
for i in $(seq 1 30); do
    curl -sf "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1 && break
    sleep 2
done

# ── Check initialized / sealed state ────────────────────────────────────────
HEALTH=$(curl -sf "$VAULT_ADDR/v1/sys/health" 2>/dev/null || \
         curl -sf "$VAULT_ADDR/v1/sys/health" --max-time 5 2>/dev/null || \
         echo '{"initialized":false,"sealed":true}')

INITIALIZED=$(echo "$HEALTH" | jq -r '.initialized // false')
SEALED=$(echo "$HEALTH" | jq -r '.sealed // true')

# ── First run: initialize ────────────────────────────────────────────────────
if [ "$INITIALIZED" = "false" ]; then
    echo "[openbao-init] First start — initializing OpenBao..."

    INIT=$(curl -sf -X POST \
        -H "Content-Type: application/json" \
        -d '{"secret_shares":1,"secret_threshold":1}' \
        "$VAULT_ADDR/v1/sys/init")

    echo "$INIT" > "$INIT_FILE"
    chmod 600 "$INIT_FILE"

    UNSEAL_KEY=$(echo "$INIT" | jq -r '.keys[0]')
    ROOT_TOKEN=$(echo "$INIT" | jq -r '.root_token')

    # Unseal
    curl -sf -X PUT \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$UNSEAL_KEY\"}" \
        "$VAULT_ADDR/v1/sys/unseal" > /dev/null

    # Enable KV v2 at secret/
    curl -sf -X POST \
        -H "X-Vault-Token: $ROOT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"type":"kv","options":{"version":"2"}}' \
        "$VAULT_ADDR/v1/sys/mounts/secret" > /dev/null 2>&1 || true

    # Create a long-lived service token with the known ID so the api and
    # integrity_checker can authenticate without any manual step.
    curl -sf -X POST \
        -H "X-Vault-Token: $ROOT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$APP_TOKEN\",\"policies\":[\"root\"],\"ttl\":\"\"}" \
        "$VAULT_ADDR/v1/auth/token/create" > /dev/null 2>&1 || true

    echo ""
    echo "========================================================"
    echo " OpenBao initialised — first run only"
    echo "========================================================"
    echo " Root Token  : $ROOT_TOKEN"
    echo " Unseal Key  : $UNSEAL_KEY"
    echo " Service Token (OPENBAO_TOKEN) : $APP_TOKEN"
    echo ""
    echo " The init data is saved in the openbao_data volume at"
    echo " $INIT_FILE for automatic unsealing on restarts."
    echo ""
    echo " If you need to use the root token directly, update"
    echo " OPENBAO_TOKEN in docker-compose.yml or a .env file."
    echo "========================================================"
    echo ""

# ── Subsequent runs: unseal if sealed ───────────────────────────────────────
elif [ "$SEALED" = "true" ]; then
    echo "[openbao-init] Sealed — reading unseal key from $INIT_FILE..."
    if [ ! -f "$INIT_FILE" ]; then
        echo "[openbao-init] ERROR: init file not found. Cannot auto-unseal."
        kill "$BAO_PID"
        exit 1
    fi
    UNSEAL_KEY=$(jq -r '.keys[0]' "$INIT_FILE")
    curl -sf -X PUT \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$UNSEAL_KEY\"}" \
        "$VAULT_ADDR/v1/sys/unseal" > /dev/null
    echo "[openbao-init] Unsealed successfully."

else
    echo "[openbao-init] Already initialised and unsealed."
fi

echo "[openbao-init] OpenBao is ready."
wait "$BAO_PID"
