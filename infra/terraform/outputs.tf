output "app_url" {
  value = local.app_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "web_task_definition_arn" {
  value = aws_ecs_task_definition.web.arn
}

output "ecs_subnet_ids_csv" {
  value = "${aws_subnet.private_a.id},${aws_subnet.private_b.id}"
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}
