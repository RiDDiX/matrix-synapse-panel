import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/docker',
        'getting-started/development',
        'getting-started/environment-variables',
        'getting-started/synapse-configuration',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      collapsed: false,
      items: [
        'features/multi-server',
        'features/tokens',
        'features/registration',
        'features/branding',
        'features/integrations',
        'features/bots',
        'features/backup-reset',
        'features/audit-log',
        'features/diagnostics',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        'api/public',
        'api/admin-servers',
        'api/admin-tokens',
        'api/admin-branding',
        'api/admin-integrations',
        'api/admin-bots',
        'api/admin-other',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: true,
      items: [
        'architecture/overview',
        'architecture/database',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: true,
      items: [
        'deployment/docker-compose',
        'deployment/reverse-proxy',
      ],
    },
    'troubleshooting',
  ],
};

export default sidebars;
