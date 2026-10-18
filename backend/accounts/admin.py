"""
Sheba Sound — Accounts Admin
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, ListenerProfile, ArtistProfile, ArtistVerificationLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "role", "is_active", "is_verified", "created_at")
    list_filter = ("role", "is_active", "is_verified")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "avatar_url")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_verified")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "password1", "password2", "role"),
        }),
    )


@admin.register(ListenerProfile)
class ListenerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "subscription_tier", "subscription_expiry")
    list_filter = ("subscription_tier",)


@admin.register(ArtistProfile)
class ArtistProfileAdmin(admin.ModelAdmin):
    list_display = ("stage_name", "user", "verified", "verification_status", "is_identity_verified", "total_streams", "submitted_at")
    list_filter = ("verified", "verification_status", "is_identity_verified")
    search_fields = ("stage_name",)
    readonly_fields = ("submitted_at", "reviewed_at", "reviewed_by")


@admin.register(ArtistVerificationLog)
class ArtistVerificationLogAdmin(admin.ModelAdmin):
    list_display = ("artist_profile", "action", "performed_by", "created_at")
    list_filter = ("action",)
    readonly_fields = ("artist_profile", "action", "performed_by", "reason", "created_at")
