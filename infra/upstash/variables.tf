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

variable "primary_region" {
  description = "Primary Upstash Redis Global region. N. California is the launch default selected by the project owner."
  type        = string
  default     = "us-west-1"
}

variable "read_regions" {
  description = "Optional Upstash Redis Global read regions. Keep empty for launch to avoid extra cost/complexity."
  type        = set(string)
  default     = []
}
