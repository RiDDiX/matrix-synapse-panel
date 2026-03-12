import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RiDDiX Matrix Control',
  tagline: 'Multi-server administration platform for Matrix Synapse homeservers',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://riddix.github.io',
  baseUrl: '/regtokendashboard-synapse/',

  organizationName: 'RiDDiX',
  projectName: 'regtokendashboard-synapse',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/RiDDiX/regtokendashboard-synapse/tree/alpha/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'RiDDiX Matrix Control',
      logo: {
        alt: 'RiDDiX Matrix Control',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/RiDDiX/regtokendashboard-synapse',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started/docker' },
            { label: 'Multi-Server', to: '/docs/features/multi-server' },
            { label: 'API Reference', to: '/docs/api/public' },
          ],
        },
        {
          title: 'Features',
          items: [
            { label: 'Token Management', to: '/docs/features/tokens' },
            { label: 'Branding', to: '/docs/features/branding' },
            { label: 'Integrations', to: '/docs/features/integrations' },
            { label: 'Bots', to: '/docs/features/bots' },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/RiDDiX/regtokendashboard-synapse',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RiDDiX. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'sql', 'nginx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
