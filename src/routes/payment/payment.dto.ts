import { createZodDto } from 'nestjs-zod'
import {
  CreatePaymentSchema,
  PaymentResponseSchema,
  PaymentCallbackResponseSchema,
  SepayWebhookSchema,
  SepayPaymentResponseSchema,
  BuyCourseDirectSchema,
} from './payment.model'

export class CreatePaymentDTO extends createZodDto(CreatePaymentSchema) {}
export class PaymentResponseDTO extends createZodDto(PaymentResponseSchema) {}
export class PaymentCallbackResponseDTO extends createZodDto(PaymentCallbackResponseSchema) {}
export class SepayWebhookDTO extends createZodDto(SepayWebhookSchema) {}
export class SepayPaymentResponseDTO extends createZodDto(SepayPaymentResponseSchema) {}
export class BuyCourseDirectDTO extends createZodDto(BuyCourseDirectSchema) {}
