import { createZodDto } from 'nestjs-zod'
import {
  CreatePaymentSchema,
  VNPayCallbackSchema,
  PaymentResponseSchema,
  PaymentCallbackResponseSchema,
} from './payment.model'

export class CreatePaymentDTO extends createZodDto(CreatePaymentSchema) {}
export class VNPayCallbackDTO extends createZodDto(VNPayCallbackSchema) {}
export class PaymentResponseDTO extends createZodDto(PaymentResponseSchema) {}
export class PaymentCallbackResponseDTO extends createZodDto(PaymentCallbackResponseSchema) {}
