"""\nStripe service — checkout session creation.\n"""

import stripe
from fastapi import HTTPException
from app.core.config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def create_checkout_session(
    company_slug: str,
    user_email: str,
    success_url: str,
    cancel_url: str,
    quantity: int = 1,
    extra_companies: int | None = None,
    user_id: str | None = None,
) -> str:
    """Create a Stripe Checkout session for a $49/mo subscription. Returns the checkout URL."""
    metadata = {"company_slug": company_slug}
    if extra_companies:
        metadata["extra_companies"] = str(extra_companies)
    if user_id:
        metadata["user_id"] = user_id

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user_email,
            line_items=[{"price": settings.stripe_price_id, "quantity": quantity}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        return session.url
    except stripe.error.AuthenticationError as e:
        print(f"[stripe] Authentication error (check STRIPE_SECRET_KEY): {e}")
        raise HTTPException(status_code=502, detail="Payment service configuration error. Please contact support.")
    except stripe.error.InvalidRequestError as e:
        print(f"[stripe] Invalid request error: {e}")
        raise HTTPException(status_code=502, detail=f"Payment setup error: {e.user_message or str(e)}")
    except stripe.error.RateLimitError as e:
        print(f"[stripe] Rate limit error: {e}")
        raise HTTPException(status_code=503, detail="Payment service temporarily unavailable. Please try again in a moment.")
    except stripe.error.APIConnectionError as e:
        print(f"[stripe] API connection error: {e}")
        raise HTTPException(status_code=503, detail="Unable to connect to payment service. Please check your connection and try again.")
    except stripe.error.StripeError as e:
        print(f"[stripe] Stripe error: {e}")
        raise HTTPException(status_code=502, detail=f"Payment error: {e.user_message or str(e)}")
    except Exception as e:
        print(f"[stripe] Unexpected error creating checkout session: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")
