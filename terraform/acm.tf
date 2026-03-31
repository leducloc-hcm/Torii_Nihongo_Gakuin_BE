# ===== ACM Certificate =====

# Look up the existing Route 53 hosted zone
data "aws_route53_zone" "main" {
  name         = "torii-nihongo-gakuin.io.vn"
  private_zone = false
}

# Request a wildcard + root certificate via DNS validation
resource "aws_acm_certificate" "main" {
  domain_name               = "develop.torii-nihongo-gakuin.io.vn"
  subject_alternative_names = ["*.torii-nihongo-gakuin.io.vn"]
  validation_method         = "DNS"

  # Must be created before destroyed to avoid ALB listener downtime
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-cert"
  }
}

# Create the DNS CNAME validation records in Route 53
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for ACM to validate the certificate (blocks apply until cert is ISSUED)
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "10m"
  }
}
