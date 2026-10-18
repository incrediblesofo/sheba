"""
Sheba Sound — Subscriptions URL Configuration
"""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.SubscriptionListView.as_view(), name="subscription-list"),
    path("current/", views.MySubscriptionView.as_view(), name="subscription-current"),
    path("initiate/", views.InitiatePaymentView.as_view(), name="subscription-initiate"),
    path("verify/<str:tx_ref>/", views.VerifyPaymentView.as_view(), name="subscription-verify"),
    path("cancel/", views.CancelSubscriptionView.as_view(), name="subscription-cancel"),
    path("webhooks/chapa/", views.ChapaWebhookView.as_view(), name="webhook-chapa"),
    path("webhooks/telebirr/", views.TelebirrCallbackView.as_view(), name="webhook-telebirr"),
]
