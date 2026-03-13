terraform {
  backend "s3" {
    bucket         = "trustloop-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "trustloop-terraform-locks"
    encrypt        = true
  }
}

# Bootstrap resources for the remote state backend.
# Run these once with local state, then migrate to the S3 backend above.
#
# aws s3api create-bucket --bucket trustloop-terraform-state --region us-east-1
# aws s3api put-bucket-versioning --bucket trustloop-terraform-state --versioning-configuration Status=Enabled
# aws s3api put-bucket-encryption --bucket trustloop-terraform-state \
#   --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'
# aws s3api put-public-access-block --bucket trustloop-terraform-state \
#   --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
# aws dynamodb create-table \
#   --table-name trustloop-terraform-locks \
#   --attribute-definitions AttributeName=LockID,AttributeType=S \
#   --key-schema AttributeName=LockID,KeyType=HASH \
#   --billing-mode PAY_PER_REQUEST \
#   --region us-east-1
