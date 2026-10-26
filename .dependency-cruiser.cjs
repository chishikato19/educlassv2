/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Cấm import vòng (circular dependencies)',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'protocol-standalone',
      severity: 'error',
      comment: 'packages/protocol không được phụ thuộc gói nội bộ nào khác',
      from: {
        path: '^packages/protocol',
      },
      to: {
        path: '^(packages/(core|db|server|question-kit|ui-kit|activities)|apps/)',
      },
    },
    {
      name: 'core-no-db-or-server',
      severity: 'error',
      comment: 'packages/core là hàm thuần, không import db, server hoặc apps',
      from: {
        path: '^packages/core',
      },
      to: {
        path: '^(packages/(db|server|activities|ui-kit)|apps/)',
      },
    },
    {
      name: 'ui-no-server-or-db',
      severity: 'error',
      comment: 'UI (apps/teacher-ui, apps/student-ui, packages/ui-kit) không import server hoặc db',
      from: {
        path: '^(apps/(teacher-ui|student-ui)|packages/ui-kit)',
      },
      to: {
        path: '^packages/(server|db)',
      },
    },
    {
      name: 'server-no-ui',
      severity: 'error',
      comment: 'Server không import trực tiếp từ apps',
      from: {
        path: '^packages/server',
      },
      to: {
        path: '^apps/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: '(?:node_modules|dist|out|build|release)',
    },
    exclude: {
      path: '(?:node_modules|dist|out|build|release|coverage|\\.git)',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
