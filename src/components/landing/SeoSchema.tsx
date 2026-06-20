// Schema.org JSON-LD para SEO — no render visual
export function SeoSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://weeklink.com.mx/#software',
        name: 'Weeklink',
        url: 'https://weeklink.com.mx',
        description: 'Software de gestión todo-en-uno para agencias de marketing en México. Incluye CRM, gestión de proyectos, chat con clientes, portal de entregas y aprobaciones.',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'MXN',
          description: 'Prueba gratuita de 14 días',
        },
        featureList: [
          'Gestión de tareas y proyectos',
          'Chat en tiempo real con clientes',
          'Portal de entregas y aprobaciones',
          'Calendario y reuniones con Google Meet',
          'Notificaciones push',
          'IA para estrategia de marketing',
          'Reportes y analytics',
        ],
        screenshot: 'https://weeklink.com.mx/og-image.png',
        inLanguage: 'es-MX',
        audience: {
          '@type': 'Audience',
          audienceType: 'Agencias de marketing digital en México',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://weeklink.com.mx/#org',
        name: 'Weeklink',
        url: 'https://weeklink.com.mx',
        logo: 'https://weeklink.com.mx/icons/icon-192.png',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'hola@weeklink.com.mx',
          contactType: 'customer support',
          availableLanguage: 'Spanish',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://weeklink.com.mx/#website',
        url: 'https://weeklink.com.mx',
        name: 'Weeklink',
        description: 'Software para agencias de marketing en México',
        publisher: { '@id': 'https://weeklink.com.mx/#org' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://weeklink.com.mx/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'es-MX',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Qué es Weeklink?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Weeklink es una plataforma todo-en-uno para agencias de marketing en México que incluye gestión de tareas, chat con clientes, portal de entregas, aprobaciones y calendario con Google Meet.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Cuánto cuesta Weeklink?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Weeklink ofrece una prueba gratuita de 14 días. Los planes de pago comienzan desde $299 MXN/mes.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Weeklink funciona para agencias de marketing en México?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sí, Weeklink está diseñado específicamente para agencias de marketing digital en México. Incluye funciones como portal de cliente, aprobaciones de diseño, chat en tiempo real y gestión de proyectos.',
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
