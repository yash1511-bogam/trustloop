data "aws_secretsmanager_secret" "app" {
  name = "${var.project_name}/production"
}

data "aws_secretsmanager_secret_version" "app" {
  secret_id = data.aws_secretsmanager_secret.app.id
}

locals {
  name        = var.project_name
  has_https   = var.acm_certificate_arn != ""
  app_secrets = jsondecode(data.aws_secretsmanager_secret_version.app.secret_string)

  app_url = var.public_app_url_override != "" ? var.public_app_url_override : (
    var.acm_certificate_arn != "" ? "https://${aws_lb.app.dns_name}" : "http://${aws_lb.app.dns_name}"
  )

  common_env = [
    { name = "NODE_ENV", value = "production" },
    { name = "LOG_MODE", value = "console" },
    { name = "NEXT_PUBLIC_APP_URL", value = local.app_url },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_ACCOUNT_ID", value = data.aws_caller_identity.current.account_id },
    { name = "REMINDER_QUEUE_NAME", value = aws_sqs_queue.reminder.name },
    { name = "REMINDER_QUEUE_URL", value = aws_sqs_queue.reminder.url },
    { name = "REMINDER_STALE_MINUTES", value = "240" },
  ]

  secret_keys = [
    "AI_KEY_HEALTH_CRON_SECRET",
    "BILLING_AUTOMATION_CRON_SECRET",
    "DATABASE_URL",
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_ENV",
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "DODO_PRODUCT_ID_ENTERPRISE",
    "DODO_PRODUCT_ID_PRO",
    "DODO_PRODUCT_ID_STARTER",
    "KEY_ENCRYPTION_SECRET",
    "REDIS_URL",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "STYTCH_ENV",
    "STYTCH_OTP_EXPIRATION_MINUTES",
    "STYTCH_PROJECT_DOMAIN",
    "STYTCH_PROJECT_ID",
    "STYTCH_PROJECT_SLUG",
    "STYTCH_PUBLIC_TOKEN",
    "STYTCH_SECRET",
    "STYTCH_SESSION_DURATION_MINUTES",
    "STYTCH_OAUTH_START_MODE",
    "TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "NEXT_PUBLIC_ROOT_DOMAIN",
  ]

  secret_env = [
    for key in local.secret_keys : {
      name      = key
      valueFrom = "${data.aws_secretsmanager_secret.app.arn}:${key}::"
    }
  ]

  web_image_uri    = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
  worker_image_uri = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
}

# ─── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name}-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 2)
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name}-public-b" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 11)
  availability_zone = data.aws_availability_zones.available.names[0]
  tags              = { Name = "${local.name}-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 12)
  availability_zone = data.aws_availability_zones.available.names[1]
  tags              = { Name = "${local.name}-private-b" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${local.name}-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  depends_on    = [aws_internet_gateway.igw]
  tags          = { Name = "${local.name}-nat" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-private-rt" }
}

resource "aws_route" "private_default" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# ─── Security Groups ─────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "ALB ingress"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name        = "${local.name}-ecs-sg"
  description = "ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ─── SQS / ECR / CloudWatch ──────────────────────────────────────────────────

resource "aws_sqs_queue" "reminder_dlq" {
  name                      = "${local.name}-incident-reminders-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "reminder" {
  name                       = "${local.name}-incident-reminders"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.reminder_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_ecr_repository" "app" {
  name                 = local.name
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = 30
}

# ─── IAM ──────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_default" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${local.name}-ecs-execution-secrets"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = [data.aws_secretsmanager_secret.app.arn] }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "task_queue_access" {
  name = "${local.name}-task-queue-policy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl", "sqs:SendMessage", "sqs:CreateQueue"]
      Resource = [aws_sqs_queue.reminder.arn, aws_sqs_queue.reminder_dlq.arn]
    }]
  })
}

# ─── ALB ──────────────────────────────────────────────────────────────────────

resource "aws_lb" "app" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

resource "aws_lb_target_group" "web" {
  name        = "${local.name}-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/login"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

resource "aws_lb_listener" "http" {
  count             = var.acm_certificate_arn == "" ? 1 : 0
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# ─── ECS ──────────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${local.name}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.web_cpu)
  memory                   = tostring(var.web_memory)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name         = "trustloop-web"
    image        = local.web_image_uri
    essential    = true
    portMappings = [{ containerPort = 3000, hostPort = 3000, protocol = "tcp" }]
    environment  = local.common_env
    secrets      = local.secret_env
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "web"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.worker_cpu)
  memory                   = tostring(var.worker_memory)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name        = "trustloop-worker"
    image       = local.worker_image_uri
    essential   = true
    command     = ["node", "worker.js"]
    environment = local.common_env
    secrets     = local.secret_env
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "worker"
      }
    }
  }])
}

