import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import * as React from 'react'
import { OTPEmail } from 'emails/otp'
import AccountCreatedEmail from 'emails/accountCreated'

@Injectable()
export class EmailService {
  private resend: Resend
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }
  async sendOTP(payload: { email: string; code: string }) {
    const subject = 'Mã OTP'
    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: <OTPEmail otpCode={payload.code} title={subject} />,
    })
  }
  async sendAccountCreated(payload: { email: string; password: string; role: 'Nhân viên' | 'Giảng viên' }) {
    const subject = `Tài khoản ${payload.role} đã được tạo`
    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: <AccountCreatedEmail passworDefault={payload.password} title={subject} role={payload.role} />,
    })
  }
}
