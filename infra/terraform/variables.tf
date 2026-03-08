variable "project_name" {
  type    = string
  default = "trustloop"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "db_name" {
  type    = string
  default = "trustloop"
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}

variable "worker_cpu" {
  type    = number
  default = 512
}

variable "worker_memory" {
  type    = number
  default = 1024
}

variable "web_desired_count" {
  type    = number
  default = 1
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "worker_max_count" {
  type    = number
  default = 10
}

variable "worker_scale_out_threshold" {
  type    = number
  default = 5
}

variable "worker_scale_in_threshold" {
  type    = number
  default = 1
}

variable "node_env" {
  type    = string
  default = "production"
}

variable "public_app_url_override" {
  type    = string
  default = ""
}

variable "stytch_project_id" {
  type = string
}

variable "stytch_secret" {
  type      = string
  sensitive = true
}

variable "stytch_env" {
  type    = string
  default = "live"
}

variable "key_encryption_secret" {
  type      = string
  sensitive = true
}

variable "resend_api_key" {
  type      = string
  sensitive = true
}

variable "resend_from_email" {
  type    = string
  default = "TrustLoop <alerts@example.com>"
}

variable "dodo_payments_api_key" {
  type      = string
  sensitive = true
}

variable "dodo_payments_webhook_key" {
  type      = string
  sensitive = true
}

variable "dodo_payments_env" {
  type    = string
  default = "live_mode"
}

variable "dodo_product_id_starter" {
  type = string
}

variable "dodo_product_id_pro" {
  type = string
}

variable "dodo_product_id_enterprise" {
  type = string
}

variable "billing_automation_cron_secret" {
  type      = string
  sensitive = true
}

variable "reminder_stale_minutes" {
  type    = number
  default = 240
}
