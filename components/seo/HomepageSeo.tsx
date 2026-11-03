// Homepage-only structured data. Keep this in sync with the public site.
// Google chooses the displayed site name automatically; these are preferences.
import { SITE_URL } from '@/lib/seo';

const BUSINESS_NAME = 'Happy Tails Pet Grooming Cafe';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: BUSINESS_NAME,
      alternateName: ['HappyTails PGC', 'happytailspgc.vercel.app'],
      inLanguage: 'en-PH',
      publisher: { '@id': `${SITE_URL}/#business` },
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#business`,
      name: BUSINESS_NAME,
      url: `${SITE_URL}/`,
      description:
        'Happy Tails Pet Grooming Cafe offers pet grooming, pet boarding, spa services, and pet supplies in Noveleta, Cavite, Philippines.',
      logo: `${SITE_URL}/images/logo.png`,
      image: `${SITE_URL}/images/hero-bg.png`,
      telephone: '+639550085317',
      email: 'happytails.pgc@gmail.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '364 Ricardo Commercial Bldg., Salcedo',
        addressLocality: 'Noveleta',
        addressRegion: 'Cavite',
        postalCode: '4105',
        addressCountry: 'PH',
      },
    },
  ],
};

const jsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');

export default function HomepageSeo() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section aria-label="Welcome to Happy Tails" className="bg-white px-6 py-7 text-center sm:py-9">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl md:text-3xl">
            Happy Tails Pet Grooming Cafe in Noveleta, Cavite
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-zinc-700 sm:text-base">
            Explore dog and cat grooming, pet boarding, spa care, and pet supplies.
            Browse our services and book your pet&apos;s next appointment online.
          </p>
        </div>
      </section>
    </>
  );
}
