export interface MailDeliveryService {
  sendEmailVerification(email: string, rawToken: string): Promise<void>;
  sendPasswordReset(email: string, rawToken: string): Promise<void>;
  sendAdminInvitation(
    email: string,
    rawToken: string,
    role: string,
  ): Promise<void>;
}
