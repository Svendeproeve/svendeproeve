from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=120)


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class OrganizationOut(BaseModel):
    id: str
    name: str
    owner_user_id: str
    created_at: datetime


class MembershipOut(BaseModel):
    user_id: str
    user_email: EmailStr
    user_full_name: Optional[str] = None
    role: Literal["owner", "admin", "member"]
    created_at: datetime


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"] = "member"


class MailAccountCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    imap_host: str = Field(min_length=3, max_length=255)
    imap_port: int = Field(ge=1, le=65535)
    imap_username: str = Field(min_length=1, max_length=255)
    imap_password: str = Field(min_length=1, max_length=255)
    use_ssl: bool = True
    smtp_host: str = Field(min_length=3, max_length=255)
    smtp_port: int = Field(ge=1, le=65535)
    smtp_username: str = Field(min_length=1, max_length=255)
    smtp_password: str = Field(min_length=1, max_length=255)
    smtp_use_ssl: bool = True


class MailAccountUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    imap_host: Optional[str] = Field(default=None, min_length=3, max_length=255)
    imap_port: Optional[int] = Field(default=None, ge=1, le=65535)
    imap_username: Optional[str] = Field(default=None, min_length=1, max_length=255)
    imap_password: Optional[str] = Field(default=None, min_length=1, max_length=255)
    use_ssl: Optional[bool] = None
    smtp_host: Optional[str] = Field(default=None, min_length=3, max_length=255)
    smtp_port: Optional[int] = Field(default=None, ge=1, le=65535)
    smtp_username: Optional[str] = Field(default=None, min_length=1, max_length=255)
    smtp_password: Optional[str] = Field(default=None, min_length=1, max_length=255)
    smtp_use_ssl: Optional[bool] = None


class MailAccountOut(BaseModel):
    id: str
    org_id: str
    name: str
    imap_host: str
    imap_port: int
    imap_username: str
    use_ssl: bool
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_use_ssl: bool
    created_at: datetime
    updated_at: datetime


class MailAccountTestRequest(BaseModel):
    imap_host: str = Field(min_length=3, max_length=255)
    imap_port: int = Field(ge=1, le=65535)
    imap_username: str = Field(min_length=1, max_length=255)
    imap_password: str = Field(min_length=1, max_length=255)
    use_ssl: bool = True


class MailAccountSmtpTestRequest(BaseModel):
    smtp_host: str = Field(min_length=3, max_length=255)
    smtp_port: int = Field(ge=1, le=65535)
    smtp_username: str = Field(min_length=1, max_length=255)
    smtp_password: str = Field(min_length=1, max_length=255)
    smtp_use_ssl: bool = True


class InboxCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=20)
    mail_account_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional. If set, only handle emails from these mail accounts. If omitted, applies to all mail accounts in the org.",
    )


class InboxUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=20)
    mail_account_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional. Replace linked mail accounts. Set to [] to apply to all mail accounts.",
    )


class InboxOut(BaseModel):
    id: str
    org_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    mail_account_ids: Optional[list[str]] = None
    is_system: bool = False
    created_at: datetime
    updated_at: datetime


class MemberInboxAccessUpdateRequest(BaseModel):
    inbox_ids: list[str] = Field(default_factory=list)


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(
        default=None,
        description="Optional UI color (hex like #RRGGBB)",
        max_length=20,
    )
    mail_account_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional. If set, only poll/categorize emails from these mail accounts. If omitted, applies to all mail accounts in the org.",
    )


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=20)
    mail_account_ids: Optional[list[str]] = Field(
        default=None,
        description="Optional. Replace linked mail accounts. Set to [] to apply to all mail accounts.",
    )


class CategoryOut(BaseModel):
    id: str
    org_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    mail_account_ids: Optional[list[str]] = None
    is_system: bool = False
    created_at: datetime
    updated_at: datetime


class FilterCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    match_query: str = Field(
        min_length=2,
        description="Human-readable rule/query that AI/classifier can evaluate.",
    )
    target_category_id: str
    is_active: bool = True


class FilterUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    match_query: Optional[str] = Field(default=None, min_length=2)
    target_category_id: Optional[str] = None
    is_active: Optional[bool] = None


class FilterOut(BaseModel):
    id: str
    org_id: str
    name: str
    description: Optional[str] = None
    match_query: str
    target_category_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MemberCategoryAccessUpdateRequest(BaseModel):
    category_ids: list[str] = Field(default_factory=list)
