terraform {
  backend "s3" {
    bucket  = "trustloop-terraform-state"
    key     = "infra/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