resource "aws_ecs_service" "web" {
  name            = "${local.name}-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.web_desired_count
  launch_type     = "FARGATE"

  force_new_deployment = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "trustloop-web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http, aws_lb_listener.http_redirect, aws_lb_listener.https]
}

resource "aws_ecs_service" "worker" {
  name            = "${local.name}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  force_new_deployment = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
}

# ─── Worker Auto-Scaling ─────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "worker" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = 1
  max_capacity       = var.worker_max_count
}

resource "aws_appautoscaling_policy" "worker_scale_out" {
  name               = "${local.name}-worker-scale-out"
  policy_type        = "StepScaling"
  service_namespace  = aws_appautoscaling_target.worker.service_namespace
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      scaling_adjustment          = 1
    }
  }
}

resource "aws_appautoscaling_policy" "worker_scale_in" {
  name               = "${local.name}-worker-scale-in"
  policy_type        = "StepScaling"
  service_namespace  = aws_appautoscaling_target.worker.service_namespace
  resource_id        = aws_appautoscaling_target.worker.resource_id
  scalable_dimension = aws_appautoscaling_target.worker.scalable_dimension

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 120
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "worker_scale_out" {
  alarm_name          = "${local.name}-worker-scale-out"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = var.worker_scale_out_threshold
  dimensions          = { QueueName = aws_sqs_queue.reminder.name }
  alarm_actions       = [aws_appautoscaling_policy.worker_scale_out.arn]
}

resource "aws_cloudwatch_metric_alarm" "worker_scale_in" {
  alarm_name          = "${local.name}-worker-scale-in"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = var.worker_scale_in_threshold
  dimensions          = { QueueName = aws_sqs_queue.reminder.name }
  alarm_actions       = [aws_appautoscaling_policy.worker_scale_in.arn]
}

resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${local.name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  dimensions          = { QueueName = aws_sqs_queue.reminder_dlq.name }
  alarm_description   = "Messages in DLQ indicate repeated processing failures"
}

# ─── EventBridge Cron Automation (requires HTTPS / ACM cert) ──────────────────

resource "aws_iam_role" "eventbridge_api_destination" {
  count = local.has_https ? 1 : 0
  name  = "${local.name}-eventbridge-api-dest-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "events.amazonaws.com" } }]
  })
}

resource "aws_cloudwatch_event_connection" "automation_ai_key_health" {
  count              = local.has_https ? 1 : 0
  name               = "${local.name}-ai-key-health"
  authorization_type = "API_KEY"
  auth_parameters {
    api_key {
      key   = "x-cron-secret"
      value = local.app_secrets["AI_KEY_HEALTH_CRON_SECRET"]
    }
  }
}

resource "aws_cloudwatch_event_connection" "automation_billing_grace" {
  count              = local.has_https ? 1 : 0
  name               = "${local.name}-billing-grace"
  authorization_type = "API_KEY"
  auth_parameters {
    api_key {
      key   = "x-cron-secret"
      value = local.app_secrets["BILLING_AUTOMATION_CRON_SECRET"]
    }
  }
}

resource "aws_cloudwatch_event_connection" "automation_enqueue_reminders" {
  count              = local.has_https ? 1 : 0
  name               = "${local.name}-enqueue-reminders"
  authorization_type = "API_KEY"
  auth_parameters {
    api_key {
      key   = "x-cron-secret"
      value = local.app_secrets["REMINDER_ENQUEUE_CRON_SECRET"]
    }
  }
}

resource "aws_cloudwatch_event_api_destination" "ai_key_health" {
  count                            = local.has_https ? 1 : 0
  name                             = "${local.name}-ai-key-health"
  connection_arn                   = aws_cloudwatch_event_connection.automation_ai_key_health[0].arn
  invocation_endpoint              = "${local.app_url}/api/automation/verify-ai-keys"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 1
}

