variable "upstash_email" {
  description = "Email address for the Upstash account."
  type        = string
  sensitive   = true
}

variable "upstash_api_key" {
  description = "Upstash API key with permission to manage Redis databases."
  type        = string
  sensitive   = true
}

variable "database_name" {
  description = "Name for the Voter Choice durable safeguards Redis database."
  type        = string
  default     = "voter-choice-launch-safeguards"
}

variable "region" {
  description = "Primary Upstash Redis region. N. California is the launch default selected by the project owner."
  type        = string
  default     = "us-west-1"
}
