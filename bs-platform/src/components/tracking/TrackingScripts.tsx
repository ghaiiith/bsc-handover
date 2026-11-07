import Script from 'next/script'
import type { PublicTrackingConfig } from '@/lib/tracking/public-config'

/**
 * Marketing request items 2, 3, 8, 9: GTM container, GA4, Meta Pixel and
 * Microsoft Clarity on every page, plus the two site-verification meta tags.
 *
 * Every id comes from platform settings, so the marketing team changes them
 * from the admin dashboard without a code deploy. Ids are validated before
 * they reach this component (lib/tracking/public-config) — a value that does
 * not look like a real id is dropped, never interpolated into a script.
 *
 * All snippets are `afterInteractive`: they never block first paint, which is
 * what keeps the mobile landing pages under the 3-second target (item 7).
 */
export default function TrackingScripts({ config }: { config: PublicTrackingConfig }) {
  const { gtmId, ga4Id, metaPixelId, clarityId, googleSiteVerification, metaDomainVerification } = config

  return (
    <>
      {/* Item 7: open the tracking hosts' connections early so the async tags
          do not pay DNS+TLS on the critical path. Only for hosts in use. */}
      {(gtmId || ga4Id) && <link rel="preconnect" href="https://www.googletagmanager.com" />}
      {metaPixelId && <link rel="preconnect" href="https://connect.facebook.net" />}
      {clarityId && <link rel="preconnect" href="https://www.clarity.ms" />}

      {googleSiteVerification && (
        <meta name="google-site-verification" content={googleSiteVerification} />
      )}
      {metaDomainVerification && (
        <meta name="facebook-domain-verification" content={metaDomainVerification} />
      )}

      {/* dataLayer exists even before GTM loads so early events queue safely. */}
      <Script id="datalayer-init" strategy="beforeInteractive">
        {`window.dataLayer = window.dataLayer || [];`}
      </Script>

      {gtmId && (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="gtm"
            />
          </noscript>
        </>
      )}

      {/* GA4 direct load only when GTM is not managing it — avoids double hits. */}
      {ga4Id && !gtmId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}',{send_page_view:true});`}
          </Script>
        </>
      )}

      {metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {clarityId && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  )
}