resource "aws_cloudwatch_event_api_destination" "billing_grace" {
  count                            = local.has_https ? 1 : 0
  name                             = "${local.name}-billing-grace"
  connection_arn                   = aws_cloudwatch_event_connection.automation_billing_grace[0].arn
  invocation_endpoint              = "${local.app_url}/api/automation/process-billing-grace"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 1
}

resource "aws_cloudwatch_event_api_destination" "process_trial" {
  count                            = local.has_https ? 1 : 0
  name                             = "${local.name}-process-trial"
  connection_arn                   = aws_cloudwatch_event_connection.automation_billing_grace[0].arn
  invocation_endpoint              = "${local.app_url}/api/automation/process-trial"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 1
}

resource "aws_cloudwatch_event_api_destination" "enqueue_reminders" {
  count                            = local.has_https ? 1 : 0
  name                             = "${local.name}-enqueue-reminders"
  connection_arn                   = aws_cloudwatch_event_connection.automation_enqueue_reminders[0].arn
  invocation_endpoint              = "${local.app_url}/api/automation/enqueue-reminders"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 1
}

resource "aws_iam_role_policy" "eventbridge_invoke" {
  count = local.has_https ? 1 : 0
  name  = "${local.name}-eventbridge-invoke"
  role  = aws_iam_role.eventbridge_api_destination[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["events:InvokeApiDestination"]
      Resource = [
        aws_cloudwatch_event_api_destination.ai_key_health[0].arn,
        aws_cloudwatch_event_api_destination.billing_grace[0].arn,
        aws_cloudwatch_event_api_destination.process_trial[0].arn,
        aws_cloudwatch_event_api_destination.enqueue_reminders[0].arn,
      ]
    }]
  })
}

resource "aws_cloudwatch_event_rule" "ai_key_health" {
  count               = local.has_https ? 1 : 0
  name                = "${local.name}-ai-key-health"
  schedule_expression = "cron(0 2 * * ? *)"
}

resource "aws_cloudwatch_event_rule" "billing_grace" {
  count               = local.has_https ? 1 : 0
  name                = "${local.name}-billing-grace"
  schedule_expression = "cron(0 */6 * * ? *)"
}

resource "aws_cloudwatch_event_rule" "process_trial" {
  count               = local.has_https ? 1 : 0
  name                = "${local.name}-process-trial"
  schedule_expression = "cron(0 1 * * ? *)"
}

resource "aws_cloudwatch_event_rule" "enqueue_reminders" {
  count               = local.has_https ? 1 : 0
  name                = "${local.name}-enqueue-reminders"
  schedule_expression = "cron(*/30 * * * ? *)"
}

resource "aws_cloudwatch_event_target" "ai_key_health" {
  count    = local.has_https ? 1 : 0
  rule     = aws_cloudwatch_event_rule.ai_key_health[0].name
  arn      = aws_cloudwatch_event_api_destination.ai_key_health[0].arn
  role_arn = aws_iam_role.eventbridge_api_destination[0].arn
  input    = jsonencode({})
}

resource "aws_cloudwatch_event_target" "billing_grace" {
  count    = local.has_https ? 1 : 0
  rule     = aws_cloudwatch_event_rule.billing_grace[0].name
  arn      = aws_cloudwatch_event_api_destination.billing_grace[0].arn
  role_arn = aws_iam_role.eventbridge_api_destination[0].arn
  input    = jsonencode({})
}

resource "aws_cloudwatch_event_target" "process_trial" {
  count    = local.has_https ? 1 : 0
  rule     = aws_cloudwatch_event_rule.process_trial[0].name
  arn      = aws_cloudwatch_event_api_destination.process_trial[0].arn
  role_arn = aws_iam_role.eventbridge_api_destination[0].arn
  input    = jsonencode({})
}

resource "aws_cloudwatch_event_target" "enqueue_reminders" {
  count    = local.has_https ? 1 : 0
  rule     = aws_cloudwatch_event_rule.enqueue_reminders[0].name
  arn      = aws_cloudwatch_event_api_destination.enqueue_reminders[0].arn
  role_arn = aws_iam_role.eventbridge_api_destination[0].arn
  input    = jsonencode({})
}

# ─── WAF ──────────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "app" {
  name        = "${local.name}-waf"
  scope       = "REGIONAL"
  description = "WAF for ${local.name} ALB"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-sqli"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "app" {
  resource_arn = aws_lb.app.arn
  web_acl_arn  = aws_wafv2_web_acl.app.arn
}
