import fs from 'fs';
let content = fs.readFileSync('app/pages/StokPage.tsx', 'utf8');

const icebergFix = `  const icebergCagesData = useGlobalTableData<any>('iceberg_cages');
  const icebergCages = React.useMemo(() => icebergCagesData || [], [icebergCagesData]);
`;
content = content.replace(/const \[icebergCages, setIcebergCages\] = useState<IcebergCage\[\]>\(\(\) =>[\s\S]*?\|\| \[\]\n\s*\);/, icebergFix);

const transFix = `  const transportersData = useGlobalTableData<any>('transporters');
  const transporters = React.useMemo(() => transportersData || [], [transportersData]);
`;
content = content.replace(/const \[transporters, setTransporters\] = useState<\{id: string, name: string\}\[\]>\(\(\) =>[\s\S]*?\|\| \[\]\n\s*\);/, transFix);

content = content.replace(/setIcebergCages\([^)]*\);/g, '// setIcebergCages removed');
content = content.replace(/setTransporters\([^)]*\);/g, '// setTransporters removed');

if (!content.includes('useGlobalTableData')) {
    content = content.replace(/import \{ useTableSync \} from '\.\.\/hooks\/useTableSync';/, `import { useTableSync } from '../hooks/useTableSync';\nimport { useGlobalTableData } from '../contexts/GlobalTableSyncContext';`);
}

fs.writeFileSync('app/pages/StokPage.tsx', content, 'utf8');
