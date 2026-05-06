import fs from 'fs';

let content = fs.readFileSync('app/pages/FaturaPage.tsx', 'utf8');

const invoiceNamesFix = `  const { data: invoiceNamesListData, addItem: addInvoiceNameSync, deleteItem: delInvoiceNameSync } = useTableSync<any>({
    tableName: 'invoice_names',
    storageKey: 'invoice_names_data',
    initialData: [],
    orderBy: 'name',
    orderAsc: true
  });
  const invoiceNamesList = React.useMemo(() => invoiceNamesListData || [], [invoiceNamesListData]);

  const icebergCagesData = useGlobalTableData<any>('iceberg_cages');
  const icebergCages = React.useMemo(() => icebergCagesData || [], [icebergCagesData]);
`;

content = content.replace(/const \[invoiceNamesList, setInvoiceNamesList\] = useState<\{id: string, name: string\}\[\]>\(\(\) => \{[\s\S]*?\|\| \[\];\n\s*\}\);/, invoiceNamesFix);
content = content.replace(/const \[icebergCages, setIcebergCages\] = useState<\{id: string, name: string\}\[\]>\(\(\) => \{[\s\S]*?\|\| \[\];\n\s*\}\);/, '');

content = content.replace(/const newList = \[\.\.\.invoiceNamesList, \{ id: 'invname-'\+Date\.now\(\), name: newInvoiceName\.trim\(\) \}\];\n\s*setInvoiceNamesList\(newList\);\n\s*setInStorage\('invoice_names_data', newList\);/, `addInvoiceNameSync({ id: 'invname-'+Date.now(), name: newInvoiceName.trim() });`);
content = content.replace(/const newList = invoiceNamesList\.filter\(x => x\.id !== item\.id\);\n\s*setInvoiceNamesList\(newList\);\n\s*setInStorage\('invoice_names_data', newList\);/, `delInvoiceNameSync(item.id);`);

if (!content.includes('useGlobalTableData')) {
    content = content.replace(/import \{ useTableSync \} from '\.\.\/hooks\/useTableSync';/, `import { useTableSync } from '../hooks/useTableSync';\nimport { useGlobalTableData } from '../contexts/GlobalTableSyncContext';`);
}

fs.writeFileSync('app/pages/FaturaPage.tsx', content, 'utf8');
