import Script from 'next/script';

export default function AnalyticsScripts() {
  const rawGaId = process.env.NEXT_PUBLIC_GA_ID || '';
  const rawClarityId = process.env.NEXT_PUBLIC_CLARITY_ID || '';
  const gaId = /^G-[A-Z0-9]+$/.test(rawGaId) ? rawGaId : '';
  const clarityId = /^[a-z0-9]+$/i.test(rawClarityId) ? rawClarityId : '';

  return <>
    {gaId && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
    </>}
    {clarityId && <Script id="microsoft-clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${clarityId}');`}</Script>}
  </>;
}
