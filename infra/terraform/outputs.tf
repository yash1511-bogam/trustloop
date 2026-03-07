output "app_url" {
  value = local.app_url
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_web_service_name" {
  value = aws_ecs_service.web.name
}

output "ecs_worker_service_name" {
  value = aws_ecs_service.worker.name
}

output "web_task_definition_arn" {
  value = aws_ecs_task_definition.web.arn
}

output "worker_task_definition_arn" {
  value = aws_ecs_task_definition.worker.arn
}

output "ecs_subnet_ids" {
  value = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "ecs_subnet_ids_csv" {
  value = join(",", [aws_subnet.public_a.id, aws_subnet.public_b.id])
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "reminder_queue_url" {
  value = aws_sqs_queue.reminder.url
}

output "postgres_endpoint" {
  value = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
