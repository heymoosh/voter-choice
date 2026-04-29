terraform {
  required_version = ">= 1.5.0"

  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = ">= 2.1.0, < 3.0.0"
    }
  }
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

resource "upstash_redis_database" "voter_choice" {
  database_name = var.database_name
  region        = var.region
  tls           = true
  eviction      = false
}

locals {
  endpoint = upstash_redis_database.voter_choice.endpoint
  rest_url = startswith(local.endpoint, "https://") ? local.endpoint : "https://${local.endpoint}"
}

output "database_id" {
  value = upstash_redis_database.voter_choice.database_id
}

output "region" {
  value = upstash_redis_database.voter_choice.region
}

output "rest_url" {
  value = local.rest_url
}

output "rest_token" {
  value     = upstash_redis_database.voter_choice.rest_token
  sensitive = true
}
