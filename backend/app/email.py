import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using SMTP.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning(
            "SMTP credentials not configured. Email would be sent to: %s", to_email
        )
        logger.info("Subject: %s", subject)
        logger.info("Content:\n%s", html_content)
        return True  # Return True in development mode

    try:
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        message["To"] = to_email
        message["Subject"] = subject

        html_part = MIMEText(html_content, "html")
        message.attach(html_part)

        smtp_kwargs: dict = dict(
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
        )
        if settings.smtp_use_tls:
            smtp_kwargs["use_tls"] = True
        else:
            smtp_kwargs["start_tls"] = True

        await aiosmtplib.send(message, **smtp_kwargs)

        logger.info("Email sent successfully to %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False


def generate_org_invite_email(invite_link: str, org_name: str, inviter_email: str, invitee_email: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been invited to {org_name}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-top: 20px;">
            <h2 style="color: #1976d2; margin-top: 0;">You've been invited to join {org_name}</h2>

            <p>Hello,</p>

            <p><strong>{inviter_email}</strong> has invited <strong>{invitee_email}</strong> to join <strong>{org_name}</strong> on Sortr.</p>

            <p>Click the button below to accept your invitation:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}"
                   style="background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Accept Invitation
                </a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all;">
                {invite_link}
            </p>

            <p><strong>This invitation will expire in 72 hours.</strong></p>

            <p style="color: #dc3545; margin-top: 30px;">
                <strong>If you weren't expecting this invitation, you can safely ignore this email.</strong>
            </p>
        </div>
    </body>
    </html>
    """


def generate_password_reset_email(reset_link: str, user_email: str) -> str:
    """Generate HTML content for password reset email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-top: 20px;">
            <h2 style="color: #1976d2; margin-top: 0;">Password Reset Request</h2>

            <p>Hello,</p>

            <p>We received a request to reset the password for your account associated with <strong>{user_email}</strong>.</p>

            <p>Click the button below to reset your password:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}"
                   style="background-color: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset Password
                </a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all;">
                {reset_link}
            </p>

            <p><strong>This link will expire in 1 hour.</strong></p>

            <p style="color: #dc3545; margin-top: 30px;">
                <strong>If you didn't request this password reset, please ignore this email.</strong>
                Your password will remain unchanged.
            </p>
        </div>
    </body>
    </html>
    """
