#!/usr/bin/env bash
# Tests de base de datos (pgTAP) contra el Supabase local.
set -euo pipefail
cd "$(dirname "$0")/../.."
SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase test db
