# Jar contracts — build, test, and per-chain deployment.
# Chain suffixes (sepolia, baseSepolia, …) match the chain keys in
# indexer/ponder.config.ts, so deploys and indexing stay in sync.
#
#   make deploy-factory-sepolia       # deploy JarFactory to Sepolia
#   make create-jar-baseSepolia       # create a jar via an existing factory
#   make anvil / make seed-anvil      # local dev loop
#
# Reads contracts/.env for FOUNDRY_ACCOUNT, RPC_<chain>, JAR_* params.
# No private keys in .env — testnets sign with a Foundry keystore account
# (cast wallet import <name> --interactive); forge prompts for its password.

-include .env

# ---- Signing ----------------------------------------------------------------
# Testnets/mainnet use the keystore account. Local Anvil uses the well-known
# account[0] key (public — safe ONLY on a local node).
FOUNDRY_ACCOUNT ?= jar-deployer
ANVIL_KEY       := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

AUTH_anvil           := --private-key $(ANVIL_KEY)
AUTH_sepolia         := --account $(FOUNDRY_ACCOUNT)
AUTH_baseSepolia     := --account $(FOUNDRY_ACCOUNT)
AUTH_optimismSepolia := --account $(FOUNDRY_ACCOUNT)
AUTH_arbitrumSepolia := --account $(FOUNDRY_ACCOUNT)

# ---- Per-chain RPC endpoints (testnet URLs live in .env) --------------------
RPC_anvil := http://127.0.0.1:8545

FORGE_FLAGS := --broadcast
# Verify on Etherscan automatically when an API key is present in .env.
ifneq ($(strip $(ETHERSCAN_API_KEY)),)
FORGE_FLAGS += --verify --etherscan-api-key $(ETHERSCAN_API_KEY)
endif

.PHONY: build test fmt anvil seed-anvil help

help:
	@echo "Targets:"
	@echo "  make build / test / fmt"
	@echo "  make anvil                      # start a local node"
	@echo "  make deploy-factory-<chain>     # chain: anvil|sepolia|baseSepolia|optimismSepolia|arbitrumSepolia"
	@echo "  make create-jar-<chain>         # needs JAR_FACTORY_ADDRESS (+ JAR_NAME/JAR_TOKEN/JAR_GOAL)"
	@echo "  make seed-anvil                 # mock token + jar + deposits (local only)"

build:
	forge build

test:
	forge test

fmt:
	forge fmt

# Start a local Anvil node (run in its own terminal).
anvil:
	anvil

# ---- Deploy the factory to a chain ----------------------------------------
# Usage: make deploy-factory-sepolia
deploy-factory-%:
	@test -n "$(RPC_$*)"  || { echo "Unknown chain '$*' (no RPC_$* in .env)"; exit 1; }
	@test -n "$(AUTH_$*)" || { echo "No auth for '$*' (no AUTH_$* defined)"; exit 1; }
	forge script script/DeployJarFactory.s.sol --rpc-url $(RPC_$*) $(FORGE_FLAGS) $(AUTH_$*)

# ---- Create a jar through an already-deployed factory ----------------------
# Usage: JAR_FACTORY_ADDRESS=0x.. make create-jar-sepolia   (or set it in .env)
create-jar-%:
	@test -n "$(RPC_$*)"              || { echo "Unknown chain '$*' (no RPC_$* in .env)"; exit 1; }
	@test -n "$(AUTH_$*)"             || { echo "No auth for '$*' (no AUTH_$* defined)"; exit 1; }
	@test -n "$(JAR_FACTORY_ADDRESS)" || { echo "Set JAR_FACTORY_ADDRESS (.env or CLI)"; exit 1; }
	forge script script/DeployJar.s.sol --rpc-url $(RPC_$*) $(FORGE_FLAGS) $(AUTH_$*)

# ---- Local one-shot seed: mock token + jar + deposits + goal change --------
# Usage: JAR_FACTORY_ADDRESS=0x.. make seed-anvil
seed-anvil:
	@test -n "$(JAR_FACTORY_ADDRESS)" || { echo "Set JAR_FACTORY_ADDRESS (the local factory)"; exit 1; }
	forge script script/SeedLocal.s.sol --rpc-url $(RPC_anvil) $(FORGE_FLAGS) $(AUTH_anvil)
