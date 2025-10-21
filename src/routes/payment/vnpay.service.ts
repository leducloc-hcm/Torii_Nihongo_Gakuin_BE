import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import * as querystring from 'querystring'
import { VNPayCallbackDTO } from './payment.dto'

export interface VNPayConfig {
  tmnCode: string
  secretKey: string
  url: string
  returnUrl: string
  apiUrl: string
}

@Injectable()
export class VNPayService {
  private readonly logger = new Logger(VNPayService.name)
  private readonly vnpayConfig: VNPayConfig

  constructor(private configService: ConfigService) {
    this.vnpayConfig = {
      tmnCode: this.configService.get<string>('VNPAY_TMN_CODE') || '',
      secretKey: this.configService.get<string>('VNPAY_SECRET_KEY') || '',
      url: this.configService.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: this.configService.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3000/payment/vnpay/callback',
      apiUrl:
        this.configService.get<string>('VNPAY_API_URL') ||
        'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    }
  }

  /**
   * Create VNPay payment URL
   */
  createPaymentUrl(params: { orderId: string; amount: number; orderInfo: string; ipAddr: string }): string {
    const { orderId, amount, orderInfo, ipAddr } = params

    const date = new Date()
    const createDate = this.formatDate(date)
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000)) // 15 minutes

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpayConfig.tmnCode,
      vnp_Amount: (amount * 100).toString(), // VNPay requires amount in VND cents
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: this.vnpayConfig.returnUrl,
      vnp_TxnRef: orderId,
      vnp_ExpireDate: expireDate,
    }

    // Sort parameters and create query string
    const sortedParams = this.sortObject(vnpParams)
    const signData = querystring.stringify(sortedParams)

    // Create secure hash
    const secureHash = this.createSecureHash(signData)
    sortedParams['vnp_SecureHash'] = secureHash

    const paymentUrl = this.vnpayConfig.url + '?' + querystring.stringify(sortedParams)

    this.logger.log(`Created VNPay payment URL for order ${orderId}`)
    return paymentUrl
  }

  /**
   * Verify VNPay callback
   */
  verifyCallback(callbackData: VNPayCallbackDTO): { isValid: boolean; message: string } {
    const vnpParams = { ...callbackData } as any
    const secureHash = vnpParams['vnp_SecureHash']

    delete vnpParams['vnp_SecureHash']
    delete vnpParams['vnp_SecureHashType']

    // Sort parameters and create verification string
    const sortedParams = this.sortObject(vnpParams)
    const signData = querystring.stringify(sortedParams)

    // Verify secure hash
    const checkSum = this.createSecureHash(signData)

    if (secureHash === checkSum) {
      // Check response code
      if (callbackData.vnp_ResponseCode === '00') {
        return { isValid: true, message: 'Payment successful' }
      } else {
        return { isValid: false, message: this.getResponseMessage(callbackData.vnp_ResponseCode) }
      }
    } else {
      return { isValid: false, message: 'Invalid signature' }
    }
  }

  /**
   * Query payment status from VNPay
   */
  queryPayment(params: { orderId: string; transDate: string; ipAddr: string }): Promise<any> {
    const { orderId, transDate, ipAddr } = params

    const vnpParams: Record<string, string> = {
      vnp_RequestId: this.generateRequestId(),
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.vnpayConfig.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Query transaction ${orderId}`,
      vnp_TransactionDate: transDate,
      vnp_CreateDate: this.formatDate(new Date()),
      vnp_IpAddr: ipAddr,
    }

    // Sort parameters and create query string
    const sortedParams = this.sortObject(vnpParams)
    const signData = querystring.stringify(sortedParams)

    // Create secure hash
    const secureHash = this.createSecureHash(signData)
    sortedParams['vnp_SecureHash'] = secureHash

    try {
      // In real implementation, you would make HTTP request to VNPay API
      // For now, we'll return a mock response
      this.logger.log(`Querying payment status for order ${orderId}`)
      return { success: true, data: sortedParams } as any
    } catch (error) {
      this.logger.error(`Error querying payment status: ${error.message}`)
      throw new BadRequestException('Failed to query payment status')
    }
  }

  private createSecureHash(data: string): string {
    return crypto.createHmac('sha512', this.vnpayConfig.secretKey).update(Buffer.from(data, 'utf-8')).digest('hex')
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {}
    const str: string[] = []

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key))
      }
    }

    str.sort()

    for (let i = 0; i < str.length; i++) {
      sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, '+')
    }

    return sorted
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}${hours}${minutes}${seconds}`
  }

  private generateRequestId(): string {
    return Date.now().toString()
  }

  private getResponseMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    }

    return messages[code] || 'Lỗi không xác định'
  }
}
