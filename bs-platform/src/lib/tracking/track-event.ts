'use client'

/**
 * Marketing request item 4 (and the lead/registration/purchase funnel): one
 * call that reaches every installed tool at once.
 *
 *   trackEvent('whatsapp_click', { location: 'job_page' })
 *
 * fans out to GTM's dataLayer (so the marketing team can wire anything from
 * the GTM console), to Meta Pixel as a standard event, and to GA4 directly
 * when GTM is not present. Missing tools are simply skipped — the call never
 * throws and never blocks the click it is attached to.
 */

export type TrackedEvent =
  | 'whatsapp_click'
  | 'lead_submit'
  | 'popup_lead_submit'
  | 'complete_registration'
  | 'purchase'
  | 'begin_checkout'
  | 'course_view'
  | 'service_view'

/** Meta standard event for each of ours — Ads Manager optimises on these. */
const META_EVENT: Record<TrackedEvent, string> = {
  whatsapp_click: 'Lead',
  lead_submit: 'Lead',
  popup_lead_submit: 'Lead',
  complete_registration: 'CompleteRegistration',
  purchase: 'Purchase',
  begin_checkout: 'InitiateCheckout',
  course_view: 'ViewContent',
  service_view: 'ViewContent',
}

/** GA4 recommended event names. */
const GA4_EVENT: Record<TrackedEvent, string> = {
  whatsapp_click: 'generate_lead',
  lead_submit: 'generate_lead',
  popup_lead_submit: 'generate_lead',
  complete_registration: 'sign_up',
  purchase: 'purchase',
  begin_checkout: 'begin_checkout',
  course_view: 'view_item',
  service_view: 'view_item',
}

type Params = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(event: TrackedEvent, params: Params = {}): void {
  if (typeof window === 'undefined') return
  const clean: Params = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v

  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event, ...clean })
  } catch {
    /* ignore */
  }
  try {
    window.fbq?.('track', META_EVENT[event], clean)
  } catch {
    /* ignore */
  }
  try {
    // Only when GA4 was loaded directly; under GTM the dataLayer push is the hook.
    window.gtag?.('event', GA4_EVENT[event], clean)
  } catch {
    /* ignore */
  }
}
